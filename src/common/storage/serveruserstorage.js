/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'storage/mongo', 'storage/cache', 'storage/log', 'storage/commit','storage/fsync'], function (Mongo, Cache, Log, Commit,Fsync) {
    "use strict";
    function server(options){
        return new Log(new Commit(new Cache(new Fsync(new Mongo(options), options), options), options), options);
    }

    return server;
});

