/**
 * @author kecso / https://github.com/kecso
 */
var MessageSender = require('webhook-manager/src/hookMessager'),
    CONSTANTS = requireJS('common/storage/constants'),
    spawn = require('child_process').spawn,
    path = require('path'),
    Q = require('q');

function memoryManager(storage, logger, gmeConfig) {
    var messageHandler = new MessageSender({
        uri: gmeConfig.mongo.uri,
        collection: '_projects'
    });

    function projectDeleted(_s, data) {
        messageHandler.send(CONSTANTS.PROJECT_DELETED, data);
    }

    function branchDeleted(_s, data) {
        messageHandler.send(CONSTANTS.BRANCH_DELETED, data);
    }

    function branchCreated(_s, data) {
        messageHandler.send(CONSTANTS.BRANCH_CREATED, data);
    }

    function branchUpdated(_s, data) {
        messageHandler.send(CONSTANTS.BRANCH_HASH_UPDATED, data);
    }

    function tagCreated(_s, data) {
        messageHandler.send(CONSTANTS.TAG_CREATED, data);
    }

    function tagDeleted(_s, data) {
        messageHandler.send(CONSTANTS.TAG_DELETED, data);
    }

    function start(callback) {
        var deferred = Q.defer();
        messageHandler.start(function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                storage.addEventListener(CONSTANTS.PROJECT_DELETED, projectDeleted);
                storage.addEventListener(CONSTANTS.BRANCH_DELETED, branchDeleted);
                storage.addEventListener(CONSTANTS.BRANCH_CREATED, branchCreated);
                storage.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED, branchUpdated);
                storage.addEventListener(CONSTANTS.TAG_CREATED, tagCreated);
                storage.addEventListener(CONSTANTS.TAG_DELETED, tagDeleted);
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
        messageHandler.stop(function (err) {
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

function redisManager(logger, gmeConfig) {
    var managerProc = null,
        initialized = false;

    function start(callback) {
        var deferred = Q.defer(),
            spawnParameters = [require.resolve('webhook-manager'), gmeConfig.mongo.uri];

        if (managerProc === null) {
            if (gmeConfig.socketIO.adapter.options && gmeConfig.socketIO.adapter.options.uri) {
                spawnParameters.push('redis://' + gmeConfig.socketIO.adapter.options.uri);
            }
            managerProc = spawn('node', spawnParameters);

            managerProc.stdout.on('data', function (data) {
                if (!initialized) {
                    initialized = true;
                    deferred.resolve();
                }
            });

            managerProc.stderr.on('data', function (data) {
                logger.error(data.toString('utf-8'));
            });

            managerProc.on('close', function (code) {
                if (initialized) {
                    managerProc = null;
                    logger.info('webhookManager process has been exited with code:', code);
                    initialized = false;
                } else {
                    deferred.reject(new Error('failed to start webhook manager process!'));
                }
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise.nodeify(callback);
    }

    function stop(callback) {
        var deferred = Q.defer();
        managerProc.kill();
        managerProc = null;

        deferred.resolve();
        return deferred.promise.nodeify(callback);
    }

    return {
        start: start,
        stop: stop
    };
}

function WebhookManager(storage, logger, gmeConfig) {

    switch (gmeConfig.webhooks.manager) {
        case 'memory':
            return new memoryManager(storage, logger.fork('memoryWebhookManager'), gmeConfig);
        case 'redis':
            return new redisManager(logger.fork('redisWebhookManager'), gmeConfig);
        default:
            logger.error('invalid configuration for webhooks', gmeConfig);
    }
}

module.exports = WebhookManager;