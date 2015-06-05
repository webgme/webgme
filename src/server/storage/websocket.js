/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var io = require('socket.io'),
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
        return gmeAuth.getUserIdBySession(getSessionIdFromSocket(socket))
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
        getEmitter(data).to(data.projectName).emit(CONSTANTS.BRANCH_DELETED, data);
    });

    storage.addEventListener(CONSTANTS.BRANCH_CREATED, function (_s, data) {
        getEmitter(data).to(data.projectName).emit(CONSTANTS.BRANCH_CREATED, data);
    });

    storage.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED, function (_s, data) {
        getEmitter(data).to(data.projectName).emit(CONSTANTS.BRANCH_HASH_UPDATED, data);
    });

    storage.addEventListener(CONSTANTS.BRANCH_UPDATED, function (_s, data) {
        getEmitter(data).to(data.projectName + ROOM_DIV + data.branchName).emit(CONSTANTS.BRANCH_UPDATED, data);
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
                if (data.join) {
                    //TODO: Check if user is authorized to read the project.
                    socket.join(data.projectName);
                    logger.debug('socket joined room', data.projectName);
                } else {
                    socket.leave(data.projectName);
                    logger.debug('socket left room', data.projectName);
                }
                callback(null);
            });

            socket.on('watchBranch', function (data, callback) {
                var roomName = data.projectName + ROOM_DIV + data.branchName;
                logger.debug('watchBranch', {metadata: data});
                if (data.join) {
                    //TODO: Check if user is authorized to read the project.
                    socket.join(roomName);
                    logger.debug('socket joined room', roomName);
                } else {
                    socket.leave(roomName);
                    logger.debug('socket left room', roomName);
                }
                callback(null);
            });

            // model editing functions
            socket.on('openProject', function (data, callback) {
                logger.debug('openProject', {metadata: data});
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

            socket.on('closeProject', function (data, callback) {
                logger.debug('closeProject', {metadata: data});
                //socket.leave(data.projectName);
                //if (data.branchName) {
                //    socket.leave(data.projectName + ROOM_DIV + data.branchName);
                //}
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
                        socket.join(data.projectName + ROOM_DIV + data.branchName);
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
                socket.leave(data.projectName + ROOM_DIV + data.branchName);
                callback();
            });

            socket.on('makeCommit', function (data, callback) {
                if (socket.rooms.indexOf(data.projectName + ROOM_DIV + data.branchName) > -1) {
                    data.socket = socket;
                }
                getUserIdFromSocket(socket)
                    .then(function (userId) {
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
                storage.loadObjects(data, function (err, result) {
                    // FIXME: different than other functions... catch(function (err) ...
                    callback(err, result);
                });
            });

            socket.on('setBranchHash', function (data, callback) {
                if (socket.rooms.indexOf(data.projectName) > -1) {
                    data.socket = socket;
                }
                storage.setBranchHash(data, function (err, result) {
                    // FIXME: different than other functions... catch(function (err) ...
                    callback(err, result);
                });
            });

            // REST like functions
            socket.on('getProjectNames', function (data, callback) {
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getProjectNames(data);
                    })
                    .then(function (projectNames) {
                        callback(null, projectNames);
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

            socket.on('getProjectsAndBranches', function (data, callback) {
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.getProjectsAndBranches(data);
                    })
                    .then(function (projectsWithBranches) {
                        callback(null, projectsWithBranches);
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
                if (socket.rooms.indexOf(DATABASE_ROOM) > -1) {
                    data.socket = socket;
                }
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.deleteProject(data);
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

            socket.on('createProject', function (data, callback) {
                if (socket.rooms.indexOf(DATABASE_ROOM) > -1) {
                    data.socket = socket;
                }
                getUserIdFromSocket(socket)
                    .then(function (userId) {
                        data.username = userId;
                        return storage.createProject(data);
                    })
                    .then(function (/*project*/) {
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

            //worker commands
            socket.on('simpleRequest', function (parameters, callback) {
                getUserIdFromSocket(socket).
                    then(function (userId) {
                        parameters.userId = userId;
                        parameters.webGMESessionId = getSessionIdFromSocket(socket);
                        workerManager.request(parameters, callback);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.message);
                        }
                    });
            });

            socket.on('simpleResult', function (resultId, callback) {
                getUserIdFromSocket(socket).
                    then(function (/*userId*/) {
                        workerManager.result(resultId, callback);
                    })
                    .catch(function (err) {
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