/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'storage/mongo', 'storage/server', 'storage/cache', 'storage/log'], function (Mongo,Server,Cache,Log) {
    "use strict";
    function server(options){
        return new Server(new Log(new Cache(new Mongo(options),options),options),options);
    }



    return server;
});


