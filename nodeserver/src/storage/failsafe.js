/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid"], function (ASSERT,GUID) {
    "use strict";
    var BRANCH_OBJ_ID = '*branch*';
    var ERROR_TIMEOUT = "no valid response arrived in time";

    function Database(_database,options){
        ASSERT(typeof options === "object" && typeof _database === "object");
        options.failsafe = options.failsafe || "memory";
        options.failsafefrequency = options.failsafefrequency || 10000;
        options.timeout = options.timeout || 10000;


        var exceptionErrors = [],
            fsId = "FS",
            dbId = options.database || "noID",
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
            for(i in pendingStorage){
                if(!pendingStorage[i][BRANCH_OBJ_ID]){
                    pendingStorage[i][BRANCH_OBJ_ID] = {};
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
                    if(!pendingStorage[projectName]){
                        pendingStorage[projectName]={};
                        pendingStorage[projectName][BRANCH_OBJ_ID] = {};
                    }
                    callback(null,{
                        fsyncDatabase: project.fsyncDatabase,
                        getDatabaseStatus: project.getDatabaseStatus,
                        closeProject: project.closeProject,
                        loadObject: loadObject,
                        insertObject: insertObject,
                        findHash: project.findHash,
                        dumpObjects: project.dumpObjects,
                        getBranchNames: getBranchNames,
                        getBranchHash: getBranchHash,
                        setBranchHash: setBranchHash,
                        getCommits: project.getCommits
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
                        if(i !== BRANCH_OBJ_ID){
                            objects.push(pendingStorage[projectName][i]);
                        }
                    }
                    var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID];
                    pendingStorage[projectName] = {};
                    pendingStorage[projectName][BRANCH_OBJ_ID] = branchObj;

                    count = objects.length;
                    for(i=0;i<objects.length;i++){
                        savingObject(objects[i],objectProcessed);
                    }
                    if(object.length === 0){
                        callback();
                    }
                } else {
                    callback();
                }
            }

            function synchroniseBranch(callback){

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
                    };
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

            function getBranchNames(callback){
                project.getBranchNames(function(err,names){
                    //we need the locally stored names either way
                    var locals = [];
                    for(var i in pendingStorage[projectName][BRANCH_OBJ_ID]){
                        locals.push(i);
                    }

                    if(err){
                        errorMode();
                        if(exceptionErrors.indexOf(err) !== -1){
                            callback(err);
                        } else {
                            callback(null,locals);
                        }
                    } else {
                        for(i=0;i<names.length;i++){
                            if(locals.indexOf(names[i]) === -1){
                                locals.push(names[i]);
                            }
                        }
                        callback(err,locals);
                    }
                });
            }

            function getBranchHash(branch,oldhash,callback){
                if(!pendingStorage[projectName][BRANCH_OBJ_ID][branch]){
                    pendingStorage[projectName][BRANCH_OBJ_ID][branch] = {local:[],fork:null,state:'sync'};
                }
                var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branch];

                if(branchObj.state === 'sync' || branchObj.state === 'ahead'){
                    project.getBranchHash(branch,oldhash,callback);
                } else {
                    //served locally
                    ASSERT(branchObj.local[0] && branchObj.local[0] != "");
                    if(branchObj.local[0] === oldhash){
                        setTimeout(function(){
                            callback(null,oldhash,branchObj.fork);
                        },options.timeout);
                    } else {
                        callback(null,branchObj.local[0],branchObj.fork);
                    }
                }
            }

            function setBranchHash(branch,oldhash,newhash,callback){
                if(!pendingStorage[projectName][BRANCH_OBJ_ID][branch]){
                    pendingStorage[projectName][BRANCH_OBJ_ID][branch] = {local:[],fork:null,state:'sync'};
                }
                var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branch];

                var returnFunction = function(err){
                    if(!err){
                        var index = branchObj.local.indexOf(newhash);
                        ASSERT(index !== -1);
                        branchObj.local.splice(index,branchObj.local.length-index);
                        if(branchObj.local.length === 0){
                            branchObj.state = 'sync';
                        }
                    } else {
                        //we go to disconnected state
                        ASSERT(branchObj.local.length > 0);
                        if(branchObj.state !== 'disconnected'){
                            branchObj.state = 'disconnected';
                            var reSyncBranch = function(err,newhash,forkedhash){
                                if(!err && newhash){
                                    if(branchObj.local.indexOf(newhash) === -1){
                                        //we forked
                                        branchObj.fork = newhash;
                                        branchObj.state = 'forked';
                                    } else {
                                        setBranchHash(branch,newhash,branchObj.local[0],function(){});
                                    }
                                } else {
                                    //timeout or something not correct, so we should retry
                                    project.getBranchHash(branch,branchObj.local[0],reSyncBranch);
                                }
                            };
                            project.getBranchHash(branch,branchObj.local[0],reSyncBranch);
                        }
                    }
                };

                switch(branchObj.state){
                    case 'sync':
                        ASSERT(branchObj.local.length === 0);
                        branchObj.state = 'ahead';
                        branchObj.local = [newhash,oldhash];
                        callback(null);
                        project.setBranchHash(branch,oldhash,newhash,returnFunction);
                        return;
                        break;
                    case 'ahead':
                        ASSERT(branchObj.local.length > 0);
                        if(oldhash === branchObj.local[0]){
                            branchObj.local.unshift(newhash);
                            callback(null);
                            project.setBranchHash(branch,oldhash,newhash,returnFunction);
                        } else {
                            callback('old hash mismatch');
                        }
                        return;
                        break;
                    case 'disconnected':
                        ASSERT(branchObj.local.length > 0);
                        if(oldhash === branchObj.local[0]){
                            branchObj.local.unshift(newhash);
                            callback(null);
                        } else {
                            callback('old hash mismatch');
                        }
                        return;
                        break;
                    default: //'forked'
                        ASSERT(branchObj.local.length > 0 && branchObj.fork);
                        if(oldhash === branchObj.local[0]){
                            if(branchObj.fork === newhash){
                                //clearing the forked leg
                                branchObj.fork = null;
                                branchObj.state = 'sync';
                                branchObj.local = [];
                            } else {
                                branchObj.local.unshift(newhash);
                            }
                            callback(null);
                        } else {
                            callback('old hash mismatch');
                        }
                        return;
                        break;
                }
            }
        }

        return {
            openDatabase : openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getProjectNames: getProjectNames,
            getDatabaseStatus: _database.getDatabaseStatus,
            openProject: openProject,
            deleteProject: deleteProject,
            ID_NAME: _database.ID_NAME
        };
    }

    return Database;
});

