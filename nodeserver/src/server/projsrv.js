define([ "core/assert","core/mongo","socket.io"], function (ASSERT,MONGO,IO) {
    "use strict";
    var ProjectServer = function(options){
        ASSERT((options.io && options.namespace) || options.port);
        ASSERT(options.mongo);
        var _socket = null;
        var _mongo = MONGO(options.mongo);
        var _self = this;
        var _selfid = null;
        var KEY = "_id";
        var BID = "*";
        var _polls = {};

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
            var callbacks = _polls[getBranchNameFromId(root[KEY])];
            if(callbacks){
                for(var i=0;i<callbacks.length;i++){
                    callbacks[i](root);
                }
                delete _polls[getBranchNameFromId(root[KEY])];
            }
        };

        _socket.on('connection',function(socket){
            log("connection arrived",socket.id);

            /*mongo functions*/
            socket.on('open',function(callback){
                _mongo.open(callback);
            });
            socket.on('load',function(key,callback){
                _mongo.load(key,callback);
            });
            socket.on('save',function(node,callback){
                if(node[KEY].indexOf(BID) === 0){
                    _mongo.load(node[KEY],function(err,oldroot){
                        if(err){
                            callback(err);
                        } else {
                            if(compareRoots(oldroot,node)){
                                _mongo.save(node,function(err){
                                    if(!err){
                                        broadcastRoot(node);
                                    }
                                    callback(err);
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

            socket.on('requestPoll',function(branchname,callback){
                if(_polls[branchname]){
                    _polls[branchname].push(callback);
                } else {
                    _polls[branchname] = [callback];
                }
            });

        });
    };
    return ProjectServer;
});

