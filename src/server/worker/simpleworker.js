/*jshint node:true*/

/**
 * @module Server.SimpleWorker
 * @author kecso / https://github.com/kecso
 */

'use strict';

var WEBGME = require(__dirname + '/../../../webgme'),

    CONSTANT = require('./constants'),
    Logger = require('../logger'),
    WorkerFunctions = require('./workerfunctions'),
    initialized = false,
    gmeConfig,
    wf,
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

// Helper functions
function initialize(parameters) {
    if (initialized !== true) {
        initialized = true;
        gmeConfig = parameters.gmeConfig;
        WEBGME.addToRequireJsPaths(gmeConfig);
        logger = Logger.create('gme:server:worker:simpleworker:pid_' + process.pid, gmeConfig.server.log, true);
        logger.debug('initializing');
        wf = new WorkerFunctions(logger, gmeConfig);
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
    } else {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
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

    if (parameters.command === CONSTANT.workerCommands.executePlugin) {
        wf.executePlugin(parameters.webGMESessionId, parameters.name, parameters.context, function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            }
        );
    } else if (parameters.command === CONSTANT.workerCommands.exportLibrary) {
        wf.exportLibrary(parameters.webGMESessionId, parameters.projectId, parameters.path, parameters,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            }
        );
    } else if (parameters.command === CONSTANT.workerCommands.seedProject) {
        if (typeof parameters.projectName === 'string' && parameters.ownerId) {
            parameters.type = parameters.type || 'db';
            wf.seedProject(parameters.webGMESessionId, parameters.projectName, parameters.ownerId, parameters,
                function (err, result) {
                    safeSend({
                        pid: process.pid,
                        type: CONSTANT.msgTypes.result,
                        error: err ? err.message : null,
                        result: result
                    });
                });
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: 'invalid parameters: ' + JSON.stringify(parameters)
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.autoMerge) {
        //TODO Check parameters.
        wf.autoMerge(parameters.webGMESessionId, parameters.projectId, parameters.mine, parameters.theirs,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANT.workerCommands.resolve) {
        //TODO Check parameters.
        wf.resolve(parameters.webGMESessionId, parameters.partial, function (err, result) {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: err ? err.message : null,
                result: result
            });
        });
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStart) {
        if (gmeConfig.addOn.enable === true) {
            wf.initConnectedWorker(parameters.webGMESessionId, parameters.userId, parameters.workerName,
                parameters.projectId, parameters.branch,
                function (err) {
                    if (err) {
                        safeSend({
                            pid: process.pid,
                            type: CONSTANT.msgTypes.request,
                            error: err ? err.message : null,
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
                type: CONSTANT.msgTypes.request,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerQuery) {
        if (gmeConfig.addOn.enable === true) {
            wf.connectedWorkerQuery(parameters, function (err, result) {
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
                type: CONSTANT.msgTypes.request,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStop) {
        if (gmeConfig.addOn.enable === true) {
            wf.connectedWorkerStop(function (err) {
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
                type: CONSTANT.msgTypes.request,
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
