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
            beenConnected = false;

        self.socket = null;
        self.userId = null;

        logger.debug('ctor');
        EventDispatcher.call(this);

        this.connect = function (networkHandler) {
            logger.debug('Connecting via ioClient.');
            ioClient.connect(function (err, socket_) {
                if (err) {
                    networkHandler(err);
                    return;
                }
                self.socket = socket_;

                self.socket.on('connect', function () {
                    if (beenConnected) {
                        logger.debug('Socket got reconnected.');
                        networkHandler(null, CONSTANTS.RECONNECTED);
                    } else {
                        logger.debug('Socket got connected for the first time.');
                        beenConnected = true;
                        self.socket.emit('getUserId', function (err, userId) {
                            if (err) {
                                self.userId = gmeConfig.authentication.guestAccount;
                                logger.error('Error getting user id setting to default', err, self.userId);
                            } else {
                                self.userId = userId;
                            }
                            networkHandler(null, CONSTANTS.CONNECTED);
                        });
                    }
                });

                self.socket.on('disconnect', function () {
                    logger.debug('Socket got disconnected!');
                    networkHandler(null, CONSTANTS.DISCONNECTED);
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

                self.socket.on(CONSTANTS.BRANCH_UPDATED, function (data) {
                    logger.debug('BRANCH_UPDATED event', {metadata: data});
                    self.dispatchEvent(self.getBranchUpdateEventName(data.projectId, data.branchName), data);
                });
            });
        };

        this.disconnect = function () {
            self.socket.disconnect();
            beenConnected = false; //This is a forced disconnect from the storage and all listeners are removed
        };

        // watcher functions
        this.watchDatabase = function (data, callback) {
            self.socket.emit('watchDatabase', data, callback);
        };

        this.watchProject = function (data, callback) {
            self.socket.emit('watchProject', data, callback);
        };

        this.watchBranch = function (data, callback) {
            self.socket.emit('watchBranch', data, callback);
        };

        // model editing functions
        this.openProject = function (data, callback) {
            self.socket.emit('openProject', data, callback);
        };

        this.closeProject = function (data, callback) {
            self.socket.emit('closeProject', data, callback);
        };

        this.openBranch = function (data, callback) {
            self.socket.emit('openBranch', data, callback);
        };

        this.closeBranch = function (data, callback) {
            self.socket.emit('closeBranch', data, callback);
        };

        this.makeCommit = function (data, callback) {
            self.socket.emit('makeCommit', data, callback);
        };

        this.loadObjects = function (data, callback) {
            self.socket.emit('loadObjects', data, callback);
        };

        this.setBranchHash = function (data, callback) {
            self.socket.emit('setBranchHash', data, callback);
        };

        // REST like functions
        this.getProjects = function (data, callback) {
            self.socket.emit('getProjects', data, callback);
        };

        this.deleteProject = function (data, callback) {
            self.socket.emit('deleteProject', data, callback);
        };

        this.createProject = function (data, callback) {
            self.socket.emit('createProject', data, callback);
        };

        this.getBranches = function (data, callback) {
            self.socket.emit('getBranches', data, callback);
        };

        this.getCommits = function (data, callback) {
            self.socket.emit('getCommits', data, callback);
        };

        this.getLatestCommitData = function (data, callback) {
            self.socket.emit('getLatestCommitData', data, callback);
        };

        this.getCommonAncestorCommit = function (data, callback) {
            self.socket.emit('getCommonAncestorCommit', data, callback);
        };

        //temporary simple request / result functions
        this.simpleRequest = function (data, callback) {
            self.socket.emit('simpleRequest', data, callback);
        };

        this.simpleResult = function (data, callback) {
            self.socket.emit('simpleResult', data, callback);
        };

        this.simpleQuery = function (workerId, data, callback) {
            self.socket.emit('simpleQuery', workerId, data, callback);
        };

        // Helper functions
        this.getBranchUpdateEventName = function (projectName, branchName) {
            return CONSTANTS.BRANCH_UPDATED + projectName + CONSTANTS.ROOM_DIVIDER + branchName;
        };
    }

    WebSocket.prototype = Object.create(EventDispatcher.prototype);
    WebSocket.prototype.constructor = WebSocket;

    return WebSocket;
});