/*jshint node:true*/

/**
 * @module Server.SimpleWorker
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var WEBGME = require(__dirname + '/../../../webgme'),

    CONSTANTS = require('./constants'),
    Logger = require('../logger'),
    WorkerRequests = require('./workerrequests'),
    wr,
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
        logger = Logger.create('gme:server:worker:simpleworker:pid_' + process.pid, gmeConfig.server.log, true);
        logger.debug('initialized worker');
        wr = new WorkerRequests(logger, gmeConfig);
        safeSend({pid: process.pid, type: CONSTANTS.msgTypes.initialized});
    } else {
        safeSend({pid: process.pid, type: CONSTANTS.msgTypes.initialized});
    }
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

    if (parameters.command === CONSTANTS.workerCommands.executePlugin) {
        wr.executePlugin(parameters.webgmeToken, parameters.socketId, parameters.name, parameters.context,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            }
        );
    } else if (parameters.command === CONSTANTS.workerCommands.seedProject) {
        parameters.type = parameters.type || 'db';
        wr.seedProject(parameters.webgmeToken, parameters.projectName, parameters.ownerId, parameters,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANTS.workerCommands.autoMerge) {
        wr.autoMerge(parameters.webgmeToken, parameters.projectId, parameters.mine, parameters.theirs,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANTS.workerCommands.resolve) {
        wr.resolve(parameters.webgmeToken, parameters.partial, function (err, result) {
            safeSend({
                pid: process.pid,
                type: CONSTANTS.msgTypes.result,
                error: err ? err.message : null,
                result: result
            });
        });
    } else if (parameters.command === CONSTANTS.workerCommands.checkConstraints) {
        wr.checkConstraints(parameters.webgmeToken, parameters.projectId, parameters, function (err, result) {
            safeSend({
                pid: process.pid,
                type: CONSTANTS.msgTypes.result,
                error: err ? err.message : null,
                result: result
            });
        });
    } else if (parameters.command === CONSTANTS.workerCommands.exportProjectToFile) {
        wr.exportProjectToFile(parameters.webgmeToken, parameters, function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            }
        );
    } else if (parameters.command === CONSTANTS.workerCommands.importProjectFromFile) {
        wr.importProjectFromFile(parameters.webgmeToken, parameters,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANTS.workerCommands.updateProjectFromFile) {
        wr.updateProjectFromFile(parameters.webgmeToken, parameters,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANTS.workerCommands.addLibrary) {
        wr.addLibrary(parameters.webgmeToken, parameters,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err && err instanceof Error ? err.message : err || null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANTS.workerCommands.updateLibrary) {
        wr.updateLibrary(parameters.webgmeToken, parameters,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANTS.workerCommands.exportSelectionToFile) {
        wr.exportSelectionToFile(parameters.webgmeToken, parameters, function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            }
        );
    } else if (parameters.command === CONSTANTS.workerCommands.importSelectionFromFile) {
        wr.importSelectionFromFile(parameters.webgmeToken, parameters, function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANTS.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            }
        );
    } else {
        safeSend({
            pid: process.pid,
            type: CONSTANTS.msgTypes.result,
            error: 'unknown command',
            resid: null
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
