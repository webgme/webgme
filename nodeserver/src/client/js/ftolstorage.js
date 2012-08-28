define([ "core/assert" ], function (ASSERT) {
    "use strict";

    var Cache = function (storage,projectinfo) {
        ASSERT(storage !== null);
        var KEYNAME = "_id";
        var SAVELIST = "SAVELIST";
        var DELETELIST = "DELETELIST";
        var MAXENTRY = 20000;
        var numOfEntry = 0;
        var OBJECTS = localStorage;
        var storageAvailable = false;

        var open = function(callback){
            storage.open(function(err){
                if(err){
                    callback(err);
                } else {
                    storageAvailable = true;
                    OBJECTS.clear();
                    callback(null);
                }
            });
        };
        var close = function(callback){
            storageAvailable = false;
            storage.close(callback);
        };
        var load = function(key,callback){
            setTimeout(function(){
                var data = JSON.parse(OBJECTS.getItem(projectinfo+key));
                if(data){
                    callback(null,data)
                }
                else{
                    storage.load(key,function(err,node){
                        if(err){
                            console.log("fault tolerant storage "+err);
                            callback(err);
                        } else {
                            if(node){
                                OBJECTS.setItem(projectinfo+node[KEYNAME],JSON.stringify(node));
                                storageAvailable = true;
                                callback(null,node);
                                sync();
                            } else {
                                callback(null,node);
                            }
                        }
                    });
                }
            },0);
        };
        var save = function(node,callback){
            setTimeout(function(){
                OBJECTS.setItem(projectinfo+node[KEYNAME],JSON.stringify(node));
                storage.save(node,function(err){
                    if(err){
                        console.log("fault tolerant storage save "+err);
                        var savequeue = JSON.parse(OBJECTS.getItem(projectinfo+SAVELIST)) || [];
                        savequeue.push(node);
                        OBJECTS.setItem(projectinfo+SAVELIST,JSON.stringify(savequeue));
                        storageAvailable = false;
                        storage.whenAvailable(availableAgain);
                        callback(null);
                    } else {
                        storageAvailable = true;
                        callback(null);
                        sync();
                    }
                });
            },0);
        };
        var remove = function(key,callback){
            setTimeout(function(){
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
            },0);
        };
        var removeAll = function(callback){
            /*TODO*/
            storage.removeAll(callback);
        };

        var sync = function(){
            var savequeue = JSON.parse(OBJECTS.getItem(projectinfo+SAVELIST)) || [];
            if(savequeue.length === 0){
                var delqueue = JSON.parse(OBJECTS.getItem(projectinfo+DELETELIST)) || [];
                if(delqueue.length > 0){
                    var key = delqueue.pop();
                    OBJECTS.setItem(projectinfo+DELETELIST,JSON.stringify(delqueue));
                    remove(key,function(err){
                        /*TODO*/
                    });
                }
            } else {
                var node = savequeue.pop();
                OBJECTS.setItem(projectinfo+SAVELIST,JSON.stringify(savequeue));
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

