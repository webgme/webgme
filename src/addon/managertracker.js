/*globals*/
/*jshint node:true*/
/**
 * This is keeps track of all addon-managers that create their own storages and in turn keeps track of the
 * branch-monitors.
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q'),
    AddOnManager = require('./addonmanager');

function ManagerTracker(mainLogger, gmeConfig, options) {
    var addOnManagers = {
            //:projectId
        },
        logger = mainLogger.fork('ManagerTracker');

    this.connectedWorkerStart = function (webgmeToken, projectId, branchName, callback) {
        var addOnManager;

        logger.debug('connectedWorkerStart', projectId, branchName);
        if (!projectId || !branchName) {
            return Q.reject(new Error('Required parameters were not provided: ' + projectId + ', ' + branchName + '.'))
                .nodeify(callback);
        }

        addOnManager = addOnManagers[projectId];

        if (!addOnManager) {
            logger.debug('No previous addOns handled for project [' + projectId + ']');
            addOnManager = new AddOnManager(projectId, logger, gmeConfig, options);
            addOnManagers[projectId] = addOnManager;
            addOnManager.addEventListener('NO_MONITORS', function (/*addOnManager_*/) {
                delete addOnManagers[projectId];
                addOnManager.close()
                    .fail(function (err) {
                        logger.error('Error closing addOnManger', err);
                    });
            });
        } else {
            logger.debug('AddOns already being handled for project [' + projectId + ']');
        }

        return addOnManager.initialize(webgmeToken)
            .then(function () {
                return addOnManager.monitorBranch(branchName);
            })
            .then(function () {
                return {
                    managers: Object.keys(addOnManagers).length,
                    branchMonitors: Object.keys(addOnManager.branchMonitors).length
                };
            })
            .nodeify(callback);
    };

    this.connectedWorkerStop = function (projectId, branchName, callback) {
        if (!projectId || !branchName) {
            return Q.reject(new Error('Required parameters were not provided: ' + projectId + ', ' + branchName + '.'))
                .nodeify(callback);
        } else if (addOnManagers[projectId]) {
            return addOnManagers[projectId].unMonitorBranch(branchName)
                .nodeify(callback);
        } else {
            logger.debug('Request stop for non existing addOnManger', projectId, branchName);
            return Q.resolve()
                .nodeify(callback);
        }
    };

    this.close = function (callback) {
        return Q.all(Object.keys(addOnManagers).map(function (projectId) {
            return addOnManagers[projectId].close();
        }))
            .nodeify(callback);
    };

    this.getStatus = function (opts) {
        var status = {};

        Object.keys(addOnManagers).forEach(function (projectId) {
            status[projectId] = addOnManagers[projectId].getStatus(opts);
        });

        return status;
    };

    this.setToken = function (token) {
        Object.keys(addOnManagers).forEach(function (projectId) {
            addOnManagers[projectId].setToken(token);
        });
    };
}


module.exports = ManagerTracker;