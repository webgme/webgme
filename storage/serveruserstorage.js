/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'storage/mongo', 'storage/cache', 'storage/log'], function (Mongo,Cache,Log) {
    "use strict";
    function server(options){
        return new Log(new Cache(new Mongo(options),options),options);
    }

    return server;
});

