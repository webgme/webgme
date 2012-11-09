define([
    'js/Client/ClientLocalStorage',
    'js/Client/ClientStorage',
    'js/Client/ClientProject',
    'socket.io/socket.io.js'
],
    function(
        ClientLocalStorage,
        ClientStorage,
        ClientProject){
   'use strict';
    var ClientMaster = function(parameters){
        var self=this,
            activeProject = null,
            activeActor = null,
            actors = {},
            users = {},
            storages = {},
            savedInfoStorage = new ClientLocalStorage(),
            projectsinfo = savedInfoStorage.load('#'+parameters.userstamp+'#saved#') || {projetcs:{}},
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
                    for(var i=0;i<serverlist.length;i++){
                        if(!projectsinfo.projects[serverlist[i]]){
                            projectsinfo.projects[serverlist[i]] = {
                                parameters: null,
                                selectedId: null,
                                branches: {
                                    master:{
                                        state:'online',
                                        commit:null
                                    }
                                }
                            }
                        }
                    }
                    //we have now all the projects, so we should connect to them...
                    var count = 0;
                    for(i in projectsinfo.projects){
                        count++;
                    }
                    var projopened = function(err){
                        if(err){
                            console.log('project cannot be opened...');
                            //TODO somehow we should either remove it from the list or retry later
                        } else {
                            console.log('connected to project');
                        }
                        if(--count === 0){
                            //we connected to all projects so we are mostly done
                        }
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
            for(var i in projectsinfo.projects){
                list.push(i);
            }
            return list;
        };
        var openProject = function(project,callback){
            if(projectsinfo.projects[project]){
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
                            innercallback(null);
                        }
                    });
                };
                var info = projectsinfo.projects[project];
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

        //functions helping branch selection and project selection
        self.getAvailableProjects = function(){
            return getLocalProjectList();
        };
        self.selectProject = function(projectname){
            if(getLocalProjectList().indexOf(projectname) !== -1){
                if(activeProject){
                    //we have to switch project, which means we will not have activeActor for sure...
                    activeActor.dismantle();
                    activeActor = null;
                    //TODO select the default actor of the project and relaunch the UI
                } else {
                    activeProject = projectname;
                }
            } else {
                return "no valid project";
            }
        };

        //MGAlike - forwarding to the active actor
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

    };
    return ClientMaster;
});
