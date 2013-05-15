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

        function checkProject(client,project,callback){
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
                socket.on('openDatabase', function(callback){
                    checkDatabase(callback);
                });

                socket.on('closeDatabase', function(callback){
                    _databaseOpened = false;
                    _database.closeDatabase(callback);
                });

                socket.on('fsyncDatabase', function(callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.fsyncDatabase(callback);
                        }
                    });
                });

                socket.on('getProjectNames', function(callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getProjectNames(callback);
                        }
                    });
                });

                socket.on('deleteProject', function(projectName,callback){
                    _database.deleteProject(projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            //TODO what to do with the object itself???
                            callback(null);
                        }
                    });
                });

                socket.on('openProject', function(projectName,callback){
                    if(_projects[projectName]){
                        addClient(socket.id,projectName);
                        callback(null,_projects[projectName]);
                    } else {
                        _database.openProject(projectName,function(err,project){
                            if(!err && project){
                                _projects[projectName] = project;
                                addClient(socket.id,projectName);
                                callback(null,_projects[projectName]);
                            } else {
                                callback(err);
                            }
                        });
                    }
                });

                socket.on('getDatabaseStatus', function(oldstatus,callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getDatabaseStatus(oldstatus,callback);
                        }
                    });
                });

                socket.on('closeProject', function(projectName,callback){
                    callback = callback || function() {};
                    checkProject(socket.id,projectName,function(err){
                        if(err) {
                            callback(err);
                        } else {
                            var index = _references[projectName].indexOf(socket.id);
                            _references[projectName].splice(index,1);
                            if(_references[projectName].length === 0){
                                delete _references[projectName];
                                var proj = _projects[projectName];
                                delete _projects[projectName];
                                proj.closeProject(callback);
                            } else {
                                callback(null);
                            }
                        }
                    });
                });

                socket.on('loadObject', function(projectName,hash,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].loadObject(hash,callback);
                        }
                    });
                });

                socket.on('insertObject', function(projectName,object,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].insertObject(object,callback);
                        }
                    });
                });

                socket.on('findHash', function(projectName,beginning,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].findHash(beginning,callback);
                        }
                    });
                });

                socket.on('dumpObjects', function(projectName,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].dumpObjects(callback);
                        }
                    });
                });
                socket.on('getBranchNames', function(projectName,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].getBranchNames(callback);
                        }
                    });
                });
                socket.on('getBranchHash', function(projectName,branch,oldhash,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].getBranchHash(branch,oldhash,callback);
                        }
                    });
                });
                socket.on('setBranchHash', function(projectName,branch,oldhash,newhash,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].setBranchHash(branch,oldhash,newhash,callback);
                        }
                    });
                });
                socket.on('getCommits',function(projectName,before,number,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].getCommits(before,number,callback);
                        }
                    });
                });
                socket.on('makeCommit',function(projectName,parents,roothash,msg,callback){
                    checkProject(socket.id,projectName,function(err){
                        if(err){
                            callback(err);
                        } else {
                            _projects[projectName].makeCommit(parents,roothash,msg,callback);
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

                socket.on('bmeg',function(){
                    console.log('bmeg...');
                    socket.disconnect();
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
