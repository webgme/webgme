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
    ManagerTracker = require('../../addon/managertracker'),
    mt,
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
        logger.debug('initializing');
        gmeConfig = parameters.gmeConfig;
        WEBGME.addToRequireJsPaths(gmeConfig);
        logger = Logger.create('gme:connectedworker:pid_' + process.pid, gmeConfig.server.log, true);
        mt = new ManagerTracker(logger, gmeConfig);
        logger.info('initialized worker');
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

    if (parameters.command === CONSTANTS.workerCommands.connectedWorkerStart) {
        mt.connectedWorkerStart(parameters.webgmeToken, parameters.projectId, parameters.branchName,
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
        mt.connectedWorkerStop(parameters.webgmeToken, parameters.projectId, parameters.branchName,
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
