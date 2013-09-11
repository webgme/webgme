/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/sha1", "util/canon", "util/guid", "auth/udm", "auth/crypto" ], function (ASSERT,SHA1,CANON,GUID,UDM,CRYPTO) {
    "use strict";


    function Database (_innerDb, options) {
        ASSERT(typeof options === "object" && typeof _innerDb === "object");
        options.sessionperiod = options.sessionperiod || 100000;
        options.expireinterval = options.expireinterval || 10000;
        var _udm = options.udm;
        var _crypto = options.crypto || nullCrypto();
        var database = {};
        var _users = {};
        var _sessions = {};

        //helping functions
        var generateSessionId = function(){
            return GUID();
        };
        var generateGuest = function(){
            return {
                puk:'',
                create:false,
                guest:true
            }
        };
        var getUsersProjectRights = function(user,projectname,callback){
            if(_users[user].projects[projectname]){
                return callback(null);
            }
            if(user.indexOf('@') !== -1){
                _udm.getUserByEmailProject(user,projectname,function(err,projectData){
                    if(!err){
                        _users[user].projects[projectname] = projectData;
                    }
                    callback(err);
                });
            } else {
                _udm.getUserProject(user,projectname,function(err,projectData){
                    if(!err){
                        _users[user].projects[projectname] = projectData;
                    }
                    callback(err);
                });
            }
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
                if(user.indexOf('@') !== -1){
                    _udm.getUserByEmail(user,function(err,userData){
                        if(err){
                            callback(err);
                        } else {
                            if(userData){
                                _users[user] = userData;
                                _users[user].id = user;
                                callback(null,_crypto.encrypt(_users[user].puk,addNewSession(_users[user])));
                            } else {
                                callback('no such user found');
                            }
                        }
                    });
                } else {
                    _udm.getUser(user,function(err,userData){
                        if(err){
                            callback(err);
                        } else {
                            if(userData){
                                _users[user] = userData;
                                _users[user].id = user;
                                callback(null,_crypto.encrypt(_users[user].puk,addNewSession(_users[user])));
                            } else {
                                callback('no such user found');
                            }
                        }
                    });
                }
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
        database.fsyncDatabase = function(callback){
            _innerDb.fsyncDatabase(callback)
        };
        database.getDatabaseStatus = function(oldstatus,callback){
            _innerDb.getDatabaseStatus(oldstatus,callback);
        };
        database.getProjectNames = function(sid,callback){
            var user = getSessionUser(sid);
            if(user){
                _innerDb.getProjectNames(function(err,names){
                    if(err){
                        callback(err);
                    } else {
                        /*var filtered = [];
                        for(var i=0;i<names.length;i++){
                            if(user.projects[names[i]]){
                                filtered.push(names[i]);
                            }
                        }*/
                        callback(null,names);
                    }
                });
            } else {
                callback('not authenticated session');
            }
        };
        database.deleteProject = function(name,sid,callback){
            var user = getSessionUser(sid);
            if(user){
                getUsersProjectRights(user.id,name,function(err){
                    if(user.projects[name]){
                        if(user.projects[name].delete === true){
                            _innerDb.deleteProject(name,callback);
                        } else {
                            callback('missing necessary rights');
                        }
                    } else {
                        callback('missing necessary rights');
                    }
                });
            } else {
                callback('not authenticated session');
            }
        };
        database.openProject = function(name,sid,callback){
            var goodToOpen = function(){
                //here we add our security layer
                _innerDb.openProject(name,function(err,innerProject){
                    if(err){
                        callback(err);
                    } else {
                        var project = {};
                        project.fsyncDatabase = function(callback){
                            innerProject.fsyncDatabase(callback);
                        };
                        project.getDatabaseStatus = function(callback){
                            innerProject.getDatabaseStatus(callback);
                        };
                        project.closeProject = function(sid,callback){
                            if(getSessionUser(sid) !== null){
                                innerProject.closeProject(callback);
                            } else {
                                if(typeof callback === 'function'){
                                    callback('not authenticated session');
                                }
                            }
                        };
                        project.loadObject = function(hash,sid,callback){
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
                        project.insertObject = function(object,sid,callback){
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
                        project.findHash = function(beginning,sid,callback){
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
                        project.getBranchHash = function(branch,oldhash,sid,callback){
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
                        project.setBranchHash = function(branch,oldhash,newhash,sid,callback){
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
                        project.getCommits = function(before,number,sid,callback){
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
                getUsersProjectRights(user.id,name,function(err){
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
                                    if(user.projects[name].read){
                                        goodToOpen();
                                    } else {
                                        callback('missing necessary rights');
                                    }
                                } else {
                                    callback('missing necessary rights');
                                }
                            }
                        }
                    });
                });
            } else {
                callback('not authenticated session');
            }
        };

        return database;
    }

    return Database;
});

