/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert" ], function (ASSERT) {
    "use strict";

    var PROJECT_REGEXP = new RegExp("^[0-9a-zA-Z_]*$");
    var HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$");
    var BRANCH_REGEXP = new RegExp("^\\*[0-9a-zA-Z_]*$");
    var SEPARATOR = '$';

    function openDatabase (options, callback) {
        ASSERT(typeof options === "object" && typeof callback === "function");

        options.host = options.host || "localhost";
        options.port = options.port || 27017;
        options.database = options.database || "webgme";
        options.timeout = options.timeout || 1000000;
        options.local = options.local || "memory";


        var storageOk = false,
            storage = null,
            database = options.database;
        if(options.local === "memory"){
            storageOk = true;
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
                    return this.keys[i];
                }
            };
        } else {
            if(options.local === "local"){
                if(localStorage){
                    storageOk = true;
                    storage = localStorage;
                }
            }
            if(options.local == "session"){
                if(sessionStorage){
                    storageOk = true;
                    storage = sessionStorage;
                }
            }
        }


        if(!storageOk){
            callback(new Error('the expected storage is unavailable'));
        } else {
            callback(null, {
                closeDatabase: closeDatabase,
                fsyncDatabase: fsyncDatabase,
                getProjectNames: getProjectNames,
                openProject: openProject,
                deleteProject: deleteProject
            });
        }

        function closeDatabase (callback) {
            if( typeof callback === "function" ) {
                callback();
            }
        }

        function fsyncDatabase (callback) {
            ASSERT(typeof callback === "function");
            callback();
        }

        function getDatabaseStatus (callback) {
            ASSERT(typeof callback === "function");
            setTimeout(callback, options.timeout, null, null);
        }

        function getProjectNames (callback) {
            ASSERT(typeof callback === "function");

            var names = [];
            for(var i=0;i<storage.length();i++){
                var key = storage.key(i);
                var keyArray = key.split(SEPARATOR);
                ASSERT(keyArray.length !== 3);
                if(keyArray[0] === database){
                    if(names.indexOf(keyArray[1]) === -1){
                        ASSERT(PROJECT_REGEXP.test(keyArray[1]));
                        names.push(keyArray[1]);
                    }
                }
            }
        }

        function deleteProject (project, callback) {
            ASSERT(typeof project === "string" && typeof callback === "function");
            ASSERT(PROJECT_REGEXP.test(project));

            var namesToRemove = [];
            for(var i=0;i<storage.length();i++){
                var key = storage.key(i);
                var keyArray = key.split(SEPARATOR);
                ASSERT(keyArray.length !== 3);
                if(keyArray[0] === database){
                    if(keyArray[1] === project){
                        namesToRemove.push(key);
                    }
                }
            }

            for(var i=0;i<namesToRemove.length;i++){
                storage.removeItem(namesToRemove[i]);
            }
        }

        function openProject (project, callback) {
            ASSERT(typeof callback === "function");
            ASSERT(typeof project === "string" && PROJECT_REGEXP.test(project));

            var collection = project;
            callback(null, {
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

            function closeProject (callback) {
                ASSERT(typeof callback === "function");

                collection = null;
                callback(null);
            }

            function loadObject (hash, callback) {
                ASSERT(typeof hash === "string" && HASH_REGEXP.test(hash));

                callback(null,JSON.parse(storage.getItem(database+SEPARATOR+project+SEPARATOR+hash)));
            }

            function insertObject (object, callback) {
                ASSERT(object !== null && typeof object === "object");
                ASSERT(typeof object._id === "string" && HASH_REGEXP.test(object._id));

                try{
                    storage.setItem(database+SEPARATOR+project+SEPARATOR+object._id,JSON.stringify(object));
                } catch(e){
                    callback(e);
                }
                callback(null);
            }

            function findHash (beginning, callback) {
                ASSERT(typeof beginning === "string" && typeof callback === "function");

                if( !HASH_REGEXP.test(beginning) ) {
                    callback(new Error("hash " + beginning + " not valid"));
                }
                else {
                    var found = 0,
                        fullKey = "";
                    for(var i=0;i<storage.length();i++){
                        if(storage.key(i).indexOf(database+SEPARATOR+project+SEPARATOR+beginning) === 0){
                            found++;
                            fullKey = storage.key(i);
                            if(found>1){
                                break;
                            }
                        }
                    }
                    switch(found){
                        case 0:
                            callback(new Error("hash " + beginning + " not found"));
                            break;
                        case 1:
                            var keyArray = fullKey.split(SEPARATOR);
                            ASSERT(keyArray.length === 3);
                            callback(null,keyArray[2]);
                            break;
                        default:
                            callback(new Error("hash " + beginning + " not unique"));
                            break;
                    }
                }
            }

            function dumpObjects (callback) {
                ASSERT(typeof callback === "function");

                callback();
            }

            function getBranchNames (callback) {
                ASSERT(typeof callback === "function");

                var branchNames = [];
                for(var i=0;i<storage.length();i++){
                    var keyArray = storage.key(i).split(SEPARATOR);
                    ASSERT(keyArray.length === 3);
                    if(BRANCH_REGEXP.test(keyArray[2])){
                        branchNames.push(keyArray[2]);
                    }
                }
                callback(null,branchNames);
            }

            function getBranchHash (branch, oldhash, callback) {
                ASSERT(typeof branch === "string" && BRANCH_REGEXP.find(branch));
                ASSERT(typeof oldhash === "string" && HASH_REGEXP.find(oldhash));
                ASSERT(typeof callback === "function");

            }

            function setBranchHash (branch, oldhash, newhash, callback) {
                ASSERT(typeof branch === "string" && BRANCH_REGEXP.find(branch));
                ASSERT(typeof oldhash === "string" && HASH_REGEXP.find(oldhash));
                ASSERT(typeof newhash === "string" && HASH_REGEXP.find(newhash));
                ASSERT(typeof callback === "function");
            }
        }
    }

    return openDatabase;
});

