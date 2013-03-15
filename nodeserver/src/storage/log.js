/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert"], function (ASSERT) {
    "use strict";

    function Database(_database,options){
        ASSERT(typeof options === "object" && typeof _database === "object");
        options.log = options.log || {
            debug : function(msg){
                console.log("DEBUG - "+msg);
            },
            error : function(msg){
                console.log("ERROR - "+msg);
            }
        };
        var logger = options.log;

        function openDatabase(callback){
            logger.debug('openDatabase()');
            _database.openDatabase(callback);
        }

        function closeDatabase(callback){
            logger.debug('closeDatabase()');
            _database.closeDatabase(callback);
        }

        function fsyncDatabase(callback){
            logger.debug('fsyncDatabase()');
            _database.fsyncDatabase(callback);
        }

        function getProjectNames(callback){
            logger.debug('getProjectNames()');
            _database.getProjectNames(callback);
        }

        function deleteProject(project,callback){
            logger.debug('deleteProject('+project+")");
            _database.deleteProject(project,callback);
        }

        function getDatabaseStatus(oldstatus,callback){
            logger.debug('getDatabasestatus('+oldstatus+")");
            _database.getDatabaseStatus(oldstatus,callback);
        }

        function openProject (projectName, callback) {
            logger.debug('deleteProject('+projectName+")");
            var project = null;
            _database.openProject(projectName,function(err,proj){
                if(!err && proj){
                    project = proj;
                    callback(null,{
                        fsyncDatabase: fsyncDatabase,
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
                    callback(err,proj);
                }
            });

            function fsyncDatabase(callback){
                logger.debug(projectName+'.fsyncDatabase()');
                project.fsyncDatabase(callback);
            }

            function closeProject(callback){
                logger.debug(projectName+'.closeProject()');
                project.closeProject(callback);
            }

            function insertObject(object,callback){
                logger.debug(projectName+'.insertObject('+object[_database.ID_NAME]+")");
                project.insertObject(object,callback);
            }

            function loadObject(hash,callback){
                logger.debug(projectName+'.loadObject('+hash+")");
                project.loadObject(hash,callback);
            }

            function findHash(beginning,callback){
                logger.debug(projectName+".findHash("+beginning+")");
                project.findHash(beginning,callback);
            }

            function dumpObjects(callback){
                logger.debug(projectName+"dumpObjects()");
                project.dumpObjects(callback);
            }

            function getBranchNames(callback){
                logger.debug(projectName+'.getBranchNames()');
                project.getBranchNames(callback);
            }

            function getBranchHash(branch,oldhash,callback){
                logger.debug(projectName+'.getBranchHash('+branch+','+oldhash+')');
                project.getBranchHash(branch,oldhash,callback);
            }

            function setBranchHash(branch,oldhash,newhash,callback){
                logger.debug(projectName+'.setBranchHash('+branch+','+oldhash+','+newhash+')');
                project.setBranchHash(branch,oldhash,newhash,callback);
            }

        }

        return {
            openDatabase : openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getProjectNames: getProjectNames,
            getDatabaseStatus: getDatabaseStatus,
            openProject: openProject,
            deleteProject: deleteProject,
            ID_NAME: _database.ID_NAME
        };
    }

    return Database;
});


