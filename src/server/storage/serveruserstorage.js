/*globals requireJS*/
/*jshint node:true*/

/**
* @author kecso / https://github.com/kecso
*/
'use strict';

var Cache = requireJS('common/storage/cache'),
    Log = requireJS('common/storage/log'),
    Commit = requireJS('common/storage/commit'),

    Fsync = require('./fsync'),
    Mongo = require('./mongo');


function server (options) {
    return new Log(new Commit(new Cache(new Fsync(new Mongo(options), options), options), options), options);
}

module.exports = server;


