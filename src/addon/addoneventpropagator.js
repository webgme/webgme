/*globals requireJS*/
/*jshint node:true*/
/**
 * This
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var superagent = require('superagent'),
    CONSTANTS = requireJS('common/Constants'),
    WORKER_CONSTANTS = require('../server/worker/constants');

function AddOnEventPropagator(storage, serverWorkerManager, mainLogger, gmeConfig) {

    var connectedWorker = !gmeConfig.addOn.workerUrl,
        logger = mainLogger.fork('AddOnEventPropagator'),
        COPY = function (obj) {
            return JSON.parse(JSON.stringify(obj));
        };

    function branchJoined(_s, data) {
        data = COPY(data);
        data.event = CONSTANTS.STORAGE.BRANCH_JOINED;

        if (connectedWorker) {
            data.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStart;
            serverWorkerManager.connectedWorkerRequests.push({
                request: data,
                cb: function (err) {
                    logger.error(err);
                }
            });
        } else {
            logger.info('Posting to add-on server at url', gmeConfig.addOn.workerUrl);
            superagent.post(gmeConfig.addOn.workerUrl, data);
        }
    }

    function branchLeft(_s, data) {
        data = COPY(data);
        data.event = CONSTANTS.STORAGE.BRANCH_LEFT;

        if (connectedWorker) {
            data.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStop;
            serverWorkerManager.connectedWorkerRequests.push({
                request: data,
                cb: function (err) {
                    logger.error(err);
                }
            });
        } else {
            logger.info('Posting to add-on server at url', gmeConfig.addOn.workerUrl);
            superagent.post(gmeConfig.addOn.workerUrl, data);
        }
    }

    function branchUpdated(_s, data) {
        data = COPY(data);
        data.event = CONSTANTS.STORAGE.BRANCH_HASH_UPDATED;

        if (connectedWorker) {
            data.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStart;
            serverWorkerManager.connectedWorkerRequests.push({
                request: data,
                cb: function (err) {
                    logger.error(err);
                }
            });
        } else {
            logger.info('Posting to add-on server at url', gmeConfig.addOn.workerUrl);
            superagent.post(gmeConfig.addOn.workerUrl, data);
        }
    }


    this.start = function (callback) {
        storage.addEventListener(CONSTANTS.STORAGE.BRANCH_JOINED, branchJoined);
        storage.addEventListener(CONSTANTS.STORAGE.BRANCH_LEFT, branchLeft);
        storage.addEventListener(CONSTANTS.STORAGE.BRANCH_HASH_UPDATED, branchUpdated);
        callback();
    };

    this.stop = function (callback) {
        storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_JOINED, branchJoined);
        storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_LEFT, branchLeft);
        storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_HASH_UPDATED, branchUpdated);
        callback();
    };
}

module.exports = AddOnEventPropagator;