/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "socketiowrapper" ], function (ASSERT,IO) {
    "use strict";

    function openDatabase(options,callback){
    ASSERT(typeof options === "object" && typeof callback === "function");

    options.socketiohost = options.socketiohost || "http://localhost";
    options.socketioport = options.socketioport || 888;

    var database = null;
    var myCallback = callback;
    var socket = IO.connect(options.socketiohost+":"+options.socketioport);

    socket.on('connect',function(){
        if(myCallback){
            socket.emit('openDatabase',options,function(err,db){
                if(!err && db){
                    database = db;
                    myCallback = null;
                    callback(null,{
                        closeDatabase: closeDatabase,
                        fsyncDatabase: fsyncDatabase,
                        getProjectNames: getProjectNames,
                        openProject: openProject,
                        deleteProject: deleteProject
                    });
                } else {
                    socket.emit('disconnect');
                    callback(err,null);
                }
            });
        }
    });

    function closeDatabase (callback) {
        socket.emit('closeDatabase',callback);
    }

    function fsyncDatabase (callback) {
        socket.emit('fsyncDatabase',callback);
    }

    function getDatabaseStatus (callback) {
        socket.emit('getDatabaseStatus',callback);
    }

    function getProjectNames (callback) {
        socket.emit('getProjectNames',callback);
    }

    function deleteProject (project, callback) {
        socket.emit('deleteProject',project,callback);
    }

    function openProject (project, callback) {

        socket.emit('openProject',project,function(err,proj){
            if(!err && proj){
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
            } else {
                callback(err,null);
            }
        });

        function fsyncDatabase(callback){
            socket.emit('fsyncDatabase',callback);
        }

        function getDatabaseStatus(callback){
            //TODO failsafe layer how to add
            socket.emit('getDatabaseStatus',callback);
        }

        function closeProject(callback){
            socket.emit('closeProject',callback);
        }

        function loadObject(hash,callback){
            socket.emit('loadObject',project,hash,callback);
        }

        function insertObject(object,callback){
            socket.emit('insertObject',project,object,callback);
        }

        function findHash(beginning,callback){
            socket.emit('findHash',project,beginning,callback);
        }

        function dumpObjects(callback){
            socket.emit('dumpObjects',project,callback);
        }

        function getBranchNames(callback){
            socket.emit('getBranchNames',callback);
        }

        function getBranchHash(branch,oldhash,callback){
            socket.emit('getBranchHash',project,branch,oldhash,callback);
        }

        function setBranchHash(branch,oldhash,newhash,callback){
            socket.emit('loadObject',project,branch,oldhash,newhash,callback);
        }
    }
}
    return openDatabase;
});
