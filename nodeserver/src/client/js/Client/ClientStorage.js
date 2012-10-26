define([
    'js/Client/ClientStorageSIO',
    'core/cache',
    'commonUtil',
    'js/Client/ClientStorageStable'
],
    function(siobase,CACHE,CU,ftbase){
        'use strict';
        var GUID = CU.guid;
        var TSSTRING = function(){
            return "["+CU.timestamp()+"]";
        };
        var TIMESTAMP = CU.timestamp;
        var ETIMESTRING = function(start){
            return "{"+ (TIMESTAMP()-start) + "ms}";
        };

        var ClientStorage = function(options){
            var _base = options.faulttolerant === true ? new ftbase(options) : new siobase(options),
                storage = _base;

            if(options.cache){
                storage = new CACHE(_base);
            }


            var log = null;
            if(options.logger){
                log = function(msg){
                    options.logger.log(TSSTRING()+"[LogStorage]"+msg);
                    };
            }else {
                log = function(msg){
                        console.log(TSSTRING()+"[LogStorage]"+msg);
                    };
            }

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

            var requestPoll = function(branchname,updatefunction){
                var start = TIMESTAMP();
                var guid = "["+GUID()+"]";
                var text = guid+"requestPoll("+branchname+")";
                log(text);
                storage.requestPoll(branchname,function(node){
                    log(text+ETIMESTRING(start));
                    updatefunction(node);
                });
            };

            if(options.log){
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
                    find          : find,
                    requestPoll   : requestPoll
                }
            } else {
                /*just simple interface towards lower layer storage*/
                return {
                    open          : storage.open,
                    opened        : storage.opened,
                    close         : storage.close,
                    KEYNAME       : storage.KEYNAME,
                    load          : storage.load,
                    save          : storage.save,
                    remove        : storage.remove,
                    dumpAll       : storage.dumpAll,
                    removeAll     : storage.removeAll,
                    searchId      : storage.searchId,
                    whenAvailable : storage.whenAvailable,
                    fsync         : storage.fsync,
                    find          : storage.find,
                    requestPoll   : storage.requestPoll
                }
            }
        };

        return ClientStorage;
    });
