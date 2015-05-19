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

    function WebSocket(ioClient, mainLogger) {
        var self = this,
            logger = mainLogger.fork('WebSocket'),
            beenConnected = false,
            socket;

        logger.debug('ctor');
        EventDispatcher.call(this);

        this.connect = function (callback) {
            logger.debug('Connecting via ioClient.');
            ioClient.connect(function (err, socket_) {
                if (err) {
                    callback(err);
                    return;
                }
                socket = socket_;

                socket.on('connect', function () {
                    if (beenConnected) {
                        logger.debug('Socket got reconnected.');
                        callback(null, CONSTANTS.RECONNECTED);
                    } else {
                        logger.debug('Socket got connected for the first time.');
                        beenConnected = true;
                        callback(null, CONSTANTS.CONNECTED);
                    }
                });

                socket.on('disconnect', function () {
                    logger.debug('Socket got disconnected!');
                    callback(null, CONSTANTS.DISCONNECTED);
                });

                socket.on(CONSTANTS.PROJECT_DELETED, function (data) {
                    self.dispatchEvent(CONSTANTS.PROJECT_DELETED, data);
                });

                socket.on(CONSTANTS.PROJECT_CREATED, function (data) {
                    self.dispatchEvent(CONSTANTS.PROJECT_CREATED, data);
                });

                socket.on(CONSTANTS.BRANCH_CREATED, function (data) {
                    data.etype = CONSTANTS.BRANCH_CREATED;
                    self.dispatchEvent(CONSTANTS.BRANCH_CREATED + data.projectName, data);
                });

                socket.on(CONSTANTS.BRANCH_DELETED, function (data) {
                    self.dispatchEvent(CONSTANTS.BRANCH_DELETED + data.projectName, data);
                });

                socket.on(CONSTANTS.BRANCH_HASH_UPDATED, function (data) {
                    self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED + data.projectName, data);
                });

                socket.on(CONSTANTS.BRANCH_UPDATED, function (data) {
                    self.dispatchEvent(self.getBranchUpdateEventName(data.projectName, data.branchName), data);
                });
            });
        };

        this.disconnect = function () {
            socket.disconnect();
        };

        // watcher functions
        this.watchDatabase = function (data) {
            socket.emit('watchDatabase', data);
        };

        this.watchProject = function (data) {
            socket.emit('watchProject', data);
        };

        this.watchBranch = function (data) {
            socket.emit('watchBranch', data);
        };

        // model editing functions
        this.openProject = function (data, callback) {
            socket.emit('openProject', data, callback);
        };

        this.closeProject = function (data, callback) {
            socket.emit('closeProject', data, callback);
        };

        this.openBranch = function (data, callback) {
            socket.emit('openBranch', data, callback);
        };

        this.closeBranch = function (data, callback) {
            socket.emit('closeBranch', data, callback);
        };

        this.makeCommit = function (data, callback) {
            socket.emit('makeCommit', data, callback);
        };

        this.loadObjects = function (data, callback) {
            socket.emit('loadObjects', data, callback);
        };

        this.setBranchHash = function (data, callback) {
            socket.emit('setBranchHash', data, callback);
        };

        // REST like functions
        this.getProjectNames = function (data, callback) {
            socket.emit('getProjectNames', data, callback);
        };

        this.deleteProject = function (data, callback) {
            socket.emit('deleteProject', data, callback);
        };

        this.createProject = function (data, callback) {
            socket.emit('createProject', data, callback);
        };

        this.getBranches = function (data, callback) {
            socket.emit('getBranches', data, callback);
        };

        this.getCommits = function (data, callback) {
            socket.emit('getCommits', data, callback);
        };

        this.getLatestCommitData = function (data, callback) {
            socket.emit('getLatestCommitData', data, callback);
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