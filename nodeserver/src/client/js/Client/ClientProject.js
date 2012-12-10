define([
    'js/Client/ClientLogCore',
    'core/lib/sha1',
    'common/commonUtil',
    'js/Client/ClientNode',
    'js/Client/ClientMeta'],
    function(ClientCore,SHA1,commonUtil,ClientNode,ClientMeta){
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
        var goOnline = function(callback){
            callback = callback || function(){};
            if(status !== 'online'){
                status = 'online';
                storage.requestPoll(branch,poll);
                modifyRootOnServer("- going online -",callback);
            } else {
                callback();
            }
        };
        var networkError = function(){
            status = 'nonetwork';
            master.changeStatus(id,status);
        };
        var createEmpty = function(callback){
            var core = new ClientCore({
                storage: storage,
                logger: null
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
                            callback(err);
                        } else {
                            //we should create the branch object so we can update it :)
                            mycommit = initialcommit;
                            storage.createBranch(branch,function(err){
                                if(err){
                                    callback(err);
                                } else {
                                    //now we should be able to update the branch object
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
                        if(currentNodes[users[i].PATHES[j]]){
                            events.push({etype:'update',eid:users[i].PATHES[j]});
                        } else {
                            events.push({etype:'unload',eid:users[i].PATHES[j]});
                        }
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
            return mycommit[KEY];
        };
        var getCurrentBranch = function(){
            return mycommit['name'];
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
        var simpleCommit = function(commitmsg,callback){
            modifyRootOnServer(commitmsg,callback);
        };

        //set functions and their helping methods
        var getMemberPath = function(path,memberpath,setid){
            if(currentNodes[path] && currentNodes[memberpath]){
                var setpath = path === "root" ? setid : path+'/'+setid;
                if(currentNodes[setpath]){
                    var members = currentCore.getChildrenRelids(currentNodes[setpath]);
                    for(var i=0;i<members.length;i++){
                        var mpath = setpath + '/' + members[i];
                        if(currentNodes[mpath]){
                            if(currentCore.getPointerPath(currentNodes[mpath],'member') === memberpath){
                                return mpath;
                            };
                        }
                    }
                    return null;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        };
        var addMember = function(path,memberpath,setid){
            setid = RELFROMSET(setid);
            var addmember = function(setpath){
                var newmemberchild = currentCore.createNode(currentNodes[setpath]);
                storeNode(newmemberchild);
                currentCore.setPointer(newmemberchild,"member",currentNodes[memberpath]);
                modifyRootOnServer('addMember');
            };
            if(currentNodes[path] && currentNodes[memberpath]){
                var node = currentNodes[path];
                var children = currentCore.getChildrenRelids(node);
                var setindex = children.indexOf(setid);
                if(setindex === -1){
                    var newset = currentCore.createNode(currentNodes[path],setid);
                    storeNode(newset);
                    var setpath = path === "root" ? setid : path+'/'+setid;
                    addmember(setpath);
                } else {
                    var setpath = path === "root" ? setid : path+'/'+setid;
                    if(currentNodes[setpath]){
                        if(getMemberPath(path,memberpath,setid) === null){
                            addmember(setpath);
                        } else {
                            console.log('the member was already in the set');
                        }
                    } else {
                        console.log('the set is not fully loaded');
                    }
                }
            } else {
                console.log("the set or the member is unknown");
            }
        };
        var removeMember = function(path,memberpath,setid){
            setid = RELFROMSET(setid);
            if(currentNodes[path] && currentNodes[memberpath]){
                var mpath = getMemberPath(path,memberpath,setid);
                if(mpath){
                    currentCore.deleteNode(currentNodes[mpath]);
                    //TODO if the last member was deleted it would be good to delete the set children as well, but currently it doesn't seems to be necessary
                    modifyRootOnServer();
                } else {
                    console.log('there is no such member in the set or set at all');
                }
            } else {
                console.log('the set or the member is unknown');
            }
        };
        var getMemberIds = function(path,setid){
            setid = setid || MINSETID;
            var setpath = path === "root" ? setid : path+'/'+setid;
            if(currentNodes[setpath]){
                var memberids = [];
                var children = currentCore.getChildrenRelids(currentNodes[setpath]);
                for(var i=0;i<children.length;i++){
                    var childid = setpath+'/'+children[i];
                    if(currentNodes[childid]){
                        memberids.push(currentCore.getPointerPath(currentNodes[childid],'member'));
                    } else {
                        return null;
                    }
                }
                return memberids;
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
            } else {
                callback();
            }
        };
        var modifyRootOnServer = function(commitmsg, callback){
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
            if(currentNodes[patternid]){
                var setpath = patternid === "root" ? setid : patternid+'/'+setid;
                var membercounter = 0;
                var memberloaded = function(err,pointernode){
                    if(!err && pointernode){
                        addNodeToPathes(pathessofar,pointernode);
                    }
                    if(--membercounter === 0){
                        callback();
                    }
                };
                var setloaded = function(err,setobject){
                    if(!err){
                        addNodeToPathes(pathessofar,setobject);
                        currentCore.loadChildren(setobject,function(err2,children){
                            if(!err2 && children && children.length > 0){
                                //TODO currently we load the members, maybe this is not necessary
                                membercounter = children.length;
                                for(var i=0;i<children.length;i++){
                                    addNodeToPathes(pathessofar,children[i]);
                                    currentCore.loadPointer(children[i],'member',memberloaded);
                                }
                            } else {
                                callback(err2);
                            }
                        });
                    } else {
                        callback(err);
                    }
                };
                if(currentNodes[setpath]){
                    setloaded(null,currentNodes[setpath]);
                } else {
                    currentCore.loadChild(currentNodes[patternid],setid,function(err,setobject){
                        if(!err && setobject){
                            setloaded(null,setobject);
                        } else {
                            callback(err);
                        }
                    });
                }
            } else {
                console.log("na ezt hogy???");
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
                    setcounter = commonUtil.validSetNames.length;
                    for(var i=0;i<commonUtil.validSetNames.length;i++){
                        loadSetPattern(patternid,RELFROMSET(commonUtil.validSetNames[i]),pathessofar,setloaded);
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
                    var innerpatternloaded = function(){
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
                    }
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
        var reLoading = function(callback){
            //TODO this function ment to be only temporary to solve the multiple object problem
            //it cleans the nodes, and using only containment it loads all of them again
            var parentpathes = {};
            var haselement = false;
            //building parentpathes array
            for(var i in currentNodes){
                var ppath = getNode(i).getParentId();
                if(ppath !== null && ppath !== 'root' && !parentpathes[ppath]){
                    parentpathes[ppath] = true;
                    haselement = true;
                }
            }

            //now clearing everything and loading with only usage of loadchildren
            if(haselement){
                currentNodes = {};
                var ongoingcalls = 0;
                var childrenLoaded = function(err,children){
                    if(--ongoingcalls === 0){
                        if(err || !children || children.length===0){
                            callback();
                        }
                    } else {
                    }
                    if(!err && children && children.length>0){
                        var id0 = storeNode(children[0]);
                        var node = getNode(id0);
                        delete parentpathes[node.getParentId()];
                        var needchildren = [];
                        for(var i=0;i<children.length;i++){
                            var id = storeNode(children[i]);
                            if(parentpathes[id]){
                                ongoingcalls++;
                                needchildren.push(i);
                            }
                        }
                        if(ongoingcalls === 0){
                            callback();
                        } else {
                            for(i=0;i<needchildren.length;i++){
                                currentCore.loadChildren(children[needchildren[i]],childrenLoaded);
                            }
                        }
                    }
                };

                currentCore.loadRoot(currentRoot,function(err,root){
                    if(!err && root){
                        storeNode(root);
                        ongoingcalls++;
                        currentCore.loadChildren(root,childrenLoaded);
                    } else {
                        callback(err);
                    }
                });
            } else {
                callback();
            }
        };
        var reLoading2 = function(callback){
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
                if(level>0){
                    var children = node.getChildrenIds();
                    for(var i=0;i<children.length;i++){
                        INSERTARR(newpathes,children[i]);
                        addChildrenPathes(level-1,children[i]);
                    }
                }
            };

            user.PATTERNS = COPY(patterns);
            if(user.SENDEVENTS){
                for(i in user.PATTERNS){
                    INSERTARR(newpathes,i);
                    var patternode = getNode(i);
                    //check the type of patterns and then put the needed pathes to the array
                    if(patterns[i].children && patterns[i].children>0){
                        addChildrenPathes(patterns[i].children,i);
                    }
                    if(patterns[i].sets){
                        var setnames = patternode.getSetNames();
                        for(var i=0;i<setnames.length;i++){
                            var memberids = patternode.getMemberIds(setnames[i]);
                            for(var j=0;j<memberids.length;j++){
                                INSERTARR(newpathes,memberids[j]);
                            }
                        }
                    }
                }

                //we know the paths
                //generating events
                //unload
                for(var i=0;i<user.PATHES.length;i++){
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

                user.PATHES = newpathes;

            }
        };
        var UpdateTerritory = function(user,patterns,nupathes,callback){
            if(user.PATTERNS !== patterns){
                var counter = 0;
                var limit = 0;
                var patternLoaded = function(){
                    if(--counter === 0){
                        //TODO same hack as in oading for loading sets
                        var innercounter = 0;
                        var mypathes = COPY(nupathes);
                        var innerpatternloaded = function(){
                            if(--innercounter === 0){
                                reLoading2(function(){
                                    checkReLoading(nupathes);
                                    callback(nupathes);
                                });
                            }
                        };
                        for(var i in nupathes){
                            innercounter++;
                        }
                        if(innercounter>0){
                            for(i in mypathes){
                                loadPattern(i,{sets:true},nupathes,innerpatternloaded);
                            }
                        } else {
                            innercounter = 1;
                            innerpatternloaded();
                        }
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
                currentNupathes = nupathes;
                reLoading2(function(){
                    checkReLoading(nupathes);
                    for(var i in users){
                        UpdateUser(users[i],users[i].PATTERNS,nupathes);
                    }
                    callback();
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
            intellyPaste        : intellyPaste,
            //MGAlike - set
            addMember    : addMember,
            removeMember : removeMember
        }
    };

    return ClientProject;
});
