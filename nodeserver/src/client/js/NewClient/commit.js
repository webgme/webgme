define([
    'util/assert',
    'util/sha1',
    'common/CommonUtil'],
    function(ASSERT,SHA1,commonUtil){
        'use strict';

        var BRANCH_ID = "*";
        var ERROR_DISCONNECTED = 'The socket.io is disconnected';

        var commit = function(_project){

            var _branch = {}, //bname : {local : hash, server : hash, status : online/offline/network}
                _active = null,
                _updateFunction = function(){},
                _statusFunction = function(){};

            var makeCommit = function(hash,parentCommit,branch,parents,msg,callback){
                callback = callback || function(){};
                branch = branch || _active;
                parents = parents || [_branch[branch].local];
                msg = msg || "n/a";

                var commitObj = {
                    _id     : "",
                    root    : hash,
                    parents : parents,
                    updater : ['TODO'],
                    time    : commonUtil.timestamp(),
                    message : msg,
                    name    : branch,
                    type    : "commit"
                };

                commitObj._id = '#' + SHA1(JSON.stringify(commitObj));
                _project.insertObject(commitObj,function(err){
                    if(err){
                        callback(err);
                    } else {
                        callback(null,commitObj._id);
                    }
                });
            };

            var makeMerge = function(callback){
                callback('NIE');
            };

            var changeStatus = function(branch,newstatus){
                //we can add here the event emitting
                _branch[branch].status = newstatus;
                if(branch === _active){
                    _statusFunction(newstatus);
                }
            };

            var serverUpdate = function(branch,callback){
                ASSERT(_branch[branch].status === 'online');
                var oldhash = _branch[branch].server,
                    newhash = _branch[branch].local;
                //we expect success so we locally update the server hash...
                _branch[_active].server = newhash;
                _project.setBranchHash(BRANCH_ID+branch,oldhash,newhash,function(err){
                    if(err){
                        _branch[branch].server = oldhash;
                        if(err === ERROR_DISCONNECTED){
                            changeStatus(branch,'network');
                        } else {
                            changeStatus(branch,'offline');
                        }
                    }
                    callback(err);
                });
            };

            var reconnecting = function(branch){
                var back = function(){
                    if(_branch[branch].status === 'network'){
                        changeStatus(branch,'online');
                        serverUpdate(branch,function(err){
                            switch (_branch[branch].status){
                                case 'network':
                                    reconnect(back);
                                    break;
                                case 'online':
                                    branchWatcher(branch);
                                    break;
                            }
                        });
                    }
                };
                reconnect(back);
            };

            var reconnect = function(callback){
                //we get the database status, then we wait until it changes
                var oldstatus = null;
                var statusArrived = function(err,newstatus){
                    if(!err && newstatus){
                        if(oldstatus === null){
                            oldstatus = newstatus;
                            _project.getDatabaseStatus(oldstatus,statusArrived);
                        } else {
                            if(oldstatus !== newstatus){
                                callback();
                            } else {
                                _project.getDatabaseStatus(oldstatus,statusArrived);
                            }
                        }
                    } else {
                        _project.getDatabaseStatus(oldstatus,statusArrived);
                    }
                };
                _project.getDatabaseStatus(oldstatus,statusArrived);
            };

            var branchWatcher = function(branch){
                var repeater = function(err,newhash){
                    if(_active === branch){
                        if(!err && newhash){
                            if(newhash !== _branch[branch].server){
                                _branch[branch].server = newhash;
                                if(_branch[branch].status === 'online'){
                                    _updateFunction(newhash,function(){
                                        //TODO is there something we can do with the error???
                                        _branch[branch].local = newhash;
                                        _project.getBranchHash(BRANCH_ID+branch,_branch[branch].server,repeater);
                                    });
                                } else {
                                    _project.getBranchHash(BRANCH_ID+branch,_branch[branch].server,repeater);
                                }
                            } else {
                                _project.getBranchHash(BRANCH_ID+branch,_branch[branch].server,repeater);
                            }
                        } else {
                            if(err === ERROR_DISCONNECTED){
                                changeStatus(branch,'network');
                                reconnecting(branch);
                            } else {
                                changeStatus(branch,'offline');
                            }
                        }
                    } else {
                        if(!err && newhash){
                            _branch[branch].server = newhash;
                        }
                    }
                };
                _project.getBranchHash(BRANCH_ID+branch,_branch[branch].server,repeater);
            };

            var newBranch = function(name,startCommitHash,updateFunction){
                ASSERT(typeof updateFunction === 'function' && typeof name === 'string' && !_branch[name]);
                _branch[name] = {local: startCommitHash, server: "", status: 'online'};
                _updateFunction = updateFunction;
                _active = name;
                branchWatcher(name);
            };

            var selectBranch = function(name,updateFunction){
                ASSERT(typeof updateFunction === 'function' && typeof name === 'string' && name !== _active);
                _active = name;
                _updateFunction = updateFunction;
                if(!_branch[_active]){
                    _branch[_active] = {local:"",server:"",status:'online'};
                    changeStatus(_active,'online');
                    branchWatcher(name);
                } else {
                    switch (_branch[_active].status){
                        case online:
                        case network:
                            if(_branch[_active].local !== ""){
                                _updateFunction(_branch[_active].local,function(){
                                    branchWatcher(name);
                                });
                            } else {
                                branchWatcher(name);
                            }
                            break;
                        default:
                            //in case of offline branch we just load our last hash
                            if(_branch[_active].local !== ""){
                                _updateFunction(_branch[_active].local,function(){
                                    //TODO do we need to start watching???
                                });
                            }
                            break;
                    }
                }
            };

            var updateBranch = function(commitHash,callback){
                ASSERT(typeof _active === 'string' && _branch[_active]);

                _branch[_active].local = commitHash;
                if(_branch[_active].status === 'online'){
                    serverUpdate(_active,callback);
                } else {
                    callback(null);
                }
            };

            var clearLocalBranch = function(name,callback){
                if(name !== _active){
                    if(_branch[name]){
                        _branch[name].local = _branch[name].server;
                        _branch[name].status = 'online';
                    }
                    callback(null);
                } else {
                    switch (_branch[name].status){
                        case 'offline':
                            //we change our local commit so we should load it
                            _branch[name].local = _branch[name].server;
                            changeStatus(name,'online');
                            _updateFunction(_branch[name].local,function(){
                                callback(null);
                            });
                            break;
                        case 'network':
                            //as we already watch for reconnection we just simply remove the local commit info
                            _branch[name].local = _branch[name].server;
                            break;
                        default:
                            //nothing to do
                            callback(null);
                            break;
                    }
                }
            };

            var deleteBranch = function(name,callback){
                ASSERT(name !== _active);
                _project.getBranchHash(name,"",function(err,newhash){
                    if(!err && newhash){
                        _project.setBranchHash(name,newhash,"",function(err){
                            if(!err){
                                delete _branch[name];
                            }

                            callback(err);
                        });
                    } else {
                        callback('cannot get latest state of branch');
                    }
                });
            };

            var setStatusFunc = function(func){
                _statusFunction = func;
                if(_branch[_active]){
                    _statusFunction(_branch[_active].status);
                }
            };

            return {
                makeCommit       : makeCommit,
                makeMerge        : makeMerge,
                newBranch        : newBranch,
                selectBranch     : selectBranch,
                updateBranch     : updateBranch,
                clearLocalBranch : clearLocalBranch,
                deleteBranch     : deleteBranch,
                setStatusFunc    : setStatusFunc
            }
        };
        return commit;
    });
