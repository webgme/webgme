define([ "core/assert","core/mongo","core/lib/sha1","socket.io",'logManager'], function (ASSERT,MONGO,SHA1,IO,logManager) {
    "use strict";
    var ProjectServer = function(_proxy,options){
        ASSERT((options.io && options.namespace) || options.port);
        ASSERT(options.mongo);
        var _logger = logManager.create('project - '+options.mongo.collection);
        var _socket = null;
        var _mongo = MONGO(options.mongo);
        var _selfid = null;
        var _nonamespace = false;
        var KEY = "_id";
        var BID = "*";
        var _polls = {};
        var _commits = {};
        var _clients = [];

        if(options.io){
            _socket = options.io.of(options.namespace);
            _selfid = "[PSRV-"+options.namespace+"]";
        } else {
            _nonamespace = true;
            _socket = IO.listen(options.port);
            _selfid = "[PSRV-"+options.port+"]";
        }

        var getBranchNameFromId = function(myid){
            //var regexp = new RegExp("^"+"\*");
            return myid.replace(/^\*/,'');
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

        var isTruePredecessor = function(commit,predecessorcommit){
            if(_commits[commit]){
                if( predecessorcommit === null || _commits[commit].parents.indexOf(predecessorcommit) !== -1){
                    return true;
                } else {
                    var retval = false;
                    for(var i=0;i<_commits[commit].parents.length;i++){
                        retval = retval || isTruePredecessor(_commits[commit].parents[i],predecessorcommit);
                    }
                    return retval;
                }
            } else {
                return false;
            }
        };

        var addClient = function(id){
            if(_clients.indexOf(id) === -1){
                _clients.push(id);
            }
        };
        var removeClient = function(id){
            var idx = _clients.indexOf(id);
            if(idx > -1 ){
                _clients.splice(idx,1);
                if(_clients.length === 0){
                    //_mongo.close();
                    _proxy.close(options.mongo.collection);
                }
            }
        };

        //functions for the clients
        _socket.on('connection',function(socket){
            addClient(socket.id);

            /*mongo functions*/
            socket.on('disconnect',function(){
                removeClient(socket.id);
            });
            socket.on('open',function(callback){
                _mongo.open(function(err){
                    if(err){
                        callback(err);
                    } else {
                        _commits = {};
                        _mongo.find({type:'commit'},function(err,commits){
                            if(!err){
                                for(var i=0;i<commits.length;i++){
                                    _commits[commits[i][KEY]] = commits[i];
                                }
                            }
                            callback();
                        });
                    }
                });
            });
            socket.on('load',function(key,callback){
                _mongo.load(key,callback);
            });
            socket.on('save',function(node,callback){
                //check if the object is hash-based
                var rechash = node[KEY];
                node[KEY] = false;
                var comphash = SHA1(node);
                if(true/*comphash === rechash*/){
                    node[KEY] = rechash;
                    _mongo.save(node,function(err){
                        if(!err){
                            if(node.type && node.type === 'commit'){
                                _commits[node[KEY]] = node;
                            }
                            callback();
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback('invalid hash value');
                }
            });
            socket.on('remove',function(key,callback){
                _mongo.remove(key,callback);
            });
            socket.on('close',function(callback){
                //_mongo.close(callback);
                //TODO how to handle when user tries to close the database connection??
                if(callback){
                    callback();
                }
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

            //only branches accepts polls
            socket.on('requestPoll',function(key,oldhash,callback){
                if(_polls[key]){
                    _polls[key].push(callback);
                } else {
                    _polls[key] = [callback];
                }
                _mongo.load("*#*"+key,function(err,branch){
                    if(!err && branch){
                        if(branch.commit !== oldhash){
                            callback(branch);
                            /*_mongo.load(branch.commit,function(err,commit){
                                if(!err && commit){
                                    callback(commit);
                                } else {
                                    _logger.warning('polling faulty branch\'s commit '+branch);
                                }
                            });*/
                        }
                    } else {
                        _logger.warning('polling faulty branch '+branch);
                    }
                });
            });

            socket.on('createBranch',function(name,callback){
                //TODO this should be a bit more sophisticated
                _mongo.save({'_id':"*#*"+name,name:name,type:'branch',commit:null},callback);
            });
            socket.on('deleteBranch',function(name,callback){
                _mongo.remove("*#*"+name,callback);
            });
            socket.on('updateBranch',function(name,commit,callback){
                //TODO if the server will not be exclusive - then we would have a lot of problems at this point
                if(_commits[commit]){
                    //we have to check whether the current commit value of the branch object is a predecessor of this commit
                    _mongo.load("*#*"+name,function(err,branch){
                        if(!err && branch){
                            if(isTruePredecessor(commit,branch.commit)){
                                //now we can update the branch
                                branch.commit = commit;
                                _mongo.save(branch,function(err){
                                    if(!err){
                                        if(_polls[name]){
                                            var object = _polls[name];
                                            for(var i=0;i<object.length;i++){
                                                if(!!(object[i] && object[i].constructor && object[i].call && object[i].apply)){
                                                    object[i](branch);
                                                }
                                            }
                                            delete _polls[name];
                                        }
                                    }
                                    callback(err);
                                });
                            } else {
                                callback('not fastforward from earlier commit');
                            }
                        } else {
                            callback('not valid branch to update');
                        }
                    });
                } else {
                    callback('commit is not valid');
                }
            });
        });

        //functions for the proxy
        var close = function(){
            //disconnect clients
            if(_socket){
                //_socket.sockets.emit('disconnect');
                if(_nonamespace){
                    _socket.sockets.clients().forEach(function (socket){
                        socket.disconnect();
                    });
                    _socket = null;
                } else {
                    _socket.clients().forEach(function(socket){
                       socket.disconnect();
                    });
                    _socket = null;
                }
            }

            //close the database connection
            if(_mongo && _mongo.opened()){
                _mongo.close();
            }
        };

        return {
            close : close
        }
    };
    return ProjectServer;
});

