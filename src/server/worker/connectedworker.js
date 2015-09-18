/*jshint node:true*/

/**
 * @module Server.ConnectedWorker
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var WEBGME = require(__dirname + '/../../../webgme'),

    CONSTANT = require('./constants'),
    Logger = require('../logger'),
    AddOnManager = require('../../addon/addonmanager'),

    addOnManagers,
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
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
    } else {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
    }
}

//AddOn Functions
function connectedWorkerStart(webGMESessionId, userId, addOnName, projectId, branchName, callback) {
    logger.info('connectedWorkerStart', addOnName, projectId, branchName);
    function finish(err) {
        if (err) {
            err = err instanceof Error ? err : new Error(err);
            logger.error('connectedWorkerStart failed', {metadata: err});
            callback(err);
        } else {
            logger.info('connectedWorkerStart done');
            callback(null);
        }
    }

    if (!addOnName || !projectId || !branchName) {
        finish(new Error('Required parameter was not provided'));
        return;
    }

    addOnManager = new AddOnManager(webGMESessionId, logger, gmeConfig);

    addOnManager.initialize(function (err) {
        if (err) {
            finish(err);
            return;
        }

        addOnManager.startNewAddOn(addOnName, projectId, branchName, userId, finish);
    });
}

function connectedWorkerQuery(addOnName, parameters, callback) {
    logger.info('connectedWorkerQuery', addOnName);
    logger.debug('connectedWorkerQuery', parameters);
    function finish(err, message) {
        if (err) {
            err = err instanceof Error ? err : new Error(err);
            logger.error('connectedWorkerQuery failed', {metadata: err});
            callback(err);
        } else {
            logger.info('connectedWorkerQuery done');
            callback(null, message);
        }
    }

    if (addOnManager) {
        addOnManager.queryAddOn(addOnName, parameters)
            .nodeify(finish);
    } else {
        finish(new Error('No AddOn is running'));
    }
}

function connectedWorkerStop(callback) {
    logger.info('connectedWorkerStop');
    function finish(err) {
        if (err) {
            err = err instanceof Error ? err : new Error(err);
            logger.error('connectedWorkerStop failed', {metadata: err});
            callback(err);
        } else {
            logger.info('connectedWorkerStop done');
            callback(null);
        }
    }

    if (addOnManager) {
        addOnManager.close()
            .then(function () {
                addOnManager = null;
                finish(null);
            })
            .catch(finish);
    } else {
        finish(null);
    }
}

//main message processing loop
process.on('message', function (parameters) {
    parameters = parameters || {};
    parameters.command = parameters.command;

    if (!initialized && parameters.command !== CONSTANT.workerCommands.initialize) {
        return safeSend({
            pid: process.pid,
            type: CONSTANT.msgTypes.request,
            error: 'worker has not been initialized yet',
            resid: null
        });
    }

    if (parameters.command === CONSTANT.workerCommands.initialize) {
        return initialize(parameters);
    }

    logger.debug('Incoming message:', {metadata: parameters});

    if (parameters.command === CONSTANT.workerCommands.connectedWorkerStart) {
        if (gmeConfig.addOn.enable === true) {
            connectedWorkerStart(parameters.webGMESessionId, parameters.userId, parameters.addOnName,
                parameters.projectId, parameters.branch,
                function (err) {
                    if (err) {
                        safeSend({
                            pid: process.pid,
                            type: CONSTANT.msgTypes.result,
                            error: err.message,
                            resid: null
                        });
                    } else {
                        safeSend({
                            pid: process.pid,
                            type: CONSTANT.msgTypes.request,
                            error: null,
                            resid: process.pid
                        });
                    }
                }
            );
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerQuery) {
        if (gmeConfig.addOn.enable === true) {
            connectedWorkerQuery(parameters.addOnName, parameters, function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.query,
                    error: err ? err.message : null,
                    result: result
                });
            });
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStop) {
        // TODO: We need a timeout here when clients disconnects, e.g. browser is closed.
        if (gmeConfig.addOn.enable === true) {
            connectedWorkerStop(function (err) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: null
                });
            });
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else {
        safeSend({
            pid: process.pid,
            type: CONSTANT.msgTypes.result,
            error: 'unknown command',
            resid: null
        });
    }
});

safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialize});

// graceful ending of the child process
process.on('SIGINT', function () {
    if (logger) {
        logger.debug('stopping child process');
    } else {
        //console.error('child was killed without initialization');
        process.exit(1);
    }
});
