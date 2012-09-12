define([ "core/assert" ], function (ASSERT) {
    "use strict";

    var Cache = function (storage,projectinfo) {
        ASSERT(storage !== null);
        var KEYNAME = "_id";
        var SAVELIST = "SAVELIST";
        var DELETELIST = "DELETELIST";
        var OBJECTS = localStorage;
        var OBJINFO = {};
        var storageAvailable = false;
        var DELAY = 0;

        var cleanCache = function(){
            var removals = [];
            for(var i=0;i<OBJECTS.length;i++){
                var key = OBJECTS.key(i);
                if(key.indexOf(projectinfo) === 0){
                    removals.push(key);
                }
            }
            for(i=0;i<removals.length;i++){
                OBJECTS.removeItem(removals[i]);
            }
            for(i in OBJINFO){
                if(OBJINFO.hasOwnProperty(i)){
                    if(OBJINFO[i].loading){
                        while(OBJINFO[i].callbacks.length>0){
                            var cb = OBJINFO[i].callbacks.pop();
                            cb("CLEANING CACHE ERROR",null);
                        }
                    }
                }
            }
            OBJINFO = {};
        };
        var loadCacheItem = function(key){
            return OBJECTS.getItem(key);
        };
        var saveCacheItem = function(key,data){
            try{
                OBJECTS.setItem(key,data);
            } catch (e) {
                if (e == QUOTA_EXCEEDED_ERR) {
                    console.log("LS QUOTA EXCEEDED")
                    cleanCache();
                    saveCacheItem(key,data);
                }
            }
        };
        var open = function(callback){
            storage.open(function(err){
                if(err){
                    callback(err);
                } else {
                    storageAvailable = true;
                    cleanCache();
                    OBJINFO = {};
                    callback(null);
                }
            });
        };
        var close = function(callback){
            storageAvailable = false;
            OBJINFO = {};
            storage.close(callback);
        };
        var load = function(key,callback){
            setTimeout(function(){
                var data = JSON.parse(loadCacheItem(projectinfo+key));
                if(data){
                    if(OBJINFO[key]){
                        if(OBJINFO[key].loading){
                            OBJINFO[key].loading = false;
                            while(OBJINFO[key].callbacks.length>0){
                                var cb = OBJINFO[key].callbacks.pop();
                                cb(null,data);
                            }
                            callback(null,data);
                        } else {
                            callback(null,data);
                        }
                    } else {
                        OBJINFO[key] = {loading:false,callbacks:[]};
                        callback(null,data);
                    }
                } else {
                    if(OBJINFO[key]){
                        if(OBJINFO[key].loading){
                            OBJINFO[key].callbacks.push(callback);
                        } else {
                            OBJINFO[key] = {loading:true,callbacks:[callback]};
                        }
                    } else {
                        OBJINFO[key] = {loading:true,callbacks:[callback]};
                    }

                    /*TODO maybe some more detailed error handling ispossible if we that the storage is unavailable*/
                    storage.load(key,function(err,node){
                        if(err){
                            storageAvailable = false;
                            storage.whenAvailable(availableAgain);
                        } else {
                            if(node){
                                saveCacheItem(projectinfo+node[KEYNAME],JSON.stringify(node));
                            }
                        }

                        if(OBJINFO[key]){
                            if(OBJINFO[key].loading){
                                OBJINFO.loading = false;
                                while(OBJINFO[key].callbacks.length>0){
                                    var cb = OBJINFO[key].callbacks.pop();
                                    cb(err,node);
                                }
                            }
                        }
                    });
                }
            },DELAY);
        };
        var save = function(node,callback){
            setTimeout(function(){
                var data = JSON.parse(loadCacheItem(projectinfo+node[KEYNAME]));
                if(data){
                    callback(null);
                } else {
                    saveCacheItem(projectinfo+node[KEYNAME],JSON.stringify(node));
                    if(OBJINFO[node[KEYNAME]]){
                        if(OBJINFO[node[KEYNAME]].loading){
                            while(OBJINFO[node[KEYNAME]].callbacks.length>0){
                                var cb = OBJINFO[node[KEYNAME]].callbacks.pop();
                                cb(null,node);
                            }
                        }
                    } else {
                        OBJINFO[node[KEYNAME]] = {loading:false,callbacks:[]}
                    }

                    storage.save(node,function(err){
                        if(err){
                            console.log("fault tolerant storage save "+err);
                            var savequeue = JSON.parse(loadCacheItem(projectinfo+SAVELIST)) || [];
                            savequeue.push(node);
                            saveCacheItem(projectinfo+SAVELIST,JSON.stringify(savequeue));
                            storageAvailable = false;
                            storage.whenAvailable(availableAgain);
                            callback(null);
                        } else {
                            storageAvailable = true;
                            callback(null);
                            sync();
                        }
                    });
                }
            },DELAY);
        };
        var remove = function(key,callback){
            /*setTimeout(function(){
                OBJECTS.removeItem(collectionname+key);
                storage.remove(key,function(err){
                    if(err){
                        console.log("fault tolerant storage delete "+err);
                        var delqueue = JSON.parse(OBJECTS.getItem(projectinfo+DELETELIST)) || [];
                        delqueue.push(key);
                        OBJECTS.setItem(projectinfo+DELETELIST,JSON.stringify(delqueue));
                        storageAvailable = false;
                        storage.whenAvailable(availableAgain);
                        callback(null);
                    } else {
                        storageAvailable = true;
                        callback(null);
                        sync();
                    }
                });
            },DELAY);*/
            callback(null);
        };
        var removeAll = function(callback){
            /*TODO*/
            cleanCache();
            storage.removeAll(callback);
        };

        var sync = function(){
            var savequeue = JSON.parse(loadCacheItem(projectinfo+SAVELIST)) || [];
            if(savequeue.length === 0){
                var delqueue = JSON.parse(loadCacheItem(projectinfo+DELETELIST)) || [];
                if(delqueue.length > 0){
                    var key = delqueue.pop();
                    saveCacheItem(projectinfo+DELETELIST,JSON.stringify(delqueue));
                    remove(key,function(err){
                        /*TODO*/
                    });
                }
            } else {
                var node = savequeue.pop();
                saveCacheItem(projectinfo+SAVELIST,JSON.stringify(savequeue));
                save(node,function(err){
                    /*TODO*/
                });
            }
        };

        var availableAgain = function(){
            storageAvailable = true;
            sync();
        };


        return {
            open: open,
            opened: storage.opened,
            close: close,
            KEYNAME: KEYNAME,
            load: load,
            save: save,
            remove: remove,
            dumpAll: storage.dumpAll,
            removeAll: removeAll,
            searchId: storage.searchId
        }
    };

    return Cache;
});

