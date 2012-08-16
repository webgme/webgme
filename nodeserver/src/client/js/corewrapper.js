define(['logManager','eventDispatcher', 'commonUtil', 'js/socmongo','core/cache','core/core2','socket.io/socket.io.js'],function(LogManager, EventDispatcher, commonUtil,SM,CACHE,CORE){
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

    Client = function(options){
        var self = this,
            _storage = new SM(options),
            storage = new CACHE(_storage),
            selectedObjectId = null,
            users = {},
            currentNodes = {},
            currentRoot = null,
            currentCore = null,
            clipboard = null,
            rootServer = null,
            pendingRoot = null,
            updating = false/*,
            previousNodes = {},
            previousRoot = null,
            previousCore = null*/;

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
            if(count === 0){
                /*in case of the first user we have to connect...*/
                storage.open(function(){
                    rootServer = io.connect(options.rootsrv);
                    rootServer.on('newRoot',function(newroot){
                        newRoot(newroot);
                    });
                });
            }
            users[guid]  = {UI:ui,PATTERNS:{},PATHES:[],KEYS:{},ONEEVENT:oneevent ? true : false};
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
                clipboard = null;

            }
        };
        this.updateTerritory = function(userID,patterns){
            if(_.isEqual(patterns,users[userID].PATTERNS)){

            }else{
                updateUser(userID,patterns,function(){
                    logger.debug("user territory updated:"+userID);
                });
            }
        };
        this.fullRefresh = function(){
            /*this call generates events to all ui with the current territory*/
            for(var i in users){
                for(var j=0;j<users[i].PATHES.length;j++){
                    users[i].UI.onEvent('update',users[i].PATHES[j]);
                }
            }
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
                modifyRootOnServer(currentNodes[path]);
            }
            else{
                logger.error("[l92] no such object: "+path);
            }
        };
        this.copyNodes = function(ids){
            clipboard = ids;
        };
        this.pasteNodes = function(parentpath){
            copyMultiplePathes(clipboard,parentpath,function(err,copyarr){
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
            var i;
            for(i=0;i<pathes.length;i++){
                currentCore.deleteNode(currentNodes[pathes[i]]);
            }
            modifyRootOnServer();
        };
        this.createChild = function(parameters){
            var baseId,
                child;

            if(parameters.parentId){
                baseId = parameters.baseId || "object";
                child = currentCore.createNode(currentNodes[parameters.parentId]);
                currentCore.setAttribute(child,"BASE",baseId);
                if(baseId === "connection"){
                    currentCore.setRegistry(child,"isConnection",true);
                    currentCore.setAttribute(child,"name","defaultConn");
                }
                else{
                    currentCore.setRegistry(child,"isConnection",false);
                    currentCore.setRegistry(child,"position",{ "x" : Math.round(Math.random() * 1000), "y":  Math.round(Math.random() * 1000)});
                    currentCore.setAttribute(child,"name","defaultObj");
                }
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
                    currentCore.setAttribute(connection,"BASE",baseId);
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
                    pathestocopy = clipboard;
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
                    copyMultiplePathes(pathestocopy,parameters.parentId,function(err,copyarr){
                        if(err){
                            logger.error("error happened during paste!!! "+err);
                            rollBackModification();
                        }
                        else{
                            for(var i=0;i<copyarr.length;i++){
                                var from = copyarr[i].from;
                                var to = copyarr[i].to;
                                if(parameters.hasOwnProperty(from)){
                                    for(var j in parameters[from].attributes){
                                        currentCore.setAttribute(currentNodes[to],j,parameters[from].attributes[j]);
                                    }
                                    for(j in parameters[from].registry){
                                        currentCore.setRegistry(currentNodes[to],j,parameters[from].registry[j]);
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
            currentCore = new CORE(storage);
            currentCore.loadRoot(currentRoot,function(err,node){
                storeNode(node);
                updateAllUser(null);
            });
        };
        var newRoot = function(newroot){
            currentRoot = newroot;
            currentNodes = {};
            currentCore = new CORE(storage);
            currentCore.loadRoot(currentRoot,function(err,node){
                storeNode(node);
                updateAllUser(null);
            });
        }
        var modifyRootOnServer = function(){
            if(currentCore){
                var newkey;
                var persistdone = function(err){
                    if(err){
                        logger.error("error during persist: "+err);
                        rollBackModification();
                    }
                    else{
                        if(rootServer){
                            rootServer.emit('modifyRoot',currentRoot,newkey);
                        }
                    }
                };
                var k = [];
                for(var i in currentNodes) if (currentNodes.hasOwnProperty(i)){
                    k.push(i);
                }
                newkey = currentCore.persist(currentCore.getRoot(currentNodes[k[0]]),persistdone);
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
        };
        var buildTerritory = function(patterns,callback){
            var i;
            var pathes = [];
            var counter = 0;

            var loaddone = function(){
                if(--counter === 0){
                    callback(pathes);
                }
            };
            var loadpath = function(path,childrenaswell){
                var pathloaded = function(err,node){
                    storeNode(node);

                    INSERTARR(pathes,getNodePath(node));
                    if(childrenaswell){
                        currentCore.loadChildren(node,function(err,children){
                            for(var i=0;i<children.length;i++){
                                storeNode(children[i]);
                                INSERTARR(pathes,getNodePath(children[i]));
                            }
                            loaddone();
                        });
                    }
                    else{
                        loaddone();
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
                counter++;
            }
            for(i in patterns){
                loadpath(i,patterns[i].children !== undefined);
            }
        };
        var generateTerritoryEvents = function(userID,newpathes){
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
        };
        var updateUser = function(userID,patterns,callback){
            users[userID].PATTERNS = JSON.parse(JSON.stringify(patterns));
            if(currentCore){
                buildTerritory(patterns,function(newpathes){
                generateTerritoryEvents(userID,newpathes);
                users[userID].PATHES = newpathes;
                if(callback){
                    callback();
                }
            });
            }
            else{
                logger.debug("we do not have root yet...");
            }
        };
        var updateAllUser = function(callback){
            var counter = 0;
            var userupdated = function(){
                if(--counter === 0){
                    if(callback){
                        callback();
                    }
                }
            }
            for(var i in users){
                counter++;
            }
            for(i in users){
                updateUser(i,users[i].PATTERNS,userupdated);
            }
        };
        var moveNode = function(path,parentpath){
            var node = currentNodes[path];
            var parent = currentNodes[parentpath];
            if(node && parent){
                var newnode = currentCore.moveNode(node,parent);
                storeNode(newnode);
                //delete currentNodes[path];
                return currentNodes[getNodePath(newnode)];
            }
            else{
                logger.error("missing object for move!!!");
            }
        };
        var copyMultiplePathes = function(pathes,parentpath,callback){
            var tempfrom,tempfrompath,tempfrompathes=[];
            var tempto,temptopathes=[];
            var temp = {};
            var returnarr = [];
            var pathes
            var parent = currentNodes[parentpath];
            if(parent){
                tempfrom = currentCore.createNode(parent);
                storeNode(tempfrom);
                tempfrompath = getNodePath(tempfrom);
                for(var i=0;i<pathes.length;i++){
                    var tpath = {parentpath:getNodePath(currentCore.getParent(currentNodes[pathes[i]]))};
                    var tnode = moveNode(pathes[i],tempfrompath);
                    tpath.path = getNodePath(tnode);
                    tempfrompathes.push(tpath);
                }
                tempto = currentCore.copyNode(tempfrom,parent);
                storeNode(tempto);
                var temptopathes = currentCore.getChildrenRelids(tempto);
                for(i=0;i<tempfrompathes.length;i++){
                    var trelid = currentNodes[tempfrompathes[i].path].relid;
                    var tnode = moveNode(tempfrompathes[i].path,tempfrompathes[i].parentpath);
                    temp[trelid] = getNodePath(tnode);
                }
                currentCore.loadChildren(tempto,function(err,children){
                    if(err){
                        logger.error("failed to load copied children!!! "+err);
                        callback("cannot paste, ROLLBACK");
                    }
                    else{
                        for(var i=0;i<children.length;i++){
                            storeNode(children[i]);
                            var t = getNodePath(children[i]);
                            var t2 = children[i].relid;
                            var tnode = moveNode(t,parentpath);
                            returnarr.push({from:temp[t2],to:getNodePath(tnode)});
                        }

                        delete currentNodes[getNodePath(tempfrom)];
                        delete currentNodes[getNodePath(tempto)];
                        currentCore.deleteNode(tempfrom);
                        currentCore.deleteNode(tempto);
                        callback(null,returnarr);
                    }
                });


            }
            else{
                logger.error("wrong parameters for the paste operation!!!");
            }
        };
    };
    ClientNode = function(node,core){
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
            var ownpath = core.getStringPath(node);
            ownpath += ownpath === "" ? "" : "/";
            for(var i=0;i<children.length;i++){
                children[i]=ownpath+children[i];
            }
            return children;
        };
        this.getBaseId = function(){
            /*return null;*/
            return core.getAttribute(node,"BASE");
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

