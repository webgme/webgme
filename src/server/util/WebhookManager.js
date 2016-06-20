/**
 * @author kecso / https://github.com/kecso
 */
var MessageSender = require('webhook-manager/src/hookMessager'),
    CONSTANTS = requireJS('common/storage/constants'),
    spawn = require('child_process').spawn,
    path = require('path'),
    __baseDir = requireJS.s.contexts._.config.baseUrl; // TODO: this is ugly

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
        messageHandler.start(function (err) {
            if (err) {
                callback(err);
            } else {
                storage.addEventListener(CONSTANTS.PROJECT_DELETED, projectDeleted);
                storage.addEventListener(CONSTANTS.BRANCH_DELETED, branchDeleted);
                storage.addEventListener(CONSTANTS.BRANCH_CREATED, branchCreated);
                storage.addEventListener(CONSTANTS.BRANCH_HASH_UPDATED, branchUpdated);
                storage.addEventListener(CONSTANTS.TAG_CREATED, tagCreated);
                storage.addEventListener(CONSTANTS.TAG_DELETED, tagDeleted);
                callback(null);
            }
        });
    }

    function stop() {
        storage.removeEventListener(projectDeleted);
        storage.removeEventListener(branchDeleted);
        storage.removeEventListener(branchCreated);
        storage.removeEventListener(branchUpdated);
        storage.removeEventListener(tagCreated);
        storage.removeEventListener(tagDeleted);
        messageHandler.stop();
    }

    return {
        start: start,
        stop: stop
    };
}

function redisManager(logger, gmeConfig) {
    var managerProc = null,
        initialized = false,
        stopping = false;

    function start(callback) {
        if (managerProc === null) {
            try {
                managerProc = spawn('node', [
                    path.join(__baseDir, '../node_modules/webhook-manager/src/webhookManager.js'),
                    gmeConfig.mongo.uri
                ]);

                managerProc.stdout.on('data', function (data) {
                    initialized = true;
                    var cb;

                    if (callback) {
                        cb = callback;
                        callback = null;
                        cb(null);
                    }
                });

                managerProc.stderr.on('data', function (data) {
                    logger.error(data.toString('utf-8'));
                });

                managerProc.on('close', function (code) {
                    if (!stopping) {
                        if (initialized) {
                            managerProc = null;
                            restart();
                        } else {
                            callback(new Error('failed to start webhook manager process!'));
                        }
                    }
                });
            } catch (err) {
                callback(err);
            }
        } else {
            callback(null);
        }
    }

    function restart() {
        var interval = setInterval(function () {
            if (managerProc === null) {
                start(function (err) {
                    if (!err) {
                        clearInterval(interval);
                    } else {
                        logger.error(err);
                    }
                });
            }
        }, 1000);
    }

    function stop() {
        stopping = true;
        managerProc.kill();
        managerProc = null;
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