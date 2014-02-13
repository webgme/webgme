/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Authors: Tamas Kecskes, Robert Kereskenyi
 */

var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/.."
});

requirejs([ "util/common", "util/assert", "core/tasync", "util/guid", "client/js/RegistryKeys" ], function (COMMON, ASSERT, TASYNC,GUID, REGISTRY_KEYS) {
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

    //these registry keys will be saved in the item's registry
    var _protectedRegistryKeys = [REGISTRY_KEYS.PROJECT_REGISTRY,
                                    REGISTRY_KEYS.META_SHEETS,
                                    REGISTRY_KEYS.IS_ABSTRACT,
                                    REGISTRY_KEYS.IS_PORT,
                                    REGISTRY_KEYS.DECORATOR,
                                    REGISTRY_KEYS.DISPLAY_FORMAT,
                                    REGISTRY_KEYS.POSITION,
                                    REGISTRY_KEYS.SVG_ICON
                                ];

    //these registry keys will be saved in the setmembers' registry
    var _protectedSetMemberRegistryKeys = [REGISTRY_KEYS.POSITION];



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
        } else {
            _branch = "master";
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
        var objID = core.getPath(node,core.getRoot(node)) + ' ('+core.getAttribute(node,"name")+"): ";
        console.log(objID);

        //clear item's global registry values
        var registryKeys = core.getRegistryNames(node) || [];
        var len = registryKeys.length;
        var removedRegKeys = "";
        var rk;
        while (len--) {
            //remove all that's not defined as protected
            rk = registryKeys[len];
            if (_protectedRegistryKeys.indexOf(rk) === -1) {
                core.delRegistry(node, rk);
                removedRegKeys += rk + ", ";
            }
        }
        if (removedRegKeys !== "") {
            console.log('\tRemoved node registry entries: ' + removedRegKeys);
        }

        //check if this node has any sets and remove the not protected set registry entries too
        var sets = core.getSetNames(node) || [];
        len = sets.length;
        var setMemberRegistryKeys;
        var set;
        var setMembers;
        var setMemberIdx;
        var setMemberRegKeysIdx;
        var sm;
        while (len--) {
            //remove all that's not defined as protected
            set = sets[len];
            setMembers = core.getMemberPaths(node, set) || [];
            setMemberIdx = setMembers.length;
            while (setMemberIdx--) {
                sm = setMembers[setMemberIdx];
                setMemberRegistryKeys = core.getMemberRegistryNames(node, set, sm) || [];
                setMemberRegKeysIdx = setMemberRegistryKeys.length;
                removedRegKeys = "";
                while (setMemberRegKeysIdx--) {
                    rk = setMemberRegistryKeys[setMemberRegKeysIdx];
                    if (_protectedSetMemberRegistryKeys.indexOf(rk) === -1) {
                        core.delMemberRegistry(node, set, sm, rk);
                        removedRegKeys += rk + ", ";
                    }
                }
                if (removedRegKeys !== "") {
                    console.log('\tRemoved set member registry entries for SET "' + set + '" and MEMBER "' + sm +  '": ' + removedRegKeys);
                }
            }
        }

        //insert newline
        console.log('\n');
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

