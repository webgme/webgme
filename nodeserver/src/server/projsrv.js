define([ "core/assert","core/mongo","socket.io"], function (ASSERT,MONGO,IO) {
    "use strict";
    var ProjectServer = function(options){
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
            _selfid = "[PSRV-"+options.namespace+"]";
        } else {
            _socket = IO.listen(options.port);
            _selfid = "[PSRV-"+options.port+"]";
        }

        var _log = options.log || function(txt){ console.log(txt);};
        var log = function(txt,socketid){
            var prefix = _selfid;
            prefix += socketid === null ? "" : "["+socketid+"]";
            _log(prefix+txt);
        };

        var getBranchNameFromId = function(myid){
            //var regexp = new RegExp("^"+"\*");
            return myid.replace(/^\*/,'');
        };

        var compareRoots = function(oldroot,newroot){
            /*if((oldroot === null || oldroot === undefined) && newroot ){
                return true;
            }

            if(oldroot.root.length !== newroot.root.length-1){
                return false;
            }

            for(var i=0; i<oldroot.root.length;i++){
                if(oldroot.root[i] !== newroot.root[i]){
                    return false;
                }
            }*/

            return true;
        };
        var broadcastRoot = function(root){
            for(var i in _clients){
                if(root[KEY] === _clients[i].branch){
                    _clients[i].socket.emit('updated',root);
                }
            }
        };

        _socket.on('connection',function(socket){
            log("connection arrived",socket.id);
            _clients[socket.id] = {socket:socket,subscriptions:{}};

            /*mongo functions*/
            socket.on('open',function(callback){
                _mongo.open(callback);
            });
            socket.on('load',function(key,callback){
                _mongo.load(key,callback);
            });
            socket.on('save',function(node,callback){
                if(node[KEY].indexOf(BID) === 0){
                    console.log("branchupdate!!!")
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
                                        var branchname = getBranchNameFromId(node[KEY]);
                                        console.log("kecso "+branchname);
                                        for(var i in _clients){
                                            console.log("kecso be");
                                            if(_clients[i]["subscriptions"][branchname]){
                                                console.log("kecso vegre");
                                                console.log(JSON.stringify(_clients[i]["subscriptions"][branchname]));
                                                _clients[i]["subscriptions"][branchname](node);
                                                _clients[i].socket.emit('updated',node);
                                            }
                                        }
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
            socket.on('find',function(criteria,callback){
                _mongo.find(criteria,callback);
            });

            socket.on('subscribe',function(branchname,updatefunction){
                console.log("KKK "+JSON.stringify(updatefunction));
                _clients[socket.id]["subscriptions"][branchname] = updatefunction;
                _mongo.load(BID+branchname,function(err,node){
                    if(!err && node){
                        updatefunction(node);
                    }
                });
            });

            socket.on('unsubscribe',function(branchname){
                if(_clients[socket.id]){
                    delete _clients[socket.id]["subscriptions"][branchname];
                }
            });

            socket.on('disconnect',function(){
                delete _clients[socket.id];
            });
        });
    };
    return ProjectServer;
});

