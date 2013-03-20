define([
    'util/asset',
    'commonUtil',
    'eventDispatcher',
    'core/core_',
    'core2/setcore',
    'storage/cache',
    'storage/failsafe',
    'storage/socketioclient',
    'js/NewClient/commit',
],
    function (
        ASSERT,
        commonUtil,
        EventDispatcher,
        Core,
        SetCore,
        Cache,
        Failsafe,
        SocketIOClient,
        Commit
        ) {

        var GUID = commonUtil.guid;
        var ClientMaster = function(){

            var self = this,
                _database = new Failsafe(
                    new Cache(
                        new SocketIOClient({
                        }),
                        {}
                    ),
                    {}
                ),
                _projectName = null,
                _project = null,
                _commit = null,
                _inTransaction = false,
                _core = null,
                _nodes = {},
                _commitObject = null,
                _patterns = {},
                _branch = null,
                _status = null,
                _users = {}; //uid:{type:not used, UI:ui, PATTERNS:{}, PATHS:[], ONEEVENT:true/false, SENDEVENTS:true/false};

            //serializer for the functions they need it
            var serializedCalls = [],
                serializedRunning = false;
            var serializedStart = function(func) {
                if(serializedRunning) {
                    serializedCalls.push(func);
                }
                else {
                    serializedRunning = true;
                    func();
                }
            };
            var serializedDone = function() {
                ASSERT(serializedRunning === true);

                if(serializedCalls.length !== 0) {
                    var func = serializedCalls.shift();
                    func();
                }
                else {
                    serializedRunning = false;
                }
            };


            //internal functions
            var cleanUsers = function(){
                for(var i in _users){
                    _users[i].PATTERNS = {};
                    _users[i].PATHS = {};
                    _users[i].SENDEVENTS = true;
                }
            };
            var closeOpenedProject = function(callback){
                var returning = function(e){
                    _projectName = null;
                    _project = null;
                    _commit = null;
                    _inTransaction = false;
                    _core = null;
                    _nodes = {};
                    _commitObject = null;
                    _patterns = {};
                    _branch = null;
                    _status = null;
                    callback(e);
                };
                if(_project){
                    _project.closeProject(function(err){
                        //TODO what if for some reason we are in transaction???
                        returning(err);
                    });
                } else {
                    returning(e);
                }
            };
            var createEmptyProject = function(project,callback){
                var core = new SetCore(new Core(project,{}));
                var commit = new Commit(project);
                var root = core.createNode();
                core.setRegistry(root,"isConnection",false);
                core.setRegistry(root,"position",{ "x": 0, "y": 0});
                core.setAttribute(root,"name","ROOT");
                core.setRegistry(root,"isMeta",false);

                commit.makeCommit(core,root,null,function(err,commitHash){
                    if(!err && commitHash){
                        project.setBranchHash('*master',null,commitHash,function(err){
                            if(!err){
                                callback(null,commitHash);
                            } else {
                                callback(err);
                            }
                        });
                    } else {
                        callback(err);
                    }
                });
            };
            var saveRoot = function(msg,callback){
                callback = callback || function(){};
                serializedStart(function() {
                    saveRootWork(msg, function(err) {
                        callback(err);
                        serializedDone();
                    });
                });
            };
            var saveRootWork = function(msg,callback){
                msg = msg || "- automated commit message -";

                if(_project && _commit && _core){
                    var error = null,
                        missing = 2,
                        commitHash = null;

                    var newRootHash = _core.persist(_nodes['root'],function(err){
                        error = error || err;
                        if(--missing === 0){
                            allDone();
                        }
                    });
                    _commit.makeCommit(newRootHash,null,_branch,null,msg,function(err,cHash){
                        error = error || err;
                        commitHash = cHash;
                        if(--missing === 0){
                            allDone();
                        }
                    });

                    var allDone = function(){
                        if(!error){
                            _commit.updateBranch(commitHash,function(err){
                                callback(err);
                            });
                        } else {
                            callback(error);
                        }
                    };

                } else {
                    callback('no active project');
                }
            };

            var branchUpdated = function(){

            };

            var getModifiedNodes = function(newerNodes){
                var modifiedNodes = [];
                for(var i in _nodes){
                    if(newerNodes[i]){
                        if(newerNodes[i].hash !== _nodes[i].hash){
                            modifiedNodes.push(i);
                        }
                    }
                }
                return modifiedNodes;
            };

            //this is just a first brute implementation it needs serious optimization!!!
            var patternToPaths = function(patternId,pattern,pathsSoFar){
                pathsSoFar[patternId] = true;
                if(pattern.children && pattern.children > 0){
                    var children = _core.getChildrenPaths(_nodes[patternId].node);
                    var subPattern = pattern;
                    subPattern.children--;
                    for(var i=0;i<children.length;i++){
                        patternToPaths(children[i],subPattern,pathsSoFar);
                    }
                }
            };
            var userEvents = function(userId,modifiedNodes){
                var newPaths = {};
                for(var i in _users[userId].PATTERNS){
                    patternToPaths(i,_users[userId].PATTERNS[i],newPaths);
                }

                var events = [];
                //deleted items
                for(i in _users[userId].PATHS[i]){
                    if(!newPaths[i]){
                        events.push({etype:'unload',eid:i});
                    }
                }

                //added items
                for(i in newPaths){
                    if(!_users[userId].PATHS[i]){
                        events.push({etype:'load',eid:i});
                    }
                }

                //updated items
                for(i=0;i<modifiedNodes.length;i++){
                    if(newPaths[modifiedNodes[i]]){
                        events.push({etype:'update',eid:modifiedNodes[i]});
                    }
                }

                _users[userId].PATHS = newPaths;

                if(events.length>0){
                    if(_users[userId].ONEEVENT){
                        _users[userId].UI.onOneEvent(events);
                    } else {
                        for(i=0;i<events.length;i++){
                            _users[userId].UI.onEvent(events[i].etype,events[i].eid);
                        }
                    }
                }
            };

            var addNode = function(core,nodesSoFar,node,callback){
                nodesSoFar[core.getStringPath(node)] = {node:node,hash:core.getSingleNodeHash(node)};
                core.loadSets(node,function(err,sets){
                    if(!err && sets && sets.length>0){
                        var  missing = 0;
                        var error = null;
                        var alldone = function(){
                            callback(error);
                        };

                        var loadset = funciton(node,callback){
                            core.loadChildren(node,function(err,children){
                                error = error || err;
                                if(!err && children && children.length>0){
                                    for(var i=0;i<children.length;i++){
                                        nodesSoFar[core.getStringPath(children[i])] = {node:children[i],hash:core.getSingleNodeHash(children[i])};
                                        core.loadPointer(children[i],'member',function(err,member){
                                            error = error || err;
                                            if(!err && member){
                                                nodesSoFar[core.getStringPath(member)] = {node:member,hash:core.getSingleNodeHash(member)};
                                                if(--missing === 0){
                                                    alldone();
                                                }
                                            } else {
                                                if(--missing === 0){
                                                    alldone();
                                                }
                                            }
                                        });
                                    }
                                } else {
                                    missing -= core.getChildrenNumber(node);
                                    if(missing === 0){
                                        alldone();
                                    }
                                }
                            });
                        };

                        for(var i=0;sets.length;i++){
                            missing += core.getChildrenNumber(sets[i]);
                        }
                        for(i=0;i<sets.length;i++){
                            nodesSoFar[core.getStringPath(sets[i])] = {node:sets[i],hash:core.getSingleNodeHash(sets[i])};
                            loadset(sets[i]);
                        }
                    } else {
                        callback(err);
                    }
                });
            };

            //this is just a first brute implementation it needs serious optimization!!!
            var loadPattern = function(core,id,pattern,nodesSoFar,callback){
                callback = callback || function(){};
                ASSERT(typeof core === 'object' && typeof pattern === 'object' && typeof nodesSoFar === 'object');

                core.loadByPath(nodesSoFar['root'],id,function(err,node){
                    if(!err && node){
                        addNode(core,nodesSoFar,node,function(err){
                            if(!err){
                                //currently we only have children type pattern, so we try to simplify the function
                                if(!pattern.children || pattern.children === 0){
                                    //we are done with this pattern
                                    callback(null);
                                } else {
                                    var childrenIds = core.getChildrenPaths(node);
                                    var subPattern = pattern;
                                    subPattern.children--;
                                    var missing = childrenIds.length;
                                    var error = null;
                                    var subLoadComplete = function(err){
                                        error = error || err;
                                        if(--missing === 0){
                                            callback(null);
                                        }
                                    };
                                    for(var i=0;i<childrenIds.length;i++){
                                        loadPattern(core,childrenIds[i],subPattern,nodesSoFar,subLoadComplete);
                                    }
                                }
                            } else {
                                callback(err);
                            }
                        });
                    } else {
                        callback(err);
                    }
                });
            };

            var loadRoot = function(rootHash,callback){
                ASSERT(_project && _commit);
                var core = new SetCore(new Core(_project));
                var nodes = {};
                core.loadRoot(rootHash,function(err,root){
                    if(!err){
                        var missing = 0,
                            error = null;
                        for(var i in _users){
                            for(var j in _users[i].PATTERNS){
                                missing++;
                            }
                        }
                        if(missing > 0){
                            for(i in _users){
                                for(j in _users[i].PATTERNS){
                                    loadPattern(core,j,_users.PATTERNS[j],nodes,function(err){
                                        error = error || err;
                                        if(--missing === 0){
                                            allLoaded();
                                        }
                                    });
                                }
                            }
                        } else {
                            allLoaded();
                        }


                        var allLoaded = function(){
                            if(!error){
                                _core = core;
                                var modifiedPaths = getModifiedNodes(nodes);
                                _nodes = nodes;
                                for(var i in _users){
                                    userEvents(i,modifiedPaths);
                                }
                                callback(null);
                            } else {
                                callback(error);
                            }
                        };
                    } else {
                        callback(err);
                    }
                });
            };

            var statusUpdated = function(newstatus){
                if(_status !== newstatus){
                    _status = newstatus;
                    self.dispatchEvent(self.events.NETWORKSTATUS_CHANGED,newstatus);
                }
            };


            //event functions to relay information between users
            $.extend(self, new EventDispatcher());
            self.events = {
                "SELECTEDOBJECT_CHANGED": "SELECTEDOBJECT_CHANGED",
                "NETWORKSTATUS_CHANGED" : "NETWORKSTATUS_CHANGED",
                "ACTOR_CHANGED"         : "ACTOR_CHANGED",
                "PROJECT_CLOSED"        : "PROJECT_CLOSED",
                "PROJECT_OPENED"        : "PROJECT_OPENED"
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


            //project and commit selection functions
            //branch manipulating commit and merge
            self.getActiveProject = function () {
                return _projectName;
            };
            self.getAvailableProjectsAsync = function (callback) {
                _database.getProjectNames(callback);
            };
            self.selectProjectAsync = function (projectname,callback) {
                //we assume that every project has a master branch and we
                //open that...
                if(projectname === _projectName){
                    callback(null);
                } else {
                    closeOpenedProject(function(err){
                        //TODO what can we do with the error??
                        _database.openProject(projectname,function(err,p){
                            if(!err && p){
                                _projectName = projectname;
                                _project = p;
                                _commit = new Commit(p);
                                _project.getBranchHash('*master',null,function(err,newhash){
                                    if(!err && newhash){
                                        _project.loadObject(newhash,function(err,commit){
                                            if(!err && commit){
                                                _commitObject = commit;
                                                _branch = '*master';
                                                //TODO check it more deeply

                                            } else {
                                                closeOpenedProject(function(err2){
                                                    callback(err);
                                                });
                                            }
                                        });
                                    } else {
                                        closeOpenedProject(function(err2){
                                            callback(err);
                                        });
                                    }
                                });
                            } else {
                                callback(err);
                            }
                        });
                    });
                }
            };
            self.createProjectAsync = function(projectname,callback){
                self.getAvailableProjectsAsync(function(err,names){
                    if(!err && names){
                        if(names.indexOf(projectname) === -1){
                            _database.openProject(projectname,function(err,p){
                                if(!err && p){
                                    createEmptyProject(p,function(err,commit){
                                        if(!err && commit){
                                            closeOpenedProject(function(err){
                                                //TODO what is with error???
                                                _projectName = projectname;
                                                _project = p;
                                                _commit = new Commit(p);
                                                _commitObject = commit;
                                                _branch = '*master';
                                            });
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            //TODO maybe the selectProjectAsync could be called :)
                            callback('the project already exists!');
                        }
                    } else {
                        callback(err);
                    }
                });
            };
            self.deleteProjectAsync = function(projectname,callback){
                if(projectname === _projectName){
                    closeOpenedProject();
                }
                _database.deleteProject(projectname,callback);
            };
            self.selectCommitAsync = function (commitid, callback) {
                callback('NIE');
            };

            self.getCommitsAsync = function (callback) {
                callback('NIE');
            };
            self.getCommitObj = function (commitid) {
                callback('NIE');
            };
            self.getActualCommit = function () {
                return _commitObject;
            };
            self.getActualBranch = function () {
                return _branch;
            };
            self.getBranchesAsync = function (callback) {
                if(_project){
                    _project.getBranchNames(callback);
                } else {
                    callback('no selected project');
                }
            };
            self.getRootKey = function () {
                if(_core && _nodes['root']){
                    _core.getKey(_nodes['root']);
                } else {
                    return null;
                }
            };
            self.commitAsync = function (parameters, callback) {
                callback('NIE');
            };
            self.deleteBranchAsync = function (branchname, callback) {
                if(_commit){
                    _commit.deleteBranch(branchname,callback);
                } else {
                    callback('there is no active project');
                }
            };

            //relayed project functions
            //kind of a MGA
            self.startTransaction = function () {
                if (_project) {
                    _inTransaction = true;
                }
            };
            self.completeTransaction = function () {
                if (_project) {
                    _inTransaction = false;

                }
            };
            self.setAttributes = function (path, name, value) {
                if (_project) {
                    _project.setAttributes(path, name, value);
                }
            };
            self.setRegistry = function (path, name, value) {
                if (_project) {
                    _project.setRegistry(path, name, value);
                }
            };
            self.copyNodes = function (ids) {
                if (_project) {
                    _project.copyNodes(ids);
                }
            };
            self.pasteNodes = function (parentpath) {
                if (_project) {
                    _project.pasteNodes(parentpath);
                }
            };
            self.deleteNode = function (path) {
                if (_project) {
                    _project.deleteNode(path);
                }
            };
            self.delMoreNodes = function (pathes) {
                if (_project) {
                    _project.delMoreNodes(pathes);
                }
            };
            self.createChild = function (parameters) {
                if (_project) {
                    _project.createChild(parameters);
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

            //territory functions
            self.addUI = function (ui, oneevent, guid) {
                guid = guid || GUID();
                users[guid] = {type:'notused', UI:ui, PATTERNS:{}, PATHS:[], ONEEVENT:oneevent ? true : false, SENDEVENTS:true};
                return guid;
            };
            self.removeUI = function (guid) {
                delete users[guid];
            };
            self.disableEventToUI = function (guid) {
                console.log('NIE');
            };
            self.enableEventToUI = function (guid) {
                console.log('NIE');
            };
            self.updateTerritory = function (guid, patterns) {

                //this has to be optimized
                var missing = 0;
                var error = null;
                for(var i in patterns){
                    missing++;
                }
                if(missing>0){
                    for(var i in patterns){
                        loadPattern(_core,i,patterns[i],_nodes,function(err){
                            error = error || err;
                            if(--missing === 0){
                                allDone();
                            }
                        });
                    }
                } else {
                    allDone();
                }

                var allDone = function(){
                    _users[guid].PATTERNS = patterns;
                    if(!error){
                        userEvents(guid,[]);
                    }
                }
            };
            
            self.fullRefresh = function () {
                console.log('NIE');
            };

            //getNode
            self.getNode = function(_id){

                var getParentId = function(){
                    return _core.getStringPath(_core.getParent(_nodes[_id].node));
                };

                var getId = function(){
                    return _id;
                };

                var getChildrenIds = function(){
                    return _core.getChildrenPaths(_nodes[_id].node);
                };

                var getBaseId = function(){
                    return _core.getRegistry(_nodes[_id].node,"isConnection") === "true" ? 'connection' : 'object';
                };

                var getInheritorIds = function(){
                    return [];
                };

                var getAttribute = function(name){
                    return _core.getAttribute(_nodes[_id].node,name);
                };

                var getRegistry = function(name){
                    return _core.getRegistry(_nodes[_id].node,name);
                };

                var getPointer = function(name){
                    return _core.getPointer(_nodes[_id].node,name);
                };

                var getPointerNames = function(){
                    return _core.getPointerNames(_nodes[_id].node);
                };

                var getAttributeNames = function(){
                    return _core.getAttributeNames(_nodes[_id].node);
                };

                var getRegistryNames = function(){
                    return _core.getRegistryNames(_nodes[_id].node);
                };

                //SET
                var getMemberIds = function(setid){
                    setid = commonUtil.setidtorelid(setid);
                    var memberids = [];
                    var index = _core.getSetRelids(_nodes[_id].node).indexOf(setid);
                    if(index > -1){
                        var setpath = _core.getSetPaths(_nodes[_id].node)[index];
                        if(_nodes[setpath].node){
                            var members = _core.getChildrenPaths(_nodes[setpath].node);
                            for(var i=0;i<members.length;i++){
                                if(_nodes[members[i]].node){
                                    memberids.push(_core.getPointer(_nodes[members[i]].node,'member'));
                                }
                            }
                        }
                    }

                    return memberids;
                };
                var getSetNames = function(){
                    var setids = _core.getSetRelids(_nodes[_id]);
                    for(var i=0;i<setids.length;i++){
                        setids[i] = commonUtil.relidtosetid(setids[i])
                    }
                    return setids;
                };
                var getSetIds = function(){
                    return _core.getSetPaths(_nodes[_id]);
                };
                //META
                var getValidChildrenTypes = function(){
                    return getMemberIds('ValidChildren');
                };

                return {
                    getParentId : getParentId,
                    getId       : getId,
                    getChildrenIds : getChildrenIds,
                    getBaseId : getBaseId,
                    getInheritorIds : getInheritorIds,
                    getAttribute : getAttribute,
                    getRegistry : getRegistry,
                    getPointer : getPointer,
                    getPointerNames : getPointerNames,
                    getAttributeNames : getAttributeNames,
                    getRegistryNames : getRegistryNames,

                    //META functions
                    getValidChildrenTypes : getValidChildrenTypes,
                    getMemberIds          : getMemberIds,
                    getSetIds             : getSetIds,
                    getSetNames           : getSetNames
                }
            };
        };

        return ClientMaster;
    });

