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
    AddOnWorkerManager = require('./addonworkermanager'),
    WORKER_CONSTANTS = require('../server/worker/constants');

function AddOnEventPropagator(storage, mainLogger, gmeConfig) {

    var logger = mainLogger.fork('AddOnEventPropagator'),
        statusUrl,
        addOnWorkerManager,
        COPY = function (obj) {
            return JSON.parse(JSON.stringify(obj));
        };

    function _sendStartCommand(data) {
        if (gmeConfig.addOn.workerUrl) {
            logger.debug('Posting to add-on server at url', {metadata: data});
            superagent.post(gmeConfig.addOn.workerUrl, data, function (err) {
                if (err) {
                    logger.error(data.event, err);
                }
            });
        } else {
            data.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStart;
            logger.debug('Sending command to connectedWorker', {metadata: data});
            addOnWorkerManager.connectedWorkerRequests.push({
                request: data,
                cb: function (err) {
                    if (err) {
                        logger.error(data.event, err);
                    }
                }
            });
        }
    }

    function branchJoined(_s, data) {
        data = COPY(data);
        data.event = CONSTANTS.STORAGE.BRANCH_JOINED;
        _sendStartCommand(data);
    }

    function branchUpdated(_s, data) {
        data = COPY(data);
        data.event = CONSTANTS.STORAGE.BRANCH_HASH_UPDATED;
        _sendStartCommand(data);
    }

    this.start = function (callback) {
        if (gmeConfig.addOn.workerUrl) {
            storage.addEventListener(CONSTANTS.STORAGE.BRANCH_JOINED, branchJoined);
            storage.addEventListener(CONSTANTS.STORAGE.BRANCH_HASH_UPDATED, branchUpdated);
            return Q.resolve().nodeify(callback);
        } else {
            addOnWorkerManager = new AddOnWorkerManager({
                gmeConfig: gmeConfig,
                logger: logger
            });

            return addOnWorkerManager.start()
                .then(function () {
                    storage.addEventListener(CONSTANTS.STORAGE.BRANCH_JOINED, branchJoined);
                    storage.addEventListener(CONSTANTS.STORAGE.BRANCH_HASH_UPDATED, branchUpdated);
                })
                .nodeify(callback);
        }
    };

    this.stop = function (callback) {
        storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_JOINED, branchJoined);
        storage.removeEventListener(CONSTANTS.STORAGE.BRANCH_HASH_UPDATED, branchUpdated);
        return Q.resolve().nodeify(callback);
    };

    this.getStatus = function (opts, callback) {
        var deferred = Q.defer();
        opts = opts || opts;
        if (gmeConfig.addOn.workerUrl) {
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
        } else {
            opts.command = WORKER_CONSTANTS.workerCommands.connectedWorkerStatus;
            addOnWorkerManager.connectedWorkerRequests.push({
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
        }

        return deferred.promise.nodeify(callback);
    };
}

module.exports = AddOnEventPropagator;