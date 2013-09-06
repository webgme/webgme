/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid","socket.io" ],function(ASSERT,GUID,IO){

    var server = function(_database,options){
        ASSERT(typeof _database === 'object');
        options = options || {};
        options.port = options.port || 888;
        var _socket = null,
            _objects = {},
            _projects = {},
            _references = {},
            _databaseOpened = false,
            ERROR_DEAD_GUID = 'the given object does not exists';

        function addClient(id,project){
            if(!_references[project]){
                _references[project] = [];
            }
            if(_references[project].indexOf(id) === -1){
                _references[project].push(id);
            }
        }

        function checkDatabase(callback){
            if(_databaseOpened){
                callback();
            } else {
                _database.openDatabase(function(err){
                    if(err){
                        callback(err);
                    } else {
                        _databaseOpened = true;
                        callback(null);
                    }
                });
            }
        }

        /*function checkProject(client,project,callback){
            if(_projects[project]){
                addClient(client,project);
                callback(null);
            } else {
                _database.openProject(project,function(err,proj){
                    if(!err && proj){
                        _projects[project] = proj;
                        addClient(client,project);
                        callback(null);
                    } else {
                        callback(err);
                    }
                });
            }
        }*/
        function checkProject(){
            ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
            var callback = arguments[arguments.length-1];
            var client = arguments[0];
            var project = arguments[1];
            var iCallBack = function(err,proj){
                if(!err && proj){
                    _projects[project] = proj;
                    addClient(client,project);
                    callback(null);
                } else {
                    callback(err);
                }
            };
            var iArgs = [];
            for(var i=1;i<arguments.length;i++){
                iArgs.push(arguments[i]);
            }
            iArgs.splice(iArgs.length-1,1,iCallBack);
            _database.openProject.apply(_database,iArgs);
        }

        function open(){
            _socket = IO.listen(options.combined ? options.combined : options.port,{
                'transports': [
                    'websocket'
                ]
            });
            if(options.logger){
                _socket.set('logger',options.logger);
            }


            _socket.on('connection',function(socket){
                console.log(socket.handshake.headers.cookie);
                socket.on('openDatabase', function(callback){
                    checkDatabase(callback);
                });

                socket.on('closeDatabase', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    _databaseOpened = false;
                    _database.closeDatabase.apply(this,arguments);
                });

                socket.on('fsyncDatabase', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var iArgs = [];
                    for(var i=0;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.fsyncDatabase.apply(_database,iArgs);
                        }
                    });
                });

                socket.on('getProjectNames', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var iArgs = [];
                    for(var i=0;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getProjectNames.apply(_database,iArgs);
                        }
                    });
                });

                socket.on('deleteProject', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var iCallBack = function(err){
                        if(err){
                            callback(err);
                        } else {
                            //TODO what to do with the object itself???
                            callback(null);
                        }
                    };
                    var iArgs = [];
                    for(var i=0;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    iArgs.push(iCallBack);
                    _database.deleteProject.apply(_database,iArgs);
                });

                socket.on('authenticate',function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var iArgs = [];
                    for(var i=0;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    _database.authenticate.apply(_database,iArgs);
                });

                socket.on('openProject', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var projectName = arguments[0];
                    if(_projects[projectName]){
                        addClient(socket.id,projectName);
                        callback(null,_projects[projectName]);
                    } else {
                        var iCallBack = function(err,project){
                            if(!err && project){
                                _projects[projectName] = project;
                                addClient(socket.id,projectName);
                                callback(null,_projects[projectName]);
                            } else {
                                callback(err);
                            }
                        };
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,1,iCallBack);
                        _database.openProject.apply(_database,iArgs);
                    }
                });

                socket.on('getDatabaseStatus', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var iArgs = [];
                    for(var i=0;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getDatabaseStatus.apply(_database,iArgs);
                        }
                    });
                });

                socket.on('closeProject', function(){
                    var callback = function(){};
                    var sid = "";
                    if(typeof arguments[arguments.length-1] === 'function'){
                        callback = arguments[arguments.length-1];
                        sid = arguments[arguments.length-2];
                    } else {
                        sid = arguments[arguments.length-1];
                    }
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err) {
                            callback(err);
                        } else {
                            var index = _references[projectName].indexOf(socket.id);
                            _references[projectName].splice(index,1);
                            if(_references[projectName].length === 0){
                                delete _references[projectName];
                                var proj = _projects[projectName];
                                delete _projects[projectName];
                                proj.closeProject.apply(proj,iArgs);
                            } else {
                                callback(null);
                            }
                        }
                    });
                });

                socket.on('loadObject', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].loadObject.apply(_projects[projectName],iArgs);
                        }
                    });
                });

                socket.on('insertObject', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].insertObject.apply(_projects[projectName],iArgs);
                        }
                    });
                });

                socket.on('findHash', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].findHash.apply(_projects[projectName],iArgs);
                        }
                    });
                });

                socket.on('dumpObjects', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].dumpObjects.apply(_projects[projectName],iArgs);
                        }
                    });
                });
                socket.on('getBranchNames', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].getBranchNames.apply(_projects[projectName],iArgs);
                        }
                    });
                });
                socket.on('getBranchHash', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].getBranchHash.apply(_projects[projectName],iArgs);
                        }
                    });
                });
                socket.on('setBranchHash', function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].setBranchHash.apply(_projects[projectName],iArgs);
                        }
                    });
                });
                socket.on('getCommits',function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].getCommits.apply(_projects[projectName],iArgs);
                        }
                    });
                });
                socket.on('makeCommit',function(){
                    ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                    var callback = arguments[arguments.length-1];
                    var sid = arguments[arguments.length-2];
                    var projectName = arguments[0];
                    var iArgs = [];
                    for(var i=1;i<arguments.length;i++){
                        iArgs.push(arguments[i]);
                    }
                    checkProject(socket.id,projectName,sid,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].makeCommit.apply(_projects[projectName],iArgs);
                        }
                    });
                });

                socket.on('disconnect',function(){
                    var todelete = [];
                    for(var i in _references){
                        if(_projects[i]){
                            var index = _references[i].indexOf(socket.id);
                            if(index>-1){
                                _references[i].splice(index,1);
                                if(_references[i].length === 0){
                                    todelete.push(i);
                                    var proj = _projects[i];
                                    delete _projects[i];
                                    proj.closeProject(null);
                                }
                            }
                        } else {
                            todelete.push(i);
                        }
                    }

                    for(i=0;i<todelete.length;i++){
                        delete _references[todelete[i]];
                    }
                });
            });
        }

        function close(){

            //disconnect clients
            if(_socket){
                //_socket.sockets.emit('disconnect');
                _socket.sockets.clients().forEach(function (socket){
                    socket.disconnect();
                });
                _socket.server.close();
                _socket = null;
            }

            if(_databaseOpened){
                //close projects
                for(var i in _projects){
                    _projects[i].closeProject(null);
                }

                //close database
                _database.closeDatabase(null);
            }

            _objects = {};
            _projects = {};
            _references = {};
            _databaseOpened = false;
        }

        return {
            open: open,
            close: close
        };
    };

    return server;
});
