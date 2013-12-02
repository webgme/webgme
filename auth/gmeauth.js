/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["storage/mongo", "core/core"],function(Mongo,Core){
    function GMEAuth(_options){
        var _collection = _options.collection || 'users',
            _session = _options.session,
            _validity = _options.validity,
            _userField = _options.user || 'username',
            _passwordField = _options.password || 'password',
            _guest = _options.guest === true ? true : false,
            _storage = new Mongo(
                {
                    host: _options.host || '127.0.0.1',
                    port: _options.port || 27017,
                    database: _options.database || 'test'
                }),
            _project = null,
            _core = null,
            _cachedUserData = {};

        function clearData(id){
            if(_cachedUserData[id]){
                delete _cachedUserData[id];
            }
        }
        function getLatestRootHash(callback){
            var hasEverything = function(){
                _project.getBranchHash('master','#hack',function(err,commithash){
                    if(!err && commithash){
                        _project.loadObject(commithash,function(err,commit){
                            if(!err && commit){
                                callback(null,commit.root);
                            } else {
                                err = err || 'invalid latest database info';
                                callback(err);
                            }
                        });
                    } else {
                        err = err || 'no valid branch found';
                        callback(err);
                    }
                });
            };
            if(_project === null){
                _storage.openDatabase(function(err){
                    if(!err){
                        _storage.openProject(_collection,function(err,proj){
                            if(!err && proj){
                                _project = proj;
                                _core = new Core(_project);
                                hasEverything();
                            } else {
                                err = err || 'cannot open project';
                                callback(err);
                            }
                        })
                    } else {
                        callback(err);
                    }
                });
            } else {
                if(_core === null){
                    _core = new Core(_project);
                }

                hasEverything();
            }
        }
        function getUserNode(id,callback){
            getLatestRootHash(function(err,rootHash){
                if(!err && rootHash){
                    _core.loadRoot(rootHash,function(err,root){
                        if(!err && root){
                            _core.loadChildren(root,function(err,children){
                                if(!err && children && children.length>0){
                                    for(var i=0;i<children.length;i++){
                                        var name = _core.getAttribute(children[i],'name');
                                        if(id === name){
                                            return callback(null,children[i]);
                                        }
                                    }
                                    err = err || 'no such user found';
                                    callback(err);
                                } else {
                                    err = err || 'no such user found';
                                    callback(err);
                                }
                            });
                        } else {
                            err = err || 'cannot find user manager\'s root';
                            callback(err);
                        }
                    });
                } else {
                    err = err || 'cannot open user data';
                    callback(err);
                }
            });
        }
        function getUserNodeByEmail(email,callback){
            getLatestRootHash(function(err,rootHash){
                if(!err && rootHash){
                    _core.loadRoot(rootHash,function(err,root){
                        if(!err && root){
                            _core.loadChildren(root,function(err,children){
                                var guest = null;
                                if(!err && children && children.length>0){
                                    for(var i=0;i<children.length;i++){
                                        var name = _core.getRegistry(children[i],'email');
                                        if(email === name){
                                            return callback(null,children[i]);
                                        }
                                        if('guest' === _core.getAttribute(children[i],'name')){
                                            guest = children[i];
                                        }
                                    }
                                    if(_guest && guest !== null){
                                        return callback(null,guest);
                                    } else {
                                        return callback('no such user found');
                                    }
                                } else {
                                    err = err || 'no user found';
                                    return callback(err);
                                }
                            })
                        } else {
                            err = err || 'cannot find user manager\'s root';
                            return callback(err);
                        }
                    });
                } else {
                    err = err || 'cannot open user data';
                    return callback(err);
                }
            });
        }
        function getUser(id,callback){
            if(_cachedUserData[id]){
                callback(null,_cachedUserData[id]);
            } else {
                getUserNode(id,function(err,node){
                    if(!err){
                        _cachedUserData[id] = {create:_core.getRegistry(node,'create')};
                        setTimeout(clearData,_validity,id);
                        return callback(null,_cachedUserData[id]);
                    } else {
                        callback(err);
                    }
                })
            }
        }
        function getUserProject(id,projectName,callback){
            if(_cachedUserData[id]){
                callback(null,_cachedUserData[id]);
            } else {
                getUserNode(id,function(err,node){
                    if(!err){
                        _cachedUserData[id+'/'+projectName] = _core.getRegistry(node,'projects')[projectName];
                        setTimeout(clearData,_validity,id+'/'+projectName);
                        return callback(null,_cachedUserData[id+'/'+projectName]);
                    } else {
                        callback(err);
                    }
                })
            }
        }

        function authenticate(req,res,next){
            var userId = req.body[_userField],
                password = req.body[_passwordField],
                gmail = false;
            //gmail based authentication - no authentication just user search
            if(userId === null || userId === undefined){
                userId = req.query['openid.ext1.value.email'];
                password = null;
                gmail = true;
            }
            var haveUser = function(err,node){
                if(!err){
                    if(gmail){
                        req.session.udmId = _core.getAttribute(node,'name');
                        req.session.authenticated = true;
                        req.session.userType = 'GME';
                        next(null);
                    } else {
                        if(password = _core.getRegistry(node,'pass')){
                            req.session.udmId = _core.getAttribute(node,'name');
                            req.session.authenticated = true;
                            req.session.userType = 'GME';
                            next(null);
                        } else {
                            res.redirect('/');
                        }
                    }
                } else {
                    res.redirect('/');
                }
            };
            if(userId.indexOf('@')>0){
                getUserNodeByEmail(userId,haveUser);
            } else {
                getUserNode(userId,haveUser);
            }
        }
        function authorize(sessionId,projectName,type,callback){
            _session.getSessionUser(sessionId,function(err,userID){
                if(!err && userID){
                    var projId = userID+'/'+projectName;
                    if(type === 'create'){
                        if(_cachedUserData[userID]){
                            callback(null,_cachedUserData[userID].create === true);
                        } else {
                            getUser(userID,function(err,userData){
                                if(!err && userData){
                                    callback(null,userData.create === true);
                                } else {
                                    err = err || 'no valid user permissions found';
                                    callback(err,false);
                                }
                            });
                        }
                    } else {
                        if(_cachedUserData[projId]){
                            callback(null,_cachedUserData[projId][type] === true);
                        } else {
                            getUserProject(userID,projectName,function(err,userData){
                                if(!err && userData){
                                    callback(null,userData[type] === true);
                                } else {
                                    err = err || 'no valid user permissions found';
                                    callback(err,false);
                                }
                            });
                        }
                    }

                } else {
                    err = err || 'not valid session';
                    callback(err,false);
                }
            });
        }

        return {
            authenticate: authenticate,
            authorize: authorize
        }
    }

    return GMEAuth;
});
