/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'common/storage/mongo', 'common/storage/server', 'common/storage/cache', 'common/storage/log', 'common/storage/broadcaster', 'common/storage/fsync'],
    function (Mongo, Server, Cache, Log, Broadcaster, Fsync) {
    "use strict";
    function server(options){
        var storages = [];
        storages.push(Fsync);
        storages.push(Broadcaster);
        storages.push(Cache);
        storages.push(Log);
        storages.push(Server);

        return storages.reduce(function (inner, class_) {
            return new class_(inner, options);
        }, new Mongo(options));
    }

    return server;
});


