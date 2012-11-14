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
            actors = {},
            users = {},
            storages = {},
            commitInfos = {},
            savedInfoStorage = new ClientLocalStorage(),
            projectsinfo = savedInfoStorage.load('#'+parameters.userstamp+'#saved#') || {},
            proxy = null;


        /*event functions to relay information between users*/
        $.extend(self, new EventDispatcher());
        self.events = {
            "SELECTEDOBJECT_CHANGED" : "SELECTEDOBJECT_CHANGED"
        };
        self.setSelectedObjectId = function ( objectId ) {
            if ( objectId !== selectedObjectId ) {
                selectedObjectId = objectId;
                self.dispatchEvent( self.events.SELECTEDOBJECT_CHANGED, selectedObjectId );
            }
        };

        //init - currently it means, we try to establish storage connection to all our saved projects
        //and create actor for all started branches...
        //if there is none, then we simply collects the projects from the server and waits for a selection from user interface...
        var init = function(){
            var tempproxy = io.connect(parameters.proxy,parameters.options);
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
                            /*for(i in projectsinfo){
                                self.selectProject(i);
                                break;
                            }*/
                            self.selectProject('egyik');
                        }
                    };
                    for(var i=0;i<serverlist.length;i++){
                        if(!projectsinfo[serverlist[i]]){
                            projectsinfo[serverlist[i]] = {
                                parameters: null,
                                currentactor: null,
                                actors:[]
                            }
                        }
                    }
                    //we have now all the projects, so we should connect to them...
                    var count = 0;
                    for(i in projectsinfo){
                        count++;
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
                list.push(i);
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
                        log : false
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

            for(var i in info){
                for(var j=0;j<info[i].actors;j++){
                    info[i].actors[j].id = null;
                }
            }
            savedInfoStorage.save('#'+parameters.userstamp+'#saved#',info);
        };
        var activateActor = function(actor){
            actor.dismantle();
            for(var i in users){
                actor.addUI(users[i]);
            }
            actor.buildUp(function(){
                for(i in users){
                    if(users[i].UI.reLaunch){
                        users[i].UI.reLaunch();
                    }
                }
            });
        };


        //functions helping branch selection and project selection
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
                //selecting the default actor
                var myinfo = projectsinfo[activeProject];
                var startcommit = null;
                if(myinfo.currentactor){
                    startcommit = myinfo.actors[myinfo.currentactor].commit;
                }
                if(startcommit){
                    self.selectCommit(startcommit);
                } else {
                    //TODO we have many options, now we will choose one which must work - select the latest commit
                    commitInfos[activeProject].getAllCommitsNow(function(err,commits){
                        if(!err && commits && commits.length>0){
                            storages[activeProject].load('*#*master',function(err,branch){
                                if(err || branch === null || branch === undefined){
                                    //no master branch load the first commit
                                    console.log(err+" so we load the first commit");
                                    self.selectCommit(commits[0]);
                                } else {
                                    console.log("loading master's latest commit:"+branch.commit);
                                    self.selectCommit(branch.commit);
                                }
                            });
                            /*var newest = null;
                            for(var i=0;i<commits.length;i++){
                                if(newest){
                                    if(newest.end<commits[i].end){
                                        newest = commits[i];
                                    }
                                } else {
                                    newest = commits[i];
                                }
                            }
                            if(newest){
                                self.selectCommit(newest[KEY]);
                            } else {
                                console.log("the project doesn't have a commit!!!" );
                            }*/
                        }
                    });
                }

            } else {
                return "no valid project";
            }
        };
        self.selectCommit = function(commit){
            if(activeProject){
                var clist = commitInfos[activeProject].getCommitList();
                if(clist.indexOf(commit) !== -1){
                    var mycommit = commitInfos[activeProject].getCommitObj(commit);
                    var needactor = true;
                    var actorindex = null;
                    var myinfo = projectsinfo[activeProject];
                    for(var i=0; i<myinfo.actors.length; i++){
                        if(myinfo.actors[i].commit === commit){
                            if(myinfo.actors[i].guid){
                                actorindex = i;
                                needactor = false;
                            } else {
                                actorindex = i;
                            }
                            break;
                        }
                    }

                    if(needactor){
                        var tempguid = GUID();
                        var tempactor = new ClientProject({
                            storage: storages[activeProject],
                            master: self,
                            id: tempguid,
                            userstamp: 'todo',
                            commit: mycommit,
                            branch: mycommit.name
                        });
                        actors[tempguid] = tempactor;
                        if(actorindex){
                            myinfo.actors[actorindex] = {
                                id:tempguid,
                                commit:commit,
                                branch:mycommit.branch
                            };
                        } else {
                            myinfo.actors.push({
                                id:tempguid,
                                commit:commit,
                                branch:mycommit.branch
                            });
                            actorindex = myinfo.actors.length-1;
                        }
                    }

                    //now we should change the active actor
                    myinfo.currentactor = actorindex;
                    if(activeActor){
                        activeActor.dismantle();
                    }
                    activeActor = actors[myinfo.actors[actorindex].id];
                    activateActor(activeActor);
                }
            }
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

        //notifications and requests from the actor
        self.changeStatus = function(actorid,status){
            //TODO we should handle this correctly
            console.log(actorid+" is in "+status+" state");
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

        //start
        init();
    };
    return ClientMaster;
});
