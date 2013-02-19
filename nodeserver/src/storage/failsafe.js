/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid"], function (ASSERT,GUID) {
    "use strict";

    function openDatabase(options,callback){
        ASSERT(typeof options === "object" && typeof callback === "function" && typeof options.layers === "array");

        options.failsafe = options.failsafe || "memory";
        options.failsafefrequency = options.failsafefrequency || 10000;

        var exceptionErrors = [];
        var database = null;
        var dbId = options.database;
        var fsId = "FS";
        var SEPARATOR = "$";
        var pendingStorage = {};
        var storage = null;
        if(options.failsafe === "local" && localStorage){
            storage = localStorage;
        } else if(options.failsafe === "session" && sessionStorage){
            storage = sessionStorage;
        } else if(options.failsafe === "memory"){

        }

        if(storage){
            loadPending();
            setInterval(savePending,options.failsafefrequency);
            /*first we need the underlying layer*/
            var index = -1;
            for(var i=0;i<options.layers.length;i++){
                if(options.layers[i].indexOf('failsafe') !== -1){
                    index = i+1;
                    break;
                }
            }
            if(index>0 && index<options.layers.length){
                require([options.layers[index]],function(STORAGE){
                    STORAGE(options,function(err,db){
                        if(!err && db){
                            callback(null,{
                                closeDatabase: closeDatabase,
                                fsyncDatabase: fsyncDatabase,
                                getProjectNames: getProjectNames,
                                openProject: openProject,
                                deleteProject: deleteProject
                            });
                        } else {
                            callback(err,db);
                        }
                    });
                });
            } else {
                callback(new Error('missing underlying layer'),null);
            }
        } else {
            callback(new Error('cannot initialize fail safe storage'),null);
        }


        function loadPending(){
            for(var i=0;i<storage.length;i++){
                if(storage.key(i).indexOf(fsId) === 0){
                    var keyArray = storage.key(i).split(SEPARATOR);
                    ASSERT(keyArray.length === 4);
                    if(keyArray[1] === dbId){
                        var object = JSON.parse(storage.getItem(storage.key(i)));
                        pendingStorage[keyArray[2]] = object;
                    }
                }
            }
        }

        function savePending(){
            //TODO maybe some check would be good, but not necessarily
            for(var i in pendingStorage){
                storage.setItem(fsId+SEPARATOR+dbId+SEPARATOR+i,JSON.stringify(pendingStorage[i]));
            }
        }

        function closeDatabase (callback) {
            database.closeDatabase(callback);
        }

        function fsyncDatabase (callback) {
            database.fsyncDatabase(callback);
        }

        function getDatabaseStatus (oldstatus,callback) {
            database.getDatabasestatus(oldstatus,callback);
        }

        function getProjectNames (callback) {
            database.getProjectNames(callback);
        }

        function deleteProject (project, callback) {
            if(pendingStorage[project]){
                callback("the project cannot be deleted as it has pending objects");
            } else {
                database.deleteProject(project,callback);
            }
        }

        function openProject (projectName, callback) {
            var project = null;
            database.openProject(projectName,function(err,proj){
                if(!err && proj){
                    project = proj;
                    callback(null,{
                        fsyncDatabase: fsyncDatabase,
                        getDatabaseStatus: getDatabaseStatus,
                        closeProject: closeProject,
                        loadObject: loadObject,
                        insertObject: insertObject,
                        findHash: findHash,
                        dumpObjects: dumpObjects,
                        getBranchNames: getBranchNames,
                        getBranchHash: getBranchHash,
                        setBranchHash: setBranchHash
                    });
                } else {
                    callback(err,project);
                }
            });

            function synchronise(callback){
                if(pendingStorage[projectName]){
                    var objects = [];
                    var count = 0;
                    var savingObject = function(object,cb){
                        project.insertObject(object,function(err){
                            if(err){
                                if(!pendingStorage[projectName]){
                                    pendingStorage[projectName]={};
                                }
                                pendingStorage[projectName][object._id] = object;
                            }
                            cb();
                        });
                    };
                    var objectProcessed = function(){
                        if(--count === 0){
                            callback();
                        }
                    };

                    for(var i in pendingStorage[projectName]){
                        objects.push(pendingStorage[projectName][i]);
                    }
                    pendingStorage[projectName] = null;

                    count = objects.length;
                    for(i=0;i<objects.length;i++){
                        savingObject(objects[i],objectProcessed);
                    }
                } else {
                    callback();
                }
            }

            function fsyncDatabase(callback){
                project.fsyncDatabase(callback);
            }

            function getDatabaseStatus(callback){
                project.getDatabaseStatus(callback);
            }

            function closeProject(callback){
                project.closeProject(callback);
            }

            function loadObject(hash,callback){
                project.loadObject(hash,function(err,object){
                    if(!err && object){
                        synchronise(function(){
                            callback(null,object);
                        });
                    } else {
                        if(exceptionErrors.indexOf(err) !== -1){
                            callback(err,object);
                        } else {
                            if(pendingStorage[projectName][hash]){
                                callback(null,pendingStorage[projectName][hash]);
                            } else {
                                callback(err,object);
                            }
                        }
                    }
                });
            }

            function insertObject(object,callback){
                project.insertObject(object,function(err){
                    if(err){
                        if(exceptionErrors.indexOf(err)){
                            callback(err);
                        } else {
                            //TODO have to check if the id is already taken...
                            if(!pendingStorage[projectName]){
                                pendingStorage[projectName]={};
                            }
                            pendingStorage[projectName][object._id] = object;
                        }
                    } else {
                        synchronise(function(){
                            callback(err);
                        });
                    }
                });
            }

            function findHash(beginning,callback){
                project.findHash(beginning,function(err,hash){
                    if(!err && hash){
                        synchronise(function(){
                            callback(err,hash);
                        });
                    } else {
                        callback(err,hash);
                    }
                });
            }

            function dumpObjects(callback){
                project.dumpObjects(callback);
            }

            function getBranchNames(callback){
                project.getBranchNames(function(err,names){
                    if(!err && names){
                        synchronise(function(){
                            callback(err,names);
                        });
                    } else {
                        callback(err,names);
                    }
                });
            }

            function getBranchHash(branch,oldhash,callback){
                project.getBranchHash(branch,oldhash,callback);
            }

            function setBranchHash(branch,oldhash,newhash,callback){
                project.setBranchHash(branch,oldhash,newhash,function(err){
                    if(err){
                        callback(err);
                    } else {
                        synchronise(function(){
                            callback(err);
                        });
                    }
                });
            }
        }
    }

    return openDatabase;
});

