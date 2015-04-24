/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

'use strict';

var session = require('express-session');

function sessionStore(parentLogger, gmeConfig) {
    var MemoryStore = session.MemoryStore,
        MongoStore = require('connect-mongo')(session),
        RedisStore = require('connect-redis')(session),
        logger = parentLogger.fork('session-store'),
        store;

    logger.debug('initializing');

    logger.debug('using ' + gmeConfig.server.sessionStore.type + ' Store');
    if (gmeConfig.server.sessionStore.type.toLowerCase() === 'memory') {
        store = new MemoryStore(gmeConfig.server.sessionStore.options);
    } else if (gmeConfig.server.sessionStore.type.toLowerCase() === 'mongo') {
        store = new MongoStore(gmeConfig.server.sessionStore.options);
    } else if (gmeConfig.server.sessionStore.type.toLowerCase() === 'redis') {
        store = new RedisStore(gmeConfig.server.sessionStore.options);
    } else {
        logger.error('unknown session store type: ' +
            gmeConfig.server.sessionStore.type +
            ' supported types: Memory, Mongo, Redis'
        );
        // FIXME: throw an exception? hard error?
    }


    store.check = function (sid, callback) {
        store.get(sid, function (err, data) {
            if (!err && data) {
                return callback(null, data.authenticated === true);
            } else {
                return callback(err, false);
            }
        });
    };
    store.getSessionUser = function (sid, callback) {
        store.get(sid, function (err, data) {
            if (!err && data) {
                return callback(null, data.udmId);
            } else {
                return callback(err, false);
            }
        });
    };

    logger.debug('ready');

    return store;
}

module.exports = sessionStore;
