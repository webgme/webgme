/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q'),
    AddOnManager = require('../../addon/addonmanager');

function ManagerTracker(mainLogger, gmeConfig, options) {
    var addOnManagers = {
            //:projectId
        },
        logger = mainLogger.fork('ManagerTracker');

    function connectedWorkerStart(webgmeToken, projectId, branchName, callback) {
        var addOnManager;

        logger.info('connectedWorkerStart', projectId, branchName);
        if (!projectId || !branchName) {
            return Q.reject(new Error('Required parameters were not provided: ' + projectId + ', ' + branchName + '.'))
                .nodeify(callback);
        }

        addOnManager = addOnManagers[projectId];

        if (!addOnManager) {
            logger.debug('No previous addOns handled for project [' + projectId + ']');
            addOnManager = new AddOnManager(projectId, logger, gmeConfig);
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
                return addOnManager.monitorBranch(webgmeToken, branchName);
            })
            .nodeify(callback);

    }

    function connectedWorkerStop(webgmeToken, projectId, branchName, callback) {
        var addOnManager;

        logger.info('connectedWorkerStop', projectId, branchName);
        if (!projectId || !branchName) {
            return Q.reject(new Error('Required parameters were not provided: ' + projectId + ', ' + branchName + '.'))
                .nodeify(callback);
        }

        addOnManager = addOnManagers[projectId];

        if (!addOnManager) {
            logger.debug('Request stop for non existing addOnManger', projectId, branchName);
            return Q.resolve({connectionCount: -1});
        }

        return addOnManager.unMonitorBranch(webgmeToken, branchName)
            .then(function (connectionCount) {
                return {connectionCount: connectionCount};
            });
    }

    this.connectedWorkerStart = connectedWorkerStart;
    this.connectedWorkerStop = connectedWorkerStop;

    this.close = function (callback) {
        return Object.keys(addOnManagers).map(function (manager) {
            return manager.close();
        })
            .nodeify(callback);
    };
}


module.exports = ManagerTracker;