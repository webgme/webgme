/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    superagent = require('superagent'),
    BranchMonitor = require('./branchmonitor'),
    EventDispatcher = requireJS('common/EventDispatcher'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    Storage = requireJS('common/storage/nodestorage');

/**
 * Class for managing branch-monitors within a single project.
 * Branch-monitors are managing the add-ons within each branch.
 * @param {string} projectId
 * @param {object} mainLogger
 * @param {object} gmeConfig
 * @param {number} gmeConfig.addOn.monitorTimeout - Time to wait before stopping a monitor after only the monitor itself
 * is connected to the branch.
 * @param {object} [options]
 * @param {object} [options.webgmeUrl=http://127.0.0.1:gmeConfig.server.port]
 * @constructor
 * @ignore
 */
function AddOnManager(projectId, mainLogger, gmeConfig, options) {
    var self = this,
        logger = mainLogger.fork('AddOnManager:' + projectId),
        webgmeUrl,
        initDeferred,
        closeDeferred;

    options = options || {};
    webgmeUrl = options.webgmeUrl || 'http://127.0.0.1:' + gmeConfig.server.port;

    EventDispatcher.call(self);

    this.branchMonitors = {
        //branchName: {
        // instance: {BranchMonitor},
        // stopTimeout: {
        //     id: {number},
        //     deferred: {Promise}
        // }
    };

    this.project = null;
    this.storage = null;
    this.initRequested = false;
    this.closeRequested = false;

    this.webgmeToken = null;
    this.renewingToken = false;

    this.inStoppedAndStarted = 0;

    function removeMonitor(branchName) {
        var remainingMonitors;

        delete self.branchMonitors[branchName];
        remainingMonitors = Object.keys(self.branchMonitors);

        logger.debug('Removing monitor [' + branchName + '] - remaining', remainingMonitors);
        if (remainingMonitors.length === 0 && self.inStoppedAndStarted === 0) {
            self.dispatchEvent('NO_MONITORS');
        }
    }

    /**
     * Opens up the storage based on the webgmeToken and opens and sets the project.
     *
     * @param {string} webgmeToken
     * @param {function} [callback]
     * @returns {Promise}
     */
    this.initialize = function (webgmeToken, callback) {
        if (self.initRequested === false) {
            initDeferred = Q.defer();
            self.initRequested = true;
            self.webgmeToken = webgmeToken;

            self.storage = Storage.createStorage(webgmeUrl, self.webgmeToken, logger, gmeConfig);
            self.storage.open(function (networkStatus) {
                if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
                    self.storage.openProject(projectId, function (err, project, branches, rights) {
                        if (err) {
                            self.close()
                                .finally(function () {
                                    initDeferred.reject(err);
                                });

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
                } else if (networkStatus === STORAGE_CONSTANTS.JWT_ABOUT_TO_EXPIRE) {
                    if (!self.renewingToken) {
                        self.renewingToken = true;
                        superagent.get(webgmeUrl + '/api/user/token')
                            .set('Authorization', 'Bearer ' + self.webgmeToken)
                            .end(function (err, res) {
                                self.renewingToken = false;
                                if (err) {
                                    logger.error(err);
                                } else {
                                    self.setToken(res.body.webgmeToken);
                                }
                            });
                    }
                } else if (networkStatus === STORAGE_CONSTANTS.DISCONNECTED) {
                    logger.warn('Lost connection to storage, awaiting reconnect...');
                } else if (networkStatus === STORAGE_CONSTANTS.RECONNECTED) {
                    logger.info('Storage reconnected!');
                } else {
                    logger.error('Connection problems' + networkStatus);
                    self.storage.close(function (err) {
                        if (err) {
                            logger.error(err);
                        }

                        initDeferred.reject(new Error('Problems connecting to the webgme server, network status: ' +
                            networkStatus));
                    });
                }
            });
        }

        return initDeferred.promise.nodeify(callback);
    };

    this.monitorBranch = function (branchName, callback) {
        var monitor = self.branchMonitors[branchName];

        function startNewTimer() {
            return setTimeout(function () {
                var timedDeferred = monitor.stopTimeout.deferred;
                monitor.stopTimeout = null;
                monitor.instance.stop()
                    .then(function () {
                        removeMonitor(branchName);
                        timedDeferred.resolve();
                    })
                    .catch(timedDeferred.reject);

            }, gmeConfig.addOn.monitorTimeout);
        }

        function startNewMonitor() {
            monitor = {
                stopTimeout: null,
                instance: new BranchMonitor(self.webgmeToken, self.storage, self.project, branchName, logger, gmeConfig)
            };

            self.branchMonitors[branchName] = monitor;

            monitor.stopTimeout = {
                deferred: Q.defer(),
                id: startNewTimer(branchName)
            };

            logger.debug('monitorBranch [' + branchName + '] - starting new monitor');
            return monitor.instance.start();
        }

        if (monitor) {
            if (monitor.stopTimeout) {
                // The monitor has been created and the stop hasn't been triggered,
                // so clear the old timeout and set a new one.
                clearTimeout(monitor.stopTimeout.id);
                monitor.stopTimeout.id = startNewTimer(branchName);

                return monitor.instance.start()
                    .nodeify(callback);
            } else {
                // The timeout has been triggered, and the monitor is in stopping stage.
                // We cannot simply remove the monitor before it has closed the branch,
                // therefore we need to register on the stop.promise and start a new monitor
                // (or use an earlier added one) once it has resolved.

                // The counter ensures that this manager isn't destroyed.
                self.inStoppedAndStarted += 1;
                return monitor.instance.stop()
                    .then(function () {
                        self.inStoppedAndStarted -= 1;
                        if (self.branchMonitors[branchName]) {
                            return self.branchMonitors[branchName].instance.start();
                        } else {
                            return startNewMonitor();
                        }
                    })
                    .nodeify(callback);
            }
        } else {
            return startNewMonitor()
                .nodeify(callback);
        }
    };

    this.unMonitorBranch = function (branchName, callback) {
        var deferred = Q.defer();
        deferred.resolve({});
        return deferred.promise.nodeify(callback);
    };

    this.queryAddOn = function (webgmeToken, branchName, addOnId, queryParams, callback) {
        var deferred = Q.defer();
        deferred.reject(new Error('Not Implemented!'));
        return deferred.promise.nodeify(callback);
    };

    this.close = function (callback) {

        function stopMonitor(branchName) {
            return self.branchMonitors[branchName].instance.stop();
        }

        if (self.closeRequested === false) {
            closeDeferred = Q.defer();
            self.closeRequested = true;

            Q.allSettled(Object.keys(self.branchMonitors).map(stopMonitor))
                .then(function (/*results*/) {
                    //TODO: Check the results and at least log errors.
                    return Q.ninvoke(self.storage, 'close');
                })
                .then(function () {
                    closeDeferred.resolve();
                })
                .catch(closeDeferred.reject);
        }

        return closeDeferred.promise.nodeify(callback);
    };

    this.setToken = function (token) {
        self.webgmeToken = token;
        logger.info('Setting new token!');
        if (self.storage) {
            self.storage.setToken(token);
        }
        Object.keys(self.branchMonitors).forEach(function (branchName) {
            self.branchMonitors[branchName].instance.setToken(token);
        });
    };

    this.getStatus = function (opts) {
        var status = {
            initRequested: self.initRequested,
            closeRequested: self.closeRequested,
            renewingToken: self.renewingToken,
            inStoppedAndStarted: self.inStoppedAndStarted,
            branchMonitors: {}
        };

        Object.keys(self.branchMonitors).forEach(function (branchName) {
            status.branchMonitors[branchName] = self.branchMonitors[branchName].instance.getStatus();
        });

        return status;
    };
}


// Inherit from the EventDispatcher
AddOnManager.prototype = Object.create(EventDispatcher.prototype);
AddOnManager.prototype.constructor = AddOnManager;

module.exports = AddOnManager;