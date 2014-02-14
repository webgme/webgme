/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["storage/mongo", "storage/commit", "core/core", "util/guid"],function(Mongo,Commit,Core,GUID){
    function GMEAuth(_options){
        var _collection = _options.collection || 'users',
            _session = _options.session,
            _validity = _options.validity || 60000,
            _userField = _options.user || 'username',
            _passwordField = _options.password || 'password',
            _tokenExpiration = _options.tokenTime || 0;
            _guest = _options.guest === true ? true : false,
            _storage = new Commit(new Mongo(
                {
                    host: _options.host || '127.0.0.1',
                    port: _options.port || 27017,
                    database: _options.database || 'test'
                }),{}),
            _project = null,
            _core = null,
            _cachedUserData = {};

        function isTokenValid (creationTime){
            if(_tokenExpiration === 0){
                return true;
            }

            if(creationTime+_tokenExpiration < (new Date()).getDate()){
                return true;
            }

            return false;
        }
        function getProjectId (userId,projectName){
            return ""+userId+"/"+projectName;
        }
        function clearData(id){
            if(_cachedUserData[id]){
                delete _cachedUserData[id];
            }
        }
        function getLatestCommit(callback){
            var hasEverything = function(){
                _project.getBranchHash('master','#hack',function(err,commithash){
                    if(!err && commithash){
                        _project.loadObject(commithash,function(err,commit){
                            if(!err && commit){
                                callback(null,commit);
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
            getLatestCommit(function(err,commit){
                if(!err && commit){
                    _core.loadRoot(commit.root,function(err,root){
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
            getLatestCommit(function(err,commit){
                if(!err && commit){
                    _core.loadRoot(commit.root,function(err,root){
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
        function getUserNodeByToken(tokenId,callback){
            getLatestCommit(function(err,commit){
                if(!err && commit){
                    _core.loadRoot(commit.root,function(err,root){
                        if(!err && root){
                            _core.loadChildren(root,function(err,children){
                                if(!err && children && children.length>0){
                                    for(var i=0;i<children.length;i++){
                                        var token = _core.getAttribute(children[i],'token');
                                        if(token !== undefined && token !== null){
                                            if(tokenId === token.id && isTokenValid(token.created) === true){
                                                callback(null,children[i]);
                                                return;
                                            }
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
            var pId = getProjectId(id,projectName);
            if(_cachedUserData[pId]){
                callback(null,_cachedUserData[pId]);
            } else {
                getUserNode(id,function(err,node){
                    if(!err){
                        _cachedUserData[pId] = _core.getRegistry(node,'projects')[projectName];
                        setTimeout(clearData,_validity,pId);
                        return callback(null,_cachedUserData[pId]);
                    } else {
                        callback(err);
                    }
                })
            }
        }

        function addProjectToUser(userId,projectName,callback){
            getUserNode(userId,function(err,userNode){
                if(!err && userNode){
                    var userProjects = _core.getRegistry(userNode,'projects');
                    if(userProjects === null || userProjects === undefined){
                        userProjects = {};
                    } else {
                        userProjects = JSON.parse(JSON.stringify(userProjects));
                    }
                    userProjects[projectName] = {read:true,write:true,delete:true};
                    _core.setRegistry(userNode,'projects',userProjects);
                    var root = _core.getRoot(userNode);
                    _core.persist(root,function(){});
                    var newHash = _core.getHash(root);
                    getLatestCommit(function(err,oldCommit){
                        if(!err && oldCommit){
                            var newCommitHash = _project.makeCommit([oldCommit.root],newHash,'user '+userId+'have created '+projectName+' project',function(err){});
                            _project.setBranchHash('master',oldCommit['_id'],newCommitHash,function(err){
                                if(!err){
                                    _cachedUserData[getProjectId(userId,projectName)] = {read:true,write:true,delete:true};
                                    callback(null);
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        }

        function removeProjectFromUser(userId,projectName,callback){
            getUserNode(userId,function(err,userNode){
                if(!err && userNode){
                    var userProjects = _core.getRegistry(userNode,'projects');
                    if(userProjects === null || userProjects === undefined){
                        userProjects = {};
                    } else {
                        userProjects = JSON.parse(JSON.stringify(userProjects));
                    }
                    delete userProjects[projectName];
                    _core.setRegistry(userNode,'projects',userProjects);
                    var root = _core.getRoot(userNode);
                    _core.persist(root,function(){});
                    var newHash = _core.getHash(root);
                    getLatestCommit(function(err,oldCommit){
                        if(!err && oldCommit){
                            var newCommitHash = _project.makeCommit([oldCommit.root],newHash,'user '+userId+'have created '+projectName+' project',function(err){});
                            _project.setBranchHash('master',oldCommit['_id'],newCommitHash,function(err){
                                if(!err){
                                    delete _cachedUserData[getProjectId(userId,projectName)];
                                    callback(null);
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        }

        function authenticate(req,res,next){
            var userId = req.body[_userField],
                password = req.body[_passwordField],
                gmail = false,
                returnUrl = req.__gmeAuthFailUrl__ || "/";
            delete req.__gmeAuthFailUrl__;
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
                            res.redirect(returnUrl);
                        }
                    }
                } else {
                    res.redirect(returnUrl);
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
                    var projId = getProjectId(userID,projectName);
                    if(type === 'create'){
                        if(_cachedUserData[userID]){
                            if(_cachedUserData[userID].create === true){
                                addProjectToUser(userID,projectName,function(err){
                                    if(!err){
                                        callback(null,true);
                                    } else {
                                        callback('cannot update user rights',false);
                                    }
                                });
                            } else {
                                callback(null,false);
                            }
                        } else {
                            getUser(userID,function(err,userData){
                                if(!err && userData){
                                    if(userData.create === true){
                                        addProjectToUser(userID,projectName,function(err){
                                            if(!err){
                                                callback(null,true);
                                            } else {
                                                callback('cannot update user rights',false);
                                            }
                                        });
                                    } else {
                                        callback(null,false);
                                    }
                                } else {
                                    err = err || 'no valid user permissions found';
                                    callback(err,false);
                                }
                            });
                        }
                    } else if (type === 'delete'){
                        if(_cachedUserData[projId]){
                            if(_cachedUserData[projId]['delete'] === true){
                                removeProjectFromUser(userID,projectName,function(err){
                                    if(err){
                                        callback(err,false);
                                    } else {
                                        callback(null,true);
                                    }
                                });
                            } else {
                                callback('no valid user permissions found',false);
                            }
                        } else {
                            getUserProject(userID,projectName,function(err,userData){
                                if(!err && userData){
                                    if(userData['delete'] === true){
                                        removeProjectFromUser(userID,projectName,function(err){
                                            if(err){
                                                callback(err,false);
                                            } else {
                                                callback(null,true);
                                            }
                                        });
                                    } else {
                                        callback('no valid user permissions found',false);
                                    }
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

        function getAuthorizationInfo(sessionId,projectName,callback){
            _session.getSessionUser(sessionId,function(err,userID){
                if(!err && userID){
                    var projId = getProjectId(userID,projectName);
                    if(_cachedUserData[projId]){
                        callback(null,_cachedUserData[projId]);
                    } else {
                        getUserProject(userID,projectName,function(err,userData){
                            if(!err && userData){
                                callback(null,_cachedUserData[projId]);
                            } else {
                                callback(null,{read:false,write:false,delete:false});
                            }
                        });
                    }
                } else {
                    callback(null,{read:false,write:false,delete:false});
                }
            });
        }

        function tokenAuthorization(tokenId,projectName,callback){ //TODO currently we expect only reads via token usage!!!
            getUserNodeByToken(tokenId,function(err,userNode){
                if(err){
                    callback(err,false);
                } else {
                    var userId = _core.getAttribute(userNode,'name');
                    if(typeof userId === 'string'){
                        getUserProject(userId,projectName,function(err,projInfo){
                            if(err){
                                callback(err,false);
                            } else {
                                if(projInfo){
                                    callback(null,projInfo['read'] || false);
                                } else {
                                    callback(null,false);
                                }
                            }
                        });

                    }
                }
            });
        }

        function generateToken(sessionId,callback){
            _session.getSessionUser(sessionId,function(err,userID){
                if(!err && userID){
                    getUserNode(userID,function(err,userNode){
                        if(!err && userNode){
                            var token = GUID()+'token';
                            _core.setAttribute(userNode,'token',{id:token,created:(new Date()).getDate()});
                            _core.persist(_core.getRoot(userNode),function(){});
                            var newHash = _core.getHash(_core.getRoot(userNode));
                            getLatestCommit(function(err,oldCommit){
                                if(!err && oldCommit){
                                    var newCommitHash = _project.makeCommit([oldCommit.root],newHash,'token for user '+userID+' have been created',function(err){});
                                    _project.setBranchHash('master',oldCommit['_id'],newCommitHash,function(err){
                                        if(!err){
                                            callback(null,token);
                                        } else {
                                            callback(err,null);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err,null);
                        }
                    });
                } else {
                    callback(err,null);
                }
            });
        }
        function getToken(sessionId,callback){
            _session.getSessionUser(sessionId,function(err,userID){
                if(!err && userID){
                    getUserNode(userID,function(err,userNode){
                        if(!err && userNode){
                            var token = _core.getAttribute(userNode,'token');
                            if(token !== null && token !== undefined){
                                if(isTokenValid(token.created) === true){
                                    callback(null,token.id);
                                } else {
                                    generateToken(sessionId,callback);
                                }
                            } else {
                                generateToken(sessionId,callback);
                            }
                        } else {
                            callback(err,null);
                        }
                    });
                } else {
                    callback(err,null);
                }
            });
        }
        function checkToken(token,callback){
            getUserNodeByToken(token,function(err,user){
                if(!err){
                    callback(true);
                } else {
                    callback(false);
                }
            });
        }
        return {
            authenticate: authenticate,
            authorize: authorize,
            getAuthorizationInfo: getAuthorizationInfo,
            tokenAuthorization: tokenAuthorization,
            generateToken: generateToken,
            getToken: getToken,
            checkToken: checkToken
        }
    }

    return GMEAuth;
});
