/*globals*/
/*jshint node:true*/
/**
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

    function connectedWorkerStart(webgmeToken, projectId, branchName, callback) {
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
    }

    function connectedWorkerStop(projectId, branchName, callback) {
        var addOnManager;

        logger.debug('connectedWorkerStop', projectId, branchName);
        if (!projectId || !branchName) {
            return Q.reject(new Error('Required parameters were not provided: ' + projectId + ', ' + branchName + '.'))
                .nodeify(callback);
        }

        addOnManager = addOnManagers[projectId];

        if (!addOnManager) {
            logger.debug('Request stop for non existing addOnManger', projectId, branchName);
            return Q.resolve({connectionCount: -1}).nodeify(callback);
        }

        return addOnManager.unMonitorBranch(branchName)
            .then(function (connectionCount) {
                return {connectionCount: connectionCount};
            })
            .nodeify(callback);
    }

    this.connectedWorkerStart = connectedWorkerStart;
    this.connectedWorkerStop = connectedWorkerStop;

    this.close = function (callback) {
        return Q.all(Object.keys(addOnManagers).map(function (projectId) {
            return addOnManagers[projectId].close();
        }))
            .nodeify(callback);
    };

    this.setToken = function (token) {
        Object.keys(addOnManagers).forEach(function (projectId) {
            addOnManagers[projectId].setToken(token);
        });
    };
}


module.exports = ManagerTracker;