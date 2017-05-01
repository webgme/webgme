/*globals requireJS*/
/*jshint node:true*/
/**
 * This propagates the events from the storage to the addon-handler process.
 *
 * The addon-handler can take two forms:
 * - If url is provided it will post requests to a separate server see (bin/addon_handler.js)
 * - Otherwise it will send messages to a connected worker.
 *
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var superagent = require('superagent'),
    Q = require('q'),
    CONSTANTS = requireJS('common/Constants'),
    WORKER_CONSTANTS = require('../server/worker/constants');

function AddOnEventPropagator(storage, serverWorkerManager, mainLogger, gmeConfig) {

    var connectedWorker = !gmeConfig.addOn.workerUrl,
        logger = mainLogger.fork('AddOnEventPropagator'),
        statusUrl,
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
                    if (err) {
                        logger.error('branchJoined', err);
                    }
                }
            });
        } else {
            logger.debug('Posting to add-on server at url', gmeConfig.addOn.workerUrl);
            superagent.post(gmeConfig.addOn.workerUrl, data, function (err) {
                if (err) {
                    logger.error('branchJoined', err);
                }
            });
        }
    }

    //function branchLeft(_s, data) {
    //    data = COPY(data);
    //    data.event = CONSTANTS.STORAGE.BRANCH_LEFT;
    //
    //    if (connectedWorker) {
    //        data.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStop;
    //        serverWorkerManager.connectedWorkerRequests.push({
    //            request: data,
    //            cb: function (err) {
    //                if (err) {
    //                    logger.error(err);
    //                }
    //            }
    //        });
    //    } else {
    //        logger.info('Posting to add-on server at url', gmeConfig.addOn.workerUrl);
    //        superagent.post(gmeConfig.addOn.workerUrl, data, function (err) {
    //            if (err) {
    //                logger.error(err);
    //            }
    //        });
    //    }
    //}

    function branchUpdated(_s, data) {
        data = COPY(data);
        data.event = CONSTANTS.STORAGE.BRANCH_HASH_UPDATED;

        if (connectedWorker) {
            data.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStart;
            serverWorkerManager.connectedWorkerRequests.push({
                request: data,
                cb: function (err) {
                    if (err) {
                        logger.error('branchUpdated', err);
                    }
                }
            });
        } else {
            logger.debug('Posting to add-on server at url', gmeConfig.addOn.workerUrl);
            superagent.post(gmeConfig.addOn.workerUrl, data, function (err) {
                if (err) {
                    logger.error('branchUpdated', err);
                }
            });
        }
    }


    this.start = function (callback) {
        storage.addEventListener(CONSTANTS.STORAGE.BRANCH_JOINED, branchJoined);
        //storage.addEventListener(CONSTANTS.STORAGE.BRANCH_LEFT, branchLeft);
        storage.addEventListener(CONSTANTS.STORAGE.BRANCH_HASH_UPDATED, branchUpdated);
        return Q.resolve().nodeify(callback);
    };

    this.stop = function (callback) {
        storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_JOINED, branchJoined);
        //storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_LEFT, branchLeft);
        storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_HASH_UPDATED, branchUpdated);
        return Q.resolve().nodeify(callback);
    };

    this.getStatus = function (opts, callback) {
        var deferred = Q.defer();
        opts = opts || opts;
        if (connectedWorker) {
            opts.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStatus;
            serverWorkerManager.connectedWorkerRequests.push({
                request: opts,
                cb: function (err, result) {
                    if (err) {
                        logger.error(err);
                        deferred.reject(err);
                    } else {
                        deferred.resolve(result);
                    }
                }
            });
        } else {
            if (!statusUrl) {
                statusUrl = gmeConfig.addOn.workerUrl;
                if (statusUrl[statusUrl.length - 1] === '/') {
                    statusUrl = statusUrl.substring(0, statusUrl.length - 1);
                }

                statusUrl = statusUrl + '/status';
                logger.debug('statusUrl', statusUrl);
            }

            superagent.get(statusUrl)
                .end(function (err, res) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(res.body);
                    }
                });
        }

        return deferred.promise.nodeify(callback);
    };
}

module.exports = AddOnEventPropagator;