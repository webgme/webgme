/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var io = require('socket.io'),
    CONSTANTS = requireJS('common/storage/constants'),
    ROOM_DIV = CONSTANTS.ROOM_DIVIDER, // TODO: Add prefixes
    DATABASE_ROOM = CONSTANTS.DATABASE_ROOM;

function WebSocket(storage, mainLogger, gmeConfig) {
    var logger = mainLogger.fork('WebSocket'),
        webSocket;
    logger.debug('ctor');

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
        getEmitter(data).emitter.to(data.projectName).emit(CONSTANTS.BRANCH_DELETED, data);
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

        webSocket.on('connection', function (socket) {
            logger.debug('New socket connected', socket.id);
            // watcher functions
            socket.on('watchDatabase', function (data) {
                if (data.join) {
                    socket.join(DATABASE_ROOM);
                } else {
                    socket.leave(DATABASE_ROOM);
                }
            });

            socket.on('watchProject', function (data) {
                logger.debug('watchProject', data.projectName);
                if (data.join) {
                    //TODO: Check if user is authorized to read the project.
                    socket.join(data.projectName);
                    logger.debug('socket joined room', data.projectName);
                } else {
                    socket.leave(data.projectName);
                    logger.debug('socket left room', data.projectName);
                }
            });

            socket.on('watchBranch', function (data) {
                var roomName = data.projectName + ROOM_DIV + data.branchName;
                logger.debug('watchBranch', data.projectName, data.branchName);
                if (data.join) {
                    //TODO: Check if user is authorized to read the project.
                    socket.join(roomName);
                    logger.debug('socket joined room', roomName);
                } else {
                    socket.leave(roomName);
                    logger.debug('socket left room', roomName);
                }
            });

            // model editing functions
            socket.on('openProject', function (data, callback) {
                storage.getBranches(data)
                    .then(function (branches) {
                        callback(null, branches);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.toString());
                        }
                    });
            });

            socket.on('closeProject', function (data, callback) {
                socket.leave(data.projectName);
                //if (data.branchName) {
                //    socket.leave(data.projectName + ROOM_DIV + data.branchName);
                //}
                callback();
            });

            socket.on('openBranch', function (data, callback) {
                storage.getLatestCommitData(data)
                    .then(function (commitData) {
                        socket.join(data.projectName + ROOM_DIV + data.branchName);
                        callback(null, commitData);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.toString());
                        }
                    });
            });

            socket.on('closeBranch', function (data, callback) {
                logger.debug('closeBranch', data.projectName, data.branchName, socket.id);
                socket.leave(data.projectName + ROOM_DIV + data.branchName);
                callback();
            });

            socket.on('makeCommit', function (data, callback) {
                if (socket.rooms.indexOf(data.projectName + ROOM_DIV + data.branchName) > -1) {
                    data.socket = socket;
                }
                storage.makeCommit(data, function (err, status) {
                    callback(err, status);
                });
            });

            socket.on('loadObjects', function (data, callback) {
                storage.loadObjects(data, function (err, result) {
                    callback(err, result);
                });
            });

            socket.on('setBranchHash', function (data, callback) {
                if (socket.rooms.indexOf(data.projectName) > -1) {
                    data.socket = socket;
                }
                storage.setBranchHash(data, function (err) {
                    callback(err);
                });
            });

            // REST like functions
            socket.on('getProjectNames', function (data, callback) {
                storage.getProjectNames(data)
                    .then(function (projectNames) {
                        callback(null, projectNames);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.toString());
                        }
                    });
            });

            socket.on('deleteProject', function (data, callback) {
                if (socket.rooms.indexOf(DATABASE_ROOM) > -1) {
                    data.socket = socket;
                }
                storage.deleteProject(data)
                    .then(function () {
                        callback(null);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.toString());
                        }
                    });
            });

            socket.on('createProject', function (data, callback) {
                if (socket.rooms.indexOf(DATABASE_ROOM) > -1) {
                    data.socket = socket;
                }
                storage.createProject(data, callback);
            });

            socket.on('getBranches', function (data, callback) {
                storage.getBranches(data)
                    .then(function (branches) {
                        callback(null, branches);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.toString());
                        }
                    });
            });

            socket.on('getCommits', function (data, callback) {
                storage.getCommits(data)
                    .then(function (commits) {
                        callback(null, commits);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.toString());
                        }
                    });
            });

            socket.on('getLatestCommitData', function (data, callback) {
                storage.getLatestCommitData(data)
                    .then(function (commitData) {
                        callback(null, commitData);
                    })
                    .catch(function (err) {
                        if (gmeConfig.debug) {
                            callback(err.stack);
                        } else {
                            callback(err.toString());
                        }
                    });
            });
        });
    };

    this.stop = function (callback) {

    };
}

module.exports = WebSocket;