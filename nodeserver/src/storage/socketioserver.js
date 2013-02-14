/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "..",
    paths: {
    }
});

requirejs([ "util/assert","storage/mongo","socket.io" ],function(ASSERT,STORAGE,IO){

    var server = function(options){
        var _socket = IO.listen(options.socketioport),
            _clients = {},
            _database = null,
            _projects = {};


        _socket.on('connection',function(socket){
            socket.on('openDatabase', function(clientoptions, callback){
                if(!_clients[socket.id]){
                    _clients[socket.id] = {};
                }

                if(_database === null){
                    STORAGE(options,function(err,db){
                        if(!err && db){
                            _database = db;
                        } else {
                            callback(err,null);
                        }
                    });
                } else {
                    callback(null,_database);
                }
            });

            socket.on('closeDatabase', function(callback){
                delete _clients[socket.id];
                var clientNumber = 0;
                for(var i in _clients){
                    clientNumber++;
                }
                if(clientNumber === 0 && _database){
                    _database.closeDatabase(callback);
                } else {
                    callback(null);
                }
            });

            socket.on('fsyncDatabase', function(callback){
               _database.fsyncDatabase(callback);
            });

            socket.on('getProjectNames', function(callback){
                _database.getProjectNames(callback);
            });

            socket.on('openProject', function(projectName,callback){
                if(!_projects[projectName]){
                    _database.openProject(projectName,function(err,proj){
                        if(!err && proj){
                            _projects[projectName] = proj;
                            _clients[socket.id][projectName] = _projects[projectName];
                            callback(null,_projects[projectName]);
                        } else {
                            callback(err,null);
                        }
                    });
                } else {
                    if(_clients[socket.id][projectName] === _projects[projectName]){
                        callback(null,_projects[projectName]);
                    } else {
                        _clients[socket.id][projectName] = _projects[projectName];
                        callback(null,_projects[projectName]);
                    }
                }
            });

            socket.on('deleteProject', function(projectName,callback){
                //TODO what to do with already opened projects??? notification something???
                _database.deleteProject(projectName,callback);
            });

            socket.on('getDatabaseStatus', function(projectName,callback){
                //TODO here we have to add a second layer of status message when this layer notices some problem
                _clients[socket.id][projectName].getDatabaseStatus(callback);
            });

            socket.on('closeProject', function(projectName,callback){
                delete _clients[socket.id][projectName];
                var hasClient = false;
                for(var i in _clients){
                    if(_clients[i][projectName]){
                        hasClient = true;
                        break;
                    }
                }

                if(!hasClient){
                    _projects[projectName].closeProject(function(){
                        delete _projects[projectName];
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            });

            socket.on('loadObject', function(projectName,hash,callback){
                ASSERT(_clients[socket.id][projectName]);
                _projects[projectName].loadObject(hash,callback);
            });

            socket.on('insertObject', function(projectName,object,callback){
                ASSERT(_clients[socket.id][projectName]);
                _projects[projectName].insertObject(object,callback);
            });

            socket.on('findHash', function(projectName,beginning,callback){
                ASSERT(_clients[socket.id][projectName]);
                _projects[projectName].findHash(beginning,callback);
            });

            socket.on('dumpObjects', function(projectName,callback){
                ASSERT(_clients[socket.id][projectName]);
                _projects[projectName].dumpObjects(callback);
            });
            socket.on('getBranchNames', function(projectName,callback){
                ASSERT(_clients[socket.id][projectName]);
                _projects[projectName].getBranchNames(callback);
            });
            socket.on('getBranchHash', function(projectName,branch,oldhash,callback){
                ASSERT(_clients[socket.id][projectName]);
                _projects[projectName].getBranchHash(branch,oldhash,callback);
            });
            socket.on('setBranchHash', function(projectName,branch,oldhash,newhash,callback){
                ASSERT(_clients[socket.id][projectName]);
                _projects[projectName].setBranchHash(branch,oldhash,newhash,callback);
            });
        });

    };

    var socketioServer = new server({
        socketioport:888,
        host: "129.59.105.239",
        port: 27017,
        database: "newtest",
        timeout: 100000,
        local: "memory"
    });
});
