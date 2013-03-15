define([
    'core/assert',
    'js/Client/ClientLogCore',
    'core/lib/sha1',
    'common/CommonUtil',
    'js/Client/ClientNode',
    'js/Client/ClientMeta'],
    function(ASSERT,ClientCore,SHA1,commonUtil,ClientNode,ClientMeta){
    'use strict';
    var KEY        = "_id";
    var INSERTARR  = commonUtil.insertIntoArray;
    var ISSET      = commonUtil.issetrelid;
    var MINSETID   = commonUtil.minsetid;
    var RELFROMID  = commonUtil.relidfromid;
    var RELFROMSET = commonUtil.setidtorelid;
    var COPY       = commonUtil.copy;

    var ClientProject = function(parameters){ //it represents one working copy of a project attached to a given branch of the project
        var self = this,
            storage = parameters.storage, //the storage of the project
            master = parameters.master, //the client master
            id = parameters.id,
            userstamp = parameters.user,
            mycommit = parameters.commit,
            branch = parameters.branch,
            currentRoot = null,
            users = {},
            currentCore = null,
            currentNodes = {},
            currentPathes = {},
            currentNupathes = {},
            clipboard = [],
            //meta = new ClientMeta(master),
            status = null,
            readonly = parameters.readonly || false,
            intransaction = false,
            blocked = false;

        //functions that client master will call
        var dismantle = function(){
            currentCore = null;
            currentRoot = null;
            currentNodes = {};
            currentPathes = {};
            clipboard = [];
            status = null;
            users = {};
            //master.changeStatus(id,status);
        };
        var goOffline = function(){
            //this function can be called internally if we lose online status due to some conflict
            status = "offline";
            master.changeStatus(id,status);
        };
        var goOnline = function(callback){
            callback = callback || function(){};
            var goOnlineWithCommit = function(){
                blocked = false;
                status = 'online';
                storage.requestPoll(branch,mycommit[KEY],projectPoll);
                modifyRootOnServer("- going online -",callback);
            };
            var isPredecessorCommit = function(youngcommitid,oldcommitid,allcommits){
                //KECSO
                return true;
                if(youngcommitid === oldcommitid){
                    return true;
                }
                if(allcommits[youngcommitid] && allcommits[oldcommitid]){
                    if(allcommits[youngcommitid].parents.length>0){
                        var possibly = false;
                        for(var i=0;i<allcommits[youngcommitid].parents.length;i++){
                            if(isPredecessorCommit(allcommits[youngcommitid].parents[i],oldcommitid,allcommits)){
                                possibly = true;
                            }
                        }
                        return possibly;
                    } else {
                        return false;
                    }
                } else {
                    return false; //some point is missing
                }
            };
            if(status !== 'online'){
                if(currentNodes && currentNodes['root']){
                    var key = currentCore.getKey(currentNodes['root']);
                    if(key === currentRoot){
                        //there were no changes so we should try to simply refresh ourselves to the server
                        blocked = true;
                        master.getBranchesAsync(function(err,branches){
                            if(!err && branches && branches.length>0){
                                master.getCommitsAsync(function(err,commits){
                                    if(!err && commits && commits.length>0){
                                        var mycommits = {};
                                        for(var i=0;i<commits.length;i++){
                                            mycommits[commits[i][KEY]] = commits[i];
                                        }
                                        var refreshed = false;
                                        for(i=0;i<branches.length;i++){
                                            if(isPredecessorCommit(branches[i].remotecommit,mycommit[KEY],mycommits)){
                                                refreshed = true;
                                                mycommit = mycommits[branches[i].remotecommit];
                                                branch = mycommit['name'];
                                                newRootArrived(mycommit.root,function(){
                                                    blocked = false;
                                                    status = 'online';
                                                    storage.requestPoll(branch,mycommit[KEY],projectPoll);
                                                    master.changeStatus(id,status);
                                                    callback();
                                                });
                                            }
                                        }
                                        if(!refreshed){
                                            goOnlineWithCommit();
                                        }
                                    } else {
                                        goOnlineWithCommit();
                                    }
                                });
                            } else {
                                goOnlineWithCommit();
                            }
                        });
                    } else {
                        goOnlineWithCommit();
                    }
                } else {
                    //not too much to do
                    callback();
                }
            } else {
                callback();
            }
        };
        var networkError = function(){
            status = 'nonetwork';
            master.changeStatus(id,status);
        };
        var createEmpty = function(callback){
            if(blocked){
                callback('cannot modify as now the actor is blocked!!!');
                return;
            }
            intransaction =true;
            var core = new ClientCore({
                storage: storage,
                logger: parameters.logger
            });
            currentCore = core;
            var root = core.createNode();
            var rootid = storeNode(root);
            core.setRegistry(root,"isConnection",false);
            core.setRegistry(root,"position",{ "x": 0, "y": 0});
            core.setAttribute(root,"name","root");
            core.setRegistry(root,"isMeta",false);
            //we create meta-meta
            var metameta = core.createNode(root);
            var metametaid = storeNode(metameta);
            core.setRegistry(metameta,"isConnection",false);
            core.setRegistry(metameta,"position",{ "x": 0, "y": 0});
            core.setAttribute(metameta,"name","META-META");
            core.setRegistry(metameta,"isMeta",false);
            var mmobject = core.createNode(metameta);
            var mmobjectid = storeNode(mmobject);
            core.setRegistry(mmobject,"isConnection",false);
            core.setRegistry(mmobject,"position",{ "x": 0, "y": 0});
            core.setAttribute(mmobject,"name","object");
            core.setRegistry(mmobject,"isMeta",false);
            //TODO currently as we use copy and not inheritance we have to set the base object with empty meta-sets...
            //addMember(mmobjectid,mmobjectid,'ValidChildren');
            //addMember(mmobjectid,mmobjectid,'ValidSource');
            //addMember(mmobjectid,mmobjectid,'ValidDestination');
            //addMember(mmobjectid,mmobjectid,'ValidInheritor');


            //now we also creates the META folder with one object and the MODEL folder which aims to be the starting point for the projects
            var meta = core.createNode(root);
            var metaid = storeNode(meta);
            core.setRegistry(meta,"isConnection",false);
            core.setRegistry(meta,"position",{ "x": 0, "y": 0});
            core.setAttribute(meta,"name","META");
            core.setRegistry(meta,"isMeta",true);
            addMember(metaid,mmobjectid,'ValidChildren');
            var model = core.createNode(root);
            var modelid = storeNode(model);
            core.setRegistry(model,"isConnection",false);
            core.setRegistry(model,"position",{ "x": 0, "y": 0});
            core.setAttribute(model,"name","MODEL");
            core.setRegistry(model,"isMeta",false);
            //now we should save this and create the first commit so afterwards we will be able to connect to this project...
            var key = core.persist(root,function(err){
                if(err){
                    intransaction = false;
                    callback(err);
                } else {
                    if(!key){
                        key = core.getKey(root);
                    }

                    var initialcommit = {
                        _id     : null,
                        root    : key,
                        parents : [],
                        updates : [userstamp],
                        time    : commonUtil.timestamp(),
                        message : " - initial commit created automatically - ",
                        name    : branch,
                        type    : "commit"
                    };
                    initialcommit[KEY] = '#' + SHA1(JSON.stringify(initialcommit));

                    storage.save(initialcommit,function(err){
                        if(err){
                            intransaction = false;
                            callback(err);
                        } else {
                            //we should create the branch object so we can update it :)
                            mycommit = initialcommit;
                            storage.createBranch(branch,function(err){
                                if(err){
                                    intransaction = false;
                                    callback(err);
                                } else {
                                    //now we should be able to update the branch object
                                    intransaction = false;
                                    storage.updateBranch(branch,mycommit[KEY],callback);
                                }
                            });
                        }
                    });
                }
            });
        };
        var buildUp = function(commitid,callback){
            callback = callback || function(){};
            if(blocked){
                callback('cannot modify as now the actor is blocked!!!');
                return;
            }
            //the initializing function, here we assume that the storage connection is up and running
            //we probably have already set the UI's and the terrytories
            if(commitid){
                var tcommit = master.getCommitObj(commitid);
                if(tcommit){
                    mycommit = tcommit;
                }
            }
            var root = mycommit.root;
            var core = new ClientCore({
                storage: storage,
                logger: parameters.logger
            });
            core.loadRoot(root,function(err,rootnode){
                if(!err && rootnode){
                    currentCore = core;
                    currentRoot = root;
                    storeNode(rootnode);
                    UpdateAll(function(){
                        /*storage.load(branchId(),function(err,branchobj){
                            if(!err && branchobj){
                                if(branchobj.commit === mycommit[KEY] || branchobj.commit === null){
                                    status = 'online';
                                    storage.requestPoll(branch,poll);
                                } else {
                                    status = 'offline';
                                }
                            } else {
                                status = 'offline';
                            }
                            master.changeStatus(id,status);
                            callback();
                        });*/
                        master.getBranchesAsync(function(err,branches){
                            if(!err && branches && branches.length>0){
                                var foundbranch = false;
                                for(var i=0;i<branches.length;i++){
                                    if(branches[i].remotecommit === mycommit[KEY]){
                                        foundbranch = true;
                                        status = 'online';
                                        branch = branches[i].name;
                                        storage.requestPoll(branch,mycommit[KEY],projectPoll);
                                    } else if(branches[i].localcommit === mycommit[KEY]){
                                        foundbranch = true;
                                        status = 'offline';
                                        branch = branches[i].name;
                                    }
                                }
                                if(!foundbranch){
                                    status = 'offline';
                                    branch = mycommit.name;
                                }
                            } else {
                                branch = mycommit.name;
                                status = 'offline';
                            }
                            master.changeStatus(id,status);
                            callback();
                        });
                    });
                } else {
                    callback();
                }
            });
        };
        var commit = function(msg,callback){
            msg = msg || " - automated commit object - ";
            callback = callback || function(){};

            var commitobj = {
                _id     : null,
                root    : currentRoot,
                parents : mycommit ? [mycommit[KEY]] : [],
                updates : [userstamp],
                time    : commonUtil.timestamp(),
                message : msg,
                name    : branch,
                type    : "commit"
            };
            commitobj[KEY] = '#' + SHA1(JSON.stringify(commitobj));

            storage.save(commitobj,function(err){
                callback(err,commitobj);
            });
        };
        var simpleCommit = function(commitmsg,callback){
            if(blocked){
                callback('cannot modify as now the actor is blocked!!!');
                return;
            }
            modifyRootOnServer(commitmsg,callback);
        };
        var isReadOnly = function(){
            return readonly;
        };
        var getState = function(){
            return status;
        };

        //root management functions
        var branchId = function(){
            return "*#*"+branch;
        };
        
        // ----------

        var projectPoll = function(node) {
        	serializedStart(function() {
        		projectPollWork(node, function() {
           			serializedDone();
        		});
        	});
        };
        
        var projectPollWork = function(node, callback){
            if(status === 'online'){
                //we interested in branch info only if we think we are online
                if(node.commit !== mycommit[KEY]){
                    //we can refresh ourselves as this must be fastforwad from our change
                    storage.load(node.commit,function(err,commitobj){
                        if(!err && commitobj){
                            mycommit = commitobj;
                            newRootArrived(mycommit.root,function(){
                                storage.requestPoll(branch,mycommit[KEY],projectPoll);
                            });
                        }
                        callback();
                    });
                    return;
                } else {
                    storage.requestPoll(branch,mycommit[KEY],projectPoll);
                }
            }
            callback();
            // in other cases we do not care about this poll... must be a mistake or the last poll we requested earlier
        };

        // ----------
        
        var projectPollOld = function(node){
            if(status === 'online'){
                //we interested in branch info only if we think we are online
                if(node.commit !== mycommit[KEY]){
                    //we can refresh ourselves as this must be fastforwad from our change
                    storage.load(node.commit,function(err,commitobj){
                        if(!err && commitobj){
                            mycommit = commitobj;
                            newRootArrived(mycommit.root,function(){
                                storage.requestPoll(branch,mycommit[KEY],projectPoll);
                            });
                        }
                    });

                } else {
                    storage.requestPoll(branch,mycommit[KEY],projectPoll);
                }
            }
            // in other cases we do not care about this poll... must be a mistake or the last poll we requested earlier
        };

        //UI handling
        //these functions will go through the project proxy or master client
        var addUI = function(UI){
            users[UI.id] = UI;
            users[UI.id].PATTERNS = {};
            users[UI.id].PATHES = [];
            users[UI.id].KEYS = {};
            users[UI.id].SENDEVENTS = true;
        };
        var removeUI = function(uid){
            delete users[uid];
        };
        var updateTerritory = function(userID,patterns){
            if(users[userID] && _.isEqual(patterns,users[userID].PATTERNS)){

            }else{
                if(currentCore){
                    UpdateSingleUser(userID,patterns,function(err){
                        if(err){
                            //TODO error handling
                            users[userID].PATTERNS = JSON.parse(JSON.stringify(patterns));
                        }
                    });
                } else {
                }
            }
        };
        var disableEventToUI = function(guid){
            if(users[guid]){
                users[guid].SENDEVENTS = false;
            }
        };
        var enableEventToUI = function(guid){
            if(users[guid]){
                if(!users[guid].SENDEVENTS){
                    users[guid].SENDEVENTS = true;
                    if(currentCore){
                        UpdateSingleUser(guid,users[guid].patterns,function(err){
                            if(err){
                                //TODO error handling
                            }
                        });
                    } else {
                    }
                }
            }
        };

        var fullRefresh = function(){
            /*this call generates events to all ui with the current territory*/
            for(var i in users){
                if(users[i].ONEEVENT){
                    var events = [];
                    for(var j=0;j<users[i].PATHES.length;j++){
                        if(currentNodes[users[i].PATHES[j]]){
                            events.push({etype:'update',eid:users[i].PATHES[j]});
                        } else {
                            events.push({etype:'unload',eid:users[i].PATHES[j]});
                        }
                    }
                    users[i].UI.onOneEvent(events);
                } else {
                    for(j=0;j<users[i].PATHES.length;j++){
                        if(currentNodes[users[i].PATHES[j]]){
                            users[i].UI.onEvent('update',users[i].PATHES[j]);
                        } else {
                            users[i].UI.onEvent('unload',users[i].PATHES[j]);
                        }
                    }
                }
            }
        };

        var getNode = function(path){
            if(currentCore && currentNodes[path]){
                return new ClientNode({
                    node:currentNodes[path],
                    core:currentCore,
                    actor:{
                        getMemberIds:getMemberIds
                    }});
            }else{
                return null;
            }
        };
        var getRootKey = function(){
            if(currentCore){
                return currentCore.getKey(currentNodes["root"]);
            } else {
                return null;
            }
        };
        var getCurrentCommit = function(){
            if(mycommit){
                return mycommit[KEY];
            } else {
                return null;
            }
        };
        var getCurrentBranch = function(){
            return mycommit['name'];
        };

        /*MGA like functions*/
        var startTransaction = function(){
            if(blocked){
                return;
            }
            intransaction = true;
        };
        var completeTransaction = function(){
            if(blocked){
                return;
            }
            intransaction = false;
            modifyRootOnServer();
        };
        var setAttributes = function(path,name,value){
            if(blocked){
                return;
            }
            if(currentNodes[path]){
                if (_.isString(name)) {
                    currentCore.setAttribute(currentNodes[path],name,value);
                } else if (_.isObject(name)) {
                    //if names is object, then names is considered as name-value pairs
                    for (var i in name) {
                        if (name.hasOwnProperty(i)) {
                            currentCore.setAttribute(currentNodes[path],i,name[i]);
                        }
                    }
                }
                modifyRootOnServer();
            } else {
            }
        };
        var setRegistry = function(path,name,value){
            if(blocked){
                return;
            }
            if(currentNodes[path]){
                if (_.isString(name)) {
                    currentCore.setRegistry(currentNodes[path],name,value);
                } else if (_.isObject(name)) {
                    //if names is object, then names is considered as name-value pairs
                    for (var i in name) {
                        if (name.hasOwnProperty(i)) {
                            currentCore.setRegistry(currentNodes[path],i,name[i]);
                        }
                    }
                }
                modifyRootOnServer();
            } else {
            }
        };
        var copyNodes = function(ids){
            if(blocked){
                return;
            }
            clipboard = ids;
        };
        var pasteNodes = function(parentpath){
            if(blocked){
                return;
            }
            nuCopy(clipboard,parentpath,function(err,copyarr){
                if(err){
                    rollBackModification();
                } else {
                    modifyRootOnServer();
                }
            });
        };
        var deleteNode = function(path){
            if(blocked){
                return;
            }
            if(currentNodes[path]){
                currentCore.deleteNode(currentNodes[path]);
                modifyRootOnServer();
            } else {
            }
        };
        var delMoreNodes = function(pathes){
            if(blocked){
                return;
            }
            var i,
                candelete = [];
            for(i=0;i<pathes.length;i++){
                /*var node = self.getNode(pathes[i]);
                 if(pathes.indexOf(node.getParentId()) === -1){
                 candelete.push(true);
                 } else {
                 candelete.push(false);
                 }*/
                var parentpath = currentCore.getStringPath(currentCore.getParent(currentNodes[pathes[i]]));
                if(parentpath === ""){
                    parentpath = "root";
                }
                if(pathes.indexOf(parentpath) === -1){
                    candelete.push(true);
                } else {
                    candelete.push(false);
                }
            }
            for(i=0;i<pathes.length;i++){
                if(candelete[i]){
                    currentCore.deleteNode(currentNodes[pathes[i]]);
                }
            }
            modifyRootOnServer();
        };
        var createChild = function(parameters){
            if(blocked){
                return;
            }
            var baseId,
                child;

            if(parameters.parentId){
                baseId = parameters.baseId || "object";
                child = currentCore.createNode(currentNodes[parameters.parentId]);
                if(baseId === "connection"){
                    currentCore.setRegistry(child,"isConnection",true);
                    currentCore.setAttribute(child,"name","defaultConn");
                } else {
                    currentCore.setRegistry(child,"isConnection",false);
                    currentCore.setAttribute(child,"name", parameters.name || "defaultObj");

                    if (parameters.position) {
                        currentCore.setRegistry(child,"position", { "x": parameters.position.x || 100, "y": parameters.position.y || 100});
                    } else {
                        currentCore.setRegistry(child,"position", { "x": 100, "y": 100});
                    }
                }
                currentCore.setAttribute(child,"isPort",true);
                modifyRootOnServer();
            } else {
            }
        };
        var createSubType = function(parent,base){
            /*TODO: currently there is no inheritance so no use of this function*/
        };
        var makePointer = function(id,name,to){
            if(blocked){
                return;
            }
            if(currentNodes[id] && currentNodes[to]){
                currentCore.setPointer(currentNodes[id],name,currentNodes[to]);
                modifyRootOnServer();
            }
            else{
            }
        };
        var delPointer = function(path,name){
            if(blocked){
                return;
            }
            if(currentNodes[path]){
                currentCore.deletePointer(currentNodes[path],name);
                modifyRootOnServer();
            }
            else{
            }
        };
        var makeConnection = function(parameters){
            if(blocked){
                return;
            }
            var commands=[],
                baseId,
                connection;
            if(parameters.parentId && parameters.sourceId && parameters.targetId){
                //baseId = parameters.baseId || "connection";
                if(currentNodes[parameters.parentId] && currentNodes[parameters.sourceId] && currentNodes[parameters.targetId]){
                    connection = currentCore.createNode(currentNodes[parameters.parentId]);
                    storeNode(connection);
                    currentCore.setPointer(connection,"source",currentNodes[parameters.sourceId]);
                    currentCore.setPointer(connection,"target",currentNodes[parameters.targetId]);
                    currentCore.setAttribute(connection,"name","defaultConn");
                    currentCore.setRegistry(connection,"isConnection",true);
                    modifyRootOnServer();
                }
                else{
                }
            }
            else{
            }
        };
        var nuIntellyPaste = function(parameters){
            if(blocked){
                return;
            }
            var pathestocopy = [],
                simplepaste = true;
            if(parameters.parentId && currentNodes[parameters.parentId]){
                for(var i in parameters){
                    if(parameters.hasOwnProperty(i) && i !== "parentId"){
                        pathestocopy.push(i);
                        simplepaste = false;
                    }
                }
                if(simplepaste){
                    pathestocopy = clipboard || [];
                }

                if(pathestocopy.length < 1){
                } else if(pathestocopy.length === 1){
                    var newnode = currentCore.copyNode(currentNodes[pathestocopy[0]],currentNodes[parameters.parentId]);
                    storeNode(newnode);
                    if(parameters.hasOwnProperty(pathestocopy[0])){
                        for(var j in parameters[pathestocopy[0]].attributes){
                            currentCore.setAttribute(newnode,j,parameters[pathestocopy[0]].attributes[j]);
                        }
                        for(j in parameters[pathestocopy[0]].registry){
                            currentCore.setRegistry(newnode,j,parameters[pathestocopy[0]].registry[j]);
                        }
                    }
                    modifyRootOnServer();
                } else {
                    nuCopy(pathestocopy,parameters.parentId,function(err,copyarr){
                        if(err){
                            rollBackModification();
                        }
                        else{
                            for(var i in copyarr){
                                if(copyarr.hasOwnProperty(i) && parameters.hasOwnProperty(i)){
                                    for(var j in parameters[i].attributes){
                                        currentCore.setAttribute(copyarr[i],j,parameters[i].attributes[j]);
                                    }
                                    for(j in parameters[i].registry){
                                        currentCore.setRegistry(copyarr[i],j,parameters[i].registry[j]);
                                    }
                                }
                            }
                            modifyRootOnServer();
                        }
                    });
                }
            } else {
                console.log('wrong parameters in intelligent paste operation - denied -');
            }
        };

        //set functions and their helping methods
        var addMember = function(path,memberpath,setname){
            if(blocked){
                return;
            }
            setname = RELFROMSET(setname);
            if(currentNodes[path] && currentNodes[memberpath]){
                var node = currentNodes[path];
                var setindex = currentCore.getChildrenRelids(node).indexOf(setname);
                var setnode = null;
                if(setindex === -1){
                    setnode = currentCore.createNode(node,setname);
                    storeNode(setnode);
                } else {
                    setnode = currentNodes[currentCore.getChildrenPaths(node)[setindex]];
                }
                //we should have the setnode at this point otherwise, it is not loaded so we fail
                if(setnode){
                    var setmembers = currentCore.getChildrenPaths(setnode);
                    var alreadyin = false;
                    for(var i=0;i<setmembers.length;i++){
                        if(currentNodes[setmembers[i]]){
                            if(currentCore.getPointerPath(currentNodes[setmembers[i]],'member') === memberpath){
                                alreadyin = true;
                                break;
                            }
                        }
                    }
                    if(!alreadyin){
                        var newmember = currentCore.createNode(setnode);
                        storeNode(newmember);
                        currentCore.setPointer(newmember,'member',currentNodes[memberpath]);
                        modifyRootOnServer('addMember');
                    } else {
                        console.log('member is already in the given set');
                    }
                } else {
                    console.log('cannot load or create the asked set');
                }

            } else {
                console.log('the member of the set owner is missing');
            }
        };
        var removeMember = function(path,memberpath,setname){
            if(blocked){
                return;
            }
            setname = RELFROMSET(setname);
            if(currentNodes[path] && currentNodes[memberpath]){
                var node = currentNodes[path];
                var setindex = currentCore.getChildrenRelids(node).indexOf(setname);
                if(setindex > -1){
                    var setnode = currentNodes[currentCore.getChildrenPaths(node)[setindex]];
                    if(setnode){
                        var setmembers = currentCore.getChildrenPaths(setnode);
                        var intheset = false;
                        for(var i=0;i<setmembers.length;i++){
                            if(currentNodes[setmembers[i]]){
                                if(currentCore.getPointerPath(currentNodes[setmembers[i]],'member') === memberpath){
                                    currentCore.deleteNode(currentNodes[setmembers[i]]);
                                    intheset = true;
                                }
                            }
                        }
                        if(intheset){
                            if(setmembers.length === 1){
                                //TODO why it causes assertion???
                                //currentCore.deleteNode(setnode);
                            }
                            modifyRootOnServer('removeMember');
                        } else {
                            console.log('there were no such member found');
                        }
                    } else {
                        console.log('the given set is not fully loaded');
                    }
                } else {
                    console.log('there is no given set');
                }
            } else {
                console.log('either set owner or set member is missing');
            }
        };
        var getMemberIds = function(path, setid){
            setid = setid || MINSETID;
            if(currentNodes[path]){
                var setindex = currentCore.getChildrenRelids(currentNodes[path]).indexOf(setid);
                if(setindex > -1){
                    var setnode = currentNodes[currentCore.getChildrenPaths(currentNodes[path])[setindex]];
                    if(setnode){
                        var setmembers = currentCore.getChildrenPaths(setnode);
                        var memberids = [];
                        for(var i=0;i<setmembers.length;i++){
                            if(currentNodes[setmembers[i]]){
                                var member = currentCore.getPointerPath(currentNodes[setmembers[i]],'member');
                                if(member){
                                    memberids.push(member);
                                } else {
                                    console.log('not used member child !!!');
                                }
                            } else {
                                return null; //as the set is not fully loaded
                            }
                        }
                        return memberids;
                    } else {
                        return null; //as the set is not fully loaded
                    }
                } else {
                    return []; //it is an empty set as it is not created yet
                }
            } else {
                return null;
            }
        };

        /*helping funcitons*/
        var newRootArrived = function(roothash,callback){
            callback = callback || function(){};
            if(currentRoot !== roothash){
                var oldroot = currentRoot;
                currentRoot = roothash;
                var tempcore = new ClientCore({
                    storage : storage,
                    logger : parameters.logger
                });
                tempcore.loadRoot(roothash,function(err,node){
                    if(!err && node){
                        currentNodes = {};
                        currentCore = tempcore;
                        storeNode(node);
                        UpdateAll(callback);
                    } else {
                        currentRoot = oldroot;
                        console.log("not ready database, wait for new root");
                    }
                });
            } else {
                callback();
            }
        };
        var modifyRootOnServerOld = function(commitmsg, callback){
            callback = callback || function(){};
            if(readonly){
                callback('this is just a viewer!!!');
            } else {
                if(!intransaction){
                    var oldroot = currentRoot;
                    var newhash = currentCore.persist(currentNodes["root"],function(err){
                        if(err){
                            //TODO what is happening with our status???
                            console.log(err);
                        } else {
                            if(!newhash){
                                newhash = currentCore.getKey(currentNodes["root"]);
                            }
                            newRootArrived(newhash,function(){
                                //now we make a commit
                                commit(commitmsg,function(err,commitobj){
                                    if(!err){
                                        mycommit = commitobj;
                                        //try to update branch if we are currently online
                                        if(status === 'online'){
                                            storage.updateBranch(branch,mycommit[KEY],function(err){
                                                if(err){
                                                    //problem, so we go offline
                                                    status = 'offline';
                                                } else {
                                                    status = 'online';
                                                }
                                                master.changeStatus(id,status);
                                                callback(err);
                                            });
                                        } else {
                                            master.changeStatus(id,status);
                                            callback();
                                        }
                                    } else {
                                        //something wrong happened during commit, so go offline
                                        status = 'offline';
                                        master.changeStatus(id,status);
                                        callback(err);
                                    }
                                });
                            });
                        }
                    });
                } else {
                    callback('cannot change root during transaction!!!');
                }
            }
        };
        
        //---------

        var serializedCalls = [];
        var serializedRunning = false;
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
        
        var modifyRootOnServer = function(commitmsg, callback) {
            callback = callback || function(){};
        	serializedStart(function() {
        		modifyRootOnServerWork(commitmsg, function(err) {
        			callback(err);
        			serializedDone();
        		});
        	});
        };
        
        var modifyRootOnServerWork = function(commitmsg, callback){
            if(readonly){
                callback('this is just a viewer!!!');
            } else if(intransaction){
                callback('cannot change root during transaction!!!');
            } else {
               	var error = null, commitobj;
               	var missing = 3;
                	
               	var newhash = currentCore.persist(currentNodes["root"], function(err) {
               		error = error || err;
               		if( --missing === 0 ) {
               			alldone();
               		}
               	});
                	
               	newRootArrived(newhash, function(err) {
               		error = error || err;
               		if( --missing === 0 ) {
               			alldone();
               		}
               	});
                	
               	commit(commitmsg, function(err, obj) {
               		error = error || err;
               		commitobj = obj;
               		if( --missing === 0 ) {
               			alldone();
               		}
               	});
                	
               	var alldone = function() {
               		if(error) {
               			console.log(error);
               			if( status !== 'offline' ) {
               				status = 'offline';
                            master.changeStatus(id,status);
               			} 
               			callback(error);
               		}
               		else if( status === 'online' ){
               			storage.updateBranch(branch, commitobj[KEY], function(err) {
               				if(err) {
                       			console.log(error);
                       			if( status !== 'offline' ) {
                       				status = 'offline';
                                    master.changeStatus(id,status);
                       			} 
               				}
               				else {
                   				mycommit = commitobj;
               				}
                   			callback(err);
               			});
               		}
               	};
            }
        };

        //---------

        var rollBackModification = function(){
            currentNodes = {};
            currentCore = new LCORE(new CORE(storage),logsrv);
            currentRoot = lastValidRoot;
            currentCore.loadRoot(currentRoot,function(err,node){
                storeNode(node);
                UpdateAll(function(err){
                    if(err){
                        console.log("now something really f*cked up...");
                    }
                });
            });
        };

        var getNodePath = function(node){
            ASSERT(node);
            var path = currentCore.getStringPath(node);
            if(path === ""){
                path = "root";
            }
            return path;
        };
        var storeNode = function(node){
            var path = getNodePath(node);
            //if(!currentNodes[path]){
            if(path){
                currentNodes[path] = node;
            }
            return path;
        };
        var moveNode = function(path,parentpath){
            var node = currentNodes[path];
            var parent = currentNodes[parentpath];
            if(node && parent){
                var newnode = currentCore.moveNode(node,parent);
                var newpath = storeNode(newnode);
                delete currentNodes[path];
                return currentNodes[newpath];
            }
            else{
            }
        };

        var nuCopy = function(pathes, parentpath,callback){
            var helpArray = {},
                subPathArray = {},
                parent = currentNodes[parentpath],
                returnArray = {};

            ASSERT(parent);



            //creating the 'from' object
            var tempfrom = currentCore.createNode(parent);
            //and moving every node under it
            for(var i=0;i<pathes.length;i++){
                helpArray[pathes[i]] = {};
                helpArray[pathes[i]].origparent = currentCore.getParent(currentNodes[pathes[i]]);
                helpArray[pathes[i]].tempnode = currentCore.moveNode(currentNodes[pathes[i]],tempfrom);
                helpArray[pathes[i]].subpath = currentCore.getStringPath(helpArray[pathes[i]].tempnode,tempfrom);
                subPathArray[helpArray[pathes[i]].subpath] = pathes[i];
                delete currentNodes[pathes[i]];
            }

            //do the copy
            var tempto = currentCore.copyNode(tempfrom,parent);

            //moving back the temporary source
            for(var i=0;i<pathes.length;i++){
                helpArray[pathes[i]].node = currentCore.moveNode(helpArray[pathes[i]].tempnode,helpArray[pathes[i]].origparent);
                storeNode(helpArray[pathes[i]].node);
            }

            //gathering the destination nodes
            currentCore.loadChildren(tempto,function(err,children){
                if(!err && children && children.length>0){
                    for(i=0;i<children.length;i++){
                        var subpath = currentCore.getStringPath(children[i],tempto);
                        if(subPathArray[subpath]){
                            var newnode = currentCore.moveNode(children[i],parent);
                            storeNode(newnode);
                            returnArray[subPathArray[subpath]] = newnode;
                        } else {
                            console.log('l973 - should never happen!!!');
                        }
                    }
                    currentCore.deleteNode(tempfrom);
                    currentCore.deleteNode(tempto);
                    callback(null,returnArray);
                } else {
                    //clean up the mess and return
                    currentCore.deleteNode(tempfrom);
                    currentCore.deleteNode(tempto);
                    callback(err,{});
                }
            });
        };
        var Copy = function(pathes,parentpath,callback){
            var retarr = {},
                parent = currentNodes[parentpath];

            if(parent){
                for(var i=0;i<pathes.length;i++){
                    retarr[pathes[i]] = {};
                }
                var tempfrom = currentCore.createNode(parent);
                for(i=0;i<pathes.length;i++){
                    retarr[pathes[i]].origparent = getNodePath(currentCore.getParent(currentNodes[pathes[i]]));
                    var node = currentCore.moveNode(currentNodes[pathes[i]],tempfrom);
                    retarr[pathes[i]].fromrelid = currentCore.getStringPath(node,tempfrom);
                }
                var tempto = currentCore.copyNode(tempfrom,parent);
                currentCore.loadChildren(tempfrom,function(err,children){
                    if(err){
                        callback(err,null);
                    } else {
                        for(i=0;i<children.length;i++){
                            var index = null;
                            for(var j in retarr){
                                if(retarr[j].fromrelid === currentCore.getStringPath(children[i],tempfrom)){
                                    index = j;
                                    break;
                                }
                            }

                            if(index){
                                var node = currentCore.moveNode(children[i],currentNodes[retarr[index].origparent]);
                                retarr[index].newfrom = storeNode(node);
                                if(index !== retarr[index].newfrom){
                                    delete currentNodes[index];
                                }
                            }else{
                                callback("wrong copy",null);
                                return;
                            }
                        }
                        currentCore.loadChildren(tempto,function(err,children){
                            if(err){
                                callback(err,null);
                            } else {
                                for(i=0;i<children.length;i++){
                                    var index = null;
                                    for(var j in retarr){
                                        if(retarr[j].fromrelid === currentCore.getStringPath(children[i],tempto)){
                                            index = j;
                                            break;
                                        }
                                    }

                                    if(index){
                                        var node = currentCore.moveNode(children[i],parent);
                                        retarr[index].topath = storeNode(node);
                                    }else{
                                        callback("wrong copy",null);
                                        return;
                                    }
                                }
                                currentCore.deleteNode(tempfrom);
                                currentCore.deleteNode(tempto);
                                callback(null,retarr);
                            }
                        });
                    }
                });
            } else {
                callback("invalid parent",null);
            }
        };
        //territory related helping functions
        var addNodeToPathes = function(pathes,node){
            var id = storeNode(node);
            if(!pathes[id]){
                pathes[id] = currentCore.getSingleNodeHash(node);
            }
            return id;
        };
        var loadChildrenPattern = function(patternid,level,pathessofar,callback){
            var childcount = 0;
            var myerr = null;
            var childcallback = function(err){
                if(err){
                    console.log('childcallback '+err);
                    myerr = err;
                }
                if(--childcount === 0){
                    callback(myerr);
                }
            };
            if(level < 1 ){
                callback(null);
            } else {
                currentCore.loadChildren(currentNodes[patternid],function(err,children){
                    if(!err && children){
                        if(children.length>0){
                            var realchildids = [];
                            for(var i=0;i<children.length;i++){
                                var childid = addNodeToPathes(pathessofar,children[i]);
                                if(!ISSET(RELFROMID(childid))){
                                    realchildids.push(childid);
                                }
                            }
                            childcount = realchildids.length;
                            if(childcount > 0 ){
                                for(i=0;i<realchildids.length;i++){
                                    loadChildrenPattern(realchildids[i],level-1,pathessofar,childcallback);
                                }

                            } else {
                                callback(err);
                            }
                        } else {
                            callback(err);
                        }
                    } else {
                        callback(err);
                    }
                });
            }
        };
        var loadSetPattern = function(patternid,setid,pathessofar,callback){
            var membercount = 0;
            var finalerr = null;
            var memberloaded = function(err,member){
                if(!err && member){
                    addNodeToPathes(pathessofar,member);
                } else {
                    if(!finalerr){
                        finalerr = err;
                    }
                }
                if(--membercount === 0){
                    callback(finalerr);
                }
            };
            var setloaded = function(setnode){
                currentCore.loadChildren(setnode,function(err,setmembers){
                    if(!err && setmembers && setmembers.length>0){
                        membercount = setmembers.length;
                        for(var i=0;i<setmembers.length;i++){
                            addNodeToPathes(pathessofar,setmembers[i]);
                            currentCore.loadPointer(setmembers[i],'member',memberloaded);
                        }
                    } else {
                        callback(err);
                    }
                });
            };
            if(currentNodes[patternid]){
                var setindex = currentCore.getChildrenRelids(currentNodes[patternid]).indexOf(setid);
                if(setindex > -1){
                    var setpath = currentCore.getChildrenPaths(currentNodes[patternid])[setindex];
                    if(setpath && currentNodes[setpath]){
                        addNodeToPathes(pathessofar,currentNodes[setpath]);
                        setloaded(currentNodes[setpath]);
                    } else {
                        currentCore.loadChild(currentNodes[patternid],setid,function(err,setobject){
                            if(!err && setobject){
                                addNodeToPathes(pathessofar,setobject);
                                setloaded(setobject);
                            } else {
                                callback(err);
                            }
                        });
                    }
                } else {
                    callback(null);
                }
            } else {
                console.log('emmi???');
                callback(null);
            }
        };
        var loadPattern = function(patternid,pattern,pathessofar,callback){
            var setcounter = 0;
            var childrenLoaded = function(err){
                callback(err);
            };
            var setsloaded = function(err){
                if(err){
                    console.log('sets loaded '+err);
                }

                //after sets we load the children if needed
                if(pattern.children && pattern.children > 0){
                    loadChildrenPattern(patternid,pattern.children,pathessofar,childrenLoaded);
                } else {
                    callback(err);
                }
            };
            var setloaded = function(err){
                var myerr = null;
                if(err){
                    console.log('set loaded '+err);
                    myerr = err;
                }
                if(--setcounter === 0){
                    setsloaded(myerr);
                }
            };
            var patternRootLoaded = function(){
                //first we start with the set loading
                if(pattern.sets){
                    setcounter = commonUtil.validRealSetNames.length;
                    for(var i=0;i<commonUtil.validRealSetNames.length;i++){
                        loadSetPattern(patternid,RELFROMSET(commonUtil.validRealSetNames[i]),pathessofar,setloaded);
                    }
                } else {
                    setsloaded(null);
                }
            };
            if(currentNodes[patternid]){
                patternRootLoaded();
            } else {
                currentCore.loadByPath(currentNodes["root"],patternid,function(err,node){
                    if(!err && node){
                        addNodeToPathes(pathessofar,node);
                        patternRootLoaded();
                    }
                });
            }
        };
        var loadMetaSets = function(baseid,pathessofar,callback){
            var globalerr = null;
            var setcounter = commonUtil.validSetNames.length; //TODO we have to clear what to load and when
            var metaSetLoaded = function(err){
                if(globalerr === null){
                    globalerr = err;
                }
                if(--setcounter === 0){
                    callback(globalerr);
                }
            };
            //start
            for(var i=0;i<commonUtil.validSetNames.length;i++){
                loadSetPattern(baseid,RELFROMSET(commonUtil.validSetNames[i]),pathessofar,metaSetLoaded);
            }
        };
        var loadMetaInfo = function(pathessofar,callback){
            var pathesNeedMeta = [];
            for(var i in pathessofar){
                pathesNeedMeta.push(i);
            }
            var globalerr = null;
            var counter = pathesNeedMeta.length;
            var metaLoaded = function(err){
                if(!globalerr){
                    globalerr = err;
                }
                if(--counter === 0){
                    callback(globalerr);
                }
            };
            for(i=0;i<pathesNeedMeta.length;i++){
                loadMetaSets(pathesNeedMeta[i],pathessofar,metaLoaded);
            }
            if(pathesNeedMeta.length === 0){
                callback(null);
            }
        };
        var Loading = function(callback){
            var nupathes = {};
            var combinePatterns = function(patternone,patterntwo){
                var resultpattern = {};
                if(patternone.sets || patterntwo.sets){
                    resultpattern.sets = true;
                }
                if(patternone.children){
                    if(patterntwo.children){
                        resultpattern.children = patternone.children > patterntwo.children ? patternone.children : patterntwo.children;
                    } else {
                        resultpattern.children = patternone.children;
                    }
                } else {
                    resultpattern.children = patterntwo.children;
                }

                return resultpattern;
            };

            var counter = 0;
            var optimizedpatterns = {};
            var patternLoaded = function(){
                if(--counter === 0){
                    //TODO now this is a hack so it should be harmonized somehow
                    /*var innerpatternloaded = function(){
                        if(--innercounter === 0){
                            callback(nupathes);
                        }
                    };
                    var mypathes = COPY(nupathes);
                    var innercounter = 0;
                    for(var i in nupathes){
                        innercounter++;
                    }
                    if(innercounter>0){
                        for(var i in mypathes){
                            loadPattern(i,{sets:true},nupathes,innerpatternloaded);
                        }
                    } else {
                        innercounter = 1;
                        innerpatternloaded();
                    }*/
                    callback(nupathes);
                }
            };

            for(var i in users){
                for(var j in users[i].PATTERNS){
                    if(optimizedpatterns[j]){
                        optimizedpatterns[j] = combinePatterns(optimizedpatterns[j],users[i].PATTERNS[j]);
                    } else {
                        optimizedpatterns[j] = users[i].PATTERNS[j];
                        counter++;
                    }
                }
            }
            if(counter>0){
                for(i in optimizedpatterns){
                    loadPattern(i,{children:optimizedpatterns[i].children},nupathes,patternLoaded);
                }
            } else {
                callback(nupathes);
            }

        };
        var reLoading2 = function(callback){
            if(currentCore && currentCore.getVersion() === 3){
                callback();
            } else {
                var parentpathes = {};
                var elemcount = 0;
                //building parentpathes array
                for(var i in currentNodes){
                    var ppath = getNode(i).getParentId();
                    if(ppath !== null && ppath !== 'root' && !parentpathes[ppath]){
                        parentpathes[ppath] = true;
                        elemcount++;
                    }
                }

                //now clearing everything and loading with only usage of loadchildren
                if(elemcount>0){
                    elemcount++;
                    currentNodes = {};
                    var childrenLoaded = function(err,children){
                        if(!err && children && children.length>0){
                            for(var i=0;i<children.length;i++){
                                var id = storeNode(children[i]);
                                if(parentpathes[id]){
                                    currentCore.loadChildren(children[i],childrenLoaded);
                                }
                            }
                        }
                        if(--elemcount === 0){
                            callback();
                        }
                    };

                    currentCore.loadRoot(currentRoot,function(err,root){
                        if(!err && root){
                            storeNode(root);
                            currentCore.loadChildren(root,childrenLoaded);
                        } else {
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            }
        };
        var checkReLoading = function(pathestocompare){
            for(var i in pathestocompare){
                if(!currentNodes[i]){
                    return false;
                }
            }
            return true;
        };
        var UpdateUser = function(user,patterns,nupathes){
            var newpathes = [];
            var events = [];
            var addChildrenPathes = function(level,path){
                var node = getNode(path);
                if(level>0 && node){
                    var children = node.getChildrenIds();
                    for(var i=0;i<children.length;i++){
                        INSERTARR(newpathes,children[i]);
                        addChildrenPathes(level-1,children[i]);
                    }
                }
            };
            var addMetaSetPathes = function(path){
                var node = getNode(path);
                var sets = node.getSetIds();
                for(var i=0;i<sets.length;i++){
                    var setnode = getNode(sets[i]);
                    INSERTARR(newpathes,sets[i]);
                }
            };
            var addSetPathes = function(path,needmembers){
                if(needmembers){
                    var node = getNode(path);
                    var setnames = node.getSetNames();
                    for(i=0;i<setnames.length;i++){
                        var setmembers = node.getMemberIds(setnames[i]);
                        for(var j=0;j<setmembers.length;j++){
                            INSERTARR(newpathes,setmembers[j]);
                        }
                    }
                }
            };

            user.PATTERNS = COPY(patterns);
            if(user.SENDEVENTS){
                for(var i in user.PATTERNS){
                    INSERTARR(newpathes,i);
                    var patternode = getNode(i);
                    //check the type of patterns and then put the needed pathes to the array
                    if(patterns[i].children && patterns[i].children>0){
                        addChildrenPathes(patterns[i].children,i);
                    }
                    addSetPathes(i,patterns[i].sets);
                }
                //adding all the sets to the checked pathes
                var temparray = [];
                for(i=0;i<newpathes.length;i++){
                    temparray.push(newpathes[i]);
                }
                for(i=0;i<temparray.length;i++){
                    addMetaSetPathes(temparray[i]);
                }

                //we know the paths
                //generating events
                //unload
                for(i=0;i<user.PATHES.length;i++){
                    if(newpathes.indexOf(user.PATHES[i]) === -1){
                        events.push({etype:"unload",eid:user.PATHES[i]});
                    }
                }

                //others
                for(i=0;i<newpathes.length;i++){
                    if(user.PATHES.indexOf(newpathes[i]) === -1){
                        events.push({etype:"load",eid:newpathes[i]});
                    }
                    else{
                        if(user.KEYS[newpathes[i]] !== nupathes[newpathes[i]]){
                            events.push({etype:"update",eid:newpathes[i]});
                        }
                    }
                    user.KEYS[newpathes[i]] = nupathes[newpathes[i]];
                }

                //we have to store the pathes before we sent out the events
                user.PATHES = newpathes;

                //we need to postprocesses our events as they probably contain setelements where they should contain only the set owner
                var eventstoadd = {};
                for(i=events.length-1;i>=0;i--){
                    var pathnode = getNode(events[i].eid);
                    if(pathnode && pathnode.isSetNode()){
                        eventstoadd[pathnode.getParentId()] = true;
                        events.splice(i,1);
                    }
                }
                //now we search wether the setowner is already among the events
                for(i=0;i<events.length;i++){
                    if(eventstoadd[events[i].eid]){
                        delete eventstoadd[events[i].eid];
                    }
                }
                //and we add the rest as update
                for(i in eventstoadd){
                    events.push({etype:'update',eid:i});
                }

                //depending on the oneevent attribute we send it in one array or in events...
                if(events.length>0){
                    if(user.ONEEVENT){
                        user.UI.onOneEvent(events);
                    }
                    else{
                        for(i=0;i<events.length;i++){
                            user.UI.onEvent(events[i].etype,events[i].eid);
                        }
                    }
                }
            }
        };
        var UpdateTerritory = function(user,patterns,nupathes,callback){
            if(user.PATTERNS !== patterns){
                var counter = 0;
                var limit = 0;
                var patternLoaded = function(){
                    if(--counter === 0){
                        //TODO same hack as in loading for loading sets
                        loadMetaInfo(nupathes,function(err){
                            reLoading2(function(){
                                checkReLoading(nupathes);
                                callback(nupathes);
                            });
                            //callback(nupathes);
                        });
                    }
                };

                for(var i in patterns){
                    counter++;
                }
                if(counter>0){
                    for(i in patterns){
                        loadPattern(i,patterns[i],nupathes,patternLoaded);
                    }
                } else {
                    callback(nupathes);
                }
            } else {
                callback(nupathes);
            }
        };
        var UpdateAll = function(callback){
            Loading(function(nupathes){
                loadMetaInfo(nupathes,function(err){
                    currentNupathes = nupathes;
                    reLoading2(function(){
                        checkReLoading(nupathes);
                        for(var i in users){
                            UpdateUser(users[i],users[i].PATTERNS,nupathes);
                        }
                        callback();
                    });
                });
            });
        };
        var UpdateSingleUser = function(userID,patterns,callback){
            UpdateTerritory(users[userID],patterns,currentNupathes,function(nupathes){
                UpdateUser(users[userID],patterns,nupathes);
                callback();
            });
        };

        return {
            //functios to master
            goOffline    : goOffline,
            goOnline     : goOnline,
            networkError : networkError,
            createEmpty  : createEmpty,
            buildUp      : buildUp,
            dismantle    : dismantle,
            commit       : simpleCommit,
            isReadOnly   : isReadOnly,
            getState     : getState,
            //UI handling
            addUI            : addUI,
            removeUI         : removeUI,
            disableEventToUI : disableEventToUI,
            enableEventToUI  : enableEventToUI,
            updateTerritory  : updateTerritory,
            fullRefresh      : fullRefresh,
            //nodes to UI
            getNode          : getNode,
            getRootKey       : getRootKey,
            getCurrentCommit : getCurrentCommit,
            getCurrentBranch : getCurrentBranch,
            //MGAlike
            startTransaction    : startTransaction,
            completeTransaction : completeTransaction,
            setAttributes       : setAttributes,
            setRegistry         : setRegistry,
            copyNodes           : copyNodes,
            pasteNodes          : pasteNodes,
            deleteNode          : deleteNode,
            delMoreNodes        : delMoreNodes,
            createChild         : createChild,
            createSubType       : createSubType,
            makePointer         : makePointer,
            delPointer          : delPointer,
            makeConnection      : makeConnection,
            intellyPaste        : nuIntellyPaste,
            //MGAlike - set
            addMember    : addMember,
            removeMember : removeMember
        };
    };

    return ClientProject;
});
