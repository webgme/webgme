/*jshint node:true*/

/**
 * @module Server.ConnectedWorker
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var WEBGME = require(__dirname + '/../../../webgme'),

    CONSTANTS = require('./constants'),
    Logger = require('../logger'),
    AddOnManager = require('../../addon/addonmanager'),

    addOnManagers = {
        //:projectId
    },
    initialized = false,
    gmeConfig,
    logger;

function safeSend(msg) {
    if (initialized) {
        logger.debug('sending message', {metadata: msg});
    } else {
        //console.log('sending message', {metadata: msg});
    }
    try {
        process.send(msg);
    } catch (e) {
        if (initialized) {
            logger.error('sending message failed', {metadata: msg, e: e});
        } else {
            console.error('sending message failed', {metadata: msg, e: e});
        }
        //TODO check if we should separate some case
        process.exit(0);
    }
}

function initialize(parameters) {
    if (initialized !== true) {
        initialized = true;

        gmeConfig = parameters.gmeConfig;
        WEBGME.addToRequireJsPaths(gmeConfig);
        logger = Logger.create('gme:server:worker:connectedworker:pid_' + process.pid, gmeConfig.server.log, true);
        logger.debug('initializing');
        logger.info('initialized worker');
        safeSend({pid: process.pid, type: CONSTANTS.msgTypes.initialized});
    } else {
        safeSend({pid: process.pid, type: CONSTANTS.msgTypes.initialized});
    }
}

//AddOn Functions
function connectedWorkerStart(webgmeToken, projectId, branchName, callback) {
    var addOnManager;

    function finish(err) {
        if (err) {
            err = err instanceof Error ? err : new Error(err);
            logger.error('connectedWorkerStart failed', err);
            callback(err);
        } else {
            logger.info('connectedWorkerStart done [totalManagerCnt, branchMonitors]',
                Object.keys(addOnManagers).length, Object.keys(addOnManager.branchMonitors).length);
            callback(null);
        }
    }

    logger.info('connectedWorkerStart', projectId, branchName);
    if (!projectId || !branchName) {
        finish(new Error('Required parameters were not provided', projectId, branchName));
        return;
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

    addOnManager.initialize(webgmeToken)
        .then(function () {
            return addOnManager.monitorBranch(webgmeToken, branchName);
        })
        .then(function () {
            finish();
        })
        .catch(finish);
}

//function connectedWorkerQuery(webGMESessionId, projectId, branchName, addOnId, commitHash, queryParams, callback) {
//    logger.info('connectedWorkerQuery', addOnName);
//    logger.debug('connectedWorkerQuery', parameters);
//    function finish(err, message) {
//        if (err) {
//            err = err instanceof Error ? err : new Error(err);
//            logger.error('connectedWorkerQuery failed', err);
//            callback(err);
//        } else {
//            logger.info('connectedWorkerQuery done');
//            callback(null, message);
//        }
//    }
//
//    if (addOnManager) {
//        addOnManager.queryAddOn(addOnName, parameters)
//            .nodeify(finish);
//    } else {
//        finish(new Error('No AddOn is running'));
//    }
//}

function connectedWorkerStop(webgmeToken, projectId, branchName, callback) {
    var addOnManager;

    function finish(err, result) {
        if (err) {
            err = err instanceof Error ? err : new Error(err);
            logger.error('connectedWorkerStop failed', err);
            callback(err);
        } else {
            logger.info('connectedWorkerStop done [totalManagerCnt, branchMonitors, connectionCnt]',
                Object.keys(addOnManagers).length,
                addOnManager ? Object.keys(addOnManager.branchMonitors).length : 'n/a',
                result.connectionCount);
            callback(null, result);
        }
    }

    logger.info('connectedWorkerStop', projectId, branchName);
    if (!projectId || !branchName) {
        finish(new Error('Required parameter was not provided'));
        return;
    }

    addOnManager = addOnManagers[projectId];

    if (!addOnManager) {
        logger.debug('Request stop for non existing addOnManger', projectId, branchName);
        finish(null, {connectionCount: -1});
        return;
    }

    addOnManager.unMonitorBranch(webgmeToken, branchName)
        .then(function (connectionCount) {
            finish(null, {connectionCount: connectionCount});
        })
        .catch(finish);
}

//main message processing loop
process.on('message', function (parameters) {
    parameters = parameters || {};
    parameters.command = parameters.command;

    if (!initialized && parameters.command !== CONSTANTS.workerCommands.initialize) {
        return safeSend({
            pid: process.pid,
            type: CONSTANTS.msgTypes.request,
            error: 'worker has not been initialized yet',
            resid: null
        });
    }

    if (parameters.command === CONSTANTS.workerCommands.initialize) {
        return initialize(parameters);
    }

    logger.debug('Incoming message:', {metadata: parameters});

    if (parameters.command === CONSTANTS.workerCommands.connectedWorkerStart) {
        connectedWorkerStart(parameters.webgmeToken, parameters.projectId, parameters.branchName,
            function (err) {
                if (err) {
                    safeSend({
                        pid: process.pid,
                        type: CONSTANTS.msgTypes.request,
                        error: err.message,
                        resid: parameters.resid
                    });
                } else {
                    safeSend({
                        pid: process.pid,
                        type: CONSTANTS.msgTypes.request,
                        error: null,
                        resid: parameters.resid
                    });
                }
            }
        );
    //} else if (parameters.command === CONSTANTS.workerCommands.connectedWorkerQuery) {
    //    connectedWorkerQuery(parameters.addOnName, parameters, function (err, result) {
    //        safeSend({
    //            pid: process.pid,
    //            type: CONSTANTS.msgTypes.query,
    //            error: err ? err.message : null,
    //            result: result
    //        });
    //    });
    } else if (parameters.command === CONSTANTS.workerCommands.connectedWorkerStop) {
        connectedWorkerStop(parameters.webgmeToken, parameters.projectId, parameters.branchName,
            function (err, result) {
                if (err) {
                    safeSend({
                        pid: process.pid,
                        type: CONSTANTS.msgTypes.request,
                        error: err.message,
                        resid: parameters.resid
                    });
                } else {
                    safeSend({
                        pid: process.pid,
                        type: CONSTANTS.msgTypes.request,
                        error: null,
                        resid: parameters.resid,
                        result: result
                    });
                }
            }
        );
    } else {
        safeSend({
            pid: process.pid,
            type: CONSTANTS.msgTypes.result,
            error: 'unknown command',
            resid: parameters.resid
        });
    }
});

safeSend({pid: process.pid, type: CONSTANTS.msgTypes.initialize});

// graceful ending of the child process
process.on('SIGINT', function () {
    if (logger) {
        logger.debug('stopping child process');
        process.exit(0);
    } else {
        //console.error('child was killed without initialization');
        process.exit(1);
    }
});
