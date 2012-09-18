define([ "core/assert","core/mongo","socket.io"], function (ASSERT,MONGO,IO) {
    "use strict";
    var MongoServer = function(options){
        ASSERT((options.io && options.namespace) || options.port);
        ASSERT(options.mongo);
        var _socket = null;
        var _mongo = MONGO(options.mongo);
        var _self = this;
        var _selfid = null;
        if(options.io){
            _socket = options.io.of(options.namespace);
            _selfid = "[DSRV-"+options.namespace+"]";
        } else {
            _socket = IO.listen(options.port);
            _selfid = "[DSRV-"+options.port+"]";
        }

        var _log = options.log || function(txt){ console.log(txt);};
        var log = function(txt,socketid){
            var prefix = _selfid;
            prefix += socketid === null ? "" : "["+socketid+"]";
            _log(prefix+txt);
        };

        _socket.on('connection',function(socket){
            log("connection arrived",socket.id);
            socket.on('open',function(callback){
                _mongo.open(callback);
            });
            socket.on('load',function(key,callback){
                _mongo.load(key,callback);
            });
            socket.on('save',function(node,callback){
                _mongo.save(node,callback);
            });
            socket.on('remove',function(key,callback){
                _mongo.remove(key,callback);
            });
            socket.on('close',function(callback){
                _mongo.close(callback);
            });
            socket.on('removeAll',function(callback){
                _mongo.removeAll(callback);
            });
            socket.on('searchId',function(beginning,callback){
                _mongo.searchId(beginning,callback);
            });
            socket.on('dumpAll',function(callback){
                _mongo.dumpAll(callback);
            });
            socket.on('fsync',function(callback){
                _mongo.fsync(callback);
            });
        });
    };
    return MongoServer;
});
