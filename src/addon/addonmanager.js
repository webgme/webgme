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
        initDeferred,
        closeDeferred;

    EventDispatcher.call(self);

    this.branchMonitors = {
        //branchName: {
        // connectionCnt: {number},
        // instance: {BranchMonitor},
        // stopTimeout: {
        //     id: {number},
        //     deferred: {Promise}
        // }
    };

    this.project = null;
    this.storage = null;
    this.initRequested = false;

    this.inStoppedAndStarted = {};

    function removeMonitor(branchName) {
        var remainingMonitors,
            stoppedAndStart;

        delete self.branchMonitors[branchName];
        remainingMonitors = Object.keys(self.branchMonitors);
        stoppedAndStart = Object.keys(self.inStoppedAndStarted);


        logger.debug('Removing monitor [' + branchName + '] - remaining, stopAndStarted',
            remainingMonitors, stoppedAndStart);
        if (remainingMonitors.length === 0 && stoppedAndStart.length === 0) {
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

            self.storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig);
            self.storage.open(function (networkStatus) {
                if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
                    self.storage.openProject(projectId, function (err, project, branches, rights) {
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
        var monitor = self.branchMonitors[branchName],
            deferred = Q.defer();

        function startNewMonitor(initCnt) {
            monitor = {
                connectionCnt: initCnt,
                stopTimeout: null,
                instance: new BranchMonitor(webGMESessionId, self.storage, self.project, branchName, logger, gmeConfig)
            };

            self.branchMonitors[branchName] = monitor;
            logger.debug('monitorBranch [' + branchName + '] - starting new monitor');
            deferred.promise = monitor.instance.start();
        }

        if (monitor) {
            monitor.connectionCnt += 1;
            logger.debug('monitorBranch [' + branchName + '] - connection counter [prev, now]',
                monitor.connectionCnt - 1, monitor.connectionCnt);
            if (monitor.connectionCnt === 1) {
                // The client disconnected before the monitor itself connected.
                // Register on start deferred and stop the monitor.
                logger.debug('The client disconnected before the monitor itself trigger connect.');
                monitor.instance.start()
                    .then(function () {
                        return monitor.instance.stop();
                    })
                    .then(function () {
                        removeMonitor(branchName);
                        deferred.resolve();
                    })
                    .catch(deferred.reject);
            } else if (monitor.connectionCnt === 2) {
                // The monitor is in stopping stage
                if (monitor.stopTimeout) {
                    // The timeout had not been triggered yet.
                    clearTimeout(monitor.stopTimeout.id);
                    logger.debug('monitorBranch [' + branchName + '] - setTimeout cleared');
                    monitor.stopTimeout.deferred.resolve(monitor.connectionCnt);
                    monitor.stopTimeout = null;
                    deferred.promise = monitor.instance.start();
                } else if (monitor.instance.stopRequested === true) {
                    // [Rare case]
                    // We cannot simply remove the monitor before it has closed the branch,
                    // therefore we need to register on the stop.promise and start a new monitor
                    // once it has resolved.
                    //
                    // (For bookkeeping of the addOnManagers it is not the same since they create a new storage.)
                    self.inStoppedAndStarted[branchName] = true;
                    logger.debug('monitorBranch [' + branchName + '] - inStoppedAndStarted!');
                    monitor.instance.stop()
                        .then(function () {
                            delete self.inStoppedAndStarted[branchName];
                            if (self.branchMonitors[branchName]) {
                                logger.error('Monitor was not removed', self.branchMonitors[branchName]);
                                deferred.reject(new Error('Monitor was not removed!'));
                            } else {
                                startNewMonitor(2);
                                // Here we are expecting a unMonitorBranch from the old monitor's closeBranch.
                                // Which will decrease the connectionCnt to 1 which will trigger the timeout.
                                // The timeout will then be cleared by the new monitors' openBranch.
                            }
                        })
                        .catch(deferred.reject);
                } else {
                    deferred.promise = monitor.instance.start();
                }
            } else if (monitor.connectionCnt > 2) {
                deferred.promise = monitor.instance.start();
            } else {
                deferred.reject(new Error('monitorBranch - unexpected connection count ( 2 > ' +
                    monitor.connectionCnt + ' )'));
            }
        } else {
            startNewMonitor(1);
        }

        return deferred.promise.nodeify(callback);
    };

    this.unMonitorBranch = function (webGMESessionId, branchName, callback) {
        var deferred = Q.defer(),
            monitor = self.branchMonitors[branchName];

        if (!monitor) {
            logger.debug('No monitor [' + branchName + '] assuming this is the monitor itself disconnecting');
            deferred.resolve(-1);
        } else {
            monitor.connectionCnt -= 1;
            logger.debug('unMonitorBranch [' + branchName + '] - connection counter [prev, now]',
                monitor.connectionCnt + 1, monitor.connectionCnt);
            if (monitor.connectionCnt === 1) {
                // One connection is the monitor itself.
                if (monitor.stopTimeout === null) {
                    logger.debug('[' + branchName + '] setting timeout to close monitor [ms]',
                        gmeConfig.addOn.monitorTimeout);
                    monitor.stopTimeout = {
                        deferred: deferred,
                        id: setTimeout(function () {
                            var timedDeferred = monitor.stopTimeout.deferred;
                            monitor.stopTimeout = null;
                            monitor.instance.stop()
                                .then(function () {
                                    removeMonitor(branchName);
                                    timedDeferred.resolve(-1);
                                })
                                .catch(timedDeferred.reject);

                        }, gmeConfig.addOn.monitorTimeout)
                    };
                } else {
                    deferred.reject(new Error('unMonitorBranch [' + branchName + '] cnt 1 but timeout already set'));
                }

            } else if (monitor.connectionCnt > 1) {
                deferred.resolve(monitor.connectionCnt);
            } else if (monitor.connectionCnt === 0) {
                // Monitor has not yet entered branch and/or triggered monitor start.
                deferred.resolve(monitor.connectionCnt);
            } else {
                deferred.reject(new Error('unMonitorBranch [' + branchName + '] unexpected connection count' +
                    '( 0 > ' + monitor.connectionCnt + ' )'));
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