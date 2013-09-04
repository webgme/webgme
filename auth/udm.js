/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "storage/cache", "storage/mongo", "core/core", "core/guidcore" ],function(ASSERT,Cache,Mongo,Core,GuidCore){

    function userDataManager(_options){

        /*var _storage =  new Cache(
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
            */


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
                    } else {
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
                var userData = {};
                userData.puk = _core.getRegistry(_users[username].node,'puk');
                userData.create = _core.getRegistry(_users[username].node,'create');
                userData.projects = _core.getRegistry(_users[username].node,'projects');
                callback(null,userData);
            } else {
                callback(null,null);
            }
        }

        /*return {
            initialize: initialize,
            getUser : getUser
        }*/
        return {
            initialize : function(callback){callback(null);},
            getUser : function(user,callback){if(user === "kecso"){ callback(null,{create:true,puk:"abcd",projects:{"test":{open: true, delete: false, write: true},"users":{open: true, delete: false, write: true}}});} else {callback("NIE",null)}}
        }
    }


    return userDataManager;
});


