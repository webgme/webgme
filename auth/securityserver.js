/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/sha1", "util/canon", "util/guid" ], function (ASSERT,SHA1,CANON,GUID) {
    "use strict";

    function nullUDM(){
        var _user = {
            pppk : 0,
            puk : 0,
            create : true,
            projects : {}
        };
        function getUser(username,callback){
            callback(null,_user);
        }
        function updateUser(username,user,callback){
            _user = user;
        }
        return {
            getUser : getUser,
            updateUser : updateUser
        }
    }
    function nullCrypto(){

        function encrypt(key,data){
            return key*data;
        }

        return {
            encrypt : encrypt
        }
    }
    function Database (_innerDb, options) {
        ASSERT(typeof options === "object" && typeof _innerDb === "object");
        options.sessionperiod = options.sessionperiod || 100000;
        options.expireinterval = options.expireinterval || 10000;
        var _udm = options.udm || nullUDM();
        var _crypto = options.crypto || nullCrypto();
        var database = {};
        var _users = {};
        var _sessions = {};

        //helping functions
        var generateSessionId = function(){
            return GUID();
        };
        var addNewSession = function(user){
            if(user.sessions){
                //nothing to do
            } else {
                user.sessions = [];
            }
            var sid = generateSessionId();
            user.sessions.push(sid);
            _sessions[sid] = {user:user,period:options.sessionperiod};
            return sid;
        };
        var getSessionUser = function(sid){
            if(_sessions[sid]){
                _sessions[sid].period = options.sessionperiod;
                return _sessions[sid].user;
            } else {
                return null;
            }
        };

        //we have to add the Authenticate function
        database.authenticate = function(user,callback){
            if(_users[user]){
                callback(null,_crypto.encrypt(_users[user].puk,addNewSession(_users[user])));
            } else {
                _udm.getUser(user,function(err,userData){
                    if(err){
                        callback(err);
                    } else {
                        if(userData){
                            _users[user] = userData;
                            callback(null,_crypto.encrypt(_users[user].puk,addNewSession(_users[user])));
                        } else {
                            callback('no such user found');
                        }
                    }
                });
            }
        };

        database.openDatabase = function(callback){
            _innerDb.openDatabase(callback);
        };
        database.closeDatabase = function(sid,callback){
            if(getSessionUser(sid) !== null){
                _innerDb.closeDatabase(callback);
            } else {
                callback('not authenticated session');
            }
        };
        database.fsyncDatabase = function(sid,callback){
            if(getSessionUser(sid) !== null){
                _innerDb.fsyncDatabase(callback);
            } else {
                callback('not authenticated session');
            }
        };
        database.getDatabaseStatus = function(sid,oldstatus,callback){
            if(getSessionUser(sid) !== null){
                _innerDb.getDatabaseStatus(oldstatus,callback);
            } else {
                callback('not authenticated session');
            }
        };
        database.getProjectNames = function(sid,callback){
            var user = getSessionUser(sid);
            if(user){
                _innerDb.getProjectNames(function(err,names){
                    if(err){
                        callback(err);
                    } else {
                        var filtered = [];
                        for(var i=0;i<names.length;i++){
                            if(user.projects[names[i]]){
                                filtered.push(names[i]);
                            }
                        }
                        callback(null,filtered);
                    }
                });
            } else {
                callback('not authenticated session');
            }
        };
        database.deleteProject = function(sid,name,callback){
            var user = getSessionUser(sid);
            if(user){
                if(user.projects[name]){
                    if(user.projects[name].delete === true){
                        _innerDb.deleteProject(name,callback);
                    } else {
                        callback('missing necessary rights');
                    }
                } else {
                    callback('missing necessary rights');
                }
            } else {
                callback('not authenticated session');
            }
        };
        database.openProject = function(sid,name,callback){
            var goodToOpen = function(){
                //here we add our security layer
                _innerDb.openProject(name,function(err,innerProject){
                    if(err){
                        callback(err);
                    } else {
                        var project = {};
                        project.fsyncDatabase = function(sid,callback){
                            if(getSessionUser(sid) !== null){
                                innerProject.fsyncDatabase(callback);
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.getDatabaseStatus = function(sid,callback){
                            if(getSessionUser(sid) !== null){
                                innerProject.getDatabaseStatus(callback);
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.closeProject = function(sid,callback){
                            if(getSessionUser(sid) !== null){
                                innerProject.closeProject(callback);
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.loadObject = function(sid,hash,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].read == true){
                                        innerProject.loadObject(hash,callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.insertObject = function(sid,object,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].write == true){
                                        //TODO signature check should be added here in case of commit
                                        innerProject.insertObject(object,callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.findHash = function(sid,beginning,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].read == true){
                                        innerProject.findHash(beginning,callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.dumpObjects = function(sid,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].read == true){
                                        innerProject.dumpObjects(callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.getBranchNames = function(sid,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].read == true){
                                        innerProject.getBranchNames(callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.getBranchHash = function(sid,branch,oldhash,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].read == true){
                                        innerProject.getBranchHash(branch,oldhash,callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.setBranchHash = function(sid,branch,oldhash,newhash,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].write == true){
                                        innerProject.setBranchHash(branch,oldhash,newhash,callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.getCommits = function(sid,before,number,callback){
                            var user = getSessionUser(sid);
                            if(user){
                                if(user.projects[name]){
                                    if(user.projects[name].read == true){
                                        innerProject.getCommits(before,number,callback);
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            } else {
                                callback('not authenticated session');
                            }
                        };
                        project.ID_NAME = innerProject.ID_NAME;

                        callback(null,project);
                    }
                });
            };

            var user = getSessionUser(sid);
            if(user){
                _innerDb.getProjectNames(function(err,names){
                    if(err){
                        callback(err);
                    } else {
                        if(names.indexOf(name) === -1){
                            //create
                            if(user.create === true){
                                goodToOpen();
                            } else {
                                callback('missing necessary rights');
                            }
                        } else {
                            //open
                            if(user.projects[name]){
                                goodToOpen();
                            } else {
                                callback('missing necessary rights');
                            }
                        }
                    }
                });
            } else {
                callback('not authenticated session');
            }
        };

        return database;
    }

    return Database;
});

