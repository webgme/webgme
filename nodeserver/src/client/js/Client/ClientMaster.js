define([
    'eventDispatcher',
    'js/Client/ClientLocalStorage',
    'js/Client/ClientStorage',
    'js/Client/ClientProject',
    'js/Client/ClientCommitInfo',
    'js/Client/ClientLog',
    'js/Client/ClientTest',
    'commonUtil',
    'socket.io/socket.io.js'
],
    function (EventDispatcher, ClientLocalStorage, ClientStorage, ClientProject, ClientCommitInfo, ClientLog, ClientTest, commonUtil) {
        'use strict';
        
        var GUID = commonUtil.guid,
            COPY = commonUtil.copy,
            //gKEY = "_id",
            ClientMaster = function (parameters) {
        	if( parameters.proxy.substring(0, 7) !== "http://" ) {
        		parameters.proxy = "http://" + parameters.proxy;
        	}
        	
            var self = this,
                selectedObjectId = null,
                activeProject = null,
                activeActor = null,
                users = {},
                storages = {},
                commitInfos = {},
                savedInfoStorage = new ClientLocalStorage(),
                projectsinfo = parameters.nosaveddata ? {} : savedInfoStorage.load('#' + parameters.userstamp + '#saved#') || {},
                proxy = null,
                viewer = null,
                mytest = new ClientTest({master:self}),
                logger = parameters.log && parameters.logsrv ? new ClientLog(parameters.logsrv) : null;


            /*event functions to relay information between users*/
            $.extend(self, new EventDispatcher());
            self.events = {
                "SELECTEDOBJECT_CHANGED":"SELECTEDOBJECT_CHANGED",
                "NETWORKSTATUS_CHANGED":"NETWORKSTATUS_CHANGED",
                "ACTOR_CHANGED":"ACTOR_CHANGED"
            };
            self.setSelectedObjectId = function (objectId) {
                if (objectId !== selectedObjectId) {
                    selectedObjectId = objectId;
                    self.dispatchEvent(self.events.SELECTEDOBJECT_CHANGED, selectedObjectId);
                }
            };
            self.clearSelectedObjectId = function () {
                self.setSelectedObjectId(null);
            };
            //notifications and requests from the actor
            self.changeStatus = function (actorid, status) {
                //TODO we should handle this correctly
                self.dispatchEvent(self.events.NETWORKSTATUS_CHANGED, status);
                console.log(actorid + " is in " + status + " state");
            };
            self.dataInSync = function (projectid) {
                if (projectsinfo[projectid]) {
                    for (var i in projectsinfo[projectid].branches) {
                        if (projectsinfo[projectid].branches[i].actor) {
                            projectsinfo[projectid].branches[i].actor.goOnline();
                        }
                    }
                }
            };
            self.dataOutSync = function (projectid) {
                if (projectsinfo[projectid]) {
                    for (var i in projectsinfo[projectid].branches) {
                        if (projectsinfo[projectid].branches[i].actor) {
                            projectsinfo[projectid].branches[i].actor.networkError();
                        }
                    }
                }
            };

            //init - currently it means, we try to establish storage connection to all our saved projects
            //and create actor for all started branches...
            //if there is none, then we simply collects the projects from the server and waits for a selection from user interface...
            var init = function(){
                var tempproxy = io.connect(parameters.proxy,parameters.options);
                tempproxy.on('connect',function(){
                    if(proxy === null){
                        //first time
                        proxy = tempproxy;

                        //now we try to open only one project, the one we like to select...
                        getServerProjectList(function(serverlist){
                            var firstproject = null;
                            for (var i = 0; i < serverlist.length; i++) {
                                if (!projectsinfo[serverlist[i]]) {
                                    projectsinfo[serverlist[i]] = {
                                        parameters:null,
                                        currentbranch:null,
                                        branches:{}
                                    };
                                }
                            }

                            var deadprojects = [];
                            for (i in projectsinfo) {
                                if (i !== 'activeProject') {
                                    if (serverlist.indexOf(i) === -1) {
                                        deadprojects.push(i);
                                    }
                                }
                            }
                            for (i = 0; i < deadprojects.length; i++) {
                                delete projectsinfo[deadprojects[i]];
                            }
                            //projectinfo is up-to-date

                            //we set the firstproject just in case
                            for (i in projectsinfo) {
                                if(i!=='activeProject'){
                                    if (firstproject === null) {
                                        firstproject = i;
                                        break;
                                    }
                                }
                            }

                            if(parameters.nosaveddata && parameters.project && projectsinfo[parameters.project]){
                                openProject(parameters.project,function(err){
                                    if(err){
                                        console.log('project cannot be opened',parameters.project,err);
                                    } else {
                                        self.selectProject(parameters.project);
                                    }
                                });
                            } else {
                                if (projectsinfo.activeProject && projectsinfo[projectsinfo.activeProject]) {
                                    openProject(projectsinfo.activeProject,function(err){
                                        if(err){
                                            console.log('project cannot be opened',projectsinfo.activeProject,err);
                                        } else {
                                            self.selectProject(projectsinfo.activeProject);
                                        }
                                    });
                                } else {
                                    if(firstproject){
                                        openProject(firstproject,function(err){
                                            if(err){
                                                console.log('proect cannot be opened',firstproject,err);
                                            } else {
                                                self.selectProject(firstproject);
                                            }
                                        });
                                    } else {
                                        console.log('there is no project on this server');
                                    }
                                }
                            }
                            setInterval(saveProjectsInfo, 1000);
                        });
                    }
                });
            };
            var getServerProjectList = function (callback) {
                if (proxy) {
                    proxy.emit('availableProjects', function (err, projects) {
                        if (err) {
                            callback([]);
                        } else {
                            callback(projects);
                        }
                    });
                } else {
                    callback([]);
                }
            };
            var getLocalProjectList = function () {
                var list = [];
                for (var i in projectsinfo) {
                    if (i !== 'activeProject') {
                        list.push(i);
                    }
                }
                return list;
            };
            var openProject = function (project, callback) {
                if (projectsinfo[project]) {
                    var connecting = function (innercallback) {
                        var tempstorage = new ClientStorage({
                            server:info.parameters.projsrv,
                            options:parameters.socketiopar,
                            projectinfo:project,
                            faulttolerant:true,
                            cache:true,
                            logger:logger,
                            log:false,
                            watcher:self
                        });
                        tempstorage.open(function (err) {
                            if (err) {
                                innercallback(err);
                            } else {
                                storages[project] = tempstorage;
                                commitInfos[project] = new ClientCommitInfo({storage:storages[project], project:project, master:self, refreshrate:1000});
                                innercallback(null);
                            }
                        });
                    };
                    var info = projectsinfo[project];
                    if (info.parameters) {
                        connecting(function (err) {
                            if (err) {
                                info.parameters = null;
                                openProject(project, callback);
                            } else {
                                callback(null);
                            }
                        });
                    } else {
                        //no direct server info, we collect trough proxy
                        if (proxy) {
                            proxy.emit('getProject', project, function (err, projns) {
                                if (err || projns === null || projns === undefined) {
                                    callback(err);
                                } else {
                                    info.parameters = {
                                        projsrv:location.host + projns,
                                        projectname:project
                                    };
                                    connecting(function (err) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            callback(null);
                                        }
                                    });
                                }
                            });
                        } else {
                            callback('no proxy to get project info!!!');
                        }
                    }
                } else {
                    callback("no such project!!!");
                }
            };
            var saveProjectsInfo = function () {
                var info = COPY(projectsinfo);
                delete info.activeProject;

                for (var i in info) {
                    for (var j in info[i].branches) {
                        if (info[i].branches[j].actor) {
                            info[i].branches[j].commit = projectsinfo[i].branches[j].actor.getCurrentCommit();
                            info[i].branches[j].actor = null;
                        }
                    }
                    info[i].parameters = null;
                }
                info.activeProject = activeProject;
                savedInfoStorage.save('#' + parameters.userstamp + '#saved#', info);
            };
            var activateActor = function (actor, commit, callback) {
                callback = callback || function () {
                };
                if (activeActor !== actor) {
                    activeActor = actor;
                    actor.dismantle();
                    for (var i in users) {
                        actor.addUI(users[i]);
                    }
                    actor.buildUp(commit, function () {
                        self.clearSelectedObjectId();
                        for (i in users) {
                            if (users[i].UI.reLaunch) {
                                users[i].UI.reLaunch();
                            }
                        }
                        self.dispatchEvent(self.events.ACTOR_CHANGED, null);
                        callback();
                    });
                } else {
                    callback();
                }
            };


            //functions helping branch selection and project selection
            self.getActiveProject = function () {
                return activeProject;
            };
            self.getAvailableProjects = function () {
                return getLocalProjectList();
            };
            self.selectProject = function (projectname) {
                if (getLocalProjectList().indexOf(projectname) !== -1) {
                    if (activeProject) {
                        //we have to switch project, which means we will not have activeActor for sure...
                        if (activeActor) {
                            activeActor.dismantle();
                        }

                    }

                    activeProject = projectname;
                    var myinfo = projectsinfo[projectname];

                    var storageReady = function(){
                        commitInfos[projectname].getBranchesNow(function (err, branches) {
                            if (!err && branches && branches.length > 0) {
                                for (var i = 0; i < branches.length; i++) {
                                    if (myinfo.branches[branches[i].name] === null || myinfo.branches[branches[i].name] === undefined) {
                                        myinfo.branches[branches[i].name] = {
                                            actor:null,
                                            commit:branches[i].commit
                                        };
                                    }
                                }
                                //at this point all branch info is filled so we can go for the master/first available or the last used one
                                if (myinfo.currentbranch) {
                                    if (myinfo.branches[myinfo.currentbranch]) {
                                        if (!myinfo.branches[myinfo.currentbranch].actor) {
                                            myinfo.branches[myinfo.currentbranch].actor = new ClientProject({
                                                storage:storages[activeProject],
                                                master:self,
                                                id:null,
                                                userstamp:'todo',
                                                commit:myinfo.branches[myinfo.currentbranch].commit,
                                                branch:myinfo.currenbtranch,
                                                readonly:false,
                                                logger:logger
                                            });
                                        }
                                    } else {
                                        //now what the f**k???
                                        console.log('something really fucked up');
                                    }
                                } else {
                                    if (myinfo.branches['master']) {
                                        if (!myinfo.branches['master'].actor) {
                                            myinfo.currentbranch = 'master';
                                            myinfo.branches['master'].actor = new ClientProject({
                                                storage:storages[activeProject],
                                                master:self,
                                                id:null,
                                                userstamp:'todo',
                                                commit:myinfo.branches['master'].commit,
                                                branch:'master',
                                                readonly:false,
                                                logger:logger
                                            });
                                        }
                                    } else {
                                        for (i in myinfo.branches) {
                                            myinfo.currentbranch = i;
                                            if (!myinfo.branches[i].actor) {
                                                myinfo.branches[i].actor = new ClientProject({
                                                    storage:storages[activeProject],
                                                    master:self,
                                                    id:null,
                                                    userstamp:'todo',
                                                    commit:myinfo.branches[i].commit,
                                                    branch:i,
                                                    readonly:false,
                                                    logger:logger
                                                });
                                            }
                                            break;
                                        }
                                    }
                                }
                                //at this point we should selected/created our actor - so we simply activate it
                                commitInfos[activeProject].getAllCommitsNow(function (err, commits) {
                                    if(err) {
                                        console.log(err);
                                    }
                                    else if (commits && commits.length > 0) {
                                        activateActor(myinfo.branches[myinfo.currentbranch].actor, myinfo.branches[myinfo.currentbranch].commit,function(err){
                                            console.log('activated');
                                        });
                                    }
                                });
                            } else {
                                //no branch for the given project, baaad
                                console.log('cannot found any branch for the given project!!!');
                            }
                        });
                    };

                    if(storages[projectname] && commitInfos[projectname]){
                        storageReady();
                    } else {
                        openProject(projectname,function(err){
                            if(err){
                                console.log('cannot open project');
                                return 'cannot open project';
                            } else {
                                storageReady();
                            }
                        });
                    }
                } else {
                    console.log('not valid project');
                    return "not valid project";
                }
            };
            self.createProjectAsync = function(projectname,callback){
                self.createProject(projectname,callback);
            };
            self.createProject = function (projectname, callback) {
                callback = callback || function () {
                };
                var connecting = function (namespace, innercallback) {
                    var tempstorage = new ClientStorage({
                        server:location.host + namespace,
                        options:parameters.socketiopar,
                        projectinfo:projectname,
                        faulttolerant:true,
                        cache:true,
                        logger:logger,
                        log:false,
                        watcher:self
                    });
                    tempstorage.open(function (err) {
                        if (err) {
                            innercallback(err);
                        } else {
                            storages[projectname] = tempstorage;
                            commitInfos[projectname] = new ClientCommitInfo({storage:storages[projectname], project:projectname, master:self, refreshrate:1000});
                            innercallback(null);
                        }
                    });
                };
                if (getLocalProjectList().indexOf(projectname) === -1) {
                    if (proxy) {
                        proxy.emit('createProject', projectname, function (err) {
                            if (!err) {
                                proxy.emit('getProject', projectname, function (err, projns) {
                                    if (err || projns === null || projns === undefined) {
                                        callback('the new project dataconnection cannot be opened!!! ' + err);
                                    } else {
                                        connecting(projns, function (err) {
                                            if (err) {
                                                callback('cannot connect to the new project database!!! ' + err);
                                            } else {
                                                var actor = new ClientProject({
                                                    storage:storages[projectname],
                                                    master:self,
                                                    id:null,
                                                    userstamp:'todo',
                                                    commit:null,
                                                    branch:"master",
                                                    readonly:false,
                                                    logger:logger
                                                });
                                                actor.createEmpty(function (err) {
                                                    if (err) {
                                                        callback('the empty project cannot be created!!! ' + err);
                                                    } else {
                                                        //now we should save the actor into the projectsinfo array
                                                        projectsinfo[projectname] = {
                                                            parameters:null,
                                                            currentbranch:'master',
                                                            branches:{
                                                                master:{
                                                                    actor:actor,
                                                                    commit:actor.getCurrentCommit()
                                                                }
                                                            }
                                                        };
                                                        //self.selectProject(projectname);
                                                        //now we just simply make the project available, but not select it
                                                        callback(null);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                callback('the new collection cannot be created for the project : ' + err);
                            }
                        });
                    } else {
                        callback('no valid proxy connection!!!');
                    }
                } else {
                    callback("you must use individual name!!!");
                }
            };
            self.deleteProjectAsync = function(projectname,callback){
                self.deleteProject(projectname,callback);
            };
            self.deleteProject = function (projectname, callback) {
                callback = callback || function () {
                };
                if(proxy){
                    proxy.emit('deleteProject',projectname,function(err){
                        if(err){
                            callback(err);
                        } else {
                            delete storages[projectname];
                            delete commitInfos[projectname];
                            delete projectsinfo[projectname];

                            callback(null);
                        }
                    });
                } else {
                    callback('there is no proxy');
                }
            };
            self.selectCommitAsync = function (commitid, callback) {
                callback = callback || function () {
                };
                if (activeProject) {
                    var mycommit = commitInfos[activeProject].getCommitObj(commitid);
                    var deadbranch = true;
                    if (mycommit) {
                        //now we check if this commit is final for the given branch so we can go on with it
                        commitInfos[activeProject].getBranchesNow(function (err, branches) {
                            if (!err && branches && branches.length > 0) {
                                for (var i = 0; i < branches.length; i++) {
                                    if (branches[i].name === mycommit.name) {
                                        //we have that kind of branch
                                        deadbranch = false;
                                        if (projectsinfo[activeProject].branches[mycommit.name]) {
                                            if (projectsinfo[activeProject].branches[mycommit.name].actor) {
                                                /*if (commitid === projectsinfo[activeProject].branches[mycommit.name].actor.getCurrentCommit()) {
                                                    projectsinfo[activeProject].currentbranch = mycommit.name;
                                                    activateActor(projectsinfo[activeProject].branches[mycommit.name].actor, null, callback);
                                                } else {
                                                    createViewer(mycommit, callback);
                                                }*/
                                                commitInfos[activeProject].isFastForward(commitid,projectsinfo[activeProject].branches[mycommit.name].actor.getCurrentCommit(),function(err,good){
                                                    if(err){
                                                        createViewer(mycommit,callback);
                                                    } else {
                                                        if(good){
                                                            projectsinfo[activeProject].currentbranch = mycommit.name;
                                                            activateActor(projectsinfo[activeProject].branches[mycommit.name].actor, null, callback);
                                                        } else {
                                                            createViewer(mycommit,callback);
                                                        }
                                                    }
                                                });
                                            } else {
                                                //TODO shouldn't have to be null
                                                if (branches[i].commit === commitid || branches[i].commit === null) {
                                                    projectsinfo[activeProject].branches[mycommit.name].actor = new ClientProject({
                                                        storage:storages[activeProject],
                                                        master:self,
                                                        id:null,
                                                        userstamp:'todo',
                                                        commit:mycommit,
                                                        branch:mycommit.name,
                                                        readonly:false,
                                                        logger:logger
                                                    });
                                                    projectsinfo[activeProject].currentbranch = mycommit.name;
                                                    activateActor(projectsinfo[activeProject].branches[mycommit.name].actor, null, callback);
                                                } else {
                                                    createViewer(mycommit, callback);
                                                }
                                            }
                                        } else {
                                            if (branches[i].commit === commitid) {
                                                projectsinfo[activeProject].branches[mycommit.name] = {
                                                    actor:new ClientProject({
                                                        storage:storages[activeProject],
                                                        master:self,
                                                        id:null,
                                                        userstamp:'todo',
                                                        commit:mycommit,
                                                        branch:mycommit.name,
                                                        readonly:false,
                                                        logger:logger
                                                    }),
                                                    commit:commitid
                                                };
                                                projectsinfo[activeProject].currentbranch = mycommit.name;
                                                activateActor(projectsinfo[activeProject].branches[mycommit.name].actor, null, callback);
                                            } else {
                                                createViewer(mycommit, callback);
                                            }
                                        }
                                    }
                                }
                                if (deadbranch) {
                                    createViewer(mycommit, callback);
                                }
                            } else {
                                //now we should do the readonly way...
                                createViewer(mycommit, callback);
                            }
                        });
                    }
                } else {
                    callback('no active project');
                }
            };
            var createViewer = function (commitobj, callback) {
                viewer = new ClientProject({
                    storage:storages[activeProject],
                    master:self,
                    id:null,
                    userstamp:'todo',
                    commit:commitobj,
                    branch:commitobj.name,
                    readonly:true,
                    logger:logger
                });
                activateActor(viewer, null, callback);
            };
            self.getCommitIds = function () {
                if (activeProject) {
                    return commitInfos[activeProject].getCommitList();
                } else {
                    return [];
                }
            };
            self.getCommitsAsync = function (callback) {
                if (activeProject) {
                    commitInfos[activeProject].getAllCommitsNow(function (err, commits) {
                        if (!err && commits && commits.length > 0) {
                            callback(null, commits);
                        } else {
                            err = err || 'there is no commit';
                            callback(err);
                        }
                    });

                } else {
                    callback('there is no active project!!!');
                }
            };
            self.getCommitObj = function (commitid) {
                if (activeProject) {
                    return commitInfos[activeProject].getCommitObj(commitid);
                } else {
                    return null;
                }
            };
            self.getActualCommit = function () {
                if (activeProject && activeActor) {
                    return activeActor.getCurrentCommit();
                }
                return null;
            };
            self.getActualBranch = function () {
                if (activeProject && activeActor) {
                    return activeActor.getCurrentBranch();
                }
                return null;
            };
            self.getBranchesAsync = function (callback) {
                if (activeProject) {
                    commitInfos[activeProject].getBranchesNow(function (err, serverbranches) {
                        if (!err && serverbranches && serverbranches.length > 0) {
                            var returnlist = {};
                            for (var i = 0; i < serverbranches.length; i++) {
                                returnlist[serverbranches[i].name] = {
                                    name:serverbranches[i].name,
                                    remotecommit:serverbranches[i].commit,
                                    localcommit:null
                                };
                            }
                            for (i in projectsinfo[activeProject].branches) {
                                if (returnlist[i]) {
                                    returnlist[i].localcommit = projectsinfo[activeProject].branches[i].actor ? projectsinfo[activeProject].branches[i].actor.getCurrentCommit() : projectsinfo[activeProject].branches[i].commit;
                                } else {
                                    returnlist[i] = {
                                        name:i,
                                        remotecommit:null,
                                        localcommit:projectsinfo[activeProject].branches[i].actor ? projectsinfo[activeProject].branches[i].actor.getCurrentCommit() : projectsinfo[activeProject].branches[i].commit
                                    };
                                }
                            }
                            var returnarray = [];
                            for (i in returnlist) {
                                returnarray.push(returnlist[i]);
                            }
                            callback(null, returnarray);
                        } else {
                            err = err || 'there is no branch';
                            callback(err);
                        }
                    });
                } else {
                    callback('there is no active project!!!');
                }
            };
            self.getRootKey = function () {
                if (activeProject && activeActor) {
                    return activeActor.getRootKey();
                }
                return null;
            };
            self.commitAsync = function (parameters, callback) {
                callback = callback || function () {
                };
                if (activeProject) {
                    if (parameters.branch && parameters.branch !== self.getActualBranch()) {
                        if (!projectsinfo[activeProject].branches[parameters.branch]) {
                            storages[activeProject].createBranch(parameters.branch, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    var commitkey = parameters.commit ? parameters.commit : activeActor.getCurrentCommit();
                                    var commit = commitInfos[activeProject].getCommitObj(commitkey);
                                    projectsinfo[activeProject].branches[parameters.branch] = {
                                        actor:new ClientProject({
                                            storage:storages[activeProject],
                                            master:self,
                                            id:null,
                                            userstamp:'todo',
                                            commit:commit,
                                            branch:parameters.branch,
                                            readonly:false,
                                            logger:logger
                                        }),
                                        commit:commitkey
                                    };
                                    activateActor(projectsinfo[activeProject].branches[parameters.branch].actor, null, function () {
                                        activeActor.commit('initial commit', callback);
                                    });
                                }
                            });
                        } else {
                            callback('the branch already exists');
                        }
                    } else {
                        if (activeActor) {
                            activeActor.commit(parameters.message, callback);
                        }
                    }
                }
            };
            self.deleteBranchAsync = function (branchname, callback) {
                if (activeProject) {
                    if (projectsinfo[activeProject].branches[branchname]) {
                        //first we kill the actor if there is any on that branch
                        if (projectsinfo[activeProject].branches[branchname].actor) {
                            projectsinfo[activeProject].branches[branchname].actor.dismantle();
                            projectsinfo[activeProject].branches[branchname].actor = null;
                        }

                        delete projectsinfo[activeProject].branches[branchname];
                        if (projectsinfo[activeProject].currentbranch === branchname) {
                            projectsinfo[activeProject].currentbranch = null;
                        }
                    }
                    //whether we have info about the branch or not, we should try to delete it from the server
                    storages[activeProject].deleteBranch(branchname, function (err) {
                        if (err) {
                            console.log('branch deletion failed... -' + err);
                        }
                        callback(err);
                    });
                } else {
                    callback('there is no active branch');
                }
            };
            self.remoteDeleteBranch = function (projectname, branchname) {
                //this function is called when it turned out that some other user deleted some branch
                if (projectsinfo[projectname]) {
                    if (projectsinfo[projectname].branches[branchname]) {
                        if (projectsinfo[projectname].branches[branchname].actor) {
                            projectsinfo[projectname].branches[branchname].actor.dismantle();
                            projectsinfo[projectname].branches[branchname].actor = null;
                        }
                        delete projectsinfo[projectname].branches[branchname];
                        if (projectsinfo[projectname].currentbranch === branchname) {
                            projectsinfo[projectname].currentbranch = null;
                        }
                    }
                }
            };

            self.goOffline = function () {
                if (activeProject && activeActor) {
                    activeActor.goOffline();
                }
            };
            self.goOnline = function () {
                if (activeProject && activeActor) {
                    activeActor.goOnline(function (err) {
                        if (err) {
                            console.log("cannot go online " + err);
                        }
                    });
                }
            };
            self.isReadOnly = function () {
                if (activeActor) {
                    return activeActor.isReadOnly();
                } else {
                    return true;
                }
            };

            //functions handling UI components
            self.addUI = function (ui, oneevent, guid) {
                guid = guid || GUID();
                users[guid] = {id:guid, UI:ui, PATTERNS:{}, PATHES:[], KEYS:{}, ONEEVENT:oneevent ? true : false, SENDEVENTS:true};
                if (activeActor) {
                    activeActor.addUI(users[guid]);
                }
                return guid;
            };
            self.removeUI = function (guid) {
                delete users[guid];
                if (activeActor) {
                    activeActor.removeUI(guid);
                }

            };
            self.disableEventToUI = function (guid) {
                if (activeActor) {
                    activeActor.disableEventToUI(guid);
                }
            };
            self.enableEventToUI = function (guid) {
                if (activeActor) {
                    activeActor.enableEventToUI(guid);
                }
            };
            self.updateTerritory = function (userID, patterns) {
                if (activeActor) {
                    activeActor.updateTerritory(userID, patterns);
                }
            };
            self.fullRefresh = function () {
                if (activeActor) {
                    activeActor.fullRefresh();
                }
            };
            self.undo = function () {
                if (activeActor) {
                    activeActor.undo();
                }
            };

            //MGAlike - forwarding to the active actor
            self.getNode = function (path) {
                if (activeActor) {
                    return activeActor.getNode(path);
                } else {
                    return null;
                }
            };

            self.startTransaction = function () {
                if (activeActor) {
                    activeActor.startTransaction();
                }
            };
            self.completeTransaction = function () {
                if (activeActor) {
                    activeActor.completeTransaction();
                }
            };
            self.setAttributes = function (path, name, value) {
                if (activeActor) {
                    activeActor.setAttributes(path, name, value);
                }
            };
            self.setRegistry = function (path, name, value) {
                if (activeActor) {
                    activeActor.setRegistry(path, name, value);
                }
            };
            self.copyNodes = function (ids) {
                if (activeActor) {
                    activeActor.copyNodes(ids);
                }
            };
            self.pasteNodes = function (parentpath) {
                if (activeActor) {
                    activeActor.pasteNodes(parentpath);
                }
            };
            self.deleteNode = function (path) {
                if (activeActor) {
                    activeActor.deleteNode(path);
                }
            };
            self.delMoreNodes = function (pathes) {
                if (activeActor) {
                    activeActor.delMoreNodes(pathes);
                }
            };
            self.createChild = function (parameters) {
                if (activeActor) {
                    activeActor.createChild(parameters);
                }
            };
            self.createSubType = function (parent, base) {
                if (activeActor) {
                    activeActor.createSubType(parent.base);
                }
            };
            self.makePointer = function (id, name, to) {
                if (activeActor) {
                    activeActor.makePointer(id, name, to);
                }
            };
            self.delPointer = function (path, name) {
                if (activeActor) {
                    activeActor.delPointer(path, name);
                }
            };
            self.makeConnection = function (parameters) {
                if (activeActor) {
                    activeActor.makeConnection(parameters);
                }
            };
            self.intellyPaste = function (parameters) {
                if (activeActor) {
                    activeActor.intellyPaste(parameters);
                }
            };

            //MGAlike - set functions
            self.addMember = function (path, memberpath, setid) {
                if (activeActor) {
                    activeActor.addMember(path, memberpath, setid);
                }
            };
            self.removeMember = function (path, memberpath, setid) {
                if (activeActor) {
                    activeActor.removeMember(path, memberpath, setid);
                }
            };

            //test
            self.testMethod = function (number) {
                /*switch(number){
                 case 1:
                 self.addMember("root",selectedObjectId);
                 break;
                 case 2:
                 self.removeMember("root",selectedObjectId);
                 break;
                 case 3:
                 var node = self.getNode("root");
                 node.printData();
                 break;
                 }*/
                /*switch (number) {
                    case 1:
                        mytest.init();
                        break;
                    case 2:
                        mytest.setTerritoryRoot(selectedObjectId);
                        break;
                    case 3:
                        mytest.setEventPrint(null);
                        break;
                }*/
                switch (number){
                    case 1:
                        self.deleteProject('deltest',function(err){
                            console.log('delete returned',err);
                        });
                        break;
                }
            };
            //start
            init();
        };
        return ClientMaster;
    });
