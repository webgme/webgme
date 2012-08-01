define(['logManager','eventDispatcher', 'commonUtil', 'js/socmongo','js/cache','js/core2','socket.io/socket.io.js'],function(LogManager, EventDispatcher, commonUtil,SM,CACHE,CORE){
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
            rootServer = io.connect(options.rootsrv),
            _storage = new SM(options),
            storage = new CACHE(_storage),
            selectedObjectId = null,
            users = {},
            currentNodes = {},
            currentRoot = null,
            currentCore = null,
            clipboard = null,
            corealreadyarrived = null/*,
            previousNodes = {},
            previousRoot = null,
            previousCore = null*/;

        var earlycore = function(){
            currentRoot = corealreadyarrived;
            corealreadyarrived = null;
            currentNodes = {};
            currentCore = new CORE(storage);
            currentCore.loadRoot(currentRoot,function(err,node){
                storeNode(node);
                updateAllUser(null);
            });
        };

        storage.open(function(){
            logger.debug('storage opened');
            if(corealreadyarrived){
                earlycore();
            }
        });

        rootServer.on('newRoot',function(newroot){
            logger.debug('new root key arrived: '+newroot);
            if(storage.opened()){
                currentRoot = newroot;
                currentNodes = {};
                currentCore = new CORE(storage);
                currentCore.loadRoot(currentRoot,function(err,node){
                    storeNode(node);
                    updateAllUser(null);
                });
            }
            else{
                corealreadyarrived = newroot;
            }
        });

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
        this.addUI = function(ui){
            var guid = GUID();
            users[guid]  = {UI:ui,PATTERNS:{},PATHES:[]};
            return guid;
        };
        this.removeUI = function(guid){
            delete users[guid];
        };
        this.updateTerritory = function(userID,patterns){
            if(_.isEqual(patterns,users[userID].PATTERNS)){

            }else{
                updateUser(userID,patterns,function(){
                    logger.debug("user territory updated:"+userID);
                });
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
                currentCore.setAttribute(currentNodes[path],name,value);
                modifyRootOnServer(currentNodes[path]);
            }
            else{
                logger.error("[l82] no such object: "+path);
            }
        };
        this.setRegistry = function(path,names,value){
            if(currentNodes[path]){
                currentCore.setRegistry(currentNodes[path],name,value);
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
            var parent = currentNodes[parentpath];
            for(var i=0;i<clipboard.length;i++){
                storeNode(currentCore.copyNode(currentNodes[clipboard[i]],parent));
            }
            modifyRootOnServer(parent);
        };
        this.deleteNode = function(path){
            if(currentNodes[path]){
                currentCore.deleteNode(currentNodes[path]);
                modifyRootOnServer(currentNodes[path]);
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
            modifyRootOnServer(currentNodes[pathes[0]]);
        };
        this.createChild = function(parameters){
            var baseId,
                child;

            if(parameters.parentId){
                baseId = parameters.baseId || "object";
                child = currentCore.createNode(currentNodes[parameters.parentId]);
                currentCore.setAttribute(child,"BASE",baseId);
                modifyRootOnServer(child);
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
                modifyRootOnServer(currentNodes[id]);
            }
            else{
                logger.error("[l144] wrong pointer creation");
            }
        };
        this.delPointer = function(path,name){
            if(currentNodes[path]){
                currentCore.DeletePointer(currentNodes[path],name);
                modifyRootOnServer(currentNodes[path]);
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
                    modifyRootOnServer(connection);
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
            var i,
                newnode,
                simplepaste=true;
            if(parameters.parentId && currentNodes[parameters.parentId]){
                for(i in parameters){
                    if(i !== "parentId"){
                        simplepaste = false;
                        if(currentNodes[i]){
                            newnode = currentCore.copyNode(currentNodes[i], currentNodes[parameters.parentId]);
                            storeNode(newnode);
                            for(var j in parameters[i].attributes){
                                currentCore.setAttribute(newnode,j,parameters[i].attributes[j]);
                            }
                            for(j in parameters[i].registry){
                                currentCore.setRegistry((newnode,j,parameters[i].registry[j]));
                            }
                        }
                        else{
                            logger.error("[l198]the object not found:"+i);
                        }
                    }
                }
                if(simplepaste){
                    for(i=0;i<clipboard.length;i++){
                        if(currentNodes[clipboard[i]]){
                            newnode = currentCore.copyNode(currentNodes[clipboard[i]],currentNodes[parameters.parentId]);
                        }
                        else{
                            logger.error("[l208]the object not found:"+clipboard[i]);
                        }
                    }
                }
                modifyRootOnServer(currentNodes[parameters.parentId]);
            }
            else{
                logger.error("fraudulent intelligent paste: "+JSON.stringify(parameters));
            }
        };

        /*helping funcitons*/
        var modifyRootOnServer = function(node){
            var newkey;
            var persistdone = function(err){
                rootServer.emit('modifyRoot',currentRoot,newkey);
            };
            newkey = currentCore.persist(currentCore.getRoot(node),persistdone);
        };
        var queryNode = function(path){
            if(path === ""){
                path = "root";
            }
            return currentNodes[path];
        };
        var storeNode = function(node){
            var path = currentCore.getStringPath(node);
            if(path === ""){
                path = "root";
            }
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
                counter++;
                var pathloaded = function(err,node){
                    storeNode(node);

                    INSERTARR(pathes,currentCore.getStringPath(node));
                    if(childrenaswell){
                        currentCore.loadChildren(node,function(err,children){
                            for(var i=0;i<children.length;i++){
                                storeNode(children[i]);
                                INSERTARR(pathes,currentCore.getStringPath(children[i]));
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
                    currentCore.loadByPath(path,pathloaded);
                }
            };

            for(i in patterns){
                loadpath(i,patterns[i].children !== undefined);
            }
        };
        var generateTerritoryEvents = function(userID,newpathes){
            var user = users[userID];
            /*unload*/
            for(var i=0;i<user.PATHES.length;i++){
                if(newpathes.indexOf(user.PATHES[i]) === -1){
                    user.UI.onEvent("unload",user.PATHES[i]);
                }
            }

            /*others*/
            for(i=0;i<newpathes.length;i++){
                if(user.PATHES.indexOf(newpathes[i]) === -1){
                    user.UI.onEvent("load",newpathes[i]);
                }
                else{
                    user.UI.onEvent("update",newpathes[i]);
                }
            }
        };
        var updateUser = function(userID,patterns,callback){
            users[userID].PATTERNS = patterns;
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
    };
    ClientNode = function(node,core){
        this.getParentId = function(){
            var parent = core.getParent(node);
            if(parent){
                return core.getStringPath(parent);
            } else {
                return null;
            }
        };
        this.getId = function(){
            return core.getStringPath(node);
        };
        this.getChildrenIds = function(){
            return core.getChildrenRelids(node);
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
            return core.getPointerPath(node,name);
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

    };
    return Client;
});

