/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    BranchMonitor = require('./branchmonitor'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    Storage = requireJS('common/storage/nodestorage');

function AddOnManager(webGMESessionId, projectId, mainLogger, gmeConfig) {
    var self = this,
        host = '127.0.0.1',
        logger = mainLogger.fork('AddOnManager'),
        storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig),
        branchMonitors = {
            //branchName: {connectionCnt: {number}, monitor: {BranchMonitor}}
        };

    this.project = null;

    /**
     * Opens up the storage based on the webGMESessionId and opens and sets the project.
     *
     * @param callback
     */
    this.initialize = function (callback) {
        var deferred = Q.defer();
        storage.open(function (networkStatus) {
            if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
                storage.openProject(projectId, function (err, project, branches, rights) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }

                    self.project = project;

                    if (rights.write === false) {
                        logger.warn('AddOnManager for project [' + projectId + '] initialized without write access.');
                    }

                    deferred.resolve(null);
                });
                callback(null);
            } else {
                deferred.reject(new Error('Problems connecting to the webgme server, network state: ' + networkStatus));
            }
        });

        return deferred.promise.nodeify(callback);
    };

    function getBranchMonitor(branchName, callback) {
        var deferred = Q.defer(),
            monitor;

        if (branchMonitors[branchName]) {
            deferred.resolve(branchMonitors[branchName]);
        } else {
            monitor = new BranchMonitor(webGMESessionId, self.project, branchName, gmeConfig, logger);
        }

        return deferred.promise.nodeify(callback);
    }

    this.monitorBranch = function (branchName, callback) {
        var monitor = branchMonitors[branchName];
        if (monitor) {

        } else {

        }
    };

    this.queryAddOn = function (addOnName, branchName, queryParams, callback) {
        var deferred = Q.defer();



        return deferred.promise.nodeify(callback);
    };

    this.close = function (callback) {
        var addOnNames = Object.keys(branchMonitors);

        logger.debug('closing all running addOns', addOnNames);

        return Q.all(addOnNames.map(function (name) {
            return self.stopAddOn(name);
        }))
            .then(function () {
                return Q.ninvoke(storage, 'close');
            })
            .nodeify(callback);
    };
}

module.exports = AddOnManager;