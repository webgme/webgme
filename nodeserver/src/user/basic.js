define([
    'util/assert',
    'commonUtil',
    'eventDispatcher',
    'core/core',
    'core/setcore',
    'core/commit',
    'storage/cache',
    'storage/failsafe',
    'storage/socketioclient'
],
    function (
        ASSERT,
        commonUtil,
        EventDispatcher,
        Core,
        SetCore,
        Commit,
        Cache,
        Failsafe,
        SocketIOClient
        ) {

        function GUID(){
            return commonUtil.guid();
        }

        function COPY(object){
            if(object){
                return JSON.parse(JSON.stringify(object));
            }
            return null;
        }


        function Client(){
            var _self = this,
                _database = new Cache(
                    new Failsafe(
                        new SocketIOClient(
                            {
                                host:commonUtil.combinedserver.host,
                                port:commonUtil.combinedserver.port
                            }
                        ),{}
                    ),{}
                ),
                _projectName = null,
                _project = null,
                _commit = null,
                _core = null,
                _selectedObjectId = null,
                _branch = null,
                _forked = false,
                _nodes = {},
                _inTransaction = false,
                _users = {},
                _patterns = {},
                _networkStatus = null,
                _clipboard = [],
                _msg = "",
                _recentCommits = [],
                _viewer = false,
                _loadCore = null,
                _loadNodes = {},
                _loadError = 0,
                _commitCache = null;

            $.extend(_self, new EventDispatcher());
            _self.events = {
                "SELECTEDOBJECT_CHANGED": "SELECTEDOBJECT_CHANGED",
                "NETWORKSTATUS_CHANGED" : "NETWORKSTATUS_CHANGED",
                "BRANCHSTATUS_CHANGED"  : "BRANCHSTATUS_CHANGED",
                "ACTOR_CHANGED"         : "ACTOR_CHANGED",
                "PROJECT_CLOSED"        : "PROJECT_CLOSED",
                "PROJECT_OPENED"        : "PROJECT_OPENED"
            };

            function setSelectedObjectId(objectId) {
                if (objectId !== _selectedObjectId) {
                    _selectedObjectId = objectId;
                    _self.dispatchEvent(_self.events.SELECTEDOBJECT_CHANGED, _selectedObjectId);
                }
            }
            function clearSelectedObjectId() {
                setSelectedObjectId(null);
            }

            function addCommit(commitHash){
                _recentCommits.unshift(commitHash);
                if(_recentCommits.length > 10){
                    _recentCommits.pop();
                }
            }

            function branchWatcher(branch) {
                ASSERT(_project && _commit);
                _recentCommits = [""];
                var branchHashUpdated = function(err,newhash,forked){
                    if(branch === _branch){
                        if(!err && newhash){
                            if(_recentCommits.indexOf(newhash) === -1){

                                addCommit(newhash);
                                //_commit.getBranchHash(branch,_recentCommits[0],branchHashUpdated);

                                //TODO here we have to start with a syncronous root object load...
                                _project.loadObject(newhash,function(err,commitObj){
                                    if(!err && commitObj){
                                        loading(commitObj.root);
                                    }
                                });
                            }

                            //checking the change of forked status
                            if(_forked){
                                if(!forked){
                                    _forked = false;
                                    _self.dispatchEvent(_self.events.BRANCHSTATUS_CHANGED, 'online');
                                }
                            } else {
                                if(forked){
                                    _forked = true;
                                    _self.dispatchEvent(_self.events.BRANCHSTATUS_CHANGED, 'forked');
                                }
                            }

                            return _commit.getBranchHash(branch,_recentCommits[0],branchHashUpdated);
                        } else {
                            return _commit.getBranchHash(branch,_recentCommits[0],branchHashUpdated);
                        }
                    }
                };

                _branch = branch;
                _self.dispatchEvent(_self.events.PROJECT_OPENED, _projectName);//TODO new event should be added here
                _commit.getBranchHash(branch,_recentCommits[0],branchHashUpdated);
            }

            function networkWatcher(){
                var status = "";
                var outstatus = '';
                var dbStatusUpdated = function(err,newstatus){
                    if(!err && newstatus && status !== newstatus){
                        status = newstatus;
                        //TODO we should remove this mapping
                        switch (status){
                            case 'connected':
                                outstatus = 'online';
                                break;
                            case "socket.io is disconnected":
                                outstatus = 'nonetwork';
                                break;
                            default:
                                outstatus = 'offline';
                                break;
                        }
                        _self.dispatchEvent(_self.events.NETWORKSTATUS_CHANGED, outstatus);
                    }
                    return _database.getDatabaseStatus(status,dbStatusUpdated);
                };
                _database.getDatabaseStatus('',dbStatusUpdated);
            }

            function commitCache(){
                var _cache = {},
                    _timeOrder = [],
                    _timeHash = {}
                function clearCache(){
                    _cache = {};
                    _timeOrder = [];
                }
                function addCommit(commitObject){
                    if(_cache[commitObject._id]){
                        //already in the cache we do not have to do anything
                        return;
                    } else {
                        _cache[commitObject._id] = commitObject;
                        var index = 0;
                        while(index < _timeOrder.length && _cache[_timeOrder[index]].time>commitObject.time){
                            index++;
                        }
                        _timeOrder.splice(index,0,commitObject._id);
                    }
                    return;
                }

                function getNCommitsFrom(commitHash,number,callback){
                    var fillCache = function(time,number,callback){
                        _project.getCommits(time,number,function(err,commits){
                            if(!err && commits){
                                for(var i=0;i<commits.length;i++){
                                    addCommit(commits[i]);
                                }
                                callback(null);
                            } else {
                                callback(err);
                            }
                        });
                    };
                    var returnNCommitsFromHash= function(hash,num,cb){
                        //now we should have all the commits in place
                        var index = _timeOrder.indexOf(hash),
                            commits = [];
                        if(index > -1 || hash === null){
                            if(hash === null){
                                index = 0;
                            } else {
                                index++;
                            }
                            while(commits.length < num && index < _timeOrder.length ){
                                commits.push(_cache[_timeOrder[index]]);
                                index++;
                            }
                            cb(null,commits);
                        } else {
                            cb('cannot found starting commit');
                        }
                    };
                    var cacheFilled = function(err){
                      if(err){
                          callback(err);
                      } else {
                          returnNCommitsFromHash(commitHash,number,callback);
                      }
                    };



                    if(commitHash){
                        if(_cache[commitHash]){
                            //we can be lucky :)
                            var index = _timeOrder.indexOf(commitHash);
                            if(_timeOrder.length>index+number){
                                //we are lucky
                                cacheFilled(null);
                            } else {
                                //not that lucky
                                fillCache(_cache[_timeOrder[_timeOrder.length-1]].time,number-(_timeOrder.length-(index+1)),cacheFilled);
                            }
                        } else {
                            //we are not lucky enough so we have to download the commit
                            _project.loadObject(commitHash,function(err,commitObject){
                                if(!err && commitObject){
                                    addCommit(commitObject);
                                    fillCache(commitObject.time,number,cacheFilled);
                                } else {
                                    callback(err);
                                }
                            });
                        }
                    } else {
                        //initial call
                        fillCache((new Date()).getTime(),number,cacheFilled);
                    }
                }

                return {
                    getNCommitsFrom: getNCommitsFrom,
                    clearCache: clearCache
                }
            }

            function openingProject(name){
                //we already done every opening related stuff
                //so these are the last ones (eventing and stuff)
                _projectName = name;
                if(_commitCache){
                    _commitCache.clearCache();
                } else {
                    _commitCache = commitCache();
                }
                _self.dispatchEvent(_self.events.PROJECT_OPENED, _projectName);
            }

            //internal functions
            function cleanUsers(){
                for(var i in _users){
                    var events = [];
                    for(var j in _users[i].PATHS){
                        events.push({etype:'unload',eid:j});
                    }
                    // TODO events.push({etype:'complete',eid:null});

                    if(_users[i].ONEEVENT){
                        _users[i].UI.onOneEvent(events);
                    } else {
                        for(j=0;j<events.length;j++){
                            _users[i].UI.onEvent(events[j].etype,events[j].eid);
                        }
                    }
                    _users[i].PATTERNS = {};
                    _users[i].PATHS = {};
                    _users[i].SENDEVENTS = true;

                    if(_users[i].UI.reLaunch){
                        _users[i].UI.reLaunch();
                    }
                }
            }

            function closeOpenedProject(callback){
                callback = callback || function(){};
                var returning = function(e){
                    clearSelectedObjectId();
                    _projectName = null;
                    _commit = null;
                    _inTransaction = false;
                    _core = null;
                    _nodes = {};
                    //_commitObject = null;
                    _patterns = {};
                    _networkStatus = null;
                    _clipboard = [];
                    _msg = "";
                    _recentCommits = [];
                    _viewer = false;
                    _loadCore = null;
                    _loadNodes = {};
                    _loadError = 0;
                    cleanUsers();
                    _self.dispatchEvent(_self.events.PROJECT_CLOSED);

                    callback(e);
                };
                _branch = null;
                if(_project){
                    var project = _project;
                    _project = null;
                    project.closeProject(function(err){
                        //TODO what if for some reason we are in transaction???
                        returning(err);
                    });
                } else {
                    returning(null);
                }
            }

            function createEmptyProject(project,callback){
                var core = new SetCore(new Core(project,{}));
                var commit = new Commit(project,{});
                var root = core.createNode();
                core.setRegistry(root,"isConnection",false);
                core.setRegistry(root,"position",{ "x": 0, "y": 0});
                core.setAttribute(root,"name","ROOT");
                core.setRegistry(root,"isMeta",false);
                var rootHash = core.persist(function(err){});
                var commitHash = commit.commit('master',[],rootHash,'project creation commit');
                commit.setBranchHash('master',"",commitHash,callback);
            }

            //loading functions
            function getModifiedNodes(newerNodes){
                var modifiedNodes = [];
                for(var i in _nodes){
                    if(newerNodes[i]){
                        if(newerNodes[i].hash !== _nodes[i].hash && _nodes[i].hash !== ""){
                            modifiedNodes.push(i);
                        }
                    }
                }
                return modifiedNodes;
            }
            //this is just a first brute implementation it needs serious optimization!!!
            function patternToPaths(patternId,pattern,pathsSoFar){
                if(_nodes[patternId]){
                    pathsSoFar[patternId] = true;
                    if(pattern.children && pattern.children > 0){
                        var children = _core.getChildrenPaths(_nodes[patternId].node);
                        var subPattern = COPY(pattern);
                        subPattern.children--;
                        for(var i=0;i<children.length;i++){
                            patternToPaths(children[i],subPattern,pathsSoFar);
                        }
                    }
                } else{
                    _loadError++;
                }

            }
            function userEvents(userId,modifiedNodes){
                var newPaths = {};
                var startErrorLevel = _loadError;
                for(var i in _users[userId].PATTERNS){
                    patternToPaths(i,_users[userId].PATTERNS[i],newPaths);
                }

                var events = [];
                //deleted items
                for(i in _users[userId].PATHS){
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
                    if(_loadError > startErrorLevel){
                        // TODO events.push({etype:'incomplete',eid:null});
                    } else {
                        // TODO events.push({etype:'complete',eid:null});
                    }
                    if(_users[userId].ONEEVENT){
                        _users[userId].UI.onOneEvent(events);
                    } else {
                        for(i=0;i<events.length;i++){
                            _users[userId].UI.onEvent(events[i].etype,events[i].eid);
                        }
                    }
                }
            }
            function storeNode(node){
                _nodes[_core.getStringPath(node)] = {node:node,hash:""};
            }
            function addNode(core,nodesSoFar,node,callback){
                var path = core.getStringPath(node);
                nodesSoFar[path] = {node:node,hash:core.getSingleNodeHash(node)};
                core.loadSets(node,function(err,sets){
                    if(!err && sets && sets.length>0){
                        var  missing = 0;
                        var error = null;
                        var alldone = function(){
                            callback(error);
                        };

                        var loadSet = function(node,callback){
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

                        for(var i=0;i<sets.length;i++){
                            missing += core.getChildrenNumber(sets[i]);
                        }
                        for(i=0;i<sets.length;i++){
                            nodesSoFar[core.getStringPath(sets[i])] = {node:sets[i],hash:core.getSingleNodeHash(sets[i])};
                            loadSet(sets[i]);
                        }
                    } else {
                        callback(err);
                    }
                });
            }
            //this is just a first brute implementation it needs serious optimization!!!
            function loadPattern(core,id,pattern,nodesSoFar,callback){
                callback = callback || function(){};
                ASSERT(core && typeof core === 'object' && typeof pattern === 'object' && typeof nodesSoFar === 'object');

                core.loadByPath(id,function(err,node){
                    if(!err && node){
                        addNode(core,nodesSoFar,node,function(err){
                            if(!err){
                                //currently we only have children type pattern, so we try to simplify the function
                                if(!pattern.children || pattern.children === 0){
                                    //we are done with this pattern
                                    callback(null);
                                } else {
                                    var childrenIds = core.getChildrenPaths(node);
                                    var subPattern = COPY(pattern);
                                    subPattern.children--;
                                    var missing = childrenIds.length;
                                    var error = null;
                                    var subLoadComplete = function(err){
                                        error = error || err;
                                        if(--missing === 0){
                                            callback(error);
                                        }
                                    };
                                    for(var i=0;i<childrenIds.length;i++){
                                        loadPattern(core,childrenIds[i],subPattern,nodesSoFar,subLoadComplete);
                                    }
                                    if(missing === 0){
                                        missing = 1;
                                        subLoadComplete(null);
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
            }
            function loadRoot(newRootHash,callback){
                //TODO here we should first do the immediate event calculating
                // then if not every object reachable we should start the normal loading
                ASSERT(_project);
                _loadCore = new SetCore(new Core(_project));
                _loadNodes = {};
                _loadError = 0;
                _loadCore.loadRoot(newRootHash,function(err,root){
                    if(!err){
                        var missing = 0,
                            error = null;
                        var allLoaded = function(){
                            if(!error){
                                callback(null);
                            } else {
                                callback(error);
                            }
                        };

                        for(var i in _users){
                            for(var j in _users[i].PATTERNS){
                                missing++;
                            }
                        }
                        if(missing > 0){
                            addNode(_loadCore,_loadNodes,root,function(err){
                                error == error || err;
                                if(!err){
                                    for(i in _users){
                                        for(j in _users[i].PATTERNS){
                                            loadPattern(_loadCore,j,_users[i].PATTERNS[j],_loadNodes,function(err){
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
                            });
                        } else {
                            allLoaded();
                        }
                    } else {
                        callback(err);
                    }
                });
            }
            function loading(newRootHash,callback){
                callback = callback || function(){};
                var incomplete = false;
                var modifiedPaths = {};
                var missing = 2;
                var finalEvents = function(){
                    if(_loadError > 0){
                        //we assume that our immediate load was only partial
                        _core = _loadCore;
                        _loadCore = null;
                        modifiedPaths = getModifiedNodes(_loadNodes);
                        _nodes = _loadNodes;
                        _loadNodes = {};
                        for(var i in _users){
                            userEvents(i,modifiedPaths);
                        }
                        _loadError = 0;
                    }
                    callback(null);
                };

                loadRoot(newRootHash,function(err){
                    if(err){
                        callback(err);
                    } else {
                        if(--missing === 0){
                            finalEvents();
                        }
                    }
                });
                //here we try to make an immediate event building
                _core = _loadCore;
                modifiedPaths = getModifiedNodes(_loadNodes);
                for(var i in _loadNodes){
                    _nodes[i] = _loadNodes[i];
                }

                for(i in _users){
                    userEvents(i,modifiedPaths);
                }

                if(--missing === 0){
                    finalEvents();
                }
            }

            function saveRoot(msg,callback){
                if(!_viewer){
                    _msg +="\n"+msg;
                    if(!_inTransaction){
                        ASSERT(_project && _commit && _core && _branch);
                        var newRootHash = _core.persist(function(err){});
                        var newCommitHash = _commit.commit(_branch,[_recentCommits[0]],newRootHash,_msg);
                        _msg = "";
                        addCommit(newCommitHash);
                        _commit.setBranchHash(_branch,_recentCommits[1],_recentCommits[0],function(err){
                            //TODO now what??? - could we screw up?
                        });
                        loading(newRootHash);
                    }
                } else {
                    _msg="";
                }
            }

            function getActiveProject() {
                return _projectName;
            }

            function getAvailableProjectsAsync(callback) {
                _database.getProjectNames(callback);
            }

            function selectProjectAsync(projectname,callback) {
                //we assume that every project has a master branch and we
                //open that...
                if(projectname === _projectName){
                    callback(null);
                } else {
                    closeOpenedProject(function(err){
                        //TODO what can we do with the error??
                        _database.openProject(projectname,function(err,p){
                            if(!err && p){
                                var commit = new Commit(p);
                                commit.getBranchNames(function(err,names){
                                    if(!err && names){
                                        _project = p;
                                        openingProject(projectname);
                                        _commit = commit;
                                        _inTransaction = false;
                                        _nodes={};
                                        if(names['master']){
                                            branchWatcher('master');
                                        } else {
                                            for(var i in names){
                                                branchWatcher(names[i]);
                                                break;
                                            }
                                        }
                                        callback(null);
                                    } else {
                                        callback(err);
                                    }
                                });
                            } else {
                                callback(err);
                            }
                        });
                    });
                }
            }

            function createProjectAsync(projectname,callback){
                getAvailableProjectsAsync(function(err,names){
                    if(!err && names){
                        if(names.indexOf(projectname) === -1){
                            _database.openProject(projectname,function(err,p){
                                if(!err && p){
                                    createEmptyProject(p,function(err,commit){
                                        if(!err && commit){
                                            callback(null);
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
            }

            function deleteProjectAsync(projectname,callback){
                if(projectname === _projectName){
                    closeOpenedProject();
                }
                _database.deleteProject(projectname,callback);
            }

            //branching functionality
            function getBranchesAsync(callback){
                _commit.getBranchNames(function(err,names){
                    if(!err && names){
                        var missing = 0;
                        var branchArray = [];
                        var error = null;
                        var getBranchValues = function(name){
                            _commit.getBranchHash(name,'',function(err,newhash,forked){
                                if(!err && newhash){
                                    var element = {name:name,localcommit:newhash,remotecommit:newhash};
                                    if(forked){
                                        element.remotecommit = forked;
                                    }
                                    branchArray.push(element);
                                } else {
                                    error = error || err;
                                }

                                if(--missing === 0){
                                    callback(error,branchArray);
                                }
                            });
                        };

                        for(var i in names){
                            missing++;
                        }
                        if(missing > 0){
                            for(i in names){
                                getBranchValues(i);
                            }
                        } else {
                            callback(null,branchArray);
                        }
                    } else {
                        callback(err);
                    }
                });
            }
            function viewerCommit(hash,callback){
                //no project change
                //we stop watching branch
                //we create the core
                //we use the existing territories
                //we set viewer mode, so there will be no modification allowed to send to server...
                _branch = null;
                _viewer = true;
                _recentCommits = [hash];
                _project.loadObject(hash,function(err,commitObj){
                    if(!err && commitObj){
                        loading(commitObj.root,function(err){
                            callback(err);
                        });
                    } else {
                        callback(err);
                    }
                });
            }
            function selectCommitAsync(hash,callback){
                //this should proxy to branch selection and viewer functions
                viewerCommit(hash,callback);
            }
            function getCommitsAsync(commitHash,number,callback){
                ASSERT(_commitCache);
                if(commitHash === undefined){
                    commitHash = null;
                }
                _commitCache.getNCommitsFrom(commitHash,number,callback);

            }
            function getActualCommit(){
                return _recentCommits[0];
            }
            function getActualBranch(){
                return _branch;
            }
            function createBranchAsync(branchName,commitHash,callback){
                //it doesn't changes anything, just creates the new branch
                _commit.setBranchHash(branchName,'',commitHash,callback);
            }
            function deleteBranchAsync(branchName,callback){
                _commit.getBranchHash(branchName,'',function(err,newhash,forkedhash){
                    if(!err && newhash){
                        if(forkedhash){
                            _commit.setBranchHash(branchName,newhash,forkedhash,callback);
                        } else {
                            _commit.setBranchHash(branchName,newhash,'',callback);
                        }
                    } else {
                        callback(err);
                    }
                });
            }

            //MGA
            function copyMoreNodes(nodePaths,parentPath,callback){
                var checkPaths = function(){
                    var result = true;
                    for(var i=0;i<nodePaths.length;i++){
                        result = result && (_nodes[nodePaths[i]] && typeof _nodes[nodePaths[i]].node === 'object');
                    }
                    return result;
                };

                if(_nodes[parentPath] && typeof _nodes[parentPath].node === 'object' && checkPaths()){
                    var helpArray = {},
                        subPathArray = {},
                        parent = _nodes[parentPath].node,
                        returnArray = {};

                    //creating the 'from' object
                    var tempFrom = _core.createNode(parent);
                    //and moving every node under it
                    for(var i=0;i<nodePaths.length;i++){
                        helpArray[nodePaths[i]] = {};
                        helpArray[nodePaths[i]].origparent = _core.getParent(_nodes[nodePaths[i]].node);
                        helpArray[nodePaths[i]].tempnode = _core.moveNode(_nodes[nodePaths[i]].node,tempFrom);
                        subPathArray[_core.getRelid(helpArray[nodePaths[i]].tempnode)] = nodePaths[i];
                        delete _nodes[nodePaths[i]];
                    }

                    //do the copy
                    var tempTo = _core.copyNode(tempFrom,parent);

                    //moving back the temporary source
                    for(var i=0;i<nodePaths.length;i++){
                        helpArray[nodePaths[i]].node = _core.moveNode(helpArray[nodePaths[i]].tempnode,helpArray[nodePaths[i]].origparent);
                        storeNode(helpArray[nodePaths[i]].node);
                    }

                    //gathering the destination nodes
                    _core.loadChildren(tempTo,function(err,children){
                        if(!err && children && children.length>0){
                            for(i=0;i<children.length;i++){
                                if(subPathArray[_core.getRelid(children[i])]){
                                    var newNode = _core.moveNode(children[i],parent);
                                    storeNode(newNode);
                                    returnArray[subPathArray[_core.getRelid(children[i])]] = newNode;
                                } else {
                                    console.log('635 - should never happen!!!');
                                }
                            }
                            _core.deleteNode(tempFrom);
                            _core.deleteNode(tempTo);
                            callback(null,returnArray);
                        } else {
                            //clean up the mess and return
                            _core.deleteNode(tempFrom);
                            _core.deleteNode(tempTo);
                            callback(err,{});
                        }
                    });
                }
            }
            function startTransaction() {
                if (_core) {
                    _inTransaction = true;
                }
            }
            function completeTransaction() {
                _inTransaction = false;
                if (_core) {
                    saveRoot('completeTransaction()');
                }
            }
            function setAttributes(path, name, value) {
                if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
                    _core.setAttribute(_nodes[path].node, name, value);
                    saveRoot('setAttribute('+path+','+'name'+','+value+')');
                }
            }
            function setRegistry(path, name, value) {
                if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
                    _core.setRegistry(_nodes[path].node, name, value);
                    saveRoot('setRegistry('+path+','+','+name+','+value+')');
                }
            }
            function copyNodes(ids) {
                if (_core) {
                    _clipboard = ids;
                }
            }
            function pasteNodes(parentpath) {
                var checkClipboard = function(){
                    var result = true;
                    for(var i=0;i<_clipboard.length;i++){
                        result = result && (typeof _nodes[_clipboard[i]].node === 'object');
                    }
                    return result;
                };

                if(_core && checkClipboard()){
                    var paths = COPY(_clipboard);
                    copyMoreNodes(paths,parentpath,function(err,copyarray){
                        if(!err){
                            saveRoot('pasteNodes('+parentpath+','+paths+')');
                        }
                    });
                }
            }
            function deleteNode(path) {
                if(_core && _nodes[path] && typeof _nodes[path].node === 'object'){
                    _core.deleteNode(_nodes[path].node);
                    saveRoot('deleteNode('+path+')');
                }
            }
            function delMoreNodes(paths) {
                if(_core){
                    for(var i=0;i<paths.length;i++){
                        if(_nodes[paths[i]] && typeof _nodes[paths[i]].node === 'object'){
                            _core.deleteNode(_nodes[paths[i]].node);
                        }
                    }
                    saveRoot('delMoreNodes('+paths+')');
                }
            }
            function createChild(parameters) {
                if(_core){
                    if(parameters.parentId && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object'){
                        var baseId = parameters.baseId || "object";
                        var child = _core.createNode(_nodes[parameters.parentId].node);
                        if(baseId === "connection"){
                            _core.setRegistry(child,"isConnection",true);
                            _core.setAttribute(child,"name","defaultConn");
                        } else {
                            _core.setRegistry(child,"isConnection",false);
                            _core.setAttribute(child,"name", parameters.name || "defaultObj");

                            if (parameters.position) {
                                _core.setRegistry(child,"position", { "x": parameters.position.x || 100, "y": parameters.position.y || 100});
                            } else {
                                _core.setRegistry(child,"position", { "x": 100, "y": 100});
                            }
                        }
                        _core.setAttribute(child,"isPort",true);

                        storeNode(child);
                        saveRoot('createChild('+parameters.parentId+','+baseId+','+_core.getStringPath(child)+')');
                    }
                }
            }
            function makePointer(id, name, to) {
                if(_core && _nodes[id] && _nodes[to] && typeof _nodes[id].node === 'object' && typeof _nodes[to].node === 'object' ){
                    _core.setPointer(_nodes[id].node,name,_nodes[to].node);
                    saveRoot('makePointer('+id+','+name+','+to+')');
                }
            }
            function delPointer(path, name) {
                if(_core && _nodes[path] && typeof _nodes[path].node === 'object'){
                    _core.setPointer(_nodes[path].node,name);
                    saveRoot('delPointer('+path+','+name+')');
                }
            }
            function makeConnection(parameters) {
                if(parameters.parentId && parameters.sourceId && parameters.targetId){
                    if(_core &&
                        _nodes[parameters.parentId] &&
                        _nodes[parameters.sourceId] &&
                        _nodes[parameters.parentId] &&
                        typeof _nodes[parameters.parentId].node === 'object' &&
                        typeof _nodes[parameters.sourceId].node === 'object' &&
                        typeof _nodes[parameters.targetId].node === 'object'){
                        var connection = _core.createNode(_nodes[parameters.parentId].node);
                        _core.setPointer(connection,"source",_nodes[parameters.sourceId].node);
                        _core.setPointer(connection,"target",_nodes[parameters.targetId].node);
                        _core.setAttribute(connection,"name",_core.getAttribute(_nodes[parameters.sourceId].node,'name')+"->"+_core.getAttribute(_nodes[parameters.targetId].node,'name'));
                        _core.setRegistry(connection,"isConnection",true);
                        storeNode(connection);
                        saveRoot('makeConnection('+parameters.targetId+','+parameters.sourceId+','+parameters.targetId+')');
                    }
                }
            }
            function intellyPaste(parameters) {
                var pathestocopy = [],
                    simplepaste = true;
                if(parameters.parentId && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object'){
                    for(var i in parameters){
                        if(i !== "parentId"){
                            pathestocopy.push(i);
                            simplepaste = false;
                        }
                    }
                    if(simplepaste){
                        pathestocopy = clipboard || [];
                    }

                    if(pathestocopy.length < 1){
                    } else if(pathestocopy.length === 1){
                        var newNode = _core.copyNode(_nodes[pathestocopy[0]].node,_nodes[parameters.parentId].node);
                        storeNode(newNode);
                        if(parameters[pathestocopy[0]]){
                            for(var j in parameters[pathestocopy[0]].attributes){
                                _core.setAttribute(newNode,j,parameters[pathestocopy[0]].attributes[j]);
                            }
                            for(j in parameters[pathestocopy[0]].registry){
                                _core.setRegistry(newNode,j,parameters[pathestocopy[0]].registry[j]);
                            }
                        }
                        saveRoot('intellyPaste('+pathestocopy+','+parameters.parentId+')');
                    } else {
                        copyMoreNodes(pathestocopy,parameters.parentId,function(err,copyarr){
                            if(err){
                                //rollBackModification();
                            }
                            else{
                                for(var i in copyarr){
                                    if(parameters[i]){
                                        for(var j in parameters[i].attributes){
                                            _core.setAttribute(copyarr[i],j,parameters[i].attributes[j]);
                                        }
                                        for(j in parameters[i].registry){
                                            _core.setRegistry(copyarr[i],j,parameters[i].registry[j]);
                                        }
                                    }
                                }
                                saveRoot('intellyPaste('+pathestocopy+','+parameters.parentId+')');
                            }
                        });
                    }
                } else {
                    console.log('wrong parameters in intelligent paste operation - denied -');
                }
            }
            //MGAlike - set functions
            function addMember(path, memberpath, setid) {
                if(_nodes[path] &&
                    _nodes[memberpath] &&
                    typeof _nodes[path].node === 'object' &&
                    typeof _nodes[memberpath].node === 'object'){
                    var setPath = _core.getSetPath(_nodes[path].node,setid);
                    if(setPath === null){
                        //we need to create the set first
                        var id = _core.getSetRelid(setid);
                        var setNode = _core.createNode(_nodes[path].node,id);
                        storeNode(setNode);
                        setPath = _core.getStringPath(setNode);
                    }

                    if(_nodes[setPath] && typeof _nodes[setPath].node === 'object'){
                        //let's check if the path already in the set
                        var members = _core.getChildrenPaths(_nodes[setPath].node);
                        var memberPaths =[];
                        for(var i=0;i<members.length;i++){
                            if(_nodes[members[i]] && typeof _nodes[memebrs[i]].node === 'object'){
                                memberPaths.push(_core.getPointerPath(_nodes[members[i]].node,'member'));
                            }
                        }
                        if(memberPaths.indexOf(memberpath) === -1){
                            var newMember = _core.createNode(_nodes[setPath].node);
                            storeNode(newMember);
                            _core.setPointer(newMember,'member',_nodes[memberpath].node);
                            saveRoot('addMember('+path+','+memberpath+','+setid+')');
                        }
                    }
                }
            }
            function removeMember(path, memberpath, setid) {
                if(_nodes[path] &&
                    _nodes[memberpath] &&
                    typeof _nodes[path].node === 'object' &&
                    typeof _nodes[memberpath].node === 'object'){
                    var setPath = _core.getSetPath(_nodes[path].node,setid);
                    if(setPath !== null){
                        if(_nodes[setPath] && typeof _nodes[setPath].node === 'object'){
                            //let's check if the path is in the set
                            var members = _core.getChildrenPaths(_nodes[setPath].node);
                            var memberPaths =[];
                            var memberHash = {};
                            for(var i=0;i<members.length;i++){
                                if(_nodes[members[i]] && typeof _nodes[members[i]].node === 'object'){
                                    memberPaths.unshift(_core.getPointerPath(_nodes[members[i]].node,'member'));
                                    memberHash[memberPaths[0]] = members[i];
                                }
                            }
                            if(memberPaths.indexOf(memberpath) !== -1){
                                _core.deleteNode(_nodes[memberHash[memberpath]].node);

                                if(members.length === 1){
                                    //this was the only element in the set so we can delete the set itself
                                    _core.deleteNode(_nodes[setPath].node);
                                }

                                saveRoot('removeMember('+path+','+memberpath+','+setid+')');
                            }
                        }
                    }
                }
            }

            //territory functions
            function addUI(ui, oneevent, guid) {
                guid = guid || GUID();
                _users[guid] = {type:'notused', UI:ui, PATTERNS:{}, PATHS:{}, ONEEVENT:oneevent ? true : false, SENDEVENTS:true};
                return guid;
            }
            function removeUI(guid) {
                delete _users[guid];
            }
            function updateTerritory(guid, patterns) {
                if(_project && _commit){

                    //this has to be optimized
                    var missing = 0;
                    var error = null;
                    var allDone = function(){
                        _users[guid].PATTERNS = patterns;
                        if(!error){
                            userEvents(guid,[]);
                        }
                    };
                    for(var i in patterns){
                        missing++;
                    }
                    if(missing>0){
                        for(i in patterns){
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
                } else {
                    //we should update the patterns, but that is all
                    _users[guid].PATTERNS = patterns;
                }
            }

            //getNode
            function getNode(_id){

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
                    return _core.getRegistry(_nodes[_id].node,"isConnection") === true ? 'connection' : 'object';
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
                    //return _core.getPointerPath(_nodes[_id].node,name);
                    return {to:_core.getPointerPath(_nodes[_id].node,name),from:[]};
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
                    var setPath = _core.getSetPath(_nodes[_id].node,setid);
                    if(setPath && _nodes[setPath] && typeof _nodes[setPath].node === 'object'){
                        var members = _core.getChildrenPaths(_nodes[setPath].node);
                        var memberIds = [];
                        for(var i=0;i<members.length;i++){
                            if(_nodes[members[i]] && typeof _nodes[members[i]].node === 'object'){
                                var path = _core.getPointerPath(_nodes[members[i]].node,'member');
                                if(path){
                                    memberIds.push(path);
                                } else {

                                }
                            }
                        }
                        return memberIds;
                    } else {
                        return [];
                    }
                };
                var getSetNames = function(){
                    var setids = _core.getSetRelids(_nodes[_id].node);
                    for(var i=0;i<setids.length;i++){
                        setids[i] = commonUtil.relidtosetid(setids[i])
                    }
                    return setids;
                };
                var getSetIds = function(){
                    return _core.getSetPaths(_nodes[_id].node);
                };
                //META
                var getValidChildrenTypes = function(){
                    return getMemberIds('ValidChildren');
                };

                //ASSERT(_nodes[_id]);

                if(_nodes[_id]){
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
                }

                return null;

            }

            //initialization
            function initialize(){
                _database.openDatabase(function(){
                    networkWatcher();
                    _database.getProjectNames(function(err,names){
                        var projectname = null;
                        if(commonUtil.combinedserver.project && names.indexOf(commonUtil.combinedserver.project) !== -1){
                            projectname = commonUtil.combinedserver.project;
                        } else {
                            projectname = names[0];
                        }
                        if(!err && names && names.length>0){
                            _database.openProject(projectname,function(err,p){
                                _project = p;
                                openingProject(projectname);
                                _commit = new Commit(_project,{});
                                _inTransaction = false;
                                _forked = false;
                                _nodes={};
                                branchWatcher('master');
                            });
                        }
                    });
                });
            }
            initialize();

            return {
                //eventer
                events: _self.events,
                _eventList: _self._eventList,
                _getEvent: _self._getEvent,
                addEventListener: _self.addEventListener,
                removeEventListener: _self.removeEventListener,
                removeAllEventListeners: _self.removeAllEventListeners,
                dispatchEvent: _self.dispatchEvent,
                setSelectedObjectId: setSelectedObjectId,
                clearSelectedObjectId: clearSelectedObjectId,

                //projects, branch, etc.
                getActiveProject: getActiveProject,
                getAvailableProjectsAsync: getAvailableProjectsAsync,
                selectProjectAsync: selectProjectAsync,
                createProjectAsync: createProjectAsync,
                deleteProjectAsync: deleteProjectAsync,
                getBranchesAsync: getBranchesAsync,
                selectCommitAsync: selectCommitAsync,
                getCommitsAsync: getCommitsAsync,
                getActualCommit: getActualCommit,
                getActualBranch: getActualBranch,
                createBranchAsync: createBranchAsync,
                deleteBranchAsync: deleteBranchAsync,
                isReadOnly: function(){ return _viewer;},//TODO should be removed


                //MGA
                startTransaction: startTransaction,
                completeTransaction: completeTransaction,
                setAttributes: setAttributes,
                setRegistry: setRegistry,
                copyNodes: copyNodes,
                pasteNodes: pasteNodes,
                deleteNode: deleteNode,
                delMoreNodes: delMoreNodes,
                createChild: createChild,
                makePointer: makePointer,
                delPointer: delPointer,
                makeConnection: makeConnection,
                intellyPaste: intellyPaste,
                addMember: addMember,
                removeMember: removeMember,

                //territory functions for the UI
                addUI: addUI,
                removeUI: removeUI,
                updateTerritory: updateTerritory,
                getNode: getNode

            };
        }

        return Client;
    });
