define([
    'eventDispatcher',
    'js/Client/ClientLocalStorage',
    'js/Client/ClientStorage',
    'js/Client/ClientProject',
    'js/Client/ClientCommitInfo',
    'commonUtil',
    'socket.io/socket.io.js'
],
    function(
        EventDispatcher,
        ClientLocalStorage,
        ClientStorage,
        ClientProject,
        ClientCommitInfo,
        commonUtil){
   'use strict';
    var GUID = commonUtil.guid;
    var COPY = commonUtil.copy;
    var KEY = "_id";
    var ClientMaster = function(parameters){
        var self=this,
            selectedObjectId = null,
            activeProject = null,
            activeActor = null,
            users = {},
            storages = {},
            commitInfos = {},
            savedInfoStorage = new ClientLocalStorage(),
            projectsinfo = /*savedInfoStorage.load('#'+parameters.userstamp+'#saved#') || */{},
            proxy = null,
            viewer = null;


        /*event functions to relay information between users*/
        $.extend(self, new EventDispatcher());
        self.events = {
            "SELECTEDOBJECT_CHANGED" : "SELECTEDOBJECT_CHANGED",
            "NETWORKSTATUS_CHANGED"  : "NETWORKSTATUS_CHANGED"
        };
        self.setSelectedObjectId = function ( objectId ) {
            if ( objectId !== selectedObjectId ) {
                selectedObjectId = objectId;
                self.dispatchEvent( self.events.SELECTEDOBJECT_CHANGED, selectedObjectId );
            }
        };
        self.clearSelectedObjectId = function () {
            self.setSelectedObjectId(null);
        };
        //notifications and requests from the actor
        self.changeStatus = function(actorid,status){
            //TODO we should handle this correctly
            self.dispatchEvent( self.events.NETWORKSTATUS_CHANGED, status );
            console.log(actorid+" is in "+status+" state");
        };
        self.dataInSync = function(projectid){
            /*if(projectsinfo[projectid]){
                for(var i=0;i<projectsinfo[projectid].actors.length;i++){
                    if( projectsinfo[projectid].actors[i].id){
                        actors[projectsinfo[projectid].actors[i].id].goOnline();
                    }
                }
            }*/
            if(projectsinfo[projectid]){
                for(var i in projectsinfo[projectid].branches){
                    if(projectsinfo[projectid].branches[i].actor){
                        projectsinfo[projectid].branches[i].actor.goOnline();
                    }
                }
            }
        };
        self.dataOutSync = function(projectid){
            /*for(var i=0;i<projectsinfo[projectid].actors.length;i++){
                if( projectsinfo[projectid].actors[i].id){
                    actors[projectsinfo[projectid].actors[i].id].networkError();
                }
            }*/
            if(projectsinfo[projectid]){
                for(var i in projectsinfo[projectid].branches){
                    if(projectsinfo[projectid].branches[i].actor){
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
            var firstproject = null;
            tempproxy.on('connect',function(){
                proxy = tempproxy;
                getServerProjectList(function(serverlist){
                    var projopened = function(err){
                        if(err){
                            console.log('project cannot be opened...');
                            //TODO somehow we should either remove it from the list or retry later
                        } else {
                            console.log('connected to project');
                        }
                        if(--count === 0){
                            //we connected to all projects so we are mostly done
                            //select one randomly
                            //TODO this is very rude, should change it...
                            //TODO soon the default selection will be the no selection ;)
                            if(projectsinfo.activeProject && projectsinfo[projectsinfo.activeProject]){
                                self.selectProject(projectsinfo.activeProject);
                            } else {
                                self.selectProject(firstproject);
                            }
                            setInterval(saveProjectsInfo,1000);
                        }
                    };

                    for(var i=0;i<serverlist.length;i++){
                        if(!projectsinfo[serverlist[i]]){
                            projectsinfo[serverlist[i]] = {
                                parameters: null,
                                currentbranch: null,
                                branches: {}
                            }
                        }
                    }
                    //we have now all the projects, so we should connect to them...
                    var count = 0;
                    for(i in projectsinfo){
                        if(firstproject === null){
                            firstproject = i;
                        }
                        count++;
                    }
                    if(count === 0){
                        console.log("there is no project on this server!!!");
                    }
                    for(i in projectsinfo){
                        openProject(i,projopened);
                    }
                });
            });
        };
        var getServerProjectList = function(callback){
            if(proxy){
                proxy.emit('availableProjects',function(err,projects){
                    if(err){
                        callback([]);
                    } else {
                        callback(projects);
                    }
                });
            } else {
                callback([]);
            }
        };
        var getLocalProjectList = function(){
            var list = [];
            for(var i in projectsinfo){
                if(i !== 'activeProject'){
                    list.push(i);
                }
            }
            return list;
        };
        var openProject = function(project,callback){
            if(projectsinfo[project]){
                var connecting = function(innercallback){
                    var tempstorage = new ClientStorage({
                        server: info.parameters.projsrv,
                        options : parameters.socketiopar,
                        projectinfo : project,
                        faulttolerant : true,
                        cache : true,
                        logger : null,
                        log : false,
                        watcher : self
                    });
                    tempstorage.open(function(err){
                        if(err){
                            innercallback(err);
                        } else {
                            storages[project] = tempstorage;
                            commitInfos[project] = new ClientCommitInfo({storage:storages[project],refreshrate:1000});
                            innercallback(null);
                        }
                    });
                };
                var info = projectsinfo[project];
                if(info.parameters){
                    connecting(function(err){
                        if(err){
                            info.parameters = null;
                            openProject(project,callback);
                        } else {
                            callback(null);
                        }
                    })
                } else {
                    //no direct server info, we collect trough proxy
                    if(proxy){
                        proxy.emit('getProject',project,function(err,projns){
                            if(err || projns === null || projns === undefined){
                                callback(err);
                            } else {
                                info.parameters = {
                                    projsrv: location.host + projns,
                                    projectname: project
                                };
                                connecting(function(err){
                                    if(err){
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
        var saveProjectsInfo = function(){
            var info = COPY(projectsinfo);
            delete info.activeProject;

            for(var i in info){
                for(var j in info.branches){
                    info[i].branches[j].actor = null;
                }
                info[i].parameters = null;
            }
            info.activeProject = activeProject;
            savedInfoStorage.save('#'+parameters.userstamp+'#saved#',info);
        };
        var activateActor = function(actor,commit){
            if(actor !== viewer){
                $('#maintitlespan').html(activeProject+'@'+projectsinfo[activeProject].currentbranch);
            }
            activeActor = actor;
            actor.dismantle();
            for(var i in users){
                actor.addUI(users[i]);
            }
            actor.buildUp(commit,function(){
                self.clearSelectedObjectId();
                for(i in users){
                    if(users[i].UI.reLaunch){
                        users[i].UI.reLaunch();
                    }
                }
            });
        };


        //functions helping branch selection and project selection
        self.getActiveProject = function(){
            return activeProject;
        };
        self.getAvailableProjects = function(){
            return getLocalProjectList();
        };
        self.selectProject = function(projectname){
            if(getLocalProjectList().indexOf(projectname) !== -1){
                if(activeProject){
                    //we have to switch project, which means we will not have activeActor for sure...
                    if(activeActor){
                        activeActor.dismantle();
                    }

                }

                activeProject = projectname;
                var myinfo = projectsinfo[projectname];
                commitInfos[projectname].getBranchesNow(function(err,branches){
                    if(!err && branches && branches.length>0){
                        for(var i=0;i<branches.length;i++){
                            if(myinfo.branches[branches[i].name] === null || myinfo.branches[branches[i].name] === undefined ){
                                myinfo.branches[branches[i].name] = {
                                    actor:null,
                                    commit:branches[i].commit
                                }
                            }
                        }
                        //at this point all branch info is filled so we can go for the master/first available or the last used one
                        if(myinfo.currentbranch){
                            if(myinfo.branches[myinfo.currentbranch]){
                                if(!myinfo.branches[myinfo.currentbranch].actor){
                                    myinfo.branches[myinfo.currentbranch].actor = new ClientProject({
                                        storage: storages[activeProject],
                                        master: self,
                                        id: null,
                                        userstamp: 'todo',
                                        commit: myinfo.branches[myinfo.currentbranch].commit,
                                        branch: myinfo.currenbtranch,
                                        readonly: false
                                    });
                                }
                            } else {
                                //now what the f**k???
                                console.log('something really fucked up');
                            }
                        } else {
                            if(myinfo.branches['master']){
                                if(!myinfo.branches['master'].actor){
                                    myinfo.currentbranch = 'master';
                                    myinfo.branches['master'].actor = new ClientProject({
                                        storage: storages[activeProject],
                                        master: self,
                                        id: null,
                                        userstamp: 'todo',
                                        commit: myinfo.branches['master'].commit,
                                        branch: 'master',
                                        readonly: false
                                    });
                                }
                            } else {
                                for(var i in myinfo.branches){
                                    myinfo.currentbranch = i;
                                    if(!myinfo.branches[i].actor){
                                        myinfo.branches[i].actor = new ClientProject({
                                            storage: storages[activeProject],
                                            master: self,
                                            id: null,
                                            userstamp: 'todo',
                                            commit: myinfo.branches[i].commit,
                                            branch: i,
                                            readonly: false
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                        //at this point we should selected/created our actor - so we simply activate it
                        try{
                            commitInfos[activeProject].getAllCommitsNow(function(err,commits){
                                if(!err && commits && commits.length>0){
                                    activateActor(myinfo.branches[myinfo.currentbranch].actor,myinfo.branches[myinfo.currentbranch].commit);
                                    console.log('activated');
                                } else {
                                    throw(err);
                                }
                            });
                        } catch(e){
                            console.log(e);
                        }
                    } else {
                        //no branch for the given project, baaad
                        console.log('cannot found any branch for the given project!!!');
                    }
                });
            } else {
                return "no valid project";
            }
        };
        self.createProject = function(projectname,callback){
            callback = callback || function(){};
            var connecting = function(namespace,innercallback){
                var tempstorage = new ClientStorage({
                    server: location.host + namespace,
                    options : parameters.socketiopar,
                    projectinfo : projectname,
                    faulttolerant : true,
                    cache : true,
                    logger : null,
                    log : false,
                    watcher : self
                });
                tempstorage.open(function(err){
                    if(err){
                        innercallback(err);
                    } else {
                        storages[projectname] = tempstorage;
                        commitInfos[projectname] = new ClientCommitInfo({storage:storages[projectname],refreshrate:1000});
                        innercallback(null);
                    }
                });
            };
            if(getLocalProjectList().indexOf(projectname) === -1){
                if(proxy){
                    proxy.emit('createProject',projectname,function(err){
                        if(!err){
                            proxy.emit('getProject',projectname,function(err,projns){
                                if(err || projns === null || projns === undefined){
                                    callback('the new project dataconnection cannot be opened!!! '+err);
                                } else {
                                    connecting(projns,function(err){
                                        if(err){
                                            callback('cannot connect to the new project database!!! '+err);
                                        } else {
                                            var guid = GUID();
                                            var actor = new ClientProject({
                                                storage: storages[projectname],
                                                master: self,
                                                id: null,
                                                userstamp: 'todo',
                                                commit: null,
                                                branch: "master",
                                                readonly: false
                                            });
                                            actor.createEmpty(function(err){
                                                if(err){
                                                    callback('the empty project cannot be created!!! '+err);
                                                } else {
                                                    //now we should save the actor into the projectsinfo array
                                                    projectsinfo[projectname] = {
                                                        parameters: null,
                                                        currentbranch: 'master',
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
                            callback('the new collection cannot be created for the project : '+err);
                        }
                    });
                } else {
                    callback('no valid proxy connection!!!');
                }
            } else {
                callback("you must use individual name!!!");
            }
        };
        self.selectCommit = function(commit){
            if(activeProject){
                var mycommit = commitInfos[activeProject].getCommitObj(commit);
                if(mycommit){
                    //now we check if this commit is final for the given branch so we can go on with it
                    commitInfos[activeProject].getBranchesNow(function(err,branches){
                        if(!err && branches && branches.length>0){
                            for(var i=0;i<branches.length;i++){
                                if(branches[i].name === mycommit.name){
                                    //we have that kind of branch
                                    if(projectsinfo[activeProject].branches[mycommit.name]){
                                        if(projectsinfo[activeProject].branches[mycommit.name].actor){
                                            if(commit === projectsinfo[activeProject].branches[mycommit.name].actor.getCurrentCommit()){
                                                projectsinfo[activeProject].currentbranch = mycommit.name;
                                                activateActor(projectsinfo[activeProject].branches[mycommit.name].actor);
                                            } else {
                                                createViewer(mycommit);
                                            }
                                        } else {
                                           if(branches[i].commit === commit){
                                               projectsinfo[activeProject].branches[mycommit.name].actor = new ClientProject({
                                                   storage: storages[activeProject],
                                                   master: self,
                                                   id: null,
                                                   userstamp: 'todo',
                                                   commit: mycommit,
                                                   branch: mycommit.name,
                                                   readonly: false
                                               });
                                               projectsinfo[activeProject].currentbranch = mycommit.name;
                                               activateActor(projectsinfo[activeProject].branches[mycommit.name].actor);
                                           } else {
                                               createViewer(mycommit);
                                           }
                                        }
                                    } else {
                                        if(branches[i].commit === commit){
                                            projectsinfo[activeProject].branches[mycommit.name] = {
                                                actor: new ClientProject({
                                                    storage: storages[activeProject],
                                                    master: self,
                                                    id: null,
                                                    userstamp: 'todo',
                                                    commit: mycommit,
                                                    branch: mycommit.name,
                                                    readonly: false
                                                }),
                                                commit: commit
                                            };
                                            projectsinfo[activeProject].currentbranch = mycommit.name;
                                            activateActor(projectsinfo[activeProject].branches[mycommit.name].actor);
                                        } else {
                                            createViewer(mycommit);
                                        }
                                    }
                                }
                            }
                        } else {
                            //now we should do the readonly way...
                            createViewer(mycommit);
                        }
                    });
                }
            }
        };
        var createViewer = function(commitobj){
            $('#maintitlespan').html(activeProject+'@'+projectsinfo[activeProject].currentbranch+'[READONLY]');
            viewer = new ClientProject({
                storage: storages[activeProject],
                master: self,
                id: null,
                userstamp: 'todo',
                commit: commitobj,
                branch: commitobj.name,
                readonly: true
            });
            activateActor(viewer);
        };
        self.getCommitIds = function(){
            if(activeProject){
                return commitInfos[activeProject].getCommitList();
            } else {
                return [];
            }
        };
        self.getCommits = function(){
            if(activeProject){
                return commitInfos[activeProject].getAllCommits();
            } else {
                return [];
            }
        };
        self.getCommitObj = function(commitid){
            if(activeProject){
                return commitInfos[activeProject].getCommitObj(commitid);
            } else {
                return null;
            }
        };
        self.getActualCommit = function(){
            if(activeProject && activeActor){
                return activeActor.getCurrentCommit();
            }
        };
        self.getActualBranch = function(){
            if(activeProject && activeActor){
                return activeActor.getCurrentBranch();
            }
        };
        self.getBranches = function(){
            if(activeProject){
                var serverbranches = commitInfos[activeProject].getBranches();
                var returnlist = {};
                for(var i=0;i<serverbranches.length;i++){
                    returnlist[serverbranches[i].name] = {
                        name : serverbranches[i].name,
                        remotecommit : serverbranches[i].commit,
                        localcommit : null
                    }
                }
                for(i in projectsinfo[activeProject].branches){
                    if(returnlist[i]){
                        returnlist[i].localcommit = projectsinfo[activeProject].branches[i].actor ? projectsinfo[activeProject].branches[i].actor.getCurrentCommit() : projectsinfo[activeProject].branches[i].commit;
                    } else {
                        returnlist[i] = {
                            name: i,
                            remotecommit: null,
                            localcommit : projectsinfo[activeProject].branches[i].actor ? projectsinfo[activeProject].branches[i].actor.getCurrentCommit() : projectsinfo[activeProject].branches[i].commit
                        }
                    }
                }
                var returnarray = [];
                for(i in returnlist){
                    returnarray.push(returnlist[i]);
                }
                return returnarray;
            } else {
                return [];
            }
        };
        self.getRootKey = function(){
            if(activeProject && activeActor){
                return activeActor.getRootKey();
            }
        };
        self.commit = function(parameters){
            if(activeProject && activeActor){
                if(parameters.branch && parameters.branch !== self.getActualBranch()){
                    //TODO we should check somewhere if the new branchname doesn't exsist
                    storages[activeProject].createBranch(parameters.branch,function(err){
                        if(err){
                            console.log("cannot create new branch due to "+err);
                        } else {
                            activeActor.changeBranch(parameters.message,parameters.branch);
                        }
                    });
                } else {
                    activeActor.commit(parameters.message);
                }
            }
        };

        self.goOffline = function(){
            if(activeProject && activeActor){
                activeActor.goOffline();
            }
        };
        self.goOnline = function(){
            if(activeProject && activeActor){
                activeActor.goOnline(function(err){
                    if(err){
                        console.log("cannot go online "+err);
                    }
                });
            }
        };
        self.isReadOnly = function(){
            if(activeActor){
                return activeActor.isReadOnly();
            } else {
                return true;
            }
        };

        //functions handling UI components
        self.addUI = function(ui,oneevent,guid){
            guid = guid || GUID();
            users[guid]  = {id:guid,UI:ui,PATTERNS:{},PATHES:[],KEYS:{},ONEEVENT:oneevent ? true : false,SENDEVENTS:true};
            if(activeActor){
                activeActor.addUI(users[guid]);
            }
            return guid;
        };
        self.removeUI = function(guid){
            delete users[guid];
            if(activeActor){
                activeActor.removeUI(guid);
            }

        };
        self.disableEventToUI = function(guid){
            if(activeActor){
                activeActor.disableEventToUI(guid);
            }
        };
        self.enableEventToUI = function(guid){
            if(activateActor){
                activeActor.enableEventToUI(guid);
            }
        };
        self.updateTerritory = function(userID,patterns){
            if(activeActor){
                activeActor.updateTerritory(userID,patterns);
            }
        };
        self.fullRefresh = function(){
            if(activeActor){
                activeActor.fullRefresh();
            }
        };
        self.undo = function(){
            if(activateActor){
                activeActor.undo();
            }
        };

        //MGAlike - forwarding to the active actor
        self.getNode = function(path){
            if(activeActor){
                return activeActor.getNode(path);
            } else {
                return null;
            }
        };

        self.startTransaction = function(){
            if(activeActor){
                activeActor.startTransaction();
            }
        };
        self.completeTransaction= function(){
            if(activeActor){
                activeActor.completeTransaction();
            }
        };
        self.setAttributes = function(path,name,value){
            if(activeActor){
                activeActor.setAttributes(path,name,value);
            }
        };
        self.setRegistry = function(path,name,value){
            if(activeActor){
                activeActor.setRegistry(path,name,value);
            }
        };
        self.copyNodes = function(ids){
            if(activeActor){
                activeActor.copyNodes(ids);
            }
        };
        self.pasteNodes = function(parentpath){
            if(activeActor){
                activeActor.pasteNodes(parentpath);
            }
        };
        self.deleteNode = function(path){
            if(activeActor){
                activeActor.deleteNode(path);
            }
        };
        self.delMoreNodes = function(pathes){
            if(activeActor){
                activeActor.delMoreNodes(pathes);
            }
        };
        self.createChild = function(parameters){
            if(activeActor){
                activeActor.createChild(parameters);
            }
        };
        self.createSubType = function(parent,base){
            if(activeActor){
                activeActor.createSubType(parent.base);
            }
        };
        self.makePointer = function(id,name,to){
            if(activeActor){
                activeActor.makePointer(id,name,to);
            }
        };
        self.delPointer = function(path,name){
            if(activeActor){
                activeActor.delPointer(path,name);
            }
        };
        self.makeConnection = function(parameters){
            if(activeActor){
                activeActor.makeConnection(parameters);
            }
        };
        self.intellyPaste = function(parameters){
            if(activeActor){
                activeActor.intellyPaste(parameters);
            }
        };

        //MGAlike - set functions
        self.addMember = function(path,memberpath){
        };
        self.removeMember = function(path,memberpath){
        };

        //start
        init();
    };
    return ClientMaster;
});
