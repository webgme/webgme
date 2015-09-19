/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    BranchMonitor = require('./branchmonitor'),
    EventDispatcher = requireJS('common/EventDispatcher'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    Storage = requireJS('common/storage/nodestorage');

function AddOnManager(projectId, mainLogger, gmeConfig) {
    var self = this,
        host = '127.0.0.1',
        logger = mainLogger.fork('AddOnManager'),
        storage,
        branchMonitors = {
            //branchName: {connectionCnt: {number}, monitor: {BranchMonitor}, stopTimeout: {id: {number},
            //deferred: {Promise}
        },
        initDeferred,
        closeDeferred;

    this.project = null;
    this.initRequested = false;

    this.monitorStoppedAndStarted = false;

    function removeMonitor(branchName) {
        delete branchMonitors[branchName];
        if (Object.keys(branchMonitors).length === 0 && self.monitorStoppedAndStarted === false) {
            self.dispatchEvent('NO_MONITORS');
        }
    }

    /**
     * Opens up the storage based on the webGMESessionId and opens and sets the project.
     *
     * @param webGMESessionId
     * @param callback
     */
    this.initialize = function (webGMESessionId, callback) {
        if (self.initRequested === false) {
            initDeferred = Q.defer();
            self.initRequested = true;

            storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig);
            storage.open(function (networkStatus) {
                if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
                    storage.openProject(projectId, function (err, project, branches, rights) {
                        if (err) {
                            initDeferred.reject(err);
                            return;
                        }

                        self.project = project;

                        if (rights.write === false) {
                            logger.warn('AddOnManager for project [' + projectId +
                                '] initialized without write access.');
                        }

                        self.initialized = true;
                        initDeferred.resolve();
                    });
                } else {
                    logger.error(new Error('Connection problems' + networkStatus));
                    initDeferred.reject(new Error('Problems connecting to the webgme server, network status: ' +
                        networkStatus));
                }
            });
        }

        return initDeferred.promise.nodeify(callback);
    };

    this.monitorBranch = function (webGMESessionId, branchName, callback) {
        var monitor = branchMonitors[branchName],
            deferred = Q.defer();

        function startNewMonitor() {
            monitor = {
                connectionCnt: 1,
                stopTimeoutId: null,
                monitor: new BranchMonitor(webGMESessionId, storage, self.project, branchName, gmeConfig, logger)
            };

            branchMonitors[branchName] = monitor;
            deferred.promise = monitor.start();
        }

        if (monitor) {
            monitor.connectionCnt += 1;
            logger.debug('monitorBranch - connection counter [prev, now]',
                monitor.connectionCnt - 1, monitor.connectionCnt);

            if (monitor.connectionCnt === 2) {
                // The monitor is in stopping stage
                if (monitor.stopTimeout) {
                    // The timeout had not been triggered yet.
                    clearTimeout(monitor.stopTimeout.id);

                    monitor.stopTimeout.deferred.resolve(monitor.connectionCnt);
                    monitor.stopTimeout = null;
                    deferred.promise = monitor.start();
                } else {
                    // [Rare case]
                    // We cannot simply remove the monitor before it has closed the branch,
                    // there for we need to register on the stop promise and start a new monitor (open the branch)
                    // once it has resolved.
                    // (For bookkeeping of the addOnManagers it is not the same since they create a new storage.)
                    self.inStoppedAndStarted = true;
                    monitor.stop()
                        .then(function () {
                            self.inStoppedAndStarted = false;
                            if (branchMonitors[branchName]) {
                                logger.error('Monitor was not removed', branchMonitors[branchName]);
                                deferred.reject(new Error('Monitor was not removed!'));
                            } else {
                                startNewMonitor();
                            }
                        })
                        .catch(deferred.reject);
                }
            } else if (monitor.connectionCnt > 2) {
                deferred.promise = monitor.start();
            } else {
                deferred.reject(new Error('Unexpected connection count > 2' + monitor.connectionCnt));
            }
        } else {
            startNewMonitor();
        }

        return deferred.promise.nodeify(callback);
    };

    this.unMonitorBranch = function (webGMESessionId, branchName, callback) {
        var deferred = Q.defer(),
            monitor = branchMonitors[branchName];

        if (!monitor) {
            deferred.resolve(-1);
        } else {
            monitor.connectionCnt -= 1;
            logger.debug('unMonitorBranch - connection counter [prev, now]',
                monitor.connectionCnt + 1, monitor.connectionCnt);
            if (monitor.connectionCnt === 1) {
                // One connection is the monitor itself.
                if (monitor.stopTimeout === null) {
                    monitor.stopTimeout = {
                        deferred: deferred,
                        id: setTimeout(function () {
                            monitor.stopTimeout = null;
                            monitor.stop()
                                .then(function () {
                                    removeMonitor(branchName);
                                    deferred.resolve(-1);
                                })
                                .catch(deferred.reject);

                        }, gmeConfig.addOn.monitorTimeout)
                    };
                } else if (monitor.connectionCnt > 1) {
                    deferred.resolve(monitor.connectionCnt);
                } else {
                    deferred.reject(new Error('Unexpected connection count < 1' + monitor.connectionCnt));
                }
            } else {
                deferred.resolve(monitor.connectionCnt);
            }
        }

        return deferred.promise.nodeify(callback);
    };

    this.queryAddOn = function (webGMESessionId, branchName, addOnId, queryParams, callback) {
        var deferred = Q.defer();

        return deferred.promise.nodeify(callback);
    };

    this.close = function (callback) {
        //TODO: (Stop all monitors) and close the project and storage.
    };
}


// Inherit from the EventDispatcher
AddOnManager.prototype = Object.create(EventDispatcher.prototype);
AddOnManager.prototype.constructor = AddOnManager;

module.exports = AddOnManager;