define([ "core/assert","core/mongo","socket.io"], function (ASSERT,MONGO,IO) {
    "use strict";
    var MongoServer = function(options){
        ASSERT((options.io && options.namespace) || options.port);
        ASSERT(options.mongo);
        var _socket = null;
        var _mongo = MONGO(options.mongo);
        var _self = this;
        var _selfid = null;
        var ROOTID = "***root***";
        var KEY = "_id";
        var BID = "*";
        var _clients = {};

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

        var compareRoots = function(oldroot,newroot){
            if(oldroot.root.length !== newroot.root.length-1){
                return false;
            }

            for(var i=0; i<oldroot.root.length;i++){
                if(oldroot.root[i] !== newroot.root[i]){
                    return false;
                }
            }

            return true;
        };
        var broadcastRoot = function(root){
            for(var i in _clients){
                if(root[KEY] === _clients[i].branch){
                    _clients[i].socket.emit('rootUpdated',root);
                }
            }
        };

        _socket.on('connection',function(socket){
            log("connection arrived",socket.id);
            _clients[socket.id] = {socket:socket,branch:null};

            /*mongo functions*/
            socket.on('open',function(callback){
                _mongo.open(callback);
            });
            socket.on('load',function(key,callback){
                _mongo.load(key,function(err,node){
                    if(err){
                        callback(err,node);
                    } else {
                        if(node && node[KEY].indexOf(BID) === 0){
                            /*this load means a branch change so we put the user into the right notification list*/
                            _clients[socket.id][branch] === node[KEY];
                            broadcastRoot(node);
                            callback(null,node);
                        }
                    }
                });
            });
            socket.on('save',function(node,callback){
                if(node[KEY].indexof(BID) === 0){
                    /*active commit save - we have to check extra stuffa*/
                    _mongo.load(node[KEY],function(err,oldroot){
                        if(err){
                            callback(err);
                        } else {
                            if(compareRoots(oldroot,node)){
                                _mongo.save(node,function(err){
                                    if(err){
                                        callback(err);
                                    } else {
                                        /*we have to broadcast the updated root to everyone*/

                                    }
                                });
                            } else {
                                callback("invalid root cannot be saved!!!");
                            }
                        }
                    });
                } else {
                    _mongo.save(node,callback);
                }
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

