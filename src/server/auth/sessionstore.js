/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(['express'],function(express){
    function sessionStore(){
        var MemoryStore = express.session.MemoryStore,
            store = new MemoryStore();
        store.check = function(sid,callback){
            store.get(sid,function(err,data){
                if(!err && data){
                    return callback(null,data.authenticated === true);
                } else {
                    return callback(err,false);
                }
            });
        };
        store.getSessionUser = function(sid,callback){
            store.get(sid,function(err,data){
                if(!err && data){
                    return callback(null,data.udmId);
                } else {
                    return callback(err,false);
                }
            });
        };
        return store;
    }

    return sessionStore;
});
