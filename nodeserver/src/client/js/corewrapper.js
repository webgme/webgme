define(['logManager',
        'eventDispatcher',
        'commonUtil',
        'js/socmongo',
        'core/cache',
        'core/core2',
        'js/ftstore',
        'js/logger',
        'js/logstorage',
        'js/logcore',
        'notificationManager',
        'socket.io/socket.io.js'],
        function( LogManager,
                  EventDispatcher,
                  commonUtil,
                  SM,
                  CACHE,
                  CORE,
                  FTOLST,
                  LogSrv,
                  LogST,
                  LCORE,
                  notificationManager){
    var logger,
        Client,
        CommandQueue,
        LocalCommander,
        Storage,
        ClientNode,
        ClientNode2,
        Territory;

    logger = LogManager.create("Client");
    GUID = commonUtil.guid;
    INSERTARR = commonUtil.insertIntoArray;

    var timestamp = function(){
        return ""+ (new Date()).getTime();
    };
    var elapsedTime = function(start){
        return ""+ ((new Date()).getTime()-start);
    };
    Client = function(options){
        /*Fault Tolerant Data server syncronization functions*/
        var dataOutSyncNoteId = null;
        var rootSrvOutNoteId = null;
        this.dataInSync = function(){
            if(dataOutSyncNoteId){
                notificationManager.removeStickyMessage(dataOutSyncNoteId);
                dataOutSyncNoteId = null;
            }
            dataLostSync = false;
            if(!rootServerOut && currentCore){
                rootRetry = false;
                modifyRootOnServer();
            }
        };
        this.dataOutSync = function(){
            if(dataOutSyncNoteId === null){
                dataOutSyncNoteId = notificationManager.addStickyMessage("Data is out of sync!!!");
            }
            dataLostSync = true;
        };


        var self = this,
            timelog = options.timelog ? function(info){console.log("["+timestamp()+"]"+info);} : function(info){},
            _storage = new SM({server:location.host+options.mongosrv,socketiopar:options.socketiopar}),
            realstorage = options.faulttolerant ? new FTOLST(self,_storage,"temporaryinfo") : _storage,
            cache = options.cache ? new CACHE(realstorage) : realstorage,
            logsrv = options.logging ? new LogSrv(location.host+options.logsrv) : null,
            //storage = options.logging ? new LogST(cache,logsrv) : cache,
            storage = new LogST(cache,logsrv),
            selectedObjectId = null,
            users = {},
            currentNodes = {},
            currentRoot = null,
            currentCore = null,
            currentNupathes = {},
            clipboard = [],
            rootServer = null,
            rootServerOut = false,
            dataLostSync = false,
            lastValidRoot = null,
            rootRetry = false,
            updating = false/*,
            previousNodes = {},
            previousRoot = null,
            previousCore = null*/;

        var waitfornextregistryset = false; //TODO HACK
        /*event functions to relay information between users*/
        $.extend(this, new EventDispatcher());
        this.events = {
            "SELECTEDOBJECT_CHANGED" : "SELECTEDOBJECT_CHANGED"
        };
        this.setSelectedObjectId = function ( objectId ) {
            if ( objectId !== selectedObjectId ) {
                selectedObjectId = objectId;

                self.dispatchEvent( self.events.SELECTEDOBJECT_CHANGED, selectedObjectId );
            }
        };


        /*User Interface handling*/
        this.addUI = function(ui,oneevent){
            var guid = GUID();
            var count = 0;
            for(var i in users){
                count++;
            }
            users[guid]  = {UI:ui,PATTERNS:{},PATHES:[],KEYS:{},ONEEVENT:oneevent ? true : false,SENDEVENTS:true};

            if(count === 0){
                /*in case of the first user we have to connect...*/
                storage.open(function(){
                    var firstopening = true;
                    if(rootServer === null){
                        rootServer = io.connect(location.host + options.rootsrv,options.socketiopar);
                    }
                    rootServer.on('newRoot',function(newroot){
                        if(newroot === lastValidRoot){
                            if(rootRetry){
                                rootRetry = false;
                                newRoot(newroot,true);
                            } else {
                                if( newroot !== currentRoot && !dataLostSync){
                                    rootRetry = true;
                                    modifyRootOnServer(true);
                                }
                            }
                        } else {
                            newRoot(newroot,true);
                        }
                    });
                    rootServer.on('connect',function(){
                        if(firstopening){
                            notificationManager.displayMessage("Your project is opened!");
                            firstopening = false;
                        }
                        //console.log('CONNECT - ROOTSRV');
                        if(rootServerOut){
                            rootServerOut = false;
                            if(rootSrvOutNoteId){
                                notificationManager.removeStickyMessage(rootSrvOutNoteId);
                                rootSrvOutNoteId = null;
                            }
                            if( lastValidRoot !== currentRoot && !dataLostSync){
                                modifyRootOnServer(true);
                            }
                        }
                    });
                    rootServer.on('connect_failed',function(){
                        rootServerOut = true;
                        //console.log('CONNECT_FAILED - ROOTSRV');
                        if(!rootSrvOutNoteId){
                            rootSrvOutNoteId = notificationManager.addStickyMessage("Connection to RootServer is down!!!");
                        }
                    });
                    rootServer.on('disconnect',function(){
                        rootServerOut = true;
                        //console.log('DISCONNECT - ROOTSRV');
                        if(!rootSrvOutNoteId){
                            rootSrvOutNoteId = notificationManager.addStickyMessage("Connection to RootServer is down!!!");
                        }
                    });
                    rootServer.on('reconnect_failed', function(){
                        rootServerOut = true;
                        //console.log('RECONNECT_FAILED - ROOTSRV');
                        if(!rootSrvOutNoteId){
                            rootSrvOutNoteId = notificationManager.addStickyMessage("Connection to RootServer is down!!!");
                        }
                    });
                    rootServer.on('reconnect', function(){
                        rootServerOut = true;
                        //console.log('RECONNECT - ROOTSRV');
                        if(!rootSrvOutNoteId){
                            rootSrvOutNoteId = notificationManager.addStickyMessage("Connection to RootServer is down!!!");
                        }
                    });
                    rootServer.on('reconnecting', function(){
                        rootServerOut = true;
                        //console.log('RECONNECTING - ROOTSRV');
                        if(!rootSrvOutNoteId){
                            rootSrvOutNoteId = notificationManager.addStickyMessage("Connection to RootServer is down!!!");
                        }
                    });

                });
            }
            return guid;
        };
        this.removeUI = function(guid){
            delete users[guid];
            var count = 0;
            for(var i in users){
                count++;
            }
            if(count === 0){
                storage.close();
                currentCore = null;
                currentNodes = {};
                currentRoot = null;
                clipboard = [];

            }
        };
        this.disableEventToUI = function(guid){
            if(users[guid]){
                users[guid].SENDEVENTS = false;
            }
        };
        this.enableEventToUI = function(guid){
            if(users[guid]){
                if(!users[guid].SENDEVENTS){
                    users[guid].SENDEVENTS = true;
                    nuUpdateUser(users[guid],users[guid].PATTERNS,currentNupathes);
                }
            }
        };
        this.updateTerritory = function(userID,patterns){
            if(_.isEqual(patterns,users[userID].PATTERNS)){

            }else{
                /*updateUser*/nuUpdateSingleUser(userID,patterns,function(err){
                    if(err){
                        //TODO now what the f**k
                        updateUser(userID,patterns,function(err){
                            if(err){
                                console.log("second try for update failed as well...");
                            } else {
                                logger.debug("user territory updated, but only for second try: "+userID);
                            }
                        });
                    } else {
                        logger.debug("user territory updated:"+userID);
                    }
                });
            }
        };
        this.fullRefresh = function(){
            /*this call generates events to all ui with the current territory*/
            for(var i in users){
                if(users[i].ONEEVENT){
                    var events = [];
                    for(var j=0;j<users[i].PATHES.length;j++){
                        events.push({etype:'update',eid:users[i].PATHES[j]});
                    }
                    onOneEvent(events);
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
        this.undo = function(){
            rootServer.emit('undoRoot');
        };

        /*getting a node*/
        this.getNode = function(path){
            if(currentNodes[path]){
                return new ClientNode(currentNodes[path],currentCore);
            }else{
                return null;
            }
        };

        /*MGA like functions*/
        this.setAttributes = function(path,name,value){
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
            }
            else{
                logger.error("[l122] no such object: "+path);
            }
        };
        this.setRegistry = function(path,name,value){
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
                if(!waitfornextregistryset){
                    waitfornextregistryset = true;
                }
                setTimeout(function(){
                    if(waitfornextregistryset){
                        waitfornextregistryset = false;
                        modifyRootOnServer();
                    }
                },100)
            }
            else{
                logger.error("[l92] no such object: "+path);
            }
        };
        this.copyNodes = function(ids){
            clipboard = ids;
        };
        this.pasteNodes = function(parentpath){
            nuCopy(clipboard,parentpath,function(err,copyarr){
                if(err){
                    logger.error("error during multiple paste!!! "+err);
                    rollBackModification();
                }
                else{
                    modifyRootOnServer();
                }
            });
        };
        this.deleteNode = function(path){
            if(currentNodes[path]){
                currentCore.deleteNode(currentNodes[path]);
                modifyRootOnServer();
            }
            else{
                logger.error("[l112] no such object: "+path);
            }
        };
        this.delMoreNodes = function(pathes){
            var i,
                candelete = [];
            for(i=0;i<pathes.length;i++){
                var node = self.getNode(pathes[i]);
                if(pathes.indexOf(node.getParentId()) === -1){
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
        this.createChild = function(parameters){
            var baseId,
                child;

            if(parameters.parentId){
                baseId = parameters.baseId || "object";
                child = currentCore.createNode(currentNodes[parameters.parentId]);
                if(baseId === "connection"){
                    currentCore.setRegistry(child,"isConnection",true);
                    currentCore.setAttribute(child,"name","defaultConn");
                }
                else{
                    currentCore.setRegistry(child,"isConnection",false);
                    currentCore.setRegistry(child,"position",{ "x" : Math.round(Math.random() * 100), "y":  Math.round(Math.random() * 100)});
                    currentCore.setAttribute(child,"name","defaultObj");
                }
                currentCore.setAttribute(child,"isPort",true);
                modifyRootOnServer();
            }
            else{
                logger.error("[l128]fraudulent child creation: "+JSON.stringify(parameters));
            }
        };
        this.createSubType = function(parent,base){
            /*TODO: currently there is no inheritance so no use of this function*/
        };
        this.makePointer = function(id,name,to){
            if(currentNodes[id] && currentNodes[to]){
                currentCore.setPointer(currentNodes[id],name,currentNodes[to]);
                modifyRootOnServer();
            }
            else{
                logger.error("[l144] wrong pointer creation");
            }
        };
        this.delPointer = function(path,name){
            if(currentNodes[path]){
                currentCore.deletePointer(currentNodes[path],name);
                modifyRootOnServer();
            }
            else{
                logger.error("[l144] no such object: "+path);
            }
        };
        this.makeConnection = function(parameters){
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
                    logger.error("not all object available for the connection: "+JSON.stringify(parameters));
                }
            }
            else{
                logger.error("fraudulent connection creation: "+JSON.stringify(parameters));
            }
        };
        this.intellyPaste = function(parameters){
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
                    logger.error("there is nothing to copy!!!");
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
                            logger.error("error happened during paste!!! "+err);
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
                logger.error("new parent not found!!! "+JSON.stringify(parameters));
            }
        };

        /*helping funcitons*/
        var rollBackModification = function(){
            currentNodes = {};
            //currentCore = options.logging ? new LCORE(new CORE(storage),logsrv) : new CORE(storage);
            currentCore = new LCORE(new CORE(storage),logsrv);
            currentRoot = lastValidRoot;
            currentCore.loadRoot(currentRoot,function(err,node){
                storeNode(node);
                nuUpdateAll(function(err){
                    if(err){
                        console.log("now something really f*cked up...");
                    }
                });
            });
        };
        var newRoot = function(newroot,fromserver){
            if(fromserver){
                lastValidRoot = newroot;
            }
            if(newroot !== currentRoot){
                //var tempcore = options.logging ? new LCORE(new CORE(storage),logsrv) : new CORE(storage);
                var tempcore = new LCORE(new CORE(storage),logsrv);
                tempcore.loadRoot(newroot,function(err,node){
                    if(!err && node){
                        currentRoot = newroot;
                        currentNodes = {};
                        currentCore = tempcore;
                        storeNode(node);
                        nuUpdateAll(function(err){
                            if(err){
                                //TODO now what???
                                nuUpdateAll(function(err){
                                    if(err){
                                        console.log("updating the whole user bunch failed for the second time as well...");
                                    }
                                });
                            }
                        });
                    } else {
                        console.log("not ready database, wait for new root");
                    }
                });
            }
        };
        var modifyRootOnServer = function(skippersist){
            if(currentCore){
                if(!skippersist){
                    var newkey;
                    var persistdone = function(err){
                        if(err){
                            logger.error("error during persist: "+err);
                            rollBackModification();
                        }
                        else{
                            if(newkey){
                                if(rootServer){
                                    rootServer.emit('modifyRoot',lastValidRoot,newkey);
                                }

                            } else {
                                logger.error("persist resulted in null key!!!");
                                newRoot(lastValidRoot,true);
                            }
                        }
                    };
                    newkey = currentCore.persist(currentCore.getRoot(currentNodes["root"]),function(err){
                        if(err){
                            persistdone(err);
                        } else {
                            if(newkey){
                                persistdone(null);
                            } else {
                                var timer = setInterval(function(){
                                    if(newkey){
                                        clearInterval(timer);
                                        persistdone(null);
                                    }
                                },1);
                            }
                        }
                    });
                    if(newkey){
                        newRoot(newkey,false);
                    } else {
                        var timer2 = setInterval(function(){
                            if(newkey){
                                clearInterval(timer2);
                                newRoot(newkey,false);
                            }
                        },1);
                    }
                } else {
                    rootServer.emit('modifyRoot',lastValidRoot,currentRoot);
                }
            }
            else{
                logger.error("There is no CORE!!!");
            }
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
        /*var buildTerritory = function(userID,patterns,callback){
            var start = timestamp();
            timelog("[MEAS002][in]["+userID+"]");
            var i;
            var pathes = [];
            var counter = 0;

            var loaddone = function(){
                if(--counter === 0){
                    timelog("[MEAS002][out]["+userID+"]{"+elapsedTime(start)+"ms}");
                    if(callback){
                        callback(null,pathes);
                    }
                }
            };
            var loadpath = function(path,childrenaswell){
                var pathloaded = function(err,node){
                    if(err || node === undefined || node === null){
                        //console.log("something wrong with the path: "+path+"  - error: "+err);
                        if(callback){
                            var cb = callback;
                            callback = null;
                            cb(err || "empty object returned");
                        }
                    } else {
                        var mypath = storeNode(node);

                        INSERTARR(pathes,mypath);
                        if(childrenaswell){
                            currentCore.loadChildren(node,function(err,children){
                                if(!err){
                                    for(var i=0;i<children.length;i++){
                                        var childpath = storeNode(children[i]);
                                        INSERTARR(pathes,childpath);
                                    }
                                    loaddone();
                                } else {
                                    if(callback){
                                        var cb = callback;
                                        callback = null;
                                        cb(err);
                                    }
                                }
                            });
                        }
                        else{
                            loaddone();
                        }
                    }
                };
                if(currentNodes[path]){
                    pathloaded(null,currentNodes[path]);
                }
                else{
                    currentCore.loadByPath(currentNodes["root"],path,pathloaded);
                }
            };

            counter = 0;
            for(i in patterns){
                if(patterns.hasOwnProperty(i)){
                    counter++;
                }
            }
            if(counter>0){
                for(i in patterns){
                    if(patterns.hasOwnProperty(i)){
                        loadpath(i,patterns[i].children !== undefined);
                    }
                }
            } else {
                if(callback){
                    callback(null,[]);
                }
            }
        };*/
        var generateTerritoryEvents = function(userID,newpathes){
            var start = timestamp();
            timelog("[MEAS003][in]["+userID+"]");
            var user = users[userID];
            var events = [];
            /*unload*/
            for(var i=0;i<user.PATHES.length;i++){
                if(newpathes.indexOf(user.PATHES[i]) === -1){
                    events.push({etype:"unload",eid:user.PATHES[i]});
                }
            }

            /*others*/
            for(i=0;i<newpathes.length;i++){
                var newkey = currentCore.getSingleNodeHash(currentNodes[newpathes[i]]);
                if(user.PATHES.indexOf(newpathes[i]) === -1){
                    events.push({etype:"load",eid:newpathes[i]});
                }
                else{
                    if(user.KEYS[newpathes[i]] !== newkey){
                        events.push({etype:"update",eid:newpathes[i]});
                    }
                }
                user.KEYS[newpathes[i]] = newkey;
            }

            /*depending on the oneevent attribute we send it in one array or in events...*/
            if(user.ONEEVENT){
                user.UI.onOneEvent(events);
            }
            else{
                for(i=0;i<events.length;i++){
                    user.UI.onEvent(events[i].etype,events[i].eid);
                }
            }
            timelog("[MEAS003][out]["+userID+"]{"+elapsedTime(start)+"ms}");
        };
        /*var updateUser = function(userID,patterns,callback){
            var start = timestamp();
            timelog("[MEAS001][in]["+userID+"]");
            users[userID].PATTERNS = JSON.parse(JSON.stringify(patterns));
            if(currentCore){
                buildTerritory(userID,patterns,function(err,newpathes){
                    if(err){
                        if(callback){
                            var cb = callback;
                            callback = null;
                            cb(err);
                        }
                    } else {
                        generateTerritoryEvents(userID,newpathes);
                        users[userID].PATHES = newpathes;
                        timelog("[MEAS001][out]["+userID+"]{"+elapsedTime(start)+"ms}");
                        if(callback){
                            callback();
                        }
                    }
                });
            }
            else{
                logger.debug("we do not have root yet...");
            }
        };*/
        /*var updateAllUser = function(callback){
            var start = timestamp();
            timelog("[MEAS000][in]");
            var counter = 0;
            var userupdated = function(err){
                if(err){
                    if(callback){
                        var cb = callback;
                        callback = null;
                        cb(err);
                    }
                } else {
                    if(--counter === 0){
                        timelog("[MEAS000][out]{"+elapsedTime(start)+"ms}");
                        if(callback){
                            callback();
                        }
                    }
                }
            };

            for(var i in users){
                if(users.hasOwnProperty(i)){
                    counter++;
                }
            }
            if(counter>0){
                for(i in users){
                    if(users.hasOwnProperty(i)){
                        updateUser(i,users[i].PATTERNS,userupdated);
                    }
                }
            } else {
                if(callback){
                    callback();
                }
            }
        };*/
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
                logger.error("missing object for move!!!");
            }
        };
        var nuCopy = function(pathes,parentpath,callback){
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
                        logger.error("original nodes unreachable: "+err);
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
                                logger.error("copy lost original children");
                                callback("wrong copy",null);
                                return;
                            }
                        }
                        currentCore.loadChildren(tempto,function(err,children){
                            if(err){
                                logger.error("cannot load copied children: "+err);
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
                                        logger.error("copy resulted in wrong children");
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
                logger.error("invalid parent in multiCopy");
                callback("invalid parent",null);
            }
        };

        var nuLoading = function(callback){
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
            for(i=0;i<patterns.length;i++){
                loadPattern(patterns[i],patternLoaded);
            }
        };
        var nuUpdateUser = function(user,patterns,nupathes){
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
                if(user.ONEEVENT){
                    user.UI.onOneEvent(events);
                }
                else{
                    for(i=0;i<events.length;i++){
                        user.UI.onEvent(events[i].etype,events[i].eid);
                    }
                }

                user.PATHES = newpathes;
            }
        };
        var nuUpdateTerritory = function(user,patterns,nupathes,callback){
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
        var nuUpdateAll = function(callback){
            var start = timestamp();
            timelog("[NMEAS000][in]");
            nuLoading(function(nupathes){
                currentNupathes = nupathes;
                for(var i in users){
                    nuUpdateUser(users[i],users[i].PATTERNS,nupathes);
                }
                timelog("[NMEAS000][out]{"+elapsedTime(start)+"ms}");
                callback();
            });
        };
        var nuUpdateSingleUser = function(userID,patterns,callback){
            var start = timestamp();
            timelog("[NMEAS001][in]["+userID+"]");
            nuUpdateTerritory(users[userID],patterns,currentNupathes,function(nupathes){
                nuUpdateUser(users[userID],patterns,nupathes);
                timelog("[NMEAS001][out]["+userID+"]{"+elapsedTime(start)+"ms}");
                callback();
            });
        };
    };
    ClientNode = function(node,core){
        var ownpath = core.getStringPath(node);
        this.getParentId = function(){
            var parent = core.getParent(node);
            if(parent){
                return getNodePath(parent);
            } else {
                return null;
            }
        };
        this.getId = function(){
            return getNodePath(node);
        };
        this.getChildrenIds = function(){
            var children = core.getChildrenRelids(node);
            ownpath += ownpath === "" ? "" : "/";
            for(var i=0;i<children.length;i++){
                children[i]=ownpath+children[i];
            }
            return children;
        };
        this.getBaseId = function(){
            /*return null;*/
            if(core.getRegistry(node,"isConnection") === true){
                return "connection";
            } else {
                return "object";
            }
        };
        this.getInheritorIds = function(){
            return null;
        };
        this.getAttribute = function(name){
            return core.getAttribute(node,name);
        };
        this.getRegistry = function(name){
            return core.getRegistry(node,name);
        };
        this.getPointer = function(name){
            return {to:core.getPointerPath(node,name),from:[]};
        };
        this.getPointerNames = function(){
            return core.getPointerNames(node);
        };
        this.getConnectionList = function(){
            return [];
        };
        this.getAttributeNames = function(){
            return core.getAttributeNames(node);
        };

        var getNodePath = function(node){
            var path = core.getStringPath(node);
            if(path === ""){
                path = "root";
            }
            return path;
        };

    };
    return Client;
});

