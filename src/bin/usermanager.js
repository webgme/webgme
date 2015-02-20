/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

if (typeof define !== "function") {
    var requirejs = require("requirejs");
    var Q = require('q');

    requirejs.config({
        nodeRequire: require,
        baseUrl: __dirname + "/..",
        paths:{
            'util':'common/util',
            'core':'common/core',
            'storage':'common/storage',
            'auth': 'server/auth',
            'bin': 'bin'
        }
    });

    requirejs([ "util/common", "util/assert", 'auth/gmeauth', 'bin/getconfig'], function(COMMON, ASSERT, gmeauth, config) {
        "use strict";

        var userId = null;

        main()
            .then(function () {
                console.log("Done");
            })
            .catch(function (err) {
                console.error('ERROR: ' + err);
            })
            .finally(gmeauth.unload);

        function main() {
            //var args = COMMON.getParameters(null);
            //console.log(args);

            var usage = function () {
                console.log("Usage: node usermanager.js [options]");
                console.log("");
                console.log("Adds or authorizes a user. Possible options:");
                console.log("");
                console.log("  -mongo [database [host [port]]]\t\t\topens a mongo database");
                console.log("  -user <username>\t\t\t\t\tthe user to manage");
                console.log("  -adduser <write = true/false> [password email]\ttadd a user");
                console.log("  -addproject <projectname> <mode = r|rw|rwd>\t\tadds a project to the user data");
                console.log("  -removeproject <projectname>\t\t\t\tremoves a project from the user data");
                console.log("  -token \t\t\t\t\tgenerates a token for the user");
                console.log("  -removeuser \t\t\t\t\t\tremoves a user data");
                console.log("  -info\t\t\t\t\t\t\tprints out the data of the user, or if no user is given then the data of all users");
                console.log("  -help\t\t\t\t\t\t\tprints out this help message");
                console.log("");
                return Q(null);
            };
            if (COMMON.getParameters("help") !== null || process.argv.length === 2) {
                return usage();
            }

            var mongoConnectionInfo = COMMON.getParameters("mongo");
            if (mongoConnectionInfo) {
                mongoConnectionInfo = {host: mongoConnectionInfo[1] || '127.0.0.1',
                    port: mongoConnectionInfo[2] || 27017,
                    database: mongoConnectionInfo[0] || 'multi'
                };
            } else {
                mongoConnectionInfo = {host: config.mongoip,
                    port: config.mongoport,
                    database: config.mongodatabase
                }
            }
            gmeauth = gmeauth(mongoConnectionInfo);
            userId = (COMMON.getParameters("user") || [])[0];
            var checkUserId = function () {
                if (!userId) {
                    return Q.reject('must specifiy -user');
                }
                return undefined;
            };

            var projpars;
            if(COMMON.getParameters("info")){
                return checkUserId() || infoPrint(userId).then(console.log);
            } else if(COMMON.getParameters("token")) {
                return checkUserId() || generateToken(userId);
            } else if(COMMON.getParameters("addproject")){
                projpars = COMMON.getParameters("addproject");
                return checkUserId() || addProject(userId, projpars[0], projpars[1] || "")
                    .then(function (success) {
                        if (!success) {
                            console.error('Unknown user ' + userId);
                        }
                    });
            } else if(COMMON.getParameters("removeproject")) {
                projpars = COMMON.getParameters("removeproject");
                return checkUserId() || gmeauth.authorizeByUserId(userId, projpars[0], 'delete')
                    .then(function (success) {
                        if (!success) {
                            console.error('Unknown user ' + userId);
                        }
                    });
            } else if(COMMON.getParameters("adduser")){
                projpars = COMMON.getParameters("adduser");
                return checkUserId() || gmeauth.addUser(userId, projpars[2] || null, projpars[1] || null, projpars[0] === 'true', { overwrite: true});
            } else if(COMMON.getParameters("removeuser")){
                return checkUserId() || gmeauth.removeUserByUserId(userId);
            } else {
                console.log("Unrecognized operation");
                return usage();
            }
        }

        function padString(str,length){
            while(str.length<length){
                str = " "+str;
            }
            return str;
        }

        //commands
        function infoPrint(userName) {
            return gmeauth.getAllUserAuthInfo(userName)
                .then(function printUser(userObject) {
                var outstring = "";
                outstring+="userName: " + padString(userObject._id) + " | ";
                outstring+="canCreate: " + userObject.canCreate + " | ";
                outstring+="projects: ";
                var userProjects = userObject.projects;
                for (var i in userProjects) {
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
            });
        }

        function generateToken() {
            return gmeauth.generateTokenForUserId(userId)
                .then(console.log);
        }

        function addProject(userId, projectName, rwd) {
            var rights = {
                    read: rwd.indexOf('r') !== -1,
                    write: rwd.indexOf('w') !== -1,
                    delete: rwd.indexOf('d') !== -1
                };
            return gmeauth.authorizeByUserId(userId, projectName, 'create', rights);
        }

    });
};
