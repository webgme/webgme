/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'storage/mongo', 'storage/server', 'storage/cache', 'storage/log', 'storage/broadcaster'], function (Mongo,Server,Cache,Log,Broadcaster) {
    "use strict";
    function server(options){
        var server = /*new Broadcaster(*/new Mongo(options)/*,options)*/;
        if (options.cache !== 0) {
            server = new Cache(server, options);
        }
        return new Server(new Log(server, options), options);
    }



    return server;
});


