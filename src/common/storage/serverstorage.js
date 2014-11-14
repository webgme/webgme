/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ 'storage/mongo', 'storage/server', 'storage/cache', 'storage/log', 'storage/broadcaster'], function (Mongo,Server,Cache,Log,Broadcaster) {
    "use strict";
    function server(options){
        return new Server(new Log(new Cache/*(new Broadcaster*/(new Mongo(options)/*,options)*/,options),options),options);
    }



    return server;
});


