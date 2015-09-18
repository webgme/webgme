/*jshint node:true*/

/**
 * @module Server.SimpleWorker
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var WEBGME = require(__dirname + '/../../../webgme'),

    CONSTANT = require('./constants'),
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
        logger.debug('initializing');
        logger.info('initialized worker');
        wr = new WorkerRequests(logger, gmeConfig);
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
        wr.executePlugin(parameters.webGMESessionId, parameters.name, parameters.context, function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            }
        );
    } else if (parameters.command === CONSTANT.workerCommands.exportLibrary) {
        wr.exportLibrary(parameters.webGMESessionId, parameters.projectId, parameters.path, parameters,
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
        parameters.type = parameters.type || 'db';
        wr.seedProject(parameters.webGMESessionId, parameters.projectName, parameters.ownerId, parameters,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANT.workerCommands.autoMerge) {
        wr.autoMerge(parameters.webGMESessionId, parameters.projectId, parameters.mine, parameters.theirs,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANT.workerCommands.resolve) {
        wr.resolve(parameters.webGMESessionId, parameters.partial, function (err, result) {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: err ? err.message : null,
                result: result
            });
        });
    } else if (parameters.command === CONSTANT.workerCommands.checkConstraints) {
        wr.checkConstraints(parameters.webGMESessionId, parameters.projectId, parameters, function (err, result) {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: err ? err.message : null,
                result: result
            });
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
