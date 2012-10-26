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
            if(oldroot === null || oldroot.root === newroot.oldroot){
                return true;
            }
            console.log("root matching error old:"+JSON.stringify(oldroot)+" new:"+JSON.stringify(newroot));
            return false;
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
                console.log('save '+node[KEY]);
                var okay = false;

                var saving = function(){
                    _mongo.save(node,function(err){
                        if(!err){
                            if(_polls[node[KEY]]){
                                console.log('we have polls');
                                var object = _polls[node[KEY]];
                                for(var i=0;i<object.length;i++){
                                    console.log('calling poll');
                                    if(!!(object[i] && object[i].constructor && object[i].call && object[i].apply)){
                                        console.log('poll is a function');
                                        object[i](node);
                                    }
                                }
                                delete _polls[node[KEY]];
                            }
                            console.log('save callback '+node[KEY]);
                            callback();
                        } else {
                            callback(err);
                        }
                    });
                };

                //start of the function
                if(node[KEY].indexOf(BID) === 0){
                    _mongo.load(node[KEY],function(err,oldroot){
                        if(err){
                            callback(err);
                        } else {
                            if(compareRoots(oldroot,node)){
                                saving();
                            } else {
                                callback("invalid root cannot be saved!!!");
                            }
                        }
                    });
                } else {
                    saving();
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

            socket.on('requestPoll',function(key,callback){
                console.log('requesting poll '+key);

                if(_polls[key]){
                    _polls[key].push(callback);
                } else {
                    _polls[key] = [callback];
                }
            });

        });
    };
    return ProjectServer;
});

