/*globals requireJS*/
/*jshint node: true*/

/**
 * @author kecso / https://github.com/kecso
 */

'use strict';

var HookMessenger = require('webgme-webhook-manager/src/hookMessenger'),
    CONSTANTS = requireJS('common/storage/constants'),
    fork = require('child_process').fork,
    Q = require('q');

function MemoryManager(storage, mainLogger, gmeConfig) {
    var hookMessenger = new HookMessenger({
        uri: gmeConfig.mongo.uri,
        collection: '_projects',
        logger: mainLogger.fork('hookMessenger')
    });

    /**
     * Since the web-socket portion temporarily appends a socket to the eventData
     * (to know if it should broadcast or not) we need to ensure that we don't send that data here.
     *
     * @param {object} data - event data from storage.
     * @returns {object} data if it does not have socket, otherwise a shallow copy without the socket.
     */
    function ensureNoSocket(data) {
        var cleanData,
            key;

        if (data.hasOwnProperty('socket')) {
            cleanData = {};
            for (key in data) {
                if (key !== 'socket') {
                    cleanData[key] = data[key];
                }
            }
        } else {
            cleanData = data;
        }

        return cleanData;
    }

    function projectDeleted(_s, data) {
        hookMessenger.send(CONSTANTS.PROJECT_DELETED, ensureNoSocket(data));
    }

    function branchDeleted(_s, data) {
        hookMessenger.send(CONSTANTS.BRANCH_DELETED, ensureNoSocket(data));
    }

    function branchCreated(_s, data) {
        hookMessenger.send(CONSTANTS.BRANCH_CREATED, ensureNoSocket(data));
    }

    function branchUpdated(_s, data) {
        hookMessenger.send(CONSTANTS.BRANCH_HASH_UPDATED, ensureNoSocket(data));
    }

    function tagCreated(_s, data) {
        hookMessenger.send(CONSTANTS.TAG_CREATED, ensureNoSocket(data));
    }

    function tagDeleted(_s, data) {
        hookMessenger.send(CONSTANTS.TAG_DELETED, ensureNoSocket(data));
    }

    function commit(_s, data) {
        hookMessenger.send(CONSTANTS.COMMIT, ensureNoSocket(data));
    }

    function start(callback) {
        var deferred = Q.defer();
        hookMessenger.start(function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                storage.addEventListener(CONSTANTS.PROJECT_DELETED, projectDeleted);
                storage.addEventListener(CONSTANTS.BRANCH_DELETED, branchDeleted);
                storage.addEventListener(CONSTANTS.BRANCH_CREATED, branchCreated);
                storage.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED, branchUpdated);
                storage.addEventListener(CONSTANTS.TAG_CREATED, tagCreated);
                storage.addEventListener(CONSTANTS.TAG_DELETED, tagDeleted);
                storage.addEventListener(CONSTANTS.COMMIT, commit);
                deferred.resolve();
            }
        });

        return deferred.promise.nodeify(callback);
    }

    function stop(callback) {
        var deferred = Q.defer();
        storage.removeEventListener(projectDeleted);
        storage.removeEventListener(branchDeleted);
        storage.removeEventListener(branchCreated);
        storage.removeEventListener(branchUpdated);
        storage.removeEventListener(tagCreated);
        storage.removeEventListener(tagDeleted);
        storage.removeEventListener(commit);
        hookMessenger.stop(function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise.nodeify(callback);
    }

    return {
        start: start,
        stop: stop
    };
}

function RedisManager(mainLogger, gmeConfig) {
    var managerProcess = null,
        logger = mainLogger.fork('RedisManager'),
        initialized = false;

    function start(callback) {
        var deferred = Q.defer(),
            forkParameters = [gmeConfig.mongo.uri];

        if (managerProcess === null) {
            if (gmeConfig.socketIO.adapter.options && gmeConfig.socketIO.adapter.options.uri) {
                forkParameters.push('redis://' + gmeConfig.socketIO.adapter.options.uri);
            }
            managerProcess = fork(require.resolve('webgme-webhook-manager'), forkParameters, {silent: true});

            managerProcess.on('exit', function (code, signal) {
                if (code !== 0 && signal !== 'SIGINT') {
                    logger.warn('manager has exited abnormally with code ' + code +
                        ', signal', signal);
                }

                if (!initialized) {
                    deferred.reject(new Error('manager exited without initialization'));
                }
            });

            managerProcess.stdout.on('data', function (/*data*/) {
                if (!initialized) {
                    initialized = true;
                    deferred.resolve();
                }
            });

            managerProcess.stderr.on('data', function (data) {
                logger.error(data.toString('utf-8'));
            });

        } else {
            deferred.resolve();
        }
        return deferred.promise.nodeify(callback);
    }

    function stop(callback) {
        var deferred = Q.defer();
        managerProcess.kill('SIGINT');
        managerProcess = null;

        deferred.resolve();
        return deferred.promise.nodeify(callback);
    }

    return {
        start: start,
        stop: stop
    };
}

function WebhookManager(storage, mainLogger, gmeConfig) {

    switch (gmeConfig.webhooks.manager) {
        case 'memory':
            return new MemoryManager(storage, mainLogger, gmeConfig);
        case 'redis':
            return new RedisManager(mainLogger, gmeConfig);
        default:
            mainLogger.error('invalid configuration for webhooks', gmeConfig);
    }
}

module.exports = WebhookManager;