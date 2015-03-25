/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'common/storage/mongo', 'common/storage/cache', 'common/storage/log', 'common/storage/commit', 'common/storage/fsync'], function (Mongo, Cache, Log, Commit,Fsync) {
    "use strict";
    function server(options){
        return new Log(new Commit(new Cache(new Fsync(new Mongo(options), options), options), options), options);
    }

    return server;
});

