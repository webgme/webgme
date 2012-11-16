define([
    'js/Client/ClientLogCore',
    'core/lib/sha1',
    'common/commonUtil',
    'js/Client/ClientNode',
    'js/Client/ClientMeta'],
    function(ClientCore,SHA1,commonUtil,ClientNode,ClientMeta){
    'use strict';
    var KEY = "_id";
    var INSERTARR = commonUtil.insertIntoArray;
    var ClientProject = function(parameters){ //it represents one working copy of a project attached to a given branch of the project
        var storage = parameters.storage, //the storage of the project
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
            meta = new ClientMeta(master),
            status = null,
            intransaction = false;

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
        var goOnline = function(){
            //TODO what we should do here???
        };
        var buildUp = function(callback){
            callback = callback || function(){};
            //the initializing function, here we assume that the storage connection is up and running
            //we probably have already set the UI's and the terrytories
            var root = mycommit.root;
            var core = new ClientCore({
                storage: storage,
                logger: null
            });
            core.loadRoot(root,function(err,rootnode){
                if(!err && rootnode){
                    currentCore = core;
                    currentRoot = root;
                    storeNode(rootnode);
                    UpdateAll(function(){
                        storage.load(branchId(),function(err,branchobj){
                            if(!err && branchobj){
                                if(branchobj.commit === mycommit[KEY]){
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
                        });
                    });
                } else {
                    callback();
                }
            });
        };
        var commit = function(callback){
            callback = callback || function(){};

            var commitobj = {
                _id     : null,
                root    : currentRoot,
                parents : [mycommit[KEY]],
                updates : [userstamp],
                time    : commonUtil.timestamp(),
                message : " - automated commit object - ",
                name    : branch,
                type    : "commit"
            };
            commitobj[KEY] = '#' + SHA1(JSON.stringify(commitobj));

            storage.save(commitobj,function(err){
                callback(err,commitobj);
            });
        };

        //root management functions
        var branchId = function(){
            return "*#*"+branch;
        };
        var poll = function(node){
            if(status === 'online'){
                //we interested in branch info only if we think we are online
                storage.requestPoll(branch,poll);
                if(node.commit !== mycommit[KEY]){
                    //we can refresh ourselves as this must be fastforwad from our change
                    storage.load(node.commit,function(err,commitobj){
                        if(!err && commitobj){
                            mycommit = commitobj;
                            newRootArrived(mycommit.root);
                        }
                    });

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
            if(_.isEqual(patterns,users[userID].PATTERNS)){

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
                        events.push({etype:'update',eid:users[i].PATHES[j]});
                    }
                    users[i].UI.onOneEvent(events);
                } else {
                    for(var j=0;j<users[i].PATHES.length;j++){
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
                return new ClientNode(currentNodes[path],currentCore,meta);
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
            return mycommit[KEY];
        };

        /*MGA like functions*/
        var startTransaction = function(){
            intransaction = true;
        };
        var completeTransaction = function(){
            intransaction = false;
            modifyRootOnServer();
        };
        var setAttributes = function(path,name,value){
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
            clipboard = ids;
        };
        var pasteNodes = function(parentpath){
            Copy(clipboard,parentpath,function(err,copyarr){
                if(err){
                    rollBackModification();
                } else {
                    modifyRootOnServer();
                }
            });
        };
        var deleteNode = function(path){
            if(currentNodes[path]){
                currentCore.deleteNode(currentNodes[path]);
                modifyRootOnServer();
            } else {
            }
        };
        var delMoreNodes = function(pathes){
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
            if(currentNodes[id] && currentNodes[to]){
                currentCore.setPointer(currentNodes[id],name,currentNodes[to]);
                modifyRootOnServer();
            }
            else{
            }
        };
        var delPointer = function(path,name){
            if(currentNodes[path]){
                currentCore.deletePointer(currentNodes[path],name);
                modifyRootOnServer();
            }
            else{
            }
        };
        var makeConnection = function(parameters){
            var commands=[],
                baseId,
                connection;
            if(parameters.parentId && parameters.sourceId && parameters.targetId){
                baseId = parameters.baseId || "connection";
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
        var intellyPaste = function(parameters){
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
                    Copy(pathestocopy,parameters.parentId,function(err,copyarr){
                        if(err){
                            rollBackModification();
                        }
                        else{
                            for(var i in copyarr){
                                if(copyarr.hasOwnProperty(i) && parameters.hasOwnProperty(i)){
                                    for(var j in parameters[i].attributes){
                                        currentCore.setAttribute(currentNodes[copyarr[i].topath],j,parameters[i].attributes[j]);
                                    }
                                    for(j in parameters[i].registry){
                                        currentCore.setRegistry(currentNodes[copyarr[i].topath],j,parameters[i].registry[j]);
                                    }
                                }
                            }
                            modifyRootOnServer();
                        }
                    });
                }
            } else{
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
                    logger : null
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
            }
        };
        var modifyRootOnServer = function(){
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
                            commit(function(err,commitobj){
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
                                        });
                                    }
                                } else {
                                    //something wrong happened during commit, so go offline
                                    status = 'offline';
                                    master.changeStatus(id,status);
                                }
                            });
                        });
                    }
                });
            }
        };
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
            var path = currentCore.getStringPath(node);
            if(path === ""){
                path = "root";
            }
            return path;
        };
        var storeNode = function(node){
            var path = getNodePath(node);
            if(!currentNodes[path]){
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
                                retarr[index].newfrom = storeNode(node);;
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
        var Loading = function(callback){
            var patterns = [];
            var nupathes = {};

            var counter = 0;
            var patternLoaded = function(){
                if(++counter === patterns.length){
                    callback(nupathes);
                }
            };
            var addToNupathes = function(node){
                var id = storeNode(node);
                if(!nupathes[id]){
                    nupathes[id] = currentCore.getSingleNodeHash(node);
                }
            };
            var loadPattern = function(basepath,internalcallback){
                if(!currentNodes[basepath]){
                    currentCore.loadByPath(currentNodes["root"],basepath,function(err,node){
                        if(!err && node){
                            addToNupathes(node);
                            currentCore.loadChildren(node,function(err,children){
                                if(!err && children){
                                    for(var i=0;i<children.length;i++){
                                        addToNupathes(children[i]);
                                    }
                                }
                                internalcallback();
                            });
                        } else {
                            internalcallback();
                        }
                    });
                } else {
                    addToNupathes(currentNodes[basepath]);
                    currentCore.loadChildren(currentNodes[basepath],function(err,children){
                        if(!err && children){
                            for(var i=0;i<children.length;i++){
                                addToNupathes(children[i]);
                            }
                        }
                        internalcallback();
                    });
                }
            };


            for(var i in users){
                for(var j in users[i].PATTERNS){
                    INSERTARR(patterns,j);
                }
            }
            if(patterns.length === 0){
                callback(nupathes);
            } else {
                for(i=0;i<patterns.length;i++){
                    loadPattern(patterns[i],patternLoaded);
                }
            }
        };
        var UpdateUser = function(user,patterns,nupathes){
            var newpathes = [];
            var events = [];
            user.PATTERNS = JSON.parse(JSON.stringify(patterns));
            if(user.SENDEVENTS){
                for(i in patterns){
                    if(currentNodes[i]){
                        INSERTARR(newpathes,i);
                        var children  = currentCore.getChildrenRelids(currentNodes[i]);
                        var ownpath = i === "root" ? "" : i+"/";
                        for(var j=0;j<children.length;j++){
                            INSERTARR(newpathes,ownpath+children[j]);
                        }
                    }
                }

                /*generating events*/
                /*unload*/
                for(var i=0;i<user.PATHES.length;i++){
                    if(newpathes.indexOf(user.PATHES[i]) === -1){
                        events.push({etype:"unload",eid:user.PATHES[i]});
                    }
                }

                /*others*/
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

                /*depending on the oneevent attribute we send it in one array or in events...*/
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

                user.PATHES = newpathes;
            }
        };
        var UpdateTerritory = function(user,patterns,nupathes,callback){
            if(user.PATTERNS !== patterns){
                var counter = 0;
                var limit = 0;
                var patternLoaded = function(){
                    if(++counter === limit){
                        callback(nupathes);
                    }
                };
                var addToNupathes = function(node){
                    var id = storeNode(node);
                    if(!nupathes[id]){
                        nupathes[id] = currentCore.getSingleNodeHash(node);
                    }
                };
                var loadPattern = function(basepath,internalcallback){
                    if(!currentNodes[basepath]){
                        if(currentCore){
                            currentCore.loadByPath(currentNodes["root"],basepath,function(err,node){
                                if(!err && node){
                                    addToNupathes(node);
                                    currentCore.loadChildren(node,function(err,children){
                                        if(!err && children){
                                            for(var i=0;i<children.length;i++){
                                                addToNupathes(children[i]);
                                            }
                                        }
                                        internalcallback();
                                    });
                                } else {
                                    internalcallback();
                                }
                            });
                        } else {
                            internalcallback();
                        }
                    } else {
                        addToNupathes(currentNodes[basepath]);
                        currentCore.loadChildren(currentNodes[basepath],function(err,children){
                            if(!err && children){
                                for(var i=0;i<children.length;i++){
                                    addToNupathes(children[i]);
                                }
                            }
                            internalcallback();
                        });
                    }
                };

                for(var i in patterns){
                    limit++;
                }
                if(limit>0){
                    for(i in patterns){
                        loadPattern(i,patternLoaded);
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
                currentNupathes = nupathes;
                for(var i in users){
                    UpdateUser(users[i],users[i].PATTERNS,nupathes);
                }
                callback();
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
            goOffline : goOffline,
            goOnline  : goOnline,
            buildUp   : buildUp,
            dismantle : dismantle,
            //UI handling
            addUI            : addUI,
            removeUI         : removeUI,
            disableEventToUI : disableEventToUI,
            enableEventToUI  : enableEventToUI,
            updateTerritory  : updateTerritory,
            fullRefresh      : fullRefresh,
            //commit
            commit       : commit,
            //nodes to UI
            getNode          : getNode,
            getRootKey       : getRootKey,
            getCurrentCommit : getCurrentCommit,
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
            intellyPaste        : intellyPaste
        }
    };

    return ClientProject;
});
