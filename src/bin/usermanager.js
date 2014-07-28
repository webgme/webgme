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

    requirejs([ "util/common", "util/assert", "core/tasync", 'util/guid' ], function(COMMON, ASSERT, TASYNC,GUID) {
        "use strict";

        TASYNC.trycatch(main, function (error) {
            console.log(error.trace || error.stack);

            COMMON.setProgress(null);
            COMMON.closeProject();
            COMMON.closeDatabase();
        });
        var _startHash = null,
            _branch = null,
            _projectName = null,
            _user = null;

        function main () {
            //var args = COMMON.getParameters(null);
            //console.log(args);

            if (COMMON.getParameters("help") !== null) {
                console.log("Usage: node usermanager.js [options]");
                console.log("");
                console.log("Parses a GME xme file and stores it int a WEBGME database. Possible options:");
                console.log("");
                console.log("  -mongo [database [host [port]]]\t\t\topens a mongo database");
                console.log("  -proj <project>\t\t\t\t\tselects the given project");
                console.log("  -branch <branch>\t\t\t\t\tthe branch to work with");
                console.log("  -create\t\t\t\t\t\tcreates an empty user project");
                console.log("  -user <username>\t\t\t\t\tthe user which we would like to manage");
                console.log("  -adduser <write = true/false> [password email]\tthe user to add");
                console.log("  -addproject <projectname> <mode = r|rw|rwd>\t\tadds a project to the user data");
                console.log("  -removeproject <projectname>\t\t\t\tremoves a project from the user data");
                console.log("  -token \t\t\t\t\tgenerates a token for the user");
                console.log("  -removeuser \t\t\t\t\t\tremoves a user data");
                console.log("  -info\t\t\t\t\t\t\tprints out the data of the user, or if no user is given then the data of all users");
                console.log("  -help\t\t\t\t\t\t\tprints out this help message");
                console.log("");
                return;
            }


            _branch = COMMON.getParameters("branch") || [];
            _branch = _branch[0] || "master";

            _projectName = COMMON.getParameters("proj") || [];
            _projectName = _projectName[0] || "users";

            _user = COMMON.getParameters("user") || [];
            _user = _user[0];

            var done = TASYNC.call(COMMON.openDatabase);
            done = TASYNC.call(COMMON.openProject,_projectName,done);
            var core = TASYNC.call(COMMON.getCore, done);

            if(COMMON.getParameters("create")){
                done = TASYNC.call(createEmptyDb,core,_branch,done);
            } else {
                _startHash = TASYNC.call(getRootHashOfBranch,_branch,done);
                var projpars;
                if(COMMON.getParameters("info")){
                    //info command
                    done = TASYNC.call(infoPrint,core,_startHash,_user);
                } else if(COMMON.getParameters("token")){
                    done = TASYNC.call(generateToken,core,_startHash,_user);
                } else if(COMMON.getParameters("addproject")){
                    projpars = COMMON.getParameters("addproject");
                    done = TASYNC.call(addProject,core,_startHash,_user,projpars[0],projpars[1] || "");
                } else if(COMMON.getParameters("removeproject")){
                    projpars = COMMON.getParameters("removeproject");
                    done = TASYNC.call(removeProject,core,_startHash,_user,projpars[0]);
                } else if(COMMON.getParameters("adduser")){
                    projpars = COMMON.getParameters("adduser");
                    done = TASYNC.call(addUser,core,_startHash,_user,projpars[0] || "false",projpars[1] || null,projpars[2] || null);
                } else if(COMMON.getParameters("removeuser")){
                    projpars = COMMON.getParameters("removeuser");
                    done = TASYNC.call(removeUser,core,_startHash,_user);
                }
            }




            done = TASYNC.call(COMMON.closeProject, done);
            done = TASYNC.call(COMMON.closeDatabase, done);
            return done;
        }

        function getRootHashOfBranch (branch){
            var project = COMMON.getProject();
            var commitHash = project.getBranchHash(branch,null);
            var done = TASYNC.call(project.loadObject,commitHash);
            done = TASYNC.call(function(object){
                _branch = branch;
                return object.root;
            },done);
            return done;
        }
        function getCommitHashOfBranch (branch){
            var project = COMMON.getProject();
            return project.getBranchHash(branch,null);
        }
        function makeCommit (newroothash, parentcommithash, msg) {
            var project = COMMON.getProject();
            return project.makeCommit([parentcommithash], newroothash, msg);
        }
        function writeBranch (oldhash,newhash) {
            var project = COMMON.getProject();
            var done = project.setBranchHash(_branch, oldhash, newhash);
            return TASYNC.call(function () {
                console.log("Commit " + newhash + " written to branch " + _branch);
            }, done);
        }
        function persist (core,root) {
            console.log("Waiting for objects to be saved ...");
            var done = core.persist(root);
            var hash = core.getHash(root);
            return TASYNC.join(hash, done);
        }
        function saveModifications(newroothash,msg){
            var oldcommithash = getCommitHashOfBranch(_branch);
            var newcommit = TASYNC.call(makeCommit,newroothash,oldcommithash,msg);
            return TASYNC.call(writeBranch,oldcommithash,newcommit);

        }
        function padString(str,length){
            while(str.length<length){
                str = " "+str;
            }
            return str;
        }

        //commands
        function createEmptyDb(core,branch){
            var root = core.createNode({parent:null,base:null});
            core.setAttribute(root,'name',"USERS");

            var newroothash = persist(core,root);
            var project = COMMON.getProject();
            var newcommit = TASYNC.call(project.makeCommit,[],newroothash,"creating empty user database");
            var oldcommit = project.getBranchHash(branch,null);
            var done = TASYNC.call(project.setBranchHash,branch,oldcommit,newcommit);
            return TASYNC.call(function () {
                console.log("Commit " + newcommit + " written to branch " + branch);
            }, done);
        }
        function infoPrint(core,roothash,userName){
            function printUser(userObject){
                var outstring = "";
                outstring+="userName: " + padString(core.getAttribute(userObject,'name'),20) + " | ";
                outstring+="canCreate: " + (core.getRegistry(userObject,'create') === true ? " true" : "false") + " | ";
                outstring+="projects: ";
                var userProjects = core.getRegistry(userObject,'projects');
                for(var i in userProjects){
                    var mode = "";
                    if(userProjects[i].read){
                        mode+="r";
                    } else {
                        mode+="_";
                    }
                    if(userProjects[i].write){
                        mode+="w";
                    } else {
                        mode+="_";
                    }
                    if(userProjects[i].delete){
                        mode+="d";
                    } else {
                        mode+="_";
                    }
                    outstring+= padString(i+"("+mode+")",20) + " ; ";
                }
                var end = outstring.lastIndexOf(';');
                if(end !== -1){
                    outstring = outstring.substring(0,end-1);
                }
                return outstring;
            }

            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    for(var i=0;i<objectArray.length;i++){
                        if(userName){
                            if(core.getAttribute(objectArray[i],'name') === userName){
                                console.log(printUser(objectArray[i]));
                            }
                        } else {
                            console.log(printUser(objectArray[i]));
                        }
                    }
                    return;
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;

        }
        function generateToken(core,roothash,userName){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === userName){
                            child = objectArray[i];
                        }
                        i++;
                    }

                    if(child){
                        core.setAttribute(child,'token',{id:GUID()+'token',created:(new Date()).getDate()});
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"token have been generated for user: "+userName);
                    } else {
                        return null;
                    }
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        }
        function addProject(core,roothash,username,projectname,rights){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child = objectArray[i];
                        }
                        i++;
                    }

                    if(child){
                        var projects = core.getRegistry(child,'projects');
                        if(projects === null || projects === undefined){
                            projects = {};
                        } else {
                            projects = JSON.parse(JSON.stringify(projects));
                        }

                        if(projects[projectname] === null || projects[projectname] === undefined){
                            projects[projectname] = {};
                        }

                        if(rights.indexOf('r') !== -1){
                            projects[projectname].read = true;
                        } else {
                            projects[projectname].read = false;
                        }
                        if(rights.indexOf('w') !== -1){
                            projects[projectname].write = true;
                        } else {
                            projects[projectname].write = false;
                        }
                        if(rights.indexOf('d') !== -1){
                            projects[projectname].delete = true;
                        } else {
                            projects[projectname].delete = false;
                        }

                        core.setRegistry(child,'projects',projects);
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"project "+projectname+" has been added to user "+username);
                    } else {
                        return null;
                    }
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        }
        function removeProject(core,roothash,username,projectname){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child = objectArray[i];
                        }
                        i++;
                    }

                    if(child){
                        var projects = core.getRegistry(child,'projects');
                        if(projects === null || projects === undefined){
                            projects = {};
                        } else {
                            projects = JSON.parse(JSON.stringify(projects));
                        }
                        if(projects[projectname]){
                            delete projects[projectname];
                            core.setRegistry(child,'projects',projects);
                            var newroothash = persist(core,parentObject);
                            return TASYNC.call(saveModifications,newroothash,"project "+projectname+" has been removed from user "+username);
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        }
        function addUser(core,roothash,username,cancreate,password,email){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child=objectArray[i];
                        }
                        i++;
                    }

                    if(child === null){
                        child = core.createNode({parent:parentObject, base:null});
                        core.setAttribute(child,'name',username);
                        core.setRegistry(child,'create',cancreate === 'true');
                        core.setRegistry(child,'projects',{});
                        if(password){
                            core.setRegistry(child,'pass',password);
                        }
                        if(email){
                            core.setRegistry(child,'email',email);
                        }
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"a new user"+username+" has been added to the database");
                    } else {
                        core.setRegistry(child,'create',cancreate === true);
                        if(password){
                            core.setRegistry(child,'pass',password);
                        }
                        if(email){
                            core.setRegistry(child,'email',email);
                        }
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"the basic data of user "+username+" has been changed");
                    }
                    return null;
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        }
        function removeUser(core,roothash,username){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child=objectArray[i];
                        }
                        i++;
                    }

                    if(child){
                        core.deleteNode(child);
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"user "+username+" has been removed from database");
                    }
                    return null;
                },children);
            }



            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        };
    });
};
