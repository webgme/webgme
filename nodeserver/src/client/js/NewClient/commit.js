define([
    'core/assert',
    'core/lib/sha1',
    'common/CommonUtil'],
    function(ASSERT,SHA1,commonUtil){
        'use strict';

        var BRANCH_ID = "*";
        var ERROR_DISCONNECTED = 'The socket.io is disconnected';

        var commit = function(_project){

            var _branch = {}, //bname : {local : hash, server : hash, changed : true/false, status : online/offline/network}
                _active = null,
                _updateFunction = function(){};

            var makeCommit = function(core,rootObject,parentCommit,callback){
                ASSERT(typeof core === 'object' && typeof callback === 'function' && typeof rootObject === 'object');
                var rootHash = core.persist(rootObject);
                if(!rootHash){
                    rootHash = core.getKey(rootObject);
                }

                var commitObj = {
                    _id     : null,
                    root    : rootHash,
                    parents : parentCommit ? [parentCommit._id] : [],
                    updates : ['TODO'],
                    time    : commonUtil.timestamp(),
                    message : "TODO",
                    name    : "TODO",
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

            var changeStatus = function(newstatus){
                //we can add here the event emitting
                _branch[_active].status = newstatus;
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
                _branch[name] = {local: startCommitHash, server: null, status: 'online'};
                _updateFunction = updateFunction;
                _active = name;
                branchWatcher(name);
            };

            var selectBranch = function(name,updateFunction){
                ASSERT(typeof updateFunction === 'function' && typeof name === 'string' && name !== _active);
                _active = name;
                _updateFunction = updateFunction;
                if(!_branch[_active]){
                    _branch[_active] = {local:null,server:null,status:'online'};
                    branchWatcher(name);
                } else {
                    switch (_branch[_active].status){
                        case online:
                            branchWatcher(name);
                            break;
                        case network:
                            reconnecting(name);
                            break;
                        //in case of offline branch we do not start watcher
                    }
                }
            };

            var updateBranch = function(commitHash,callback){
                ASSERT(typeof _active === 'string' && _branch[_active]);

                _branch[_active].local = commitHash;
                switch(_branch[_active.status]){
                    case 'online':
                        serverUpdate(_active,callback);
                        break;
                    case 'network':
                        _branch[_active].changed = true;
                        break;
                    default:
                        callback(null);
                }
                if(_branch[_active].status === 'online'){
                    serverUpdate(_active,callback);
                } else {
                    callback(null);
                }
            };

            return {
                makeCommit     : makeCommit,
                makeMerge      : makeMerge,
                newBranch      : newBranch,
                selectBranch   : selectBranch,
                updateBranch   : updateBranch

            }
        };
        return commit;
    });
