/*globals requireJS*/
/*jshint node:true, newcap:false, camelcase:false*/
/**
 * @module Server:WebSockets
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var io = require('socket.io'),
    redis = require('socket.io-redis'),
    Q = require('q'),
    UTIL = require('../../utils'),
//COOKIE = require('cookie-parser'),
    URL = requireJS('common/util/url'),
    CONSTANTS = requireJS('common/storage/constants'),
    PACKAGE_JSON;

PACKAGE_JSON = UTIL.getPackageJsonSync();

function WebSocket(storage, mainLogger, gmeConfig, gmeAuth, workerManager) {
    var logger = mainLogger.fork('WebSocket'),
        metadataStorage = gmeAuth.metadataStorage,
        authorizer = gmeAuth.authorizer,
        projectAuthParams = {
            entityType: authorizer.ENTITY_TYPES.PROJECT
        },
        webSocket;

    logger.debug('ctor');

    function getTokenFromHandshake(socket) {
        var token,
            handshakeData = socket.handshake;

        if (handshakeData && handshakeData.headers.cookie) {
            // We try to dig it from the cookie.
            token = URL.parseCookie(handshakeData.headers.cookie)[gmeConfig.authentication.jwt.cookieId];
        }

        return token;
    }

    function getUserIdFromToken(socket, token, callback) {
        if (gmeConfig.authentication.enable === true) {
            return gmeAuth.verifyJWToken(token)
                .then(function (result) {
                    // Check if token is about to expire
                    if (result.renew === true) {
                        logger.debug('JWT_ABOUT_TO_EXPIRE for user', result.content.userId, socket.id);
                        socket.emit(CONSTANTS.JWT_ABOUT_TO_EXPIRE, {
                            exp: result.content.exp,
                            iat: result.content.iat
                        });
                    }

                    return result.content.userId;
                })
                .catch(function (err) {
                    if (err.name === 'TokenExpiredError') {
                        logger.debug('JWT_EXPIRED for socket', socket.id);
                        socket.emit(CONSTANTS.JWT_EXPIRED, {});
                        throw new Error('TokenExpired');
                    } else {
                        throw err;
                    }
                })
                .nodeify(callback);
        } else {
            return Q(gmeConfig.authentication.guestAccount);
        }
    }

    function projectAccess(socket, token, projectId, callback) {
        var userId = userId;
        return getUserIdFromToken(socket, token)
            .then(function (userId) {
                return authorizer.getAccessRights(userId, projectId, projectAuthParams);
            })
            .nodeify(callback);
    }

    function getEmitter(data) {
        var emitter;
        if (data.socket) {
            logger.debug('socket provided - will broadcast from ', data.socket.id);
            emitter = data.socket.broadcast;
            delete data.socket;
        } else {
            // Changes from the server itself needs to emit to all sockets.
            logger.debug('socket NOT provided - will emit to everybody.');
            emitter = webSocket;
        }
        return emitter;
    }

    function joinBranchRoom(socket, token, projectId, branchName) {
        var deferred = Q.defer(),
            roomName = projectId + CONSTANTS.ROOM_DIVIDER + branchName,
            eventData = {
                projectId: projectId,
                branchName: branchName,
                userId: socket.userId,
                socketId: socket.id,
                join: true,
                // These won't work with multiple servers
                currNbrOfSockets: 0,
                prevNbrOfSockets: 0
            };

        if (socket.rooms.hasOwnProperty(roomName) === true) {
            // Socket is already in given room - no need to account for it.
            logger.debug('socket already in room', socket.id, roomName);
            deferred.resolve();
        } else {
            Q.ninvoke(socket, 'join', roomName)
                .then(function () {
                    var workManagerParams = {
                        projectId: projectId,
                        branchName: branchName,
                        webgmeToken: token,
                        join: true
                    };
                    logger.debug('socket joined room', socket.id, eventData.userId, roomName);
                    eventData.currNbrOfSockets = Object.keys(webSocket.sockets.adapter.rooms[roomName]).length;
                    eventData.prevNbrOfSockets = eventData.currNbrOfSockets - 1;
                    eventData.type = CONSTANTS.BRANCH_ROOM_SOCKETS;

                    socket.broadcast.to(roomName).emit(CONSTANTS.NOTIFICATION, eventData);


                    return Q.ninvoke(workerManager, 'socketRoomChange', workManagerParams);
                })
                .then(deferred.resolve)
                .catch(function (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                });
        }

        return deferred.promise;
    }

    function leaveBranchRoom(socket, projectId, branchName/*, disconnected*/) {
        var deferred = Q.defer(),
            roomName = projectId + CONSTANTS.ROOM_DIVIDER + branchName,
            eventData = {
                projectId: projectId,
                branchName: branchName,
                userId: socket.userId,
                socketId: socket.id,
                // These won't work with multiple servers
                currNbrOfSockets: 0,
                prevNbrOfSockets: 0
            };

        if (socket.rooms.hasOwnProperty(roomName) === false) {
            // Socket was never in or had already left given room - no need to account for it.
            logger.debug('socket already left room', socket.id, roomName);
            deferred.resolve();
        } else {
            eventData.prevNbrOfSockets = Object.keys(webSocket.sockets.adapter.rooms[roomName]).length;
            eventData.currNbrOfSockets = eventData.prevNbrOfSockets - 1;
            eventData.type = CONSTANTS.BRANCH_ROOM_SOCKETS;
            socket.broadcast.to(roomName).emit(CONSTANTS.NOTIFICATION, eventData);
            Q.ninvoke(socket, 'leave', roomName)
                .then(function () {
                    var workManagerParams = {
                        projectId: projectId,
                        branchName: branchName,
                        webgmeToken: null,
                        join: false
                    };

                    logger.debug('socket left room', socket.id, eventData.userId, roomName);

                    return Q.ninvoke(workerManager, 'socketRoomChange', workManagerParams);
                })
                .then(deferred.resolve)
                .catch(function (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                });
        }

        return deferred.promise;
    }

    storage.addEventListener(CONSTANTS.PROJECT_DELETED, function (_s, data) {
        getEmitter(data).to(CONSTANTS.DATABASE_ROOM).emit(CONSTANTS.PROJECT_DELETED, data);
    });

    storage.addEventListener(CONSTANTS.PROJECT_CREATED, function (_s, data) {
        getEmitter(data).to(CONSTANTS.DATABASE_ROOM).emit(CONSTANTS.PROJECT_CREATED, data);
    });

    storage.addEventListener(CONSTANTS.BRANCH_DELETED, function (_s, data) {
        getEmitter(data).to(data.projectId).emit(CONSTANTS.BRANCH_DELETED, data);
    });

    storage.addEventListener(CONSTANTS.BRANCH_CREATED, function (_s, data) {
        getEmitter(data).to(data.projectId).emit(CONSTANTS.BRANCH_CREATED, data);
    });

    storage.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED, function (_s, data) {
        getEmitter(data).to(data.projectId).emit(CONSTANTS.BRANCH_HASH_UPDATED, data);
    });

    storage.addEventListener(CONSTANTS.COMMIT, function (_s, data) {
        getEmitter(data).to(data.projectId).emit(CONSTANTS.COMMIT, data);
    });

    storage.addEventListener(CONSTANTS.TAG_CREATED, function (_s, data) {
        getEmitter(data).to(data.projectId).emit(CONSTANTS.TAG_CREATED, data);
    });

    storage.addEventListener(CONSTANTS.TAG_DELETED, function (_s, data) {
        getEmitter(data).to(data.projectId).emit(CONSTANTS.TAG_DELETED, data);
    });

    storage.addEventListener(CONSTANTS.BRANCH_UPDATED, function (_s, data) {
        getEmitter(data)
            .to(data.projectId + CONSTANTS.ROOM_DIVIDER + data.branchName)
            .emit(CONSTANTS.BRANCH_UPDATED, data);
    });

    this.start = function (server) {
        logger.debug('start');

        webSocket = io.listen(server || gmeConfig.server.port, gmeConfig.socketIO.serverOptions);

        if (gmeConfig.socketIO.adapter.type.toLowerCase() === 'redis') {
            logger.info('redis adapter:', JSON.stringify(gmeConfig.socketIO.adapter.options));
            webSocket.adapter(redis(gmeConfig.socketIO.adapter.options.uri));
        }

        logger.debug('listening');

        webSocket.use(function (socket, next) {
            getUserIdFromToken(socket, getTokenFromHandshake(socket))
                .then(function (userId) {
                    logger.debug('User connected and authenticated', userId);
                    socket.userId = userId;
                    next();
                })
                .catch(next);
        });

        webSocket.on('connection', function (socket) {
            logger.debug('New socket connected', socket.id);

            // Inject into socket.onclose in order to see which rooms socket was in.
            var originalOnClose = socket.onclose;
            socket.onclose = function () {
                var i,
                    roomIds,
                    projectIdBranchName;

                if (webSocket) {
                    roomIds = Object.keys(socket.rooms);
                    for (i = 0; i < roomIds.length; i += 1) {
                        if (roomIds[i].indexOf(CONSTANTS.ROOM_DIVIDER) > -1) {
                            logger.debug('Socket was in branchRoom', roomIds[i]);
                            projectIdBranchName = roomIds[i].split(CONSTANTS.ROOM_DIVIDER);
                            // We cannot wait for this since socket.onclose is synchronous.
                            leaveBranchRoom(socket, projectIdBranchName[0], projectIdBranchName[1])
                                .fail(function (err) {
                                    logger.error(err);
                                });
                        }
                    }
                }

                originalOnClose.apply(socket, arguments);
            };

            socket.on('disconnect', function () {
                // When this event is triggered, the disconnect socket has already left all rooms.
                logger.debug('disconnect socket is in rooms: ', socket.id, Object.keys(socket.rooms));
            });

            socket.on('getConnectionInfo', function (data, callback) {
                var info = {
                    userId: null,
                    serverVersion: PACKAGE_JSON.version
                };
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        info.userId = userId;
                        callback(null, info);
                    }).catch(function (err) {
                    callback(err.message);
                });
            });

            // watcher functions
            socket.on('watchDatabase', function (data, callback) {
                logger.debug('watchDatabase', {metadata: data});
                if (data && data.join) {
                    socket.join(CONSTANTS.DATABASE_ROOM);
                } else {
                    socket.leave(CONSTANTS.DATABASE_ROOM);
                }
                callback(null);
            });

            socket.on('watchProject', function (data, callback) {
                logger.debug('watchProject', {metadata: data});
                data = data || {};
                projectAccess(socket, data.webgmeToken, data.projectId)
                    .then(function (access) {
                        if (data.join) {
                            if (access.read) {
                                socket.join(data.projectId);
                                logger.debug('socket joined room', data.projectId);
                                callback(null);
                            } else {
                                logger.warn('socket not authorized to join room', data.projectId);
                                callback('No read access for ' + data.projectId);
                            }
                        } else {
                            socket.leave(data.projectId);
                            logger.debug('socket left room', data.projectId);
                            callback(null);
                        }
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('watchBranch', function (data, callback) {
                // This is emitted from clients that got disconnected while having branches open.
                logger.debug('watchBranch', {metadata: data});
                data = data || {};
                projectAccess(socket, data.webgmeToken, data.projectId)
                    .then(function (access) {
                        if (data.join) {
                            if (access.read) {
                                joinBranchRoom(socket, data.webgmeToken, data.projectId, data.branchName)
                                    .fail(function (err) {
                                        logger.error(err);
                                    });
                            } else {
                                logger.warn('socket not authorized to join room', data.projectId);
                                throw new Error('No read access for ' + data.projectId);
                            }
                        } else {
                            leaveBranchRoom(socket, data.projectId, data.branchName)
                                .fail(function (err) {
                                    logger.error(err);
                                });
                        }
                    })
                    .then(function () {
                        callback(null);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            // model editing functions
            socket.on('openProject', function (data, callback) {
                var branches,
                    access;
                logger.debug('openProject', {metadata: data});
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getBranches(data);
                    })
                    .then(function (branches_) {
                        branches = branches_;
                        return projectAccess(socket, data.webgmeToken, data.projectId);
                    })
                    .then(function (access_) {
                        var username = data.username || this.gmeConfig.authentication.guestAccount;
                        access = access_;
                        return metadataStorage.updateProjectInfo(data.projectId, {
                            viewedAt: (new Date()).toISOString(),
                            viewer: username
                        });
                    })
                    .then(function () {
                        callback(null, branches, access);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('closeProject', function (data, callback) {
                logger.debug('closeProject', {metadata: data});
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        return metadataStorage.updateProjectInfo(data.projectId, {
                            viewedAt: (new Date()).toISOString(),
                            viewer: userId || this.gmeConfig.authentication.guestAccount
                        });
                    })
                    .then(function () {
                        callback();
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('openBranch', function (data, callback) {
                var latestCommitData;
                logger.debug('openBranch', {metadata: data});
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        // This ensures read access.
                        return storage.getLatestCommitData(data);
                    })
                    .then(function (commitData) {
                        latestCommitData = commitData;
                        joinBranchRoom(socket, data.webgmeToken, data.projectId, data.branchName)
                            .fail(function (err) {
                                logger.error(err);
                            });
                    })
                    .then(function () {
                        callback(null, latestCommitData);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('closeBranch', function (data, callback) {
                logger.debug('closeBranch', {metadata: data});
                data = data || {};
                leaveBranchRoom(socket, data.projectId, data.branchName)
                    .fail(function (err) {
                        logger.error(err);
                    });

                callback(null);
            });

            socket.on('makeCommit', function (data, callback) {
                var commitStatus;
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        var roomName;
                        if (data.branchName) {
                            roomName = data.projectId + CONSTANTS.ROOM_DIVIDER + data.branchName;
                            if (socket.rooms.hasOwnProperty(roomName)) {
                                logger.debug('Committer is in the branch-room', userId, roomName);
                                data.socket = socket;
                            }
                        }

                        data.username = userId;
                        return storage.makeCommit(data);
                    })
                    .then(function (status) {
                        var now = (new Date()).toISOString();

                        commitStatus = status;
                        return metadataStorage.updateProjectInfo(data.projectId, {
                            modifiedAt: now,
                            viewedAt: now,
                            viewer: data.username,
                            modifier: data.username
                        });
                    })
                    .then(function () {
                        var tokenPromise;
                        if (commitStatus.status === CONSTANTS.FORKED && gmeConfig.storage.autoMerge.enable) {
                            // Commit was forked and auto-merge is enabled. First get a new token for the worker.
                            if (gmeConfig.authentication.enable === true) {
                                tokenPromise = gmeAuth.regenerateJWToken(data.webgmeToken);
                            } else {
                                tokenPromise = Q();
                            }

                            tokenPromise
                                .then(function (token) {
                                    var workerParameters = {
                                        command: 'autoMerge',
                                        projectId: data.projectId,
                                        mine: commitStatus.hash,
                                        theirs: data.branchName,
                                        webgmeToken: token
                                    };

                                    workerManager.request(workerParameters, function (err, result) {
                                        if (err) {
                                            logger.error('Merging failed', err);
                                        } else if (result.conflict && result.conflict.items.length > 0) {
                                            logger.info('Merge resulted in conflict', commitStatus);
                                        } else if (result.updatedBranch) {
                                            logger.info('Merge successful', commitStatus);
                                            callback(null, {
                                                status: CONSTANTS.MERGED,
                                                hash: commitStatus.hash,
                                                theirHash: result.theirCommitHash,
                                                mergeHash: result.finalCommitHash
                                            });
                                            return;
                                        } else {
                                            logger.error('No conflict nor an updateBranch, this should not happen.');
                                        }

                                        // In the cases where the merged failed or resulted in conflicts we just return
                                        // the original FORKED commit-status.
                                        callback(null, commitStatus);
                                    });
                                })
                                .catch(function (err) {
                                    callback(err.message);
                                });
                        } else {
                            callback(null, commitStatus);
                        }
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('loadObjects', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.loadObjects(data);
                    })
                    .then(function (loadedObjects) {
                        callback(null, loadedObjects); //Single load-fails are reported in this object.
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('loadPaths', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.loadPaths(data);
                    })
                    .then(function (hashDictionary) {
                        callback(null, hashDictionary);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('setBranchHash', function (data, callback) {
                var status;
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        if (socket.rooms.hasOwnProperty(data.projectId)) {
                            data.socket = socket;
                        }

                        data.username = userId;
                        return storage.setBranchHash(data);
                    })
                    .then(function (result) {
                        var now = (new Date()).toISOString(),
                            username = data.username || this.gmeConfig.authentication.guestAccount;
                        status = result;

                        return metadataStorage.updateProjectInfo(data.projectId, {
                            modifiedAt: now,
                            viewedAt: now,
                            viewer: username,
                            modifier: username
                        });
                    })
                    .then(function () {
                        callback(null, status);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getBranchHash', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getBranchHash(data);
                    })
                    .then(function (result) {
                        callback(null, result);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getProjects', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getProjects(data);
                    })
                    .then(function (projects) {
                        callback(null, projects);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('deleteProject', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        if (socket.rooms.hasOwnProperty(CONSTANTS.DATABASE_ROOM)) {
                            data.socket = socket;
                        }

                        data.username = userId;
                        return storage.deleteProject(data);
                    })
                    .then(function (didExist) {
                        callback(null, didExist);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('createProject', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        if (socket.rooms.hasOwnProperty(CONSTANTS.DATABASE_ROOM)) {
                            data.socket = socket;
                        }

                        data.username = userId;
                        return storage.createProject(data);
                    })
                    .then(function (project) {
                        callback(null, project.projectId);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('transferProject', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        if (socket.rooms.hasOwnProperty(CONSTANTS.DATABASE_ROOM)) {
                            data.socket = socket;
                        }

                        data.username = userId;
                        return storage.transferProject(data);
                    })
                    .then(function (newProjectId) {
                        callback(null, newProjectId);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('duplicateProject', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        if (socket.rooms.hasOwnProperty(CONSTANTS.DATABASE_ROOM)) {
                            data.socket = socket;
                        }

                        data.username = userId;
                        return storage.duplicateProject(data);
                    })
                    .then(function (newProject) {
                        callback(null, newProject.projectId);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getBranches', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getBranches(data);
                    })
                    .then(function (branches) {
                        callback(null, branches);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('createTag', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.createTag(data);
                    })
                    .then(function () {
                        callback(null);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('deleteTag', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.deleteTag(data);
                    })
                    .then(function () {
                        callback(null);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getTags', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getTags(data);
                    })
                    .then(function (tags) {
                        callback(null, tags);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getCommits', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getCommits(data);
                    })
                    .then(function (commits) {
                        callback(null, commits);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getHistory', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getHistory(data);
                    })
                    .then(function (commits) {
                        callback(null, commits);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getLatestCommitData', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getLatestCommitData(data);
                    })
                    .then(function (commitData) {
                        callback(null, commitData);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('getCommonAncestorCommit', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getCommonAncestorCommit(data);
                    })
                    .then(function (commonCommitHash) {
                        callback(null, commonCommitHash);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            //worker commands
            socket.on('simpleRequest', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        data.userId = userId;
                        data.socketId = socket.id;

                        if (gmeConfig.authentication.enable === true) {
                            return gmeAuth.regenerateJWToken(data.webgmeToken);
                        }
                    })
                    .then(function (newToken) {
                        data.webgmeToken = newToken;
                        workerManager.request(data, callback); //FIXME: Q ninvoke!
                    })
                    .catch(function (err) {
                        if (typeof err === 'string') {
                            //FIXME: server-worker manager should return errors.
                            callback(err);
                            return;
                        }
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('simpleQuery', function (workerId, data, callback) {
                getUserIdFromToken(socket, data.webgmeToken)
                    .then(function (userId) {
                        data.userId = userId;
                        data.socketId = socket.id;

                        if (gmeConfig.authentication.enable === true) {
                            return gmeAuth.regenerateJWToken(data.webgmeToken);
                        }
                    })
                    .then(function (newToken) {
                        data.webgmeToken = newToken;
                        workerManager.query(workerId, data, callback); //FIXME: Q ninvoke!
                    })
                    .catch(function (err) {
                        if (typeof err === 'string') {
                            //FIXME: server-worker manager should return errors.
                            callback(err);
                            return;
                        }
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('notification', function (data, callback) {
                getUserIdFromToken(socket, data && data.webgmeToken)
                    .then(function (userId) {
                        logger.debug('Incoming notification from', userId, {metadata: data});
                        data.userId = userId;
                        data.socketId = socket.id;
                        delete data.webgmeToken;

                        if (data.type === CONSTANTS.PLUGIN_NOTIFICATION) {
                            if (data.notification.toBranch &&
                                typeof data.projectId === 'string' && typeof data.branchName === 'string') {
                                webSocket.to(data.projectId + CONSTANTS.ROOM_DIVIDER + data.branchName)
                                    .emit(CONSTANTS.NOTIFICATION, data);
                            } else if (data.originalSocketId) {
                                webSocket.to(data.originalSocketId).emit(CONSTANTS.NOTIFICATION, data);
                            } else {
                                throw new Error('PLUGIN_NOTIFICATION requires provided originalSocketId to emit to.');
                            }
                        } else if (data.type === CONSTANTS.ADD_ON_NOTIFICATION) {
                            socket.broadcast.to(data.projectId + CONSTANTS.ROOM_DIVIDER + data.branchName)
                                .emit(CONSTANTS.NOTIFICATION, data);
                        } else if (data.type === CONSTANTS.CLIENT_STATE_NOTIFICATION) {
                            socket.broadcast.to(data.projectId + CONSTANTS.ROOM_DIVIDER + data.branchName)
                                .emit(CONSTANTS.NOTIFICATION, data);
                        } else {
                            throw new Error('Unknown notification type: "' + data.type + '"');
                        }
                    })
                    .then(function () {
                        callback(null);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });
        });
    };

    this.stop = function () {
        //disconnect clients
        var socketIds;
        if (webSocket) {
            socketIds = Object.keys(webSocket.sockets.connected);
            socketIds.forEach(function (socketId) {
                webSocket.sockets.connected[socketId].disconnect();
            });
            webSocket = null;
        }
    };
}

module.exports = WebSocket;