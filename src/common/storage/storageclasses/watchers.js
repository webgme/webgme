/*globals define*/
/*jshint browser: true, node:true*/
/**
 * Provides watching-functionality of the database and specific projects.
 * Keeps a state of the registered watchers.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/constants'], function (CONSTANTS) {
    'use strict';

    function StorageWatcher(webSocket, logger, gmeConfig) {
        // watcher counters determining when to join/leave a room on the sever
        this.watchers = {
            database: 0,
            projects: {}
        };
        this.webSocket = webSocket;
        this.logger = this.logger || logger.fork('storage');
        this.gmeConfig = gmeConfig;
        this.logger.debug('StorageWatcher ctor');
        this.connected = false;
    }

    StorageWatcher.prototype.watchDatabase = function (eventHandler, callback) {
        this.logger.debug('watchDatabase - handler added');
        this.webSocket.addEventListener(CONSTANTS.PROJECT_DELETED, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.PROJECT_CREATED, eventHandler);
        this.watchers.database += 1;
        this.logger.debug('Nbr of database watchers:', this.watchers.database);
        if (this.watchers.database === 1) {
            this.logger.debug('First watcher will enter database room.');
            this.webSocket.watchDatabase({join: true}, callback);
        } else {
            callback(null);
        }
    };

    StorageWatcher.prototype.unwatchDatabase = function (eventHandler, callback) {
        this.logger.debug('unwatchDatabase - handler will be removed');
        this.logger.debug('Nbr of database watchers (before removal):', this.watchers.database);
        this.webSocket.removeEventListener(CONSTANTS.PROJECT_DELETED, eventHandler);
        this.webSocket.removeEventListener(CONSTANTS.PROJECT_CREATED, eventHandler);
        this.watchers.database -= 1;
        if (this.watchers.database === 0) {
            this.logger.debug('No more watchers will exit database room.');
            if (this.connected) {
                this.webSocket.watchDatabase({join: false}, callback);
            } else {
                callback(null);
            }
        } else if (this.watchers.database < 0) {
            this.logger.error('Number of database watchers became negative!');
            callback(new Error('Number of database watchers became negative!'));
        } else {
            callback(null);
        }
    };

    StorageWatcher.prototype.watchProject = function (projectId, eventHandler, callback) {
        this.logger.debug('watchProject - handler added for project', projectId);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_DELETED + projectId, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_CREATED + projectId, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED + projectId, eventHandler);

        this.watchers.projects[projectId] = this.watchers.projects.hasOwnProperty(projectId) ?
        this.watchers.projects[projectId] + 1 : 1;
        this.logger.debug('Nbr of watchers for project:', projectId, this.watchers.projects[projectId]);
        if (this.watchers.projects[projectId] === 1) {
            this.logger.debug('First watcher will enter project room:', projectId);
            this.webSocket.watchProject({projectId: projectId, join: true}, callback);
        } else {
            callback(null);
        }
    };

    StorageWatcher.prototype.unwatchProject = function (projectId, eventHandler, callback) {
        this.logger.debug('unwatchProject - handler will be removed', projectId);
        this.logger.debug('Nbr of database watchers (before removal):', projectId,
            this.watchers.projects[projectId]);
        this.webSocket.removeEventListener(CONSTANTS.BRANCH_DELETED + projectId, eventHandler);
        this.webSocket.removeEventListener(CONSTANTS.BRANCH_CREATED + projectId, eventHandler);
        this.webSocket.removeEventListener(CONSTANTS.BRANCH_HASH_UPDATED + projectId, eventHandler);

        this.watchers.projects[projectId] = this.watchers.projects.hasOwnProperty(projectId) ?
        this.watchers.projects[projectId] - 1 : -1;
        if (this.watchers.projects[projectId] === 0) {
            this.logger.debug('No more watchers will exit project room:', projectId);
            delete this.watchers.projects[projectId];
            if (this.connected) {
                this.webSocket.watchProject({projectId: projectId, join: false}, callback);
            } else {
                callback(null);
            }
        } else if (this.watchers.projects[projectId] < 0) {
            this.logger.error('Number of project watchers became negative!:', projectId);
            callback(new Error('Number of project watchers became negative!'));
        } else {
            callback(null);
        }
    };

    StorageWatcher.prototype._rejoinWatcherRooms = function () {
        var self = this,
            projectId,
            callback = function (err) {
                //TODO: Add a callback here too.
                if (err) {
                    self.logger.error('problems rejoining watcher rooms', err);
                }
            };
        this.logger.debug('rejoinWatcherRooms');
        if (this.watchers.database > 0) {
            this.logger.debug('Rejoining database room.');
            this.webSocket.watchDatabase({join: true}, callback);
        }
        for (projectId in this.watchers.projects) {
            if (this.watchers.projects.hasOwnProperty(projectId) && this.watchers.projects[projectId] > 0) {
                this.logger.debug('Rejoining project room', projectId, this.watchers.projects[projectId]);
                this.webSocket.watchProject({projectId: projectId, join: true}, callback);
            }
        }
    };

    return StorageWatcher;
});