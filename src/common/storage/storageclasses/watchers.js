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
    }

    StorageWatcher.prototype.watchDatabase = function (eventHandler) {
        this.logger.debug('watchDatabase - handler added');
        this.webSocket.addEventListener(CONSTANTS.PROJECT_DELETED, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.PROJECT_CREATED, eventHandler);
        this.watchers.database += 1;
        this.logger.debug('Nbr of database watchers:', this.watchers.database);
        if (this.watchers.database === 1) {
            this.logger.debug('First watcher will enter database room.');
            this.webSocket.watchDatabase({join: true});
        }
    };

    StorageWatcher.prototype.unwatchDatabase = function (eventHandler) {
        this.logger.debug('unwatchDatabase - handler will be removed');
        this.logger.debug('Nbr of database watchers (before removal):', this.watchers.database);
        this.webSocket.removeEventListener(CONSTANTS.PROJECT_DELETED, eventHandler);
        this.webSocket.removeEventListener(CONSTANTS.PROJECT_CREATED, eventHandler);
        this.watchers.database -= 1;
        if (this.watchers.database === 0) {
            this.logger.debug('No more watchers will exit database room.');
            this.webSocket.watchDatabase({join: false});
        } else if (this.watchers.database < 0) {
            this.logger.error('Number of database watchers became negative!');
        }
    };

    StorageWatcher.prototype.watchProject = function (projectName, eventHandler) {
        this.logger.debug('watchProject - handler added for project', projectName);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_DELETED + projectName, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_CREATED + projectName, eventHandler);
        this.webSocket.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED + projectName, eventHandler);

        this.watchers.projects[projectName] = this.watchers.projects.hasOwnProperty(projectName) ?
        this.watchers.projects[projectName] + 1 : 1;
        this.logger.debug('Nbr of watchers for project:', projectName, this.watchers.projects[projectName]);
        if (this.watchers.projects[projectName] === 1) {
            this.logger.debug('First watcher will enter project room:', projectName);
            this.webSocket.watchProject({projectName: projectName, join: true});
        }
    };

    StorageWatcher.prototype.unwatchProject = function (projectName, eventHandler) {
        this.logger.debug('unwatchProject - handler will be removed', projectName);
        this.logger.debug('Nbr of database watchers (before removal):', projectName,
            this.watchers.projects[projectName]);
        this.webSocket.removeEventListener(CONSTANTS.BRANCH_DELETED + projectName, eventHandler);
        this.webSocket.removeEventListener(CONSTANTS.BRANCH_CREATED + projectName, eventHandler);
        this.webSocket.removeEventListener(CONSTANTS.BRANCH_HASH_UPDATED + projectName, eventHandler);

        this.watchers.projects[projectName] = this.watchers.projects.hasOwnProperty(projectName) ?
        this.watchers.projects[projectName] - 1 : -1;
        if (this.watchers.projects[projectName] === 0) {
            this.logger.debug('No more watchers will exit project room:', projectName);
            delete this.watchers.projects[projectName];
            this.webSocket.watchProject({projectName: projectName, join: false});
        } else if (this.watchers.database < 0) {
            this.logger.error('Number of project watchers became negative!:', projectName);
        }
    };

    StorageWatcher.prototype._rejoinWatcherRooms = function () {
        var projectName;
        this.logger.debug('rejoinWatcherRooms');
        if (this.watchers.database > 0) {
            this.logger.debug('Rejoining database room.');
            this.webSocket.watchDatabase({join: true});
        }
        for (projectName in this.watchers.projects) {
            if (this.watchers.projects.hasOwnProperty(projectName) && this.watchers.projects[projectName] > 0) {
                this.logger.debug('Rejoining project room', projectName, this.watchers.projects[projectName]);
                this.webSocket.watchProject({projectName: projectName, join: true});
            }
        }
    };

    return StorageWatcher;
});