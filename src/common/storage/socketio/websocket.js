/*globals define*/
/*jshint browser: true, node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

// socket.io-client
//
define([
    'common/EventDispatcher',
    'common/storage/constants'
], function (EventDispatcher, CONSTANTS) {

    'use strict';

    function WebSocket(ioClient, mainLogger, gmeConfig) {
        var self = this,
            logger = mainLogger.fork('WebSocket'),
            forcedDisconnect,
            beenConnected = false;

        self.socket = null;
        self.userId = null;
        self.serverVersion = null;

        logger.debug('ctor');
        EventDispatcher.call(this);

        function wrapError(callback) {
            return function () {
                if (typeof arguments[0] === 'string') {
                    callback(new Error(arguments[0]), arguments[1]); // Add second argument for e.g. pluginResults
                } else {
                    callback.apply(null, arguments);
                }
            };
        }

        this.connect = function (networkHandler) {
            logger.debug('Connecting via ioClient.');
            forcedDisconnect = false;

            ioClient.connect(function (err, socket_) {
                if (err) {
                    networkHandler(err);
                    return;
                }
                self.socket = socket_;

                self.socket.on('connect', function () {
                    var i,
                        sendBufferSave = [];
                    if (beenConnected) {
                        logger.debug('Socket got reconnected.');

                        // #368
                        for (i = 0; i < self.socket.sendBuffer.length; i += 1) {
                            // Clear all makeCommits. If pushed - they would be emitted back to the socket.
                            if (self.socket.sendBuffer[i].data[0] === 'makeCommit') {
                                logger.debug('Removed makeCommit from sendBuffer...');
                            } else {
                                sendBufferSave.push(self.socket.sendBuffer[i]);
                            }
                        }
                        if (self.socket.receiveBuffer.length > 0) {
                            // TODO: In which cases is this applicable??
                            logger.debug('receiveBuffer not empty after reconnect');
                        }
                        self.socket.sendBuffer = sendBufferSave;
                        self.socket.emit('getConnectionInfo', {webgmeToken: ioClient.getToken()}, function (err, info) {
                            if (err) {
                                networkHandler(new Error('Could not get info on reconnect'));
                            } else {
                                if (self.serverVersion === info.serverVersion) {
                                    networkHandler(null, CONSTANTS.RECONNECTED);
                                } else {
                                    networkHandler(null, CONSTANTS.INCOMPATIBLE_CONNECTION);
                                }
                            }
                        });
                    } else {
                        logger.debug('Socket got connected for the first time.');
                        beenConnected = true;
                        self.socket.emit('getConnectionInfo', {webgmeToken: ioClient.getToken()}, function (err, info) {
                            if (err) {
                                networkHandler(new Error('Could not get info on connect'));
                            } else {
                                self.userId = info.userId || gmeConfig.authentication.guestAccount;
                                self.serverVersion = info.serverVersion;
                                networkHandler(null, CONSTANTS.CONNECTED);
                            }
                        });
                    }
                });

                self.socket.on('disconnect', function () {
                    logger.debug('Socket got disconnected!');
                    networkHandler(null, CONSTANTS.DISCONNECTED);

                    // When the server is shut-down the skipReconnect is set to false
                    // create a new socket connect.
                    if (self.socket.io.skipReconnect === true && forcedDisconnect === false) {
                        self.connect(networkHandler);
                    }
                });

                self.socket.on(CONSTANTS.JWT_ABOUT_TO_EXPIRE, function (data) {
                    data.etype = CONSTANTS.JWT_ABOUT_TO_EXPIRE;
                    logger.debug('JWT_ABOUT_TO_EXPIRE event', {metadata: data});
                    networkHandler(null, CONSTANTS.JWT_ABOUT_TO_EXPIRE);
                });

                self.socket.on(CONSTANTS.JWT_EXPIRED, function (data) {
                    data.etype = CONSTANTS.JWT_EXPIRED;
                    logger.debug('JWT_EXPIRED event', {metadata: data});
                    networkHandler(null, CONSTANTS.JWT_EXPIRED);
                });

                self.socket.on(CONSTANTS.PROJECT_DELETED, function (data) {
                    data.etype = CONSTANTS.PROJECT_DELETED;
                    logger.debug('PROJECT_DELETED event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.PROJECT_DELETED, data);
                });

                self.socket.on(CONSTANTS.PROJECT_CREATED, function (data) {
                    data.etype = CONSTANTS.PROJECT_CREATED;
                    logger.debug('PROJECT_CREATED event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.PROJECT_CREATED, data);
                });

                self.socket.on(CONSTANTS.BRANCH_CREATED, function (data) {
                    data.etype = CONSTANTS.BRANCH_CREATED;
                    logger.debug('BRANCH_CREATED event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.BRANCH_CREATED + data.projectId, data);
                });

                self.socket.on(CONSTANTS.BRANCH_DELETED, function (data) {
                    data.etype = CONSTANTS.BRANCH_DELETED;
                    logger.debug('BRANCH_DELETED event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.BRANCH_DELETED + data.projectId, data);
                });

                self.socket.on(CONSTANTS.BRANCH_HASH_UPDATED, function (data) {
                    data.etype = CONSTANTS.BRANCH_HASH_UPDATED;
                    logger.debug('BRANCH_HASH_UPDATED event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED + data.projectId, data);
                });

                self.socket.on(CONSTANTS.TAG_CREATED, function (data) {
                    data.etype = CONSTANTS.TAG_CREATED;
                    logger.debug('TAG_CREATED event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.TAG_CREATED + data.projectId, data);
                });

                self.socket.on(CONSTANTS.TAG_DELETED, function (data) {
                    data.etype = CONSTANTS.TAG_DELETED;
                    logger.debug('TAG_DELETED event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.TAG_DELETED + data.projectId, data);
                });

                self.socket.on(CONSTANTS.BRANCH_UPDATED, function (data) {
                    logger.debug('BRANCH_UPDATED event', {metadata: data});
                    self.dispatchEvent(self.getBranchUpdateEventName(data.projectId, data.branchName), data);
                });

                self.socket.on(CONSTANTS.NOTIFICATION, function (data) {
                    logger.debug('NOTIFICATION event', {metadata: data});
                    self.dispatchEvent(CONSTANTS.NOTIFICATION, data);
                });
            });
        };

        this.disconnect = function () {
            forcedDisconnect = true;
            self.socket.disconnect();
            beenConnected = false; //This is a forced disconnect from the storage and all listeners are removed
        };

        // watcher functions
        this.watchDatabase = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('watchDatabase', data, wrapError(callback));
        };

        this.watchProject = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('watchProject', data, wrapError(callback));
        };

        this.watchBranch = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('watchBranch', data, wrapError(callback));
        };

        // model editing functions
        this.openProject = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('openProject', data, wrapError(callback));
        };

        this.closeProject = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('closeProject', data, wrapError(callback));
        };

        this.openBranch = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('openBranch', data, wrapError(callback));
        };

        this.closeBranch = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('closeBranch', data, wrapError(callback));
        };

        this.makeCommit = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('makeCommit', data, wrapError(callback));
        };

        this.loadObjects = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('loadObjects', data, wrapError(callback));
        };

        this.loadPaths = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('loadPaths', data, wrapError(callback));
        };

        this.setBranchHash = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('setBranchHash', data, wrapError(callback));
        };

        this.getBranchHash = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getBranchHash', data, wrapError(callback));
        };

        // REST like functions
        this.getProjects = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getProjects', data, wrapError(callback));
        };

        this.deleteProject = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('deleteProject', data, wrapError(callback));
        };

        this.createProject = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('createProject', data, wrapError(callback));
        };

        this.transferProject = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('transferProject', data, wrapError(callback));
        };

        this.duplicateProject = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('duplicateProject', data, wrapError(callback));
        };

        this.getBranches = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getBranches', data, wrapError(callback));
        };

        this.createTag = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('createTag', data, wrapError(callback));
        };

        this.deleteTag = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('deleteTag', data, wrapError(callback));
        };

        this.getTags = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getTags', data, wrapError(callback));
        };

        this.getCommits = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getCommits', data, wrapError(callback));
        };

        this.getHistory = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getHistory', data, wrapError(callback));
        };

        this.getLatestCommitData = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getLatestCommitData', data, wrapError(callback));
        };

        this.getCommonAncestorCommit = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('getCommonAncestorCommit', data, wrapError(callback));
        };

        //temporary simple request / result functions
        this.simpleRequest = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('simpleRequest', data, wrapError(callback));
        };

        this.simpleQuery = function (workerId, data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('simpleQuery', workerId, data, wrapError(callback));
        };

        this.sendNotification = function (data, callback) {
            data.webgmeToken = ioClient.getToken();
            self.socket.emit('notification', data, wrapError(callback));
        };

        // Helper functions
        this.getBranchUpdateEventName = function (projectId, branchName) {
            return CONSTANTS.BRANCH_UPDATED + projectId + CONSTANTS.ROOM_DIVIDER + branchName;
        };
    }

    WebSocket.prototype = Object.create(EventDispatcher.prototype);
    WebSocket.prototype.constructor = WebSocket;

    return WebSocket;
});