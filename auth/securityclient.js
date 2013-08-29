/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "auth/crypto" ], function (ASSERT,CRYPTO) {
    "use strict";

    function Database (_innerDb, options) {
        ASSERT(typeof options === "object" && typeof _innerDb === "object");
        var database = {};
        for(var i in _innerDb){
            database[i] = _innerDb[i];
        }
        var _privateKey = "",
            _sessionId = null,
            _username = "",
            _project = null;


        //new functions
        database.authenticate = function(username,privateKey,callback){
            _username = username;
            _privateKey = privateKey;
            _innerDb.authenticate(username,function(err,codedSession){
                if(!err){
                    _sessionId = CRYPTO.decrypt(_privateKey,codedSession);
                    callback(null);
                } else {
                    return err;
                }
            });
        };

        //modified functions
        database.getProjectNames = function(){
            ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
            var iArgs = [];
            for(var i=0;i<arguments.length;i++){
                iArgs.push(arguments[i]);
            }
            iArgs.splice(iArgs.length-1,0,_sessionId);
            _innerDb.getProjectNames.apply(_innerDb,iArgs);
        };
        database.openProject = function(projectName,callback){
            _innerDb.openProject(projectName,_sessionId,function(err,innerProject){
                if(!err){
                    _project = {};

                    //we must override all functions with session id
                    _project.getDatabaseStatus = innerProject.getDatabaseStatus;

                    _project.closeProject = function() {
                        var haveCallback = false;
                        if(typeof arguments[arguments.length-1] === 'function'){
                            haveCallback = true;
                        }
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }

                        if(haveCallback){
                            iArgs.splice(iArgs.length-1,0,_sessionId);
                        } else {
                            iArgs.push(_sessionId);
                        }

                        innerProject.closeProject.apply(innerProject,iArgs);
                    };

                    _project.loadObject = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.loadObject.apply(innerProject,iArgs);
                    };

                    _project.insertObject = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.insertObject.apply(innerProject,iArgs);
                    };

                    _project.findHash = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.findHash.apply(innerProject,iArgs);
                    };

                    _project.dumpObjects = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.dumpObjects.apply(innerProject,iArgs);
                    };

                    _project.getBranchNames = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.getBranchNames.apply(innerProject,iArgs);
                    };

                    _project.getBranchHash = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.getBranchHash.apply(innerProject,iArgs);
                    };

                    _project.setBranchHash = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.setBranchHash.apply(innerProject,iArgs);
                    };

                    _project.getCommits = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.getCommits.apply(innerProject,iArgs);
                    };

                    _project.makeCommit = function() {
                        ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                        var iArgs = [];
                        for(var i=0;i<arguments.length;i++){
                            iArgs.push(arguments[i]);
                        }
                        iArgs.splice(iArgs.length-1,0,_sessionId);
                        innerProject.makeCommit.apply(innerProject,iArgs);
                    };

                    callback(null,_project);
                } else {
                    callback(err);
                }
            })
        };

        return database;
    }

    return Database;
});

