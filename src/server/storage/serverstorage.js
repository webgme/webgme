/*globals requireJS*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */
'use strict';

var Cache = requireJS('common/storage/cache'),
    Log = requireJS('common/storage/log'),
    Broadcaster = requireJS('common/storage/broadcaster'),

    Fsync = require('./fsync'),
    Mongo = require('./mongo'),
    Server = require('./server');

function server(options) {
    var storages = [];
    storages.push(Fsync);
    storages.push(Broadcaster);
    storages.push(Cache);
    storages.push(Log);
    storages.push(Server);

    return storages.reduce(function (inner, Class) {
        return new Class(inner, options);
    }, new Mongo(options));
}

module.exports = server;


