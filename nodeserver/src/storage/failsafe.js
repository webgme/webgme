/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid"], function (ASSERT,GUID) {
    "use strict";

    function Database(_database,options){
        ASSERT(typeof options === "object" && typeof _database === "object");
        options.failsafe = options.failsafe || "memory";
        options.failsafefrequency = options.failsafefrequency || 10000;

        var exceptionErrors = [],
            fsId = "FS",
            SEPARATOR = "$",
            STATUS_CONNECTED = "connected",
            pendingStorage = {},
            storage = null;

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

        function openDatabase(callback){
            if(options.failsafe === "local" && localStorage){
                storage = localStorage;
            } else if(options.failsafe === "session" && sessionStorage){
                storage = sessionStorage;
            } else if(options.failsafe === "memory"){
                storage = {
                    length : 0,
                    keys : [],
                    data : {},
                    getItem : function(key){
                        ASSERT(typeof key === "string");
                        return this.data[key];
                    },
                    setItem : function(key,object){
                        ASSERT(typeof key === "string" && typeof object === "string");
                        this.data[key] = object;
                        this.keys.push(key);
                        this.length++;
                    },
                    key : function(index){
                        return this.keys[index];
                    }
                };
            }

            if(storage){
                loadPending();
                setInterval(savePending,options.failsafefrequency);
                _database.openDatabase(callback);
            } else {
                callback('cannot initialize fail safe storage');
            }
        }

        function closeDatabase(callback){
            _database.closeDatabase(callback);
        }

        function fsyncDatabase(callback){
            _database.fsyncDatabase(callback);
        }

        function getProjectNames(callback){
            _database.getProjectNames(callback);
        }

        function deleteProject(project,callback){
            _database.deleteProject(project,callback);
        }

        function openProject (projectName, callback) {
            var project = null;
            var inSync = true;
            _database.openProject(projectName,function(err,proj){
                if(!err && proj){
                    project = proj;
                    callback(null,{
                        fsyncDatabase: project.fsyncDatabase,
                        getDatabaseStatus: project.getDatabaseStatus,
                        closeProject: project.closeProject,
                        loadObject: loadObject,
                        insertObject: insertObject,
                        findHash: project.findHash,
                        dumpObjects: project.dumpObjects,
                        getBranchNames: project.getBranchNames,
                        getBranchHash: project.getBranchHash,
                        setBranchHash: project.setBranchHash
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

            function errorMode(){
                if(inSync){
                    inSync = false;
                    var checkIfAvailable = function(err,newstate){
                        if(newstate === STATUS_CONNECTED){
                            synchronise(function(){
                                inSync = true;
                            });
                        } else {
                            project.getDatabaseStatus(newstate,checkIfAvailable);
                        }
                    }
                    project.getDatabaseStatus(null,checkIfAvailable);
                }
            }

            function loadObject(hash,callback){
                project.loadObject(hash,function(err,object){
                    if(!err && object){
                        callback(null,object);
                    } else {
                        errorMode();
                        if(exceptionErrors.indexOf(err) !== -1){
                            callback(err,object);
                        } else {
                            if(pendingStorage[projectName] && pendingStorage[projectName][hash]){
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
                        errorMode();
                        if(exceptionErrors.indexOf(err) !== -1){
                            callback(err);
                        } else {
                            //TODO have to check if the id is already taken...
                            if(!pendingStorage[projectName]){
                                pendingStorage[projectName]={};
                            }
                            pendingStorage[projectName][object._id] = object;
                            callback(null);
                        }
                    } else {
                        callback(err);
                    }
                });
            }


            /*
            function getDatabaseStatus(oldstatus,callback){
                project.getDatabaseStatus(oldstatus,callback);
            }

            function fsyncDatabase(callback){
                project.fsyncDatabase(callback);
            }

            function closeProject(callback){
                project.closeProject(callback);
            }

            function findHash(beginning,callback){
                project.findHash(beginning,callback);
            }

            function dumpObjects(callback){
                project.dumpObjects(callback);
            }

            function getBranchNames(callback){
                project.getBranchNames(callback);
            }

            function getBranchHash(branch,oldhash,callback){
                project.getBranchHash(branch,oldhash,callback);
            }

            function setBranchHash(branch,oldhash,newhash,callback){
                project.setBranchHash(branch,oldhash,newhash,callback);
            }
            */
        }

        return {
            openDatabase : openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getProjectNames: getProjectNames,
            getDatabaseStatus: _database.getDatabaseStatus,
            openProject: openProject,
            deleteProject: deleteProject
        }
    }

    return Database;
});

