/*globals define*/
/*jshint browser: true, node:true*/
/**
 * Provides watching-functionality of the database and specific projects.
 * Keeps a state of the registered watchers.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/constants', 'q'], function (CONSTANTS, Q) {
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
        var deferred = Q.defer();
        this.logger.debug('watchDatabase - handler added');
        this.webSocket.addEventListener(CONSTANTS.PROJECT_DELETED, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.PROJECT_CREATED, eventHandler);
        this.watchers.database += 1;
        this.logger.debug('Nbr of database watchers:', this.watchers.database);

        if (this.watchers.database === 1) {
            this.logger.debug('First watcher will enter database room.');
            this.webSocket.watchDatabase({join: true}, function (err) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve();
                }
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    StorageWatcher.prototype.unwatchDatabase = function (eventHandler, callback) {
        var deferred = Q.defer();

        this.logger.debug('unwatchDatabase - handler will be removed');
        this.logger.debug('Nbr of database watchers (before removal):', this.watchers.database);
        this.webSocket.removeEventListener(CONSTANTS.PROJECT_DELETED, eventHandler);
        this.webSocket.removeEventListener(CONSTANTS.PROJECT_CREATED, eventHandler);
        this.watchers.database -= 1;

        if (this.watchers.database === 0) {
            this.logger.debug('No more watchers will exit database room.');
            if (this.connected) {
                this.webSocket.watchDatabase({join: false}, function (err) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
            } else {
                deferred.resolve();
            }
        } else if (this.watchers.database < 0) {
            this.logger.error('Number of database watchers became negative!');
            deferred.reject(new Error('Number of database watchers became negative!'));
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    StorageWatcher.prototype.watchProject = function (projectId, eventHandler, callback) {
        var deferred = Q.defer();

        this.logger.debug('watchProject - handler added for project', projectId);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_DELETED + projectId, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_CREATED + projectId, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED + projectId, eventHandler);

        this.watchers.projects[projectId] = this.watchers.projects.hasOwnProperty(projectId) ?
        this.watchers.projects[projectId] + 1 : 1;
        this.logger.debug('Nbr of watchers for project:', projectId, this.watchers.projects[projectId]);
        if (this.watchers.projects[projectId] === 1) {
            this.logger.debug('First watcher will enter project room:', projectId);
            this.webSocket.watchProject({projectId: projectId, join: true}, function (err) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve();
                }
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    StorageWatcher.prototype.unwatchProject = function (projectId, eventHandler, callback) {
        var deferred = Q.defer();

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
                this.webSocket.watchProject({projectId: projectId, join: false}, function (err) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
            } else {
                deferred.resolve();
            }
        } else if (this.watchers.projects[projectId] < 0) {
            this.logger.error('Number of project watchers became negative!:', projectId);
            deferred.reject(new Error('Number of project watchers became negative!'));
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    StorageWatcher.prototype._rejoinWatcherRooms = function (callback) {
        var projectId,
            promises = [];

        this.logger.debug('rejoinWatcherRooms');
        if (this.watchers.database > 0) {
            this.logger.debug('Rejoining database room.');
            promises.push(Q.ninvoke(this.webSocket, 'watchDatabase', {join: true}));
        }

        for (projectId in this.watchers.projects) {
            if (this.watchers.projects.hasOwnProperty(projectId) && this.watchers.projects[projectId] > 0) {
                this.logger.debug('Rejoining project room', projectId, this.watchers.projects[projectId]);
                promises.push(Q.ninvoke(this.webSocket, 'watchProject', {projectId: projectId, join: true}));
            }
        }

        return Q.all(promises).nodeify(callback);
    };

    return StorageWatcher;
});