define(['commonUtil'], function (CU) {
    "use strict";
    var GUID = CU.guid;
    var TSSTRING = function(){
        return "["+CU.timestamp()+"]";
    };
    var TIMESTAMP = CU.timestamp;
    var ETIMESTRING = function(start){
        return "{"+ (TIMESTAMP()-start) + "ms}";
    };
    var LogStorage = function (storage,logger) {
        var log = function(msg){
            if(logger){
                logger.log(TSSTRING()+"[LogStorage]"+msg);
            } else {
                console.log(TSSTRING()+"[LogStorage]"+msg);
            }
        };
        var open = function(callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"open()";
            log(text);
            storage.open(function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };
        var close = function(callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"close()";
            log(text);
            storage.close(function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };
        var load = function(key,callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"load("+key+")";
            log(text);
            storage.load(key,function(err,node){
                log(text+ETIMESTRING(start));
                callback(err,node);
            });
        };
        var save = function(node,callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"save("+node["_id"]+")";
            log(text);
            storage.save(node,function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };
        var remove = function(key,callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"remove("+key+")";
            log(text);
            storage.remove(key,function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };
        var removeAll = function(callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"removeAll()";
            log(text);
            storage.removeAll(function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };

        var dumpAll = function(callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"dumpAll()";
            log(text);
            storage.dumpAll(function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };
        var searchId = function(beggining,callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"searchId("+beggining+")";
            log(text);
            storage.searchId(beggining,function(err,node){
                log(text+ETIMESTRING(start));
                callback(err,node);
            });
        };
        var whenAvailable = function(callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"whenAvailable()";
            log(text);
            storage.whenAvailable(function(){
                log(text+ETIMESTRING(start));
                callback();
            });
        };
        var fsync = function(callback){
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"fsync()";
            log(text);
            storage.fsync(function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });

        };

        var getUpdated = function(myfunction){
            var guid = "["+GUID()+"]";
            var text = guid+"getUpdated()";
            log(text);
            storage.getUpdated(myfunction);
        };

        var find = function(criteria,callback){
            var guid = "["+GUID()+"]";
            var text = guid+"find("+JSON.stringify(criteria)+")";
            log(text);
            storage.find(criteria,function(err,nodes){
                log(text+ETIMESTRING(start));
                callback(err,nodes);
            });
        };

        var subscribe = function(branchname,updatefunction){
            var guid = "["+GUID()+"]";
            var text = guid+"subscribe("+branchname+")";
            log(text);
            storage.subscribe(branchname,updatefunction);
        };

        var unsubscribe = function(branchname){
            var guid = "["+GUID()+"]";
            var text = guid+"unsubscribe("+branchname+")";
            log(text);
            storage.subscribe(branchname,updatefunction);
        };

        return {
            open          : open,
            opened        : storage.opened,
            close         : close,
            KEYNAME       : storage.KEYNAME,
            load          : load,
            save          : save,
            remove        : remove,
            dumpAll       : dumpAll,
            removeAll     : removeAll,
            searchId      : searchId,
            whenAvailable : whenAvailable,
            fsync         : fsync,
            getUpdated    : getUpdated,
            find          : find,
            subscribe     : subscribe,
            unsubscribe   : unsubscribe
        }
    };

    return LogStorage;
});


