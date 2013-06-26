define([
    'util/assert',
    'eventDispatcher',
    'util/guid',
    'core/core',
    'core/setcore',
    'storage/cache',
    'storage/failsafe',
    'storage/socketioclient',
    'storage/log',
    'storage/commit',
    'logManager'
],
    function (
        ASSERT,
        EventDispatcher,
        GUID,
        Core,
        SetCore,
        Cache,
        Failsafe,
        SocketIOClient,
        Log,
        Commit,
        LogManager
        ) {

        function COPY(object){
            if(object){
                return JSON.parse(JSON.stringify(object));
            }
            return null;
        }


        function Client(_configuration){
            var _self = this,
                logger = LogManager.create("client"),
                _database = null,
                _projectName = null,
                _project = null,
                _core = null,
                _selectedObjectId = null,
                _propertyEditorSelection = null,
                _branch = null,
                _branchState = null,
                _nodes = {},
                _inTransaction = false,
                _users = {},
                _patterns = {},
                _networkStatus = '',
                _clipboard = [],
                _msg = "",
                _recentCommits = [],
                _viewer = false,
                _loadNodes = {},
                _loadError = 0,
                _commitCache = null,
                _offline = false,
                _networkWatcher = null;

            //default configuration
            _configuration = _configuration || {};
            _configuration.autoreconnect = _configuration.autoreconnect === null || _configuration.autoreconnect === undefined ? true : _configuration.autoreconnect;
            _configuration.reconndelay  = _configuration.reconndelay || 1000;
            _configuration.reconnamount = _configuration.reconnamount || 1000;
            _configuration.host = _configuration.host || "http://"+document.location.hostname;
            _configuration.port = _configuration.port || document.location.port;
            _configuration.autostart = _configuration.autostart === null || _configuration.autostart === undefined ? false : _configuration.autostart;


            $.extend(_self, new EventDispatcher());
            _self.events = {
                "SELECTEDOBJECT_CHANGED": "SELECTEDOBJECT_CHANGED",
                "PROPERTY_EDITOR_SELECTION_CHANGED": "PROPERTY_EDITOR_SELECTION_CHANGED",
                "NETWORKSTATUS_CHANGED" : "NETWORKSTATUS_CHANGED",
                "BRANCHSTATUS_CHANGED"  : "BRANCHSTATUS_CHANGED",
                "BRANCH_CHANGED"        : "BRANCH_CHANGED",
                "PROJECT_CLOSED"        : "PROJECT_CLOSED",
                "PROJECT_OPENED"        : "PROJECT_OPENED"
            };
            _self.networkStates = {
                'CONNECTED' :"connected",
                'DISCONNECTED' : "socket.io is disconnected"
            };
            _self.branchStates = {
                'SYNC'    : 'inSync',
                'FORKED'  : 'forked',
                'OFFLINE' : 'offline'
            };

            function setSelectedObjectId(objectId) {
                if (objectId !== _selectedObjectId) {
                    _selectedObjectId = objectId;
                    _self.dispatchEvent(_self.events.SELECTEDOBJECT_CHANGED, _selectedObjectId);
                    setPropertyEditorIdList([objectId]);
                }
            }
            function clearSelectedObjectId() {
                setSelectedObjectId(null);
            }
            function setPropertyEditorIdList(idList) {
                if (idList !== _propertyEditorSelection) {
                    _propertyEditorSelection = idList;
                    _self.dispatchEvent(_self.events.PROPERTY_EDITOR_SELECTION_CHANGED, _propertyEditorSelection);
                }
            }
            function clearPropertyEditorIdList() {
                setPropertyEditorIdList([]);
            }
            function changeBranchState(newstate){
                if(_branchState !== newstate){
                    _branchState = newstate;
                    _self.dispatchEvent(_self.events.BRANCHSTATUS_CHANGED,_branchState);
                }
            }
            function connect(){
                //this is when the user force to go online on network level
                //TODO implement :) - but how, there is no such function on the storage's API
                if(_database){
                    _database.openDatabase(function(err){});
                }
            }

            //branch handling functions
            function goOffline(){
                //TODO stop watching the branch changes
                _offline = true;
                changeBranchState(_self.branchStates.OFFLINE);
            }
            function goOnline(){
                //TODO we should try to update the branch with our latest commit
                //and 'restart' listening to branch changes
                if(_offline){
                    branchWatcher(_branch);
                }
            }

            function addCommit(commitHash){
                _commitCache.newCommit(commitHash);
                _recentCommits.unshift(commitHash);
                if(_recentCommits.length > 10){
                    _recentCommits.pop();
                }
            }

            function branchWatcher(branch,callback) {
                ASSERT(_project);
                callback = callback || function(){};
                var myCallback = null;
                var branchHashUpdated = function(err,newhash,forked){
                    if(branch === _branch && !_offline){
                        if(!err && typeof newhash === 'string'){
                            if(newhash === ''){
                                logger.warning('The current branch '+branch+' have been deleted!');
                                //we should open a viewer with our current commit...
                                var latestCommit = _recentCommits[0];
                                viewerCommit(latestCommit,function(err){
                                    if(err){
                                        logger.error('Current branch '+branch+' have been deleted, and unable to open the latest commit '+latestCommit+'! ['+JSON.stringify(err)+']');
                                    }
                                });
                            } else{
                                if(_recentCommits.indexOf(newhash) === -1){

                                    addCommit(newhash);

                                    //TODO here we have to start with a syncronous root object load...
                                    _project.loadObject(newhash,function(err,commitObj){
                                        if(!err && commitObj){
                                            loading(commitObj.root);
                                        }
                                    });
                                }

                                if(callback){
                                    myCallback = callback;
                                    callback = null;
                                    myCallback();
                                }

                                //branch status update
                                if(_offline){
                                    changeBranchState(_self.branchStates.OFFLINE);
                                } else {
                                    if(forked){
                                        changeBranchState(_self.branchStates.FORKED);
                                    }/* else {
                                     changeBranchState(_self.branchStates.SYNC);
                                     }*/
                                }

                                return _project.getBranchHash(branch,_recentCommits[0],branchHashUpdated);
                            }
                        } else {
                            if(callback){
                                myCallback = callback;
                                callback = null;
                                myCallback();
                            }
                            return _project.getBranchHash(branch,_recentCommits[0],branchHashUpdated);
                        }
                    } else {
                        if(callback){
                            myCallback = callback;
                            callback = null;
                            myCallback();
                        }
                    }
                };

                if(_branch !== branch){
                    _branch = branch;
                    _viewer = false;
                    _offline = false;
                    _recentCommits = [""];
                    _self.dispatchEvent(_self.events.BRANCH_CHANGED,_branch);
                    changeBranchState(_self.branchStates.SYNC);
                    _project.getBranchHash(branch,_recentCommits[0],branchHashUpdated);
                } else {
                    if(_offline){
                        _viewer = false;
                        _offline = false;
                        changeBranchState(_self.branchStates.SYNC);
                        _project.getBranchHash(branch,_recentCommits[0],branchHashUpdated);
                    } else {
                        callback(null);
                    }
                }
            }

            function networkWatcher(){
                _networkStatus = "";
                var running = true;
                var autoReconnect = _configuration.autoreconnect ? true : false;
                var reConnDelay = _configuration.reconndelay || 1000;
                var reConnAmount = _configuration.reconnamount || 1000;
                var reconnecting = function(){
                    var counter = 0;
                    var timerId = setInterval(function(){
                        if(counter<reConnAmount && _networkStatus === _self.networkStates.DISCONNECTED && running){
                            _database.openDatabase(function(err){});
                            counter++;
                        } else {
                            clearInterval(timerId);
                        }
                    },reConnDelay);
                };
                var dbStatusUpdated = function(err,newstatus){
                    if(running){
                        if(!err && newstatus && _networkStatus !== newstatus){
                            _networkStatus = newstatus;
                            if(_networkStatus === _self.networkStates.DISCONNECTED && autoReconnect){
                                reconnecting();
                            }
                            _self.dispatchEvent(_self.events.NETWORKSTATUS_CHANGED, _networkStatus);
                        }
                        return _database.getDatabaseStatus(_networkStatus,dbStatusUpdated);
                    }
                    return;
                };
                var stop = function(){
                    running = false;
                }
                _database.getDatabaseStatus('',dbStatusUpdated);

                return {
                    stop: stop
                }
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
                                //we cannot get new commits from the server
                                //we should use our very own ones
                                //callback(err);
                                callback(null);
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

                function newCommit(commitHash){
                    if(_cache[commitHash]){
                        return;
                    } else {
                        _project.loadObject(commitHash,function(err,commitObj){
                            if(!err && commitObj){
                                addCommit(commitObj);
                            }
                            return;
                        });
                    }
                }

                return {
                    getNCommitsFrom: getNCommitsFrom,
                    clearCache: clearCache,
                    newCommit: newCommit
                }
            }

            function viewLatestCommit(callback){
                _commitCache.getNCommitsFrom(null,1,function(err,commits){
                    if(!err && commits && commits.length>0){
                        viewerCommit(commits[0][_database.ID_NAME],callback)
                    } else {
                        logger.error('Cannot get latest commit! ['+JSON.stringify(err)+']');
                        callback(err);
                    }
                });
            }
            function openProject(name,callback){
                ASSERT(_database);
                _database.openProject(name,function(err,p){
                    if(!err &&  p){
                        _project = p;
                        _projectName = name;
                        _inTransaction = false;
                        _nodes = {};
                        _core = new SetCore(new Core(_project));
                        if(_commitCache){
                            _commitCache.clearCache();
                        } else {
                            _commitCache = commitCache();
                        }
                        _self.dispatchEvent(_self.events.PROJECT_OPENED, _projectName);

                        //check for master or any other branch
                        _project.getBranchNames(function(err,names){
                            if(!err && names){
                                var firstName = null;

                                for(var i in names){
                                    if(!firstName){
                                        firstName = i;
                                    }
                                    if(i === 'master'){
                                        firstName = i;
                                        break;
                                    }
                                }

                                if(firstName){
                                    branchWatcher(firstName,function(err){
                                        if(!err){
                                            _self.dispatchEvent(_self.events.BRANCH_CHANGED, _branch);
                                            callback(null);
                                        } else {
                                            logger.error('The branch '+firstName+' of project '+name+' cannot be selected! ['+JSON.stringify(err)+']');
                                            callback(err);
                                        }
                                    });
                                } else {
                                    //we should try the latest commit
                                    viewLatestCommit(callback);
                                }
                            } else {
                                //we should try the latest commit
                                viewLatestCommit(callback);
                            }
                        });
                    } else {
                        logger.error('The project '+name+' cannot be opened! ['+JSON.stringify(err)+']');
                        callback(err);
                    }
                });
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
                    _inTransaction = false;
                    _core = null;
                    _nodes = {};
                    //_commitObject = null;
                    _patterns = {};
                    _clipboard = [];
                    _msg = "";
                    _recentCommits = [];
                    _viewer = false;
                    _loadNodes = {};
                    _loadError = 0;
                    _offline = false;
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
                var root = core.createNode();
                core.setRegistry(root,"isConnection",false);
                core.setRegistry(root,"position",{ "x": 0, "y": 0});
                core.setAttribute(root,"name","ROOT");
                core.setRegistry(root,"isMeta",false);
                core.persist(function(err){});
                var rootHash = core.getHash(root);
                var commitHash = project.makeCommit([],rootHash,'project creation commit',function(err){});
                project.setBranchHash('master',"",commitHash,callback);
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
            function addSetPaths(pathsSoFar){
                for(var i in pathsSoFar){
                    var sets = _core.getSetPaths(_nodes[i].node);
                    for(var j=0;j<sets.length;j++){
                        pathsSoFar[sets[j]] = true;
                    }
                }
            }
            function userEvents(userId,modifiedNodes){
                var newPaths = {};
                var startErrorLevel = _loadError;
                for(var i in _users[userId].PATTERNS){
                    patternToPaths(i,_users[userId].PATTERNS[i],newPaths);
                }
                addSetPaths(newPaths);

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

                //we should remove set events and add their owner instead
                var setEvents = {};
                var eventsToRemove = [];
                //first we mark the set changes
                var setPath = null;
                for(i=0;i<events.length;i++){
                    setPath =  _core.getSetOwnerPath(events[i].eid);
                    if(setPath){
                        eventsToRemove.unshift(i);
                        setEvents[setPath] = false;
                    }
                }
                //we remove the set events
                while(eventsToRemove.length>0){
                    var index = eventsToRemove.shift();
                    events.splice(index,1);
                }

                //we check which events should be really added
                for(i=0;i<events.length;i++){
                    if(setEvents[events[i].eid] === false){
                        setEvents[events[i].eid] = true;
                    }
                }

                //adding the needed events
                for(i in setEvents){
                    if(setEvents[i] === false){
                        events.push({etype:'update',eid:i});
                    }
                }


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
            function storeNode(node,basic){
                basic = basic || true;
                var path = _core.getPath(node);
                if(_nodes[path]){
                    //TODO we try to avoid this
                } else {
                    _nodes[path] = {node:node,hash:"",incomplete:true,basic:basic};
                }
                return path;
            }
            function completeNode(core,nodesSoFar,node,callback){
                if(core.getSetsNumber(node)>0){
                    core.loadSets(node,function(err,sets){
                        if(!err && sets ){
                            var missing = sets.length;
                            var error = null;
                            var path = null;
                            for(var i=0;i<sets.length;i++){
                                path = core.getPath(sets[i]);
                                if(!nodesSoFar[path]){
                                    nodesSoFar[path] = {node:sets[i],hash:core.getSingleNodeHash(sets[i]),incomplete:false,basic:false};
                                }
                                if(core.getChildrenNumber(sets[i])>0){
                                    core.loadChildren(sets[i],function(err,children){
                                        error = error || err;
                                        if(!err){
                                            for(var j=0;j<children.length;j++){
                                                path = core.getPath(children[j]);
                                                if(!nodesSoFar[path]){
                                                    nodesSoFar[path] = {node:children[j],hash:core.getSingleNodeHash(children[j]),incomplete:false,basic:false};
                                                }
                                            }
                                        }

                                        if(--missing === 0){
                                            nodesSoFar[core.getPath(node)].incomplete = false;
                                            callback(error);
                                        }
                                    });
                                } else {
                                    if(--missing === 0){
                                        nodesSoFar[core.getPath(node)].incomplete = false;
                                        callback(error);
                                    }
                                }
                            }
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    nodesSoFar[core.getPath(node)].incomplete = false;
                    callback(null);
                }
            }
            function _completeNodes(core,nodes,callback){
                var incompletes = [];
                for(var i in nodes){
                    if(nodes[i].incomplete){
                        incompletes.push(nodes[i].node);
                    }
                }
                var missing = incompletes.length;
                if(missing>0){
                    var error = null;
                    for(i=0;i<incompletes.length;i++){
                        completeNode(core,nodes,incompletes[i],function(err){
                            error = error || err;
                            if(--missing === 0){
                                callback(error);
                            }
                        });
                    }
                } else {
                    callback(null);
                }
            }
            function completeNodes(core,nodes,callback){
                for(var i in nodes){
                    if(nodes[i].incomplete){
                        nodes[i].incomplete = false;
                    }
                }
                callback(null);
            }
            function loadChildrenPattern(core,nodesSoFar,node,level,callback){
                var path = core.getPath(node);
                if(!nodesSoFar[path]){
                    nodesSoFar[path] = {node:node,hash:core.getSingleNodeHash(node),incomplete:true,basic:true};
                }
                if(level>0){
                    if(core.getChildrenNumber(nodesSoFar[path].node)>0){
                        core.loadChildren(nodesSoFar[path].node,function(err,children){
                            if(!err && children){
                                var missing = children.length;
                                var error = null;
                                for(var i=0;i<children.length;i++){
                                    loadChildrenPattern(core,nodesSoFar,children[i],level-1,function(err){
                                        error = error || err;
                                        if(--missing === 0){
                                            callback(error);
                                        }
                                    });
                                }
                            } else {
                                callback(err);
                            }
                        });
                    } else {
                        callback(null);
                    }
                } else {
                    callback(null);
                }
            }
            function loadPattern(core,id,pattern,nodesSoFar,callback){
                var base = null;
                var baseLoaded = function(){
                       if(pattern.children && pattern.children>0){
                           var level = pattern.children;
                           loadChildrenPattern(core,nodesSoFar,base,level,callback);
                       } else {
                           callback(null);
                       }
                };

                if(nodesSoFar[id]){
                    base = nodesSoFar[id].node;
                    baseLoaded();
                } else {
                    core.loadByPath(id,function(err,node){
                        if(!err && node){
                            var path = core.getPath(node);
                            if(!nodesSoFar[path]){
                                nodesSoFar[path] = {node:node,hash:core.getSingleNodeHash(node),incomplete:false,basic:true};
                            }
                            base = node;
                            baseLoaded();
                        } else {
                            callback(err);
                        }
                    });
                }
            }
            function loadRoot(newRootHash,callback){
                _loadNodes = {};
                _loadError = 0;
                _core.loadRoot(newRootHash,function(err,root){
                    if(!err){
                        var missing = 0,
                            error = null;
                        _loadNodes[_core.getPath(root)] = {node:root,hash:_core.getSingleNodeHash(root),incomplete:true,basic:true};
                        var allLoaded = function(){
                            if(!error){
                                completeNodes(_core,_loadNodes,callback);
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
                            for(i in _users){
                                for(j in _users[i].PATTERNS){
                                    loadPattern(_core,j,_users[i].PATTERNS[j],_loadNodes,function(err){
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
                    } else {
                        callback(err);
                    }
                });
            }
            //this is just a first brute implementation it needs serious optimization!!!
            function loading(newRootHash,callback){
                callback = callback || function(){};
                var incomplete = false;
                var modifiedPaths = {};
                var missing = 2;
                var finalEvents = function(){
                    if(_loadError > 0){
                        //we assume that our immediate load was only partial
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
                //TODO we should deal with the full unloading!!!
                //TODO we should check not to hide any issue related to immediate loading!!!
                var hasEnoughNodes = false;
                var counter = 0;
                var limit = 0;
                for(var i in _nodes){
                    counter++;
                }
                limit = counter/2;
                counter = 0;
                for(i in _loadNodes){
                    counter++;
                }
                hasEnoughNodes = limit <= counter;
                if(hasEnoughNodes){
                    modifiedPaths = getModifiedNodes(_loadNodes);
                    _nodes = {};
                    for(i in _loadNodes){
                        _nodes[i] = _loadNodes[i];
                    }

                    for(i in _users){
                        userEvents(i,modifiedPaths);
                    }

                    if(--missing === 0){
                        finalEvents();
                    }

                } else {
                    _loadError++;
                    if(--missing === 0){
                        finalEvents();
                    }
                }
            }


            function saveRoot(msg,callback){
                callback = callback || function(){};
                if(!_viewer){
                    _msg +="\n"+msg;
                    if(!_inTransaction){
                        ASSERT(_project && _core && _branch);
                        _core.persist(function(err){});
                        var newRootHash = _core.getHash(_core.getRoot());
                        var newCommitHash = _project.makeCommit([_recentCommits[0]],newRootHash,_msg,function(err){
                            //TODO now what??? - could we end up here?
                        });
                        _msg = "";
                        addCommit(newCommitHash);
                        _project.setBranchHash(_branch,_recentCommits[1],_recentCommits[0],function(err){
                            //TODO now what??? - could we screw up?
                            callback(err);
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
                if(_database){
                    _database.getProjectNames(callback);
                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }
            function selectProjectAsync(projectname,callback) {
                if(_database){
                    if(projectname === _projectName){
                        callback(null);
                    } else {
                        closeOpenedProject(function(err){
                            //TODO what can we do with the error??
                            openProject(projectname,callback);
                        });
                    }
                } else {
                    callback(new Error('there is no open database connection!!!'));
                }
            }
            function createProjectAsync(projectname,callback){
                if(_database){
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
                } else {
                    callback(new Error('there is no open database connection!'));
                }

            }
            function deleteProjectAsync(projectname,callback){
                if(_database){
                    if(projectname === _projectName){
                        closeOpenedProject();
                    }
                    _database.deleteProject(projectname,callback);

                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }

            //branching functionality
            function getBranchesAsync(callback){
                if(_database){
                    if(_project){
                        _project.getBranchNames(function(err,names){
                            if(!err && names){
                                var missing = 0;
                                var branchArray = [];
                                var error = null;
                                var getBranchValues = function(name){
                                    _project.getBranchHash(name,'#hack',function(err,newhash,forked){
                                        if(!err && newhash){
                                            var element = {name:name,commitId:newhash};
                                            if(forked){
                                                element.sync = false;
                                            } else {
                                                element.sync = true;
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
                    } else {
                        callback(new Error('there is no open project!'));
                    }
                } else {
                    callback(new Error('there is no opened database connection!'));
                }
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
                _self.dispatchEvent(_self.events.BRANCH_CHANGED, _branch);
                _project.loadObject(hash,function(err,commitObj){
                    if(!err && commitObj){
                        loading(commitObj.root,callback);
                    } else {
                        logger.error('Cannot view given '+hash+' commit as it\'s root cannot be loaded! ['+JSON.stringify(err)+']');
                        callback(err);
                    }
                });
            }
            function selectCommitAsync(hash,callback){
                //this should proxy to branch selection and viewer functions
                if(_database){
                    if(_project){
                        viewerCommit(hash,callback);
                    } else {
                        callback(new Error('there is no open project!'));
                    }
                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }
            function selectBranchAsync(branch,callback){
                if(_database){
                    if(_project){
                        branchWatcher(branch,callback);
                    } else {
                        callback(new Error('there is no open project!'));
                    }
                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }
            function getCommitsAsync(commitHash,number,callback){
                if(_database){
                    if(_project){
                        ASSERT(_commitCache);
                        if(commitHash === undefined){
                            commitHash = null;
                        }
                        _commitCache.getNCommitsFrom(commitHash,number,callback);
                    } else {
                        callback(new Error('there is no open project!'));
                    }
                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }
            function getActualCommit(){
                return _recentCommits[0];
            }
            function getActualBranch(){
                return _branch;
            }
            function getActualNetworkStatus(){
                return _networkStatus;
            }
            function getActualBranchStatus(){
                return _branchState;
            }
            function createBranchAsync(branchName,commitHash,callback){
                //it doesn't changes anything, just creates the new branch
                if(_database){
                    if(_project){
                        _project.setBranchHash(branchName,'',commitHash,callback);
                    } else {
                        callback(new Error('there is no open project!'));
                    }
                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }
            function deleteBranchAsync(branchName,callback){
                if(_database){
                    if(_project){
                        _project.getBranchHash(branchName,'',function(err,newhash,forkedhash){
                            if(!err && newhash){
                                if(forkedhash){
                                    _project.setBranchHash(branchName,newhash,forkedhash,function(err){
                                        if(!err){
                                            changeBranchState(_self.branchStates.SYNC);
                                        }
                                        callback(err);
                                    });
                                } else {
                                    _project.setBranchHash(branchName,newhash,'',callback);
                                }
                            } else {
                                callback(err);
                            }
                        });
                    } else {
                        callback(new Error('there is no open project!'));
                    }
                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }
            function commitAsync(params,callback){
                if(_database){
                    if(_project){
                        var msg = params.message || '';
                        saveRoot(msg,callback);
                    } else {
                        callback(new Error('there is no open project!'));
                    }
                } else {
                    callback(new Error('there is no open database connection!'));
                }
            }
            function connectToDatabaseAsync(options,callback){
                options = options || {};
                callback = callback || function(){};
                options.host = options.host || _configuration.host;
                options.port = options.port || _configuration.port;
                options.open = (options.open !== undefined || options.open !== null) ? options.open : false;
                options.project = options.project || null;
                if(_database){
                    //we have to close the current
                    closeOpenedProject(function(){});
                    _database.closeDatabase(function(){});
                    _networkStatus = "";
                    changeBranchState(null);
                }
                _database = new Log(
                    new Commit(
                        new Cache(
                            new Failsafe(
                                new SocketIOClient(
                                    {
                                        host:options.host,
                                        port:options.port
                                    }
                                ),{}
                            ),{}
                        ),{}
                    ),{log:LogManager.create('client-storage')}
                );

                _database.openDatabase(function(err){
                    if(!err){
                        if(_networkWatcher){
                            _networkWatcher.stop();
                        }
                        _networkWatcher = networkWatcher();

                        if(options.open){
                            if(options.project){
                                openProject(options.project,callback);
                            } else {
                                //default opening routine
                                _database.getProjectNames(function(err,names){
                                    if(!err && names && names.length>0){
                                        openProject(names[0],callback);
                                    } else {
                                        logger.error('Cannot get project names / There is no project on the server');
                                        callback(err);
                                    }
                                });
                            }
                        } else {
                            callback(null);
                        }
                    } else {
                        logger.error('Cannot open database');
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
                    saveRoot('startTransaction()');
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
                            _core.setRegistry(child,"isPort",false);
                            _core.setAttribute(child,"name","defaultConn");
                        } else {
                            _core.setRegistry(child,"isConnection",false);
                            _core.setRegistry(child,"isPort",true);
                            _core.setAttribute(child,"name", parameters.name || "defaultObj");

                            if (parameters.position) {
                                _core.setRegistry(child,"position", { "x": parameters.position.x || 100, "y": parameters.position.y || 100});
                            } else {
                                _core.setRegistry(child,"position", { "x": 100, "y": 100});
                            }
                        }

                        _core.setRegistry(child,"decorator","");

                        storeNode(child);
                        saveRoot('createChild('+parameters.parentId+','+baseId+','+_core.getPath(child)+')');
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
                        _core.setRegistry(connection,"decorator","");
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
            function _addMember(path, memberpath, setid) {
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
                        setPath = _core.getPath(setNode);
                    }

                    if(_nodes[setPath] && typeof _nodes[setPath].node === 'object'){
                        //let's check if the path already in the set
                        var members = _core.getChildrenPaths(_nodes[setPath].node);
                        var memberPaths =[];
                        for(var i=0;i<members.length;i++){
                            if(_nodes[members[i]] && typeof _nodes[members[i]].node === 'object'){
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
            function _removeMember(path, memberpath, setid) {
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

            function addMember(path,memberpath,setid){
                if(_nodes[path] &&
                    _nodes[memberpath] &&
                    typeof _nodes[path].node === 'object' &&
                    typeof _nodes[memberpath].node === 'object'){
                    _core.addMember(_nodes[path].node,setid,_nodes[memberpath].node);
                    saveRoot('addMember('+path+','+memberpath+','+setid+')');
                }
            }
            function removeMember(path,memberpath,setid){
                if(_nodes[path] &&
                    typeof _nodes[path].node === 'object'){
                    _core.delMember(_nodes[path].node,setid,memberpath);
                    saveRoot('removeMember('+path+','+memberpath+','+setid+')');
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
                if(_project){

                    //this has to be optimized
                    var missing = 0;
                    var error = null;
                    var allDone = function(){
                        completeNodes(_core,_nodes,function(err){
                            _users[guid].PATTERNS = patterns;
                            if(!error && !err){
                                userEvents(guid,[]);
                            }
                        });
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

                var setNames = {
                    VALIDCHILDREN    : 'ValidChildren',
                    VALIDSOURCE      : 'ValidSource',
                    VALIDDESTINATION : 'ValidDestination',
                    VALIDINHERITOR   : 'ValidInheritor',
                    GENERAL          : 'General'
                };
                var setIds = {
                    VALIDCHILDREN    : "2200000001",
                    VALIDSOURCE      : "2200000002",
                    VALIDDESTINATION : "2200000003",
                    VALIDINHERITOR   : "2200000004",
                    GENERAL          : "2200000000"
                };
                var getParentId = function(){
                    return _core.getPath(_core.getParent(_nodes[_id].node));
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
                var _getMemberIds = function(setid){
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
                var getMemberIds = function(setid){
                    return _core.getMemberPaths(_nodes[_id].node,setid);
                };
                var relidtosetid = function(id){
                    for(var i in setIds){
                        if(id === setIds[i]){
                            return setNames[i];
                        }
                    }
                    return "-";
                };
                var _getSetNames = function(){
                    var setids = _core.getSetRelids(_nodes[_id].node);
                    for(var i=0;i<setids.length;i++){
                        setids[i] = relidtosetid(setids[i])
                    }
                    return setids;
                };
                var getSetNames = function(){
                    return _core.getSetNames(_nodes[_id].node);
                };
                var getValidSetNames = function(){
                    var names = [];
                    for(var i in setNames){
                        names.push(setNames[i]);
                    }
                    return names;
                };
                /*var getSetIds = function(){
                    return _core.getSetPaths(_nodes[_id].node);
                };*/
                //META
                var getValidChildrenTypes = function(){
                    return getMemberIds('ValidChildren');
                };

                //ASSERT(_nodes[_id]);

                if(_nodes[_id] /*&& _nodes[_id].incomplete === false*/){
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
                        //getSetIds             : getSetIds,
                        getSetNames           : getSetNames,
                        getValidSetNames      : getValidSetNames
                    }
                }

                return null;

            }

            //testing
            function testMethod(testnumber){
                /*deleteBranchAsync("blabla",function(err){
                    getBranchesAsync(function(err,branches){
                        console.log('kecso');
                    });
                    /*setTimeout(function(){
                        getBranchesAsync(function(err,branches){
                            console.log('kecso');
                        });
                    },0);
                });*/
                connectToDatabaseAsync({open:true},function(err){
                    console.log('kecso connecting to database',err);
                });
            }

            //initialization
            function initialize(){
                _database = new Log(
                    new Commit(
                        new Cache(
                            new Failsafe(
                                new SocketIOClient(
                                    {
                                        host:_configuration.host,
                                        port:_configuration.port
                                    }
                                ),{}
                            ),{}
                        ),{}
                    ),{log:LogManager.create('client-storage')}
                );
                _database.openDatabase(function(err){
                    if(!err){
                        _networkWatcher = networkWatcher();
                        _database.getProjectNames(function(err,names){
                            if(!err && names && names.length>0){
                                var projectName = null;
                                if(_configuration.project && names.indexOf(_configuration.project) !== -1){
                                    projectName = _configuration.project;
                                } else {
                                    projectName = names[0];
                                }
                                openProject(projectName,function(err){
                                    if(err){
                                        logger.error('Problem during project opening:'+JSON.stringify(err));
                                    }
                                });
                            } else {
                                logger.error('Cannot get project names / There is no project on the server');
                            }
                        });
                    } else {
                        logger.error('Cannot open database');
                    }
                });
            }
            if(_configuration.autostart){
                initialize();
            }

            return {
                //eventer
                events: _self.events,
                networkStates: _self.networkStates,
                branchStates: _self.branchStates,
                _eventList: _self._eventList,
                _getEvent: _self._getEvent,
                addEventListener: _self.addEventListener,
                removeEventListener: _self.removeEventListener,
                removeAllEventListeners: _self.removeAllEventListeners,
                dispatchEvent: _self.dispatchEvent,
                setSelectedObjectId: setSelectedObjectId,
                clearSelectedObjectId: clearSelectedObjectId,
                setPropertyEditorIdList: setPropertyEditorIdList,
                clearPropertyEditorIdList: clearPropertyEditorIdList,
                connect: connect,

                //projects, branch, etc.
                getActiveProject: getActiveProject,
                getAvailableProjectsAsync: getAvailableProjectsAsync,
                connectToDatabaseAsync: connectToDatabaseAsync,
                selectProjectAsync: selectProjectAsync,
                createProjectAsync: createProjectAsync,
                deleteProjectAsync: deleteProjectAsync,
                getBranchesAsync: getBranchesAsync,
                selectCommitAsync: selectCommitAsync,
                getCommitsAsync: getCommitsAsync,
                getActualCommit: getActualCommit,
                getActualBranch: getActualBranch,
                getActualNetworkStatus: getActualNetworkStatus,
                getActualBranchStatus: getActualBranchStatus,
                createBranchAsync: createBranchAsync,
                deleteBranchAsync: deleteBranchAsync,
                selectBranchAsync: selectBranchAsync,
                commitAsync: commitAsync,
                goOffline: goOffline,
                goOnline: goOnline,
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
                getNode: getNode,

                //testing
                testMethod: testMethod

            };
        }

        return Client;
    });
