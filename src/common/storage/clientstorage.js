/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(['common/storage/client', 'common/storage/failsafe', 'common/storage/cache', 'common/storage/commit', 'common/storage/log'], function (Client,Failsafe,Cache,Commit,Log) {
    "use strict";
    function client(options){
        //return  new Log(new Commit(new Cache(new Failsafe(new Client(options),options),options),options),options);
        return  new Commit(new Cache(new Failsafe(new Client(options),options),options),options);
    }



    return client;
});


