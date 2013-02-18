/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid","basestoragelayer","socket.io" ],function(ASSERT,GUID,STORAGE,IO){

    var server = function(options){
        var _socket = IO.listen(options.socketioport),
            _objects = {};


        _socket.on('connection',function(socket){
            socket.on('openDatabase', function(clientoptions, callback){
                STORAGE(options,function(err,db){
                        if(!err && db){
                            var guid = GUID();
                            _objects[guid] = db;
                            callback(null,guid);
                        } else {
                            callback(err,null);
                        }
                    });
            });

            socket.on('closeDatabase', function(guid,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].closeDatabase(function(){
                    delete _objects[guid];
                    callback(null);
                });
            });

            socket.on('fsyncDatabase', function(guid,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].fsyncDatabase(callback);
            });

            socket.on('getProjectNames', function(guid,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].getProjectNames(callback);
            });

            socket.on('openProject', function(guid,projectName,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].openProject(projectName,function(err,proj){
                    if(!err && proj){
                        var projguid = GUID();
                        _objects[projguid] = proj;
                        callback(null,projguid);
                    } else {
                        callback(err,null);
                    }
                });
            });

            socket.on('deleteProject', function(guid,projectName,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].deleteProject(projectName,callback);
            });

            socket.on('getDatabaseStatus', function(guid,oldstatus,callback){
                //TODO here we have to add a second layer of status message when this layer notices some problem
                ASSERT(guid && _objects[guid]);
                _objects[guid].getDatabaseStatus(oldstatus,callback);
            });

            socket.on('closeProject', function(guid,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].closeProject(function(){
                    delete _objects[guid];
                    callback(null);
                });
            });

            socket.on('loadObject', function(guid,hash,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].loadObject(hash,callback);
            });

            socket.on('insertObject', function(guid,object,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].insertObject(object,callback);
            });

            socket.on('findHash', function(guid,beginning,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].findHash(beginning,callback);
            });

            socket.on('dumpObjects', function(guid,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].dumpObjects(callback);
            });
            socket.on('getBranchNames', function(guid,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].getBranchNames(callback);
            });
            socket.on('getBranchHash', function(guid,branch,oldhash,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].getBranchHash(branch,oldhash,callback);
            });
            socket.on('setBranchHash', function(guid,branch,oldhash,newhash,callback){
                ASSERT(guid && _objects[guid]);
                _objects[guid].setBranchHash(branch,oldhash,newhash,callback);
            });
        });

    };

    return server;
});
