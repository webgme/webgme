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

    requirejs([ "util/common", "util/assert", "core/tasync", "bin/tree_hasher" ], function (COMMON, ASSERT, TASYNC, hasher) {
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
                console.log("Usage: node tree_hasher.js [options]");
                console.log("");
                console.log("Parses a GME xme file and stores it int a WEBGME database. Possible options:");
                console.log("");
                console.log("  -mongo [database [host [port]]]\topens a mongo database");
                console.log("  -proj <project>\t\t\tselects the given project");
                console.log("  -branch <branch>\t\t\tthe branch to serialize");
                console.log("  -hash <hash>\t\t\t\tthe root hash to serialize");
                console.log("  -commit <hash>\t\t\tthe commit hash to serialize");
                console.log("  -help\t\t\t\t\tprints out this help message");
                console.log("");
                return;
            }

            console.log('starting tree discovery',new Date());

            _branch = COMMON.getParameters("branch");
            if (_branch) {
                _branch = _branch[0] || "parsed";
            }
            _startHash = COMMON.getParameters("hash");
            if(_startHash){
                _startHash = _startHash[0];
            }
            _projectName = COMMON.getParameters("proj");
            if(_projectName){
                _projectName = _projectName[0];
            }
            _commit = COMMON.getParameters('commit');
            if(_commit){
                _commit = _commit[0];
            }

            var done = TASYNC.call(COMMON.openDatabase);
            done = TASYNC.call(COMMON.openProject, done);
            var core = TASYNC.call(COMMON.getCore, done);
            if(!_startHash){
                if(_branch){
                    _startHash = TASYNC.call(getRootHashOfBranch,_branch,done);
                } else if(_commit){
                    _startHash = TASYNC.call(getRootHashOfCommit,_commit,done);
                } else {
                    done = TASYNC.call(COMMON.closeProject, done);
                    done = TASYNC.call(COMMON.closeDatabase, done);
                    return done;
                }
            }
            done = TASYNC.call(hasher,core,_startHash);
            done = TASYNC.call(function(object){
                console.log('the hash value of the tree is:',object);
                return null;
            },done);
            done = TASYNC.call(COMMON.closeProject, done);
            done = TASYNC.call(COMMON.closeDatabase, done);
            done = TASYNC.call(function(){
                console.log('finished',new Date());
            },done);
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

    });
}

define([ "util/assert", "core/tasync", "util/common", "util/canon", "util/sha1" ], function (ASSERT, TASYNC, COMMON,CANON,SHA1) {


    //new TASYNC compatible functions

    var theCore;
    var theTree;

    function getChildren(treeObject,nodeObject){
        treeObject[theCore.getHash(nodeObject)] = {};
        //console.log(theTree);

        //handling children
        var children = theCore.loadChildren(nodeObject);
        var done = TASYNC.call(function(objectArray){
            var mydone;
            for(var i=0;i<objectArray.length;i++){
                mydone = TASYNC.call(getChildren,treeObject[theCore.getHash(nodeObject)],objectArray[i]);
            }
            return mydone;
        },children);

        return done;
    }
    function prettify(){
        var pretty = "printing the hashes of the tree:\n\n";
        pretty+=prettifyObject(theTree,"");
        pretty+="\n\nprintout finished";
        return pretty;
    }
    function prettifyObject(treeObject,indent){
        var pretty = "";

        for(var i in treeObject){
            pretty+=indent+i+'\n';
            pretty+=prettifyObject(treeObject[i],indent+"  ");
        }
        return pretty;
    }
    function hasher(core,hash){
        theCore = core;
        theTree = {};
        var root = core.loadRoot(hash);

        var done = TASYNC.call(getChildren,theTree,root);
        return TASYNC.call(function(){
            console.log(prettify());
            return SHA1(CANON.stringify(theTree));
        },done);
    }

    //return TASYNC.wrap(serialize);
    return hasher;
});

