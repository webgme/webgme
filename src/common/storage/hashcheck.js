/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/zssha1", "util/canon" ], function (ASSERT,SHA1,CANON) {
    "use strict";

    var zsSHA = new SHA1();

    function Database (_innerDb, gmeConfig) {
        ASSERT(typeof gmeConfig === "object" && typeof _innerDb === "object");
        var database = {};
        for(var i in _innerDb){
            database[i] = _innerDb[i];
        }

        //we have to modify the openProject function
        database.openProject = function(projectName, callback){
            _innerDb.openProject(projectName,function(err,innerProject){
                if(!err && innerProject){
                    var project = {};
                    for(var i in innerProject){
                        project[i] = innerProject[i];
                    }

                    //we add the hash check to insertObject
                    project.insertObject = function(object, cb){
                        var inHash = object[project.ID_NAME];
                        object[project.ID_NAME] = "";
                        var checkHash = "#" + zsSHA.getHash(CANON.stringify(object));
                        object[project.ID_NAME] = inHash;

                        if(inHash !== checkHash){
                            cb("wrong hash: expeced - "+checkHash+", received - "+inHash);
                        } else {
                            innerProject.insertObject(object,cb);
                        }
                    };

                    callback(null,project);

                } else {
                    callback(err);
                }
            });
        };

        return database;
    }

    return Database;
});
