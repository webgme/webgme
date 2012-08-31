define([], function () {
    "use strict";

    var LogStorage = function (storage,logger) {
        var log = function(msg){
            if(logger){
                logger.log("[LogStorage][FC]"+msg);
            }
        };
        var open = function(callback){
            log("open");
            storage.open(callback);
        };
        var close = function(callback){
            log("close");
            storage.close(callback);
        };
        var load = function(key,callback){
            log("load("+JSON.stringify(key)+")");
            storage.load(key,callback);
        };
        var save = function(node,callback){
            log("save("+JSON.stringify(node)+")");
            storage.save(node,callback);
        };
        var remove = function(key,callback){
            log("remove("+JSON.stringify(key)+")");
            storage.remove(key,callback);
        };
        var removeAll = function(callback){
            log("removeAll");
            storage.removeAll(callback);
        };

        var dumpAll = function(callback){
            log("dumpAll");
            storage.dumpAll(callback);
        };
        var searchId = function(beggining,callback){
            log("searchId("+JSON.stringify(beggining)+")");
            storage.searchId(beggining,callback);
        };
        var whenAvailable = function(callback){
            log("whenAvailable()");
            storage.whenAvailable(callback);
        };

        return {
            open: open,
            opened: storage.opened,
            close: close,
            KEYNAME: storage.KEYNAME,
            load: load,
            save: save,
            remove: remove,
            dumpAll: dumpAll,
            removeAll: removeAll,
            searchId: searchId,
            whenAvailable: whenAvailable
        }
    };

    return LogStorage;
});


