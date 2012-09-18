define([ "core/assert","core/mongo","socket.io"], function (ASSERT,MONGO,IO) {
    "use strict";
    var RootServer = function(options){
        ASSERT((options.io && options.namespace) || options.port);
        ASSERT(options.mongo);
        var _socket = null;
        var _mongo = MONGO(options.mongo);
        var _self = this;
        var _selfid = null;
        var ROOTID = "***root***";
        var _syncing = false;
        var _newroot = false;

        var _log = options.log || function(txt){ console.log(txt);};
        var log = function(txt,socketid){
            var prefix = _selfid;
            prefix += socketid === null ? "" : "["+socketid+"]";
            _log(prefix+txt);
        };
        var sendRoot = function(socket){
            _mongo.load(ROOTID,function(err,root){
                if(!err && root){
                    socket.emit('newRoot',root.value[0]);
                } else {
                    log("problem with sending root ("+err+","+JSON.stringify(root)+")",socket.id);
                }
            });
        };


        if(options.io){
            _socket = options.io.of(options.namespace);
            _selfid = "[RSRV-"+options.namespace+"]";
        } else {
            _socket = IO.listen(options.port);
            _selfid = "[RSRV-"+options.port+"]";
        }
        _mongo.open(function(){
            _socket.on('disconnect',function(socket){
                delete _connecteds[socket.id];
            });

            _socket.on('connection',function(socket){
                log("new connection",socket.id);
                sendRoot(socket);

                socket.on('modifyRoot',function(oldroot,newroot){
                    _mongo.load(ROOTID,function(err,root){
                        if(!err){
                            root = root || {_id:ROOTID,value:[]};
                            if((oldroot === root.value[0] || root.value[0] === null) && newroot){
                                root.value.unshift(newroot);
                                _mongo.save(root,function(err){
                                    if(!err){
                                        socket.broadcast.emit("newRoot",root.value[0]);
                                        socket.emit("newRoot",root.value[0]);
                                    }
                                });
                            }
                        }
                    });
                });
                socket.on('undoRoot',function(){
                    _mongo.load(ROOTID,function(err,root){
                        if(!err && root){
                            if(root.value.length > 1){
                                root.value.shift();
                                _mongo.save(root,function(err){
                                    if(!err){
                                        socket.broadcast.emit("newRoot",root.value[0]);
                                        socket.emit("newRoot",root.value[0]);
                                    }
                                });
                            }
                        }
                    });
                });
            });
        });


    };
    return RootServer;
});

