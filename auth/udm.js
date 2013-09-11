/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "storage/cache", "storage/mongo", "core/core", "core/guidcore" ],function(ASSERT,Cache,Mongo,Core,GuidCore){

    function userDataManager(_options){

        var _storage =  new Cache(
                new Mongo(
                    {
                        host: _options.ip,
                        port: _options.port,
                        database: _options.database
                    }),
                {}),
            _project = null,
            _core = null,
            _users = {}; //name:{node,hash,name}



        function getUserData(id){
            var userData = {};
            userData.puk = _core.getRegistry(_users[id].node,'puk');
            userData.create = _core.getRegistry(_users[id].node,'create');
            userData.projects = {};
            userData.pass = _core.getRegistry(_users[id].node,'pass');
            userData.email = _core.getRegistry(_users[id].node,'email');
            return userData;
        }
        function getUserProjectData(id,projectname){
            var projects = _core.getRegistry(_users[id].node,'projects');
            return projects[projectname] || {read:false,write:false,delete:false};
        }

        function initialize(callback){
            if(_core !== null && _project !== null){
                callback(null);
            } else {
                _users = {};
                _storage.openDatabase(function(err){
                    if(!err){
                        _storage.openProject(_options.collection, function(err,project){
                            if(!err && project){
                                _project = project;
                                _core = new GuidCore(new Core(_project));
                                _project.getBranchHash('master','',function(err,commithash){
                                    if(!err && commithash){
                                        _project.loadObject(commithash,function(err,commit){
                                            if(!err && commit){
                                                loadUsers(commit.root,callback);
                                            } else {
                                                setAutoReInit();
                                                callback(err);
                                            }
                                        });
                                    } else {
                                        setAutoReInit();
                                        callback(err);
                                    }
                                });

                            } else {
                                setAutoReInit();
                                callback(err);
                            }
                        });
                    } else {
                        setAutoReInit();
                        callback(err);
                    }
                });
            }
        }
        function loadUsers(roothash,callback){
            _core.loadRoot(roothash,function(err,root){
                if(!err && root){
                    _core.loadChildren(root,function(err,children){
                        if(!err && children && children.length > 0){
                            for(var i=0;i<children.length;i++){
                                var child = {node:children[i],name:_core.getAttribute(children[i],'name'),hash:_core.getSingleNodeHash(children[i])};
                                if(_users[child.name]){
                                    if(_users[child.name].hash !== child.hash){
                                        _users[child.name] = child;
                                    }
                                } else {
                                    _users[child.name] = child;
                                }
                            }
                            callback(null);
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        }
        function getUser(username,callback){
            if(_users[username]){
                callback(null,getUserData(username));
            } else {
                callback("no such user",null);
            }
        }
        function getUserByEmail(email,callback){
            for(var i in _users){
                if(_core.getRegistry(_users[i].node,'email') === email){
                    return callback(null,getUserData(i));
                }
            }
            return callback("no such user",null);
        }
        function getUserProject(username,projectname,callback){
            if(_users[username]){
                callback(null,getUserProjectData(username,projectname));
            } else {
                callback("no such user",null);
            }
        }
        function getUserByEmailProject(email,projectname,callback){
            for(var i in _users){
                if(_core.getRegistry(_users[i].node,'email') === email){
                    return callback(null,getUserProjectData(i,projectname));
                }
            }
            return callback("no such user",null);
        }
        function setAutoReInit(){
            if(_options.refresh > 0){
                setInterval(initialize,_options.refresh,function(){});
            }
        }

        return {
            initialize: initialize,
            getUser : getUser,
            getUserByEmail : getUserByEmail,
            getUserProject : getUserProject,
            getUserByEmailProject : getUserByEmailProject
        }
    }


    return userDataManager;
});


