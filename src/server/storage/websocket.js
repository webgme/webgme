/*globals requireJS*/
/*jshint node:true, newcap: false*/
/**
 * @module Server:WebSockets
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var io = require('socket.io'),
    Q = require('q'),
    COOKIE = require('cookie-parser'),
    URL = requireJS('common/util/url'),
    CONSTANTS = requireJS('common/storage/constants'),
    ROOM_DIV = CONSTANTS.ROOM_DIVIDER, // TODO: Add prefixes
    DATABASE_ROOM = CONSTANTS.DATABASE_ROOM;

function WebSocket(storage, mainLogger, gmeConfig, gmeAuth, workerManager) {
    var logger = mainLogger.fork('WebSocket'),
        webSocket;
    logger.debug('ctor');

    function getSessionIdFromSocket(socket) {
        var sessionId,
            handshakeData = socket.handshake;

        if (handshakeData) {
            if (handshakeData.query &&
                handshakeData.query.webGMESessionId &&
                handshakeData.query.webGMESessionId !== 'undefined') {
                // TODO: Isn't this branch deprecated?
                sessionId = handshakeData.query.webGMESessionId;
            } else if (handshakeData.query &&
                handshakeData.query[gmeConfig.server.sessionCookieId] &&
                handshakeData.query[gmeConfig.server.sessionCookieId] !== 'undefined') {
                sessionId = COOKIE.signedCookie(handshakeData.query[gmeConfig.server.sessionCookieId],
                    gmeConfig.server.sessionCookieSecret);
            } else if (gmeConfig.server.sessionCookieId &&
                gmeConfig.server.sessionCookieSecret &&
                handshakeData.headers && handshakeData.headers.cookie) {
                //we try to dig it from the signed cookie
                sessionId = COOKIE.signedCookie(
                    URL.parseCookie(handshakeData.headers.cookie)[gmeConfig.server.sessionCookieId],
                    gmeConfig.server.sessionCookieSecret);
            }
        }
        return sessionId;
    }

    function getUserIdFromSocket(socket, callback) {
        var sessionId = getSessionIdFromSocket(socket);
        logger.debug('sessionId for socket', sessionId);
        return gmeAuth.getUserIdBySession(sessionId)
            .nodeify(callback);
    }

    function projectAccess(socket, projectId, callback) {
        var userId = userId;
        return getUserIdFromSocket(socket)
            .then(function (userId) {
                return gmeAuth.getProjectAuthorizationByUserId(userId, projectId);
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

    storage.addEventListener(CONSTANTS.PROJECT_DELETED, function (_s, data) {
        getEmitter(data).to(DATABASE_ROOM).emit(CONSTANTS.PROJECT_DELETED, data);
    });

    storage.addEventListener(CONSTANTS.PROJECT_CREATED, function (_s, data) {
        getEmitter(data).to(DATABASE_ROOM).emit(CONSTANTS.PROJECT_CREATED, data);
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

    storage.addEventListener(CONSTANTS.BRANCH_UPDATED, function (_s, data) {
        getEmitter(data).to(data.projectId + ROOM_DIV + data.branchName).emit(CONSTANTS.BRANCH_UPDATED, data);
    });

    this.start = function (server) {
        logger.debug('start');

        webSocket = io.listen(server || gmeConfig.server.port, {
            transports: gmeConfig.socketIO.transports
        });

        logger.debug('listening');

        webSocket.use(function (socket, next) {
            //either the html header contains some webgme signed cookie with the sessionID
            // or the data has a webGMESession member which should also contain the sessionID
            // - currently the same as the cookie
            if (gmeConfig.authentication.enable === true) {
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        if (typeof userId === 'string') {
                            next();
                        } else {
                            throw new Error('Could not authenticate socket.');
                        }
                    })
                    .catch(function (err) {
                        next(err);
                    });
            } else {
                next();
            }
        });

        webSocket.on('connection', function (socket) {
            logger.debug('New socket connected', socket.id);

            // Inject into socket.onclose in order to see which rooms socket was in.
            var originalOnClose = socket.onclose;
            socket.onclose = function () {
                var i,
                    projectIdBranchName;
                logger.info('onclose: socket was in rooms: ', socket.rooms);
                for (i = 0; i < socket.rooms.length; i += 1) {
                    if (socket.rooms[i].indexOf(ROOM_DIV) > -1) {
                        logger.info('Socket was in branchRoom', socket.rooms[i]);
                        projectIdBranchName = socket.rooms[i].split(ROOM_DIV);
                        workerManager.socketRoomChange(projectIdBranchName[0], projectIdBranchName[1], false);
                    }
                }

                originalOnClose.apply(socket, arguments);
            };

            socket.on('disconnect', function () {
                // When this event is triggered, the disconnect socket has already left all rooms.
                logger.info('disconnect socket is in rooms: ', socket.rooms);
            });

            socket.on('getUserId', function (callback) {
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        if (typeof userId === 'string') {
                            callback(null, userId);
                        } else {
                            throw new Error('Could not get userId');
                        }
                    }).catch(function (err) {
                        callback(err.message);
                    });
            });

            // watcher functions
            socket.on('watchDatabase', function (data, callback) {
                logger.debug('watchDatabase', {metadata: data});
                if (data.join) {
                    socket.join(DATABASE_ROOM);
                } else {
                    socket.leave(DATABASE_ROOM);
                }
                callback(null);
            });

            socket.on('watchProject', function (data, callback) {
                logger.debug('watchProject', {metadata: data});

                projectAccess(socket, data.projectId)
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
                projectAccess(socket, data.projectId)
                    .then(function (access) {
                        var roomName = data.projectId + ROOM_DIV + data.branchName;
                        if (data.join) {
                            if (access.read) {
                                workerManager.socketRoomChange(data.projectId, data.branchName, true);
                                socket.join(roomName);
                                logger.debug('socket joined room', roomName);
                                callback(null);
                            } else {
                                logger.warn('socket not authorized to join room', roomName);
                                callback('No read access for ' + data.projectId);
                            }
                        } else {
                            workerManager.socketRoomChange(data.projectId, data.branchName, false);
                            socket.leave(roomName);
                            logger.debug('socket left room', roomName);
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

            // model editing functions
            socket.on('openProject', function (data, callback) {
                var branches;
                logger.debug('openProject', {metadata: data});
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getBranches(data);
                    })
                    .then(function (branches_) {
                        branches = branches_;
                        return projectAccess(socket, data.projectId);
                    })
                    .then(function (access) {
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
                callback();
            });

            socket.on('openBranch', function (data, callback) {
                logger.debug('openBranch', {metadata: data});
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getLatestCommitData(data);
                    })
                    .then(function (commitData) {
                        // Here we know the user has rights to the project.
                        workerManager.socketRoomChange(data.projectId, data.branchName, true);
                        socket.join(data.projectId + ROOM_DIV + data.branchName);

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

            socket.on('closeBranch', function (data, callback) {
                logger.debug('closeBranch', {metadata: data});
                socket.leave(data.projectId + ROOM_DIV + data.branchName);
                callback();
            });

            socket.on('makeCommit', function (data, callback) {
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        if (socket.rooms.indexOf(data.projectId + ROOM_DIV + data.branchName) > -1) {
                            data.socket = socket;
                        }
                        data.username = userId;
                        return storage.makeCommit(data);
                    })
                    .then(function (status) {
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

            socket.on('loadObjects', function (data, callback) {
                getUserIdFromSocket(socket)
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

            socket.on('setBranchHash', function (data, callback) {
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        if (socket.rooms.indexOf(data.projectId) > -1) {
                            data.socket = socket;
                        }
                        data.username = userId;
                        return storage.setBranchHash(data);
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

            socket.on('getBranchHash', function (data, callback) {
                getUserIdFromSocket(socket)
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
                getUserIdFromSocket(socket)
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
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        if (socket.rooms.indexOf(DATABASE_ROOM) > -1) {
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
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        if (socket.rooms.indexOf(DATABASE_ROOM) > -1) {
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
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        if (socket.rooms.indexOf(DATABASE_ROOM) > -1) {
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

            socket.on('getBranches', function (data, callback) {
                getUserIdFromSocket(socket)
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

            socket.on('getCommits', function (data, callback) {
                getUserIdFromSocket(socket)
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

            socket.on('getLatestCommitData', function (data, callback) {
                getUserIdFromSocket(socket)
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

            socket.on('getCommonAncestorCommit', function (parameters, callback) {
                getUserIdFromSocket(socket).
                    then(function (userId) {
                        parameters.username = userId;
                        return storage.getCommonAncestorCommit(parameters);
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
            socket.on('simpleRequest', function (parameters, callback) {
                getUserIdFromSocket(socket).
                    then(function (userId) {
                        parameters.userId = userId;
                        parameters.webGMESessionId = getSessionIdFromSocket(socket);
                        workerManager.request(parameters, callback);
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

            socket.on('simpleQuery', function (workerId, parameters, callback) {
                getUserIdFromSocket(socket).
                    then(function (userId) {
                        parameters.userId = userId;
                        parameters.webGMESessionId = getSessionIdFromSocket(socket);
                        workerManager.query(workerId, parameters, callback);
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
        });
    };

    this.stop = function () {
        //disconnect clients
        if (webSocket) {
            webSocket.sockets.sockets.forEach(function (socket) {
                socket.disconnect();
            });
            webSocket = null;
        }
    };
}

module.exports = WebSocket;