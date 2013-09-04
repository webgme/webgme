/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

if (typeof define !== "function") {
    var requirejs = require("requirejs");

    requirejs.config({
        nodeRequire: require,
        baseUrl: __dirname + "/.."
    });

    requirejs([ "util/common", "util/assert", "core/tasync" ], function (COMMON, ASSERT, TASYNC) {
        "use strict";

        TASYNC.trycatch(main, function (error) {
            console.log(error.trace || error.stack);

            COMMON.setProgress(null);
            COMMON.closeProject();
            COMMON.closeDatabase();
        });
        var _commit = null,
            _startHash = null,
            _branch = null,
            _projectName = null;

        function main () {
            //var args = COMMON.getParameters(null);
            //console.log(args);

            if (COMMON.getParameters("help") !== null) {
                console.log("Usage: node usermanager.js [options]");
                console.log("");
                console.log("Parses a GME xme file and stores it int a WEBGME database. Possible options:");
                console.log("");
                console.log("  -mongo [database [host [port]]]\topens a mongo database");
                console.log("  -proj <project>\t\t\tselects the given project");
                console.log("  -branch <branch>\t\t\tthe branch to work with");
                console.log("  -adduser <username> <publickey> <write = true/false>\t\t\tthe user to add");
                console.log("  -addproject <username> <projectname> <mode = r|rw|rwd>\t\t\t adds a project to the user data");
                console.log("  -removeproject <username> <projectname>\t\t\t removes a project from the user data");
                console.log("  -removeuser <username>\t\t\t removes a user data");
                console.log("  -info\t\t\t prints out the users and their data from the project");
                console.log("  -help\t\t\t\t\tprints out this help message");
                console.log("");
                return;
            }


            _branch = COMMON.getParameters("branch");
            if (_branch) {
                _branch = _branch[0] || "master";
            } else {
                _branch = "master";
            }
            _projectName = COMMON.getParameters("proj");
            if(_projectName){
                _projectName = _projectName[0];
            } else {
                _projectName = "users";
            }

            var done = TASYNC.call(COMMON.openDatabase);
            done = TASYNC.call(COMMON.openProject, done);
            var core = TASYNC.call(COMMON.getCore, done);
            _startHash = TASYNC.call(getRootHashOfBranch,_branch,done);


            if(COMMON.getParameters("info")){
                //info command
                done = TASYNC.call(infoPrint,core,_startHash);
            }
            return done;
        }

        function getRootHashOfBranch (branch){
            var project = COMMON.getProject();
            var commitHash = project.getBranchHash(branch,null);
            var done = TASYNC.call(project.loadObject,commitHash);
            done = TASYNC.call(function(object){
                console.log('getRootHashOfBranch',branch,object.root);
                _branch = branch;
                return object.root;
            },done);
            return done;
        }

        function getRootHashOfCommit (commit){
            var project = COMMON.getProject();
            return TASYNC.call(function(object){
                console.log('getRootHashOfCommit',commit,object.root);
                return object.root;
            },TASYNC.call(project.loadObject,commit));
        }

        function infoPrint(core,roothash){
            function printUser(userObject){
                var outstring = "";
                outstring+="username: "+core.getAttribute(userObject,'name')+" | ";
                var userProjects = core.getRegistry(userObject,'projects');
                var hasproject=false;
                for(var i in userProjects){
                    if(hasproject === false){
                        hasproject = true;
                        outstring+= "projects:";
                    }
                    outstring+= " "+i;
                }
                return outstring;
            }

            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    for(var i=0;i<objectArray.length;i++){
                        console.log(printUser(objectArray[i]));
                    }
                    return;
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;

        }

    });

    return;
}


