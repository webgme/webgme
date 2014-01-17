/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/.."
});

requirejs([ "util/common", "util/assert", "core/tasync", "util/guid" ], function (COMMON, ASSERT, TASYNC,GUID) {
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
        _projectName = null,
        _outFile = null;

    function main () {
        var args = COMMON.getParameters(null);

        if (COMMON.getParameters("help") !== null) {
            console.log("Usage: node update_project.js [options]");
            console.log("");
            console.log("Updates the given branch to the latest webgme format. Possible options:");
            console.log("");
            console.log("  -mongo [database [host [port]]]\topens a mongo database");
            console.log("  -proj <project>\t\t\tselects the given project");
            console.log("  -branch <branch>\t\t\tthe branch to serialize");
            console.log("  -help\t\t\t\t\tprints out this help message");
            console.log("");
            return;
        }

        console.log('starting serialization',new Date());
        _outFile = args[0];

        _branch = COMMON.getParameters("branch");
        if (_branch) {
            _branch = _branch[0] || "parsed";
        }
        _projectName = COMMON.getParameters("proj");
        if(_projectName){
            _projectName = _projectName[0];
        }

        var done = TASYNC.call(COMMON.openDatabase);
        done = TASYNC.call(COMMON.openProject, done);
        var core = TASYNC.call(COMMON.getCore, done);
        if(!_startHash){
            if(_branch){
                _startHash = TASYNC.call(getRootHashOfBranch,_branch,done);
                TASYNC.call(settingCommitHashOfBranch,_branch,done);
            } else if(_commit){
                _startHash = TASYNC.call(getRootHashOfCommit,_commit,done);
            } else {
                done = TASYNC.call(COMMON.closeProject, done);
                done = TASYNC.call(COMMON.closeDatabase, done);
                return done;
            }
        }
        done = TASYNC.call(updateProject,core,_startHash);
        done = TASYNC.call(function(newhash){
            console.log('the root after serializing and normalizing:',newhash);
            console.log('the commit hash what we modified:',_commit);
            if(_commit){
                //we should make a commit
                var newCommit = makeCommit(newhash,_commit);
                if(_branch){
                    //we also should update the branch
                    return TASYNC.call(writeBranch,newCommit);
                } else {
                    return null;
                }
            } else {
                return null;
            }
        },done);
        done = TASYNC.call(COMMON.closeProject, done);
        done = TASYNC.call(COMMON.closeDatabase, done);
        done = TASYNC.call(function(){
            console.log('finished',new Date());
        },done);
        return done;
    }

    function makeCommit (rootHash, parentCommitHash) {
        var project = COMMON.getProject();
        return project.makeCommit([parentCommitHash], rootHash, "Updating project to be visible with latest webGME.");
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

    function settingCommitHashOfBranch (branch){
        var project = COMMON.getProject();
        var cHash = project.getBranchHash(branch,null);
        return TASYNC.call(function(hash){
            _commit = hash;
            return hash;
        },cHash);
    }

    function getRootHashOfCommit (commit){
        var project = COMMON.getProject();
        return TASYNC.call(function(object){
            console.log('getRootHashOfCommit',commit,object.root);
            return object.root;
        },TASYNC.call(project.loadObject,commit));
    }

    function writeBranch (hash) {
        var project = COMMON.getProject();
        var done = project.setBranchHash(_branch, _commit, hash);
        return TASYNC.call(function () {
            console.log("Commit " + hash + " written to branch " + _branch);
        }, done);
    }

    function updateNode(core,node){ //TODO this method should be always up-to-date...
        var text = " - "+core.getPath(node,core.getRoot(node))+' : '+core.getAttribute(node,"name")+" - ";
        var basepath = core.getPointerPath(node,"base");
        if(basepath === undefined){
            core.setPointer(node,"base",null);
            text += "base set";
        } else {
            text += "base checked";
        }
        var relguid = core.getAttribute(node,"_relguid");
        if(relguid === undefined || relguid === null){
            core.setGuid(node,GUID());
            text += " - guid set";
        } else {
            text += " - guid checked";
        }
        console.log(text);
        return;
    }
    function traverseNode (core,node){
        updateNode(core,node);
        var children = core.loadChildren(node);
        var traverseChildren = function(core,nodearray){
            var done;
            for(var i=0;i<nodearray.length;i++){
                done = TASYNC.call(traverseNode,core,nodearray[i],done);
            }
            return TASYNC.call(function(){return;},done);
        };
        return TASYNC.call(traverseChildren,core,children);
    }
    function updateProject(core,roothash){
        var root = core.loadRoot(roothash);
        var done = TASYNC.call(traverseNode,core,root);
        return TASYNC.call(saveChanges,core,root,done);
    }
    function saveChanges(core,root){
        console.log("Finalizing the update...");
        var done = core.persist(root);
        var hash = core.getHash(root);
        return TASYNC.join(hash, done);
    }

});

