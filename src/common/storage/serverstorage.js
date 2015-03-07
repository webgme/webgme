/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'storage/mongo', 'storage/server', 'storage/cache', 'storage/log', 'storage/broadcaster', 'storage/fsync'],
    function (Mongo, Server, Cache, Log, Broadcaster, Fsync) {
    "use strict";
    function server(options){
        var storages = [];
        // storages.push(Broadcaster);
        storages.push(Fsync);
        if (options.cache !== 0) {
            storages.push(Cache);
        }
        storages.push(Log);
        storages.push(Server);

        return storages.reduce(function (inner, class_) {
            return new class_(inner, options);
        }, new Mongo(options));
    }

    return server;
});


