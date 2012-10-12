define([ "core/assert" ], function (ASSERT) {
    "use strict";

    var Cache = function (watcher,storage,projectinfo) {
        ASSERT(storage !== null);

        var KEYNAME = "_id";
        var PENDING = "pending";
        var OBJECTS = localStorage;
        var inSync = watcher ? watcher.dataInSync : function(){};
        var outSync = watcher ? watcher.dataOutSync : function(){};


        var open = function(callback) {
            storage.open(function(err) {
               if(!err) {
                   sync();
               }
                callback(err);
            });
        }

        var load = function(key,callback){
            storage.load(key, function(err,node){
                if(err) {
                    var data = OBJECTS.getItem(PENDING+key);
                    if( data ) {
                        data = JSON.parse(data);
                        err = null;
                        node = data.object;
                    }
                }
                callback(err,node);
            });
        };

        var save = function(node,callback){
            storage.save(node,function(err){
                var newerr = null;
                if(err) {
                    console.log("real save failed "+node[KEYNAME]);
                    storage.whenAvailable(sync);
                    outSync();

                    var data = OBJECTS.getItem(PENDING+node[KEYNAME]);
                    if( data ) {
                        data = JSON.parse(data);
                        if( data.projects.indexOf(projectinfo) < 0 ) {
                            data.projects.push(projectinfo);
                        }
                        else {
                            data = null;
                        }
                    }
                    else {
                        data = {
                            projects: [projectinfo],
                            object: node
                        };
                    }

                    if( data !== null ) {
                        data = JSON.stringify(data);
                        try{
                            OBJECTS.setItem(PENDING+node[KEYNAME],data);
                        } catch (e) {
                            console.log("local storage full");
                            newerr = err;
                        }
                    }
                }
                callback(newerr);
            });
        };

        var sync = function(){
            var count = 0;
            var objectSyncronized = function(){
                if(--count === 0){
                    inSync();
                }
            };
            var tryToSave = function(obj) {
                storage.save(obj, function(err) {
                    if( !err ) {
                        var name = PENDING + obj[KEYNAME];
                        var data = OBJECTS.getItem(name);
                        if( data ) {
                            data = JSON.parse(data);
                            var index = data.projects.indexOf(projectinfo);
                            if( index >= 0 ) {
                                data.projects.splice(index, 1);
                                if( data.projects.length === 0 ) {
                                    OBJECTS.removeItem(name);
                                }
                                else {
                                    OBJECTS.setItem(name, JSON.stringify(data));
                                }
                                console.log("pending object saved "+ obj[KEYNAME]);
                                objectSyncronized();
                            }
                        }
                    }
                    else {
                        storage.whenAvailable(sync);
                        outSync();
                    }
                });
            };

            console.log("trying to save pending objects");
            for(var i=0; i<OBJECTS.length; i++){
                var name = OBJECTS.key(i);
                if( name.indexOf(PENDING) === 0 ) {
                    var data = OBJECTS.getItem(name);
                    data = JSON.parse(data);
                    if( data.projects.indexOf(projectinfo) >= 0 ) {
                        count++;
                        tryToSave(data.object);
                    }
                }
            }

            if(count === 0){
                inSync();
            }
        };

        var remove = function(key,callback){
            callback("not implemented");
        };

        var removeAll = function(callback){
            storage.removeAll(callback);
        };

        var fsync = function(callback){
            storage.fsync(function(err){
                //TODO how to hanlde coming errors
                callback(null);
            });
        };
        return {
            open         : open,
            opened       : storage.opened,
            close        : storage.close,
            KEYNAME      : KEYNAME,
            load         : load,
            save         : save,
            remove       : remove,
            dumpAll      : storage.dumpAll,
            removeAll    : removeAll,
            searchId     : storage.searchId,
            fsync        : fsync,
            find         : storage.find,
            requestPoll  : storage.requestPoll
        }
    };

    return Cache;
});

