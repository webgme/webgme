define(['/common/LogManager.js','/common/EventDispatcher.js', '/socket.io/socket.io.js'],function(LogManager, EventDispatcher){
    var logger,
        Client,
        CommandQueue,
        LocalCommander,
        Storage,
        ClientNode,
        ClientNode2,
        Territory;

    logger = LogManager.create("Client");
    /*
    this is the main class
    it contains all the information
    it communicates with the server
    and it serves the widgets - of course not directly ;)
     */
    Client = function(cServerLocation){
        var cStorage,
            cQueue,
            cSocket,
            cLogin,
            cPassword,
            cTerritories,
            cCommandsequence,
            cSelf,
            cProject,
            cBranch,
            cConnected,
            cFirst,
            cReconnecting,
            cFakereconnect;

        $.extend(this, new EventDispatcher());

        this.events = {
            "SELECTEDOBJECT_CHANGED" : "SELECTEDOBJECT_CHANGED"
        };

        cStorage = new Storage(this);
        cQueue = new CommandQueue(this,cStorage);
        cTerritories ={};
        cCommandsequence = 0;
        cSelf = this;
        cConnected = false;
        cFirst = true;
        cReconnecting = false;
        cFakereconnect = true;

        /*public interface*/
        /*message sending*/
        this.sendMessage = function(msg){
            if(cConnected){
                logger.debug("clientMessage "+JSON.stringify(msg));
                cSocket.emit('clientMessage',msg);
            }
            else{
                logger.debug("clientMessage not sent as server is not reachable");
            }
        };

        /*project selection and upper level functions*/
        this.connect = function(cb){


            /*main*/
            if(cSocket === undefined){
                cSocket = io.connect( cServerLocation );

                /*socket handling functions*/

            }

            /*socket communication*/
            cSocket.on('connect', function(msg){
                if(cProject !== undefined && cBranch !== undefined && cReconnecting === false){
                    cReconnecting = true;
                    /*this is a recconection, so we have to act accordingly*/
                    reconnectToServer(function(error){
                        if(error === true){
                            console.log("recconection failure :(");
                        }
                        else{
                            cConnected = true;
                            /*we should send to the server our territories again!!!*/
                            resendAllTerritories();
                            cReconnecting = false;
                            cFakereconnect = true;
                        }

                    });
                }

                if(cFirst){
                    cFirst = false;
                    cb();
                }
            });
            cSocket.on('error',function(msg){
            });
            cSocket.on('reconnecting',function(msg){
                cConnected = false;
            });

            cSocket.on('serverMessage',function(msg){
                logger.debug("serverMessage "+JSON.stringify(msg));
                for(var i in msg){
                    var event = msg[i];
                    logger.debug("event "+JSON.stringify(event));
                    if(event.type === "command"){
                        cQueue.commandResult(event.cid,event.success);
                    }
                    else if(event.type === "load"){
                        cStorage.set(event.id,event.object);
                        shootEvent("load",event.id);
                    }
                    else if(event.type === "unload"){
                        cStorage.set(event.id, undefined);
                        shootEvent("unload",event.id);
                    }
                    else if(event.type === "modify"){
                        cStorage.set(event.id,event.object);
                        shootEvent("modify",event.id);
                    }
                    else if(event.type === "delete"){
                        cStorage.set(event.id,null);
                        shootEvent("delete",event.id);
                    }
                }

            });

            cSocket.on('clientMessageAck',function(){
            });
            cSocket.on('clientMessageNack',function(error){
            });
            /*
            _socket.on('listProjectsAck',function(msg){
                console.log("listProjectsAck");
            });
            _socket.on('createProjectNack',function(msg){
                console.log("createProjectNack");
            });
            _socket.on('createProjectAck',function(msg){
                console.log("createProjectAck");
            });
            _socket.on('listBranchesAck',function(msg){
                console.log("listBranchesAck");
            });
            _socket.on('selectProjectAck',function(msg){
                console.log("selectProjectAck");
            });
            _socket.on('selectProjectNack',function(msg){
                console.log("selectProjectNack");
            });
            _socket.on('createBranchAck',function(msg){
                console.log("createBranchAck");
            });
            _socket.on('createBranchNack',function(msg){
                console.log("createBranchNack");
            });
            _socket.on('connectToBranchAck',function(msg){
                console.log("selectBranchAck");
            });
            _socket.on('connectToBranchNack',function(msg){
                console.log("selectBranchNack");
            });

            temporary removed as we skip project selection
            */
        };
        this.authenticate = function(login,pwd,cb){
            cSocket.on('authenticateAck',function(){
                cb();
            });
            cSocket.on('authenticateNack',function(error){
                cb(error);
            });

            /*main*/
            cLogin = login;
            cPassword = pwd;
            cSocket.emit('authenticate',{login:cLogin,pwd:cPassword});
        };
        this.listProjects = function(cb){
            cSocket.on('listProjectsAck',function(msg){
               cb(null,msg);
            });
            cSocket.on('listProjectsNack',function(error){
                cb(error);
            });

            /*main*/
            cSocket.emit('listProjects');
        };
        /*this is just for test purpose till we implement the project selection widget...*/
        this.makeconnect = function(cb){
            cSocket.on('connectToBranchAck',function(){
                cConnected = true;
                cb();
                return;
            });
            cSocket.emit('connectToBranch',"test");
        };

        /*storage like operations*/
        this.getNode = function(id){
            if(cStorage.get(id) !== undefined && cStorage.get(id) !== null){
                return new ClientNode(this,id,cStorage);
            }
            return cStorage.get(id);
        };
        this.delNode = function(id){
            cQueue.push({cid:"c"+(cCommandsequence++),type:"delete",id:id});
        };

        /* Maintain currently selected node id */
        var selectedObjectId = null;
        this.setSelectedObjectId = function ( objectId ) {
            if ( objectId !== selectedObjectId ) {
                selectedObjectId = objectId;

                cSelf.dispatchEvent( cSelf.events.SELECTEDOBJECT_CHANGED, selectedObjectId );
            }
        };

        /*territory functions*/
        /*used by the ui*/
        var _territoryCounter = 0;
        this.reserveTerritory = function(ui){
            _territoryCounter += 1;
            cTerritories[_territoryCounter] = new Territory(cSelf,_territoryCounter,ui);
            return _territoryCounter;
        };
        this.addPatterns = function(tid,patterns){
            cTerritories[tid].addPatterns(patterns);
        };
        this.removePatterns = function(tid,patterns){
            cTerritories[tid].removePatterns(patterns);
        };
        this.removeTerritory = function(tid){
            cTerritories[tid].del();
            delete cTerritories[tid];
        };
        this.hasPattern = function(tid,nodeid){
            return cTerritories[tid].hasPattern(nodeid);
        };

        /*used by the territory*/
        this.updateTerritory = function(tid,patterns){
            cQueue.push({type:"territory",cid:"c"+(cCommandsequence++),id:tid,patterns:patterns});
        };

        /*clipboard functions*/
        this.copy = function(ids){
            cQueue.push({type:"copy",cid:"c"+(cCommandsequence++),ids:ids});
        };
        this.paste = function(id){
            cQueue.push({type:"paste",cid:"c"+(cCommandsequence++),id:id});
        };

        /*attribute change*/
        this.modifyNode = function(nodeid,attributename,newvalue){
            var command = {type:"modify",id:nodeid};
            command[attributename] = newvalue;
            cQueue.push(command);
        };

        /*client side commander functions*/
        this.transmitEvent = function(etype,eid){
            logger.debug("Client.transmitEvent "+etype+","+eid);
            shootEvent(etype,eid);
        };
        this.getClientId = function(){
            return cSocket.socket.sessionid;
        }
        /*private functions*/
        var shootEvent = function(etype,eid){
            for(var i in cTerritories){
                cTerritories[i].onEvent(etype,eid);
            }
        };
        var reconnectToServer = function(cb){
            cSocket.on('selectProjectAck',function(msg){
                cSocket.emit('connectToBranch',cBranch);
            });
            cSocket.on('connectToBranchAck',function(msg){
                cb();
            });
            cSocket.on('authenticateNack',function(error){
                cb(true);
            });
            cSocket.on('selectProjectNack',function(error){
                cb(true);
            });

            /*main*/
            cSelf.authenticate(cLogin,cPassword,function(){
                cSocket.emit('selectProject',cProject);
            });
        };
        var resendAllTerritories = function(){
            for(var i in cTerritories){
                cTerritories[i].reSend();
            }
        }
    };
    /*
    this class represent the queue for the commands
    it track whether each command is successfull or not
    and notifies depending
    it also controls the speed of message sending
    and it collects the command requests
     */
    CommandQueue = function(_client,_storage){
        var _queue = {};
        var _sent = {};
        var _timer = 10000;
        var _cansend = true;
        var _commander = new LocalCommander(_client,_storage);

        /*public functions*/
        this.push = function(command){
            _commander.handleCommand(command);
            if(command.type === "territory"){
                /*these can go paralelly without cid*/
                _client.sendMessage({commands:[command]});
                return;
            }
            _queue[command.cid] = command;
            setTimeout(function(){
                commandTimeout(command.cid);
            },_timer);
            sendNextClientMessage();
        };
        this.commandResult = function(cid,success){
            /*TODO success*/
            delete _sent[cid];

            if(isSentEmpty()){
                _cansend = true;
                sendNextClientMessage();
            }
        };
        var isSentEmpty = function(){
            var counter = 0;
            for(var i in _sent){
                counter++;
            }
            if(counter === 0){
                return true;
            }
            return false;
        };
        var sendNextClientMessage = function(){
            logger.debug("trying to send next command message to server (cansend="+_cansend+",sentisempty="+isSentEmpty());
            if(_cansend ===true || isSentEmpty()){
                _cansend = true;
                var msg = {commands:[]};
                for(var i in _queue){
                    msg.commands.push(_queue[i]);
                }
                logger.debug("next command message to server "+JSON.stringify(msg));
                if(msg.commands.length>0){
                    _client.sendMessage(msg);
                    _cansend = false;
                    _sent = _queue;
                    _queue = {};
                }
            }
        };
        var commandTimeout = function(cid){
            if(_queue[cid] || _sent[cid]){
                console.log("command timeout "+cid);
            }
            delete _queue[cid];
            delete _sent[cid];

            if(isSentEmpty()){
                _cansend = true;
                sendNextClientMessage();
            }
        };
    };
    /*
    this class will represent the clients'
    commander which means it will try to do
    the given command before the real answer arrives
    TODO: it should also handle the reversing of the command
    if for some reason it fails on the server side...
     */
    LocalCommander = function(_client,_storage){
        _clipboard = [];
        /*public functions*/
        this.handleCommand = function(command){
            logger.debug("LocalCommander.handleCommand "+JSON.stringify(command));
            if(command.type === "copy"){
                copyCommand(command);
            }
            else if(command.type === "modify"){
                modifyCommand(command);
            }
            else if(command.type === "delete"){
                deleteCommand(command);
            }
            else if(command.type === "paste"){
                pasteCommand(command);
            }
            else if(command.type === "save"){
                saveCommand(command);
            }
        };

        /*private functions*/
        var copyCommand = function(copycommand){
            _clipboard = copycommand.ids;
        };
        var modifyCommand = function(modifycommand){
            var myobject = _storage.get(modifycommand.id);
            if(myobject){
                for(var i in modifycommand){
                    if(i!=="id" && i!=="type" && i!=="cid"){
                        myobject[i] = modifycommand[i];
                    }
                }
                _storage.set(modifycommand.id,myobject);
                _client.transmitEvent("modify",modifycommand.id);
            }
        };
        var deleteCommand = function(deletecommand){
            _storage.set(deletecommand.id,null);
            _client.transmitEvent("delete",deletecommand.id);
        };
        var pasteCommand = function(pastecommand){
            var prefix = "p_"+_client.getClientId()+"_"+pastecommand.cid+"_";
            var parent = _storage.get(pastecommand.id);
            if(parent){
                for(var i in _clipboard){
                    parent.children.push(prefix+_clipboard[i]);
                }
                _storage.set(pastecommand.id,parent);
                _client.transmitEvent("modify",pastecommand.id);
            }
        };
    }
    /*
    basic storage class
    it is not used directly by the widgets
     */
    Storage = function(_client){
        var _objects = {};

        /*public functions*/
        this.get = function(id){
            logger.debug("Storage.get "+id);
            return _objects[id];
        };
        this.set = function(id,object){
            logger.debug("Storage.set "+id+","+JSON.stringify(object));
            _objects[id] = object;
        };
    };
    /*
    this class is the object class for the widgets
    they always get objects like this
    so they cannot touch directly the data
    but only through functions
    this way all modifications will be visible
     */
    ClientNode = function(_client,_id,_storage){

        /*public interface*/
        this.isDeleted = function(){
            if(_storage.get(_id) === null){
                return true;
            }
            return false;
        };
        this.getAttribute = function(name){
            logger.debug("ClientNode.getAttribute "+name);
            /*var object = _storage.get(_id);
            if(object[name]){
                var retval = JSON.stringify(_data[name]);
                return JSON.parse(retval);
            }
            else if(object["base"])
            return _data[name];*/
            return recursiveGetComplexAttribute(name.split(".")[0], name.split("." ).splice(1),_id);

        };
        this.setAttribute = function(name,value){
            logger.debug("ClientNode.setAttribute "+name+","+value);
            _client.modifyNode(_id,name,value);
        };

        /*private functions*/
        var recursiveGetAttribute = function(name,id){
            var object = _storage.get(id);
            if(object){
                if(object[name]){
                    var retval = JSON.stringify(object[name]);
                    return JSON.parse(retval);
                }
                else if(object.base){
                    return recursiveGetAttribute(name,object.base);
                }
                else{
                    return null;
                }
            }
            else{
                return undefined;
            }
        };

        var recursiveGetComplexAttribute = function(name, attrSegments,id){
            var object = _storage.get(id);
            if(object){
                if(object[name]){
                    var retval = JSON.parse(JSON.stringify(object[name]));

                    while( attrSegments.length > 0 ) {
                        var subSegment = attrSegments[0];
                        attrSegments = attrSegments.slice(1);

                        if ( retval[subSegment] ) {
                            retval = retval[subSegment];
                        } else {
                            retval = null;
                            break;
                        }
                    }

                    return retval;
                }
                else if(object.base){
                    return recursiveGetAttribute(name,object.base);
                }
                else{
                    return null;
                }
            }
            else{
                return undefined;
            }
        };
    };
    ClientNode2 = function(cClient,cId,cStorage){
        var copyObject,
            rIsMyBase,
            rGetProperty;

        copyObject = function(object){
            "use strict";
            var copyobject = JSON.stringify(object);
            copyobject = JSON.parse(copyobject);
            return copyobject;
        };
        rIsMyBase = function(baseid,selfid){
            var object;
            if(baseid && selfid){
                object = cStorage.get(selfid);
                if(object){
                    if(object.base){
                        if(object.baseId === baseid){
                            return true;
                        }
                        return rIsMyBase(baseid,selfid);
                    }
                    return false;
                }
                return false;
            }
            return false;
        };
        rGetProperty = function(propertypath,id){
            var propertyarray,
                actual,
                inner,
                object;

            propertyarray = propertypath.split('.');
            object = cStorage.get(id);
            actual = 0;
            inner = object;

            if(object === null || object === undefined){
                return object;
            }

            while(actual<propertyarray.length){
                if(inner[propertyarray[actual]] === null){
                    return null;
                }
                if(inner[propertyarray[actual]] === undefined){
                    if(object.baseId){
                        return rGetProperty(propertypath,object.baseId);
                    }
                    return null;
                }
                inner = inner[propertyarray[actual++]];
            }
            return copyObject(inner);
        };

        /*basic getter and setter*/
        /*TODO maybe array should have their own getter and setter*/
        this.getProperty = function(propertypath){
            /* TODO: if property is array type than we should give back the inherited ones as well */
            return rGetProperty(propertypath,cId);
        };
        this.setProperty = function(propertypath,newvalue){
            /* TODO: if property is array type than we should check to not add any inherited to this level */
            var fullmodify,
                innermodify,
                actual,
                object,
                propertyarray;

            propertyarray = propertypath.split('.');
            object = cStorage.get(cId);
            if(object === null || object === undefined){
                return;
            }

            object = copyObject(object);
            actual = 0;
            fullmodify = object;
            while(actual<propertyarray.length){
                object[propertyarray[actual]] = object[propertyarray[actual]] || {};
                object = object[propertyarray[actual++]];
            }
            object = newvalue;
            cClient.modifyNode(cId,propertyarray[0],fullmodify[propertyarray[0]]);
        };

        /*property setter and getter functions*/
        /*name*/
        this.getName = function(){
            return this.getProperty("name");
        };
        this.setName = function(newvalue){
            this.setProperty("name",newvalue);
        };
        /*id*/
        this.getId = function(){
            return this.getProperty("_id");
        };
        this.setId = function(newvalue){
            this.setProperty("_id",newvalue);
        };
        /*containement relations*/
        /*parent*/
        this.getParentId = function(){
            return this.getProperty("parentId");
        };
        this.getMetaParentIds = function(){
            return this.getProperty("metaParentIds");
        };
        this.setParentId = function(newvalue){
            this.setProperty("parentId",newvalue);
        };
        this.setMetaParentIds = function(newarray){
            this.setProperty("metaParentId",newarray);
        };
        /*children*/
        this.getChildrenIds = function(){
            return this.getProperty("childrenIds");
        };
        this.getMetaChildrenIds = function(){
            return this.getProperty("metaChildrenIds");
        };
        this.setChildrenIds = function(newarray){
            this.setProperty("childrenIds",newarray);
        };
        this.setMetaChildrenIds = function(newarray){
            this.setProperty("metaChildrenIds",newarray);
        };
        /*connection attributes*/
        /*source*/
        this.getSourceId = function(){
            return this.getProperty("sourceId");
        };
        this.getMetaSourceIds = function(){
            return this.getProperty("metaSourceIds");
        };
        this.setSourceId = function(newvalue){
            this.setProperty("sourceId",newvalue);
        };
        this.setMetaSourceIds = function(newarray){
            this.setProperty("metaSourceIds",newarray);
        };
        /*destination*/
        this.getDestinationId = function(){
            return this.getProperty("destinationId");
        };
        this.getMetaDestinationIds = function(){
            return this.getProperty("metaDestinationIds");
        };
        this.setDestinationId = function(newvalue){
            this.setProperty("destinationId",newvalue);
        };
        this.setMetaDestinationIds = function(newarray){
            this.setProperty("metaDestinationIds",newarray);
        };


        /*registry*/
        this.getRegistry = function(registrypath){
            if(registrypath === null || registrypath === undefined || registrypath === ""){
                registrypath = "registry";
            }
            else{
                registrypath = "registry."+registrypath;
            }
            return this.getProperty(registrypath);
        };
        this.setRegistry = function(registrypath,newvalue){
            if(registrypath === null || registrypath === undefined || registrypath === ""){
                registrypath = "registry";
            }
            else{
                registrypath = "registry."+registrypath;
            }
            this.setProperty(registrypath,newvalue);
        };


    };
    Territory = function(_client,_tid,_ui){
        var _patterns = {};

        /*public interface*/
        this.addPatterns = function(patterns){
            var modified = false;
            for(var i in patterns){
                if(_patterns[i] === undefined || _patterns[i]===null){
                    modified = true;
                    _patterns[i] = patterns[i];
                }
                else if( _patterns[i] !== patterns[i]){
                    modified = true;
                    _patterns[i] = patterns[i];
                }
            }
            if(modified){
                _client.updateTerritory(_tid,_patterns);
            }
        };
        this.removePatterns = function(patterns){
            var modified = false;
            for(var i in patterns){
                if(_patterns[patterns[i]] !== undefined){
                    modified = true;
                    delete _patterns[patterns[i]];
                }
            }
            if(modified){
                _client.updateTerritory(_tid,_patterns);
            }
        };
        this.del = function(){
            _patterns={};
            _client.updateTerritory(_tid,_patterns);
        };
        this.hasPattern = function(id){
            if(_patterns[id]){
                return true;
            }
            return false;
        };
        this.onEvent = function(etype,eid){
            _ui.onEvent(etype,eid);
        };
        this.reSend = function(){
            _client.updateTerritory(_tid,_patterns);
        };
    };

    return Client;
});