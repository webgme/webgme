var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require
});

var FS = require('fs');
var LOGMANAGER = require('./../common/LogManager.js');
var commonUtil = require('./../common/CommonUtil.js');
//var FlatCore = require('./../server/FlatCore.js');
//var TestStorage = require('./../server/FileStorage.js');
//var DirtyStorage = require('./../server/MongoStorage.js');

/*COMMON VARIABLES*/
var STORAGELATENCY = 1;
LOGMANAGER.setLogLevel( LOGMANAGER.logLevels.ALL /*1*/);
LOGMANAGER.useColors( true );
var logger = LOGMANAGER.create( "GmeProject" );
var ID = "_id";

/*CORE can be used globally although it will be initialized by the project*/
var CORE = null;
/*Project can be global as well*/
var PROJECT = null;

requirejs(['./../server/FlatCore.js','./../server/FileStorage.js','./../server/MongoStorage.js'],function(FlatCore,TestStorage,DirtyStorage){
    var TransactionQueue = function(){
        var cQueue   = [],
            cCanWork = true,
            messageHandled,
            processNextMessage;

        messageHandled = function(){
            cQueue.shift();
            cCanWork = true;
            processNextMessage();
        };
        processNextMessage = function(){
            if(cCanWork === true && cQueue.length>0){
                var territorymsg = cQueue[0],
                    clientId = territorymsg.client,
                    updatecommands = [],
                    territorycommands = {},
                    i;
                for(i in territorymsg.msg.commands){
                    if(territorymsg.msg.commands[i].type === 'territory'){
                        territorycommands[territorymsg.msg.commands[i].id] = territorymsg.msg.commands[i];
                    }
                    else{
                        updatecommands.push(territorymsg.msg.commands[i]);
                    }
                }
                for(i in territorycommands){
                    PROJECT.onUpdateTerritory(clientId,territorycommands[i].id,territorycommands[i].patterns);
                }
                if(updatecommands.length>0){
                    PROJECT.onProcessMessage(clientId,{transactionId:territorymsg.msg.transactionId,commands:updatecommands},messageHandled);
                    cCanWork = false;
                }
                else{
                    messageHandled(); /*this message contained only reading, so we finished processing ;)*/
                }
            }
        };

        /*public functions*/
        this.onClientMessage = function(msg){
            /*we simply put the message into the queue*/
            logger.debug("TransactionQueue.onClientMessage "+JSON.stringify(msg));
            cQueue.push(commonUtil.copy(msg));
            processNextMessage();
        };
    };
    var Commander = function(clients,clientId,transaction,callback){
        var processCommand,
            commandProcessed,
            modifyCommand,
            copyCommand,
            pasteCommand,
            childrenCommand,
            deleteCommand,
            pointCommand,
            commandBuffer,
            readSubTree,
            readISubTree,
            inheritObject,
            commandIds,
            finalizeCommand,
            commandFailed,
            i;

        processCommand = function(command){
            if(command.type === "copy"){
                copyCommand(command,commandProcessed);
            }
            else if(command.type === "modify"){
                modifyCommand(command,commandProcessed);
            }
            else if(command.type === "delete"){
                deleteCommand(command,commandProcessed);
            }
            else if(command.type === "paste"){
                pasteCommand(command,commandProcessed);
            }
            else if(command.type === "createChild" || command.type === "createSubType"){
                childrenCommand(command,commandProcessed);
            }
            else if(command.type === "point"){
                pointCommand(command,commandProcessed);
            }
        };
        commandProcessed = function(){
            var i;
            transaction.commands.shift();
            if(transaction.commands.length>0){
                processCommand(transaction.commands[0]);
            }
            else{
                finalizeCommand();
            }
        };

        commandFailed = function(){
            CORE.flushTree();
            clients[clientId].sendMessage([{type:"command",transactionId:transaction.transactionId,success:false}]);
        };
        finalizeCommand = function(){
            var changedobjects,
                clientUpdated;

            clientUpdated = function(id,loadlist,removelist){
                var msg = [],
                    i,
                    objectid;

                for(i in changedobjects){
                    objectid = CORE.getStringPath(changedobjects[i].object);
                    if(loadlist[objectid]){
                        msg.push({type:"load",id:objectid,object:changedobjects[i].object});
                        delete loadlist[objectid];
                    }
                    else if(removelist[CORE.getStringPath(changedobjects[i].object)]){
                        msg.push({type:"unload",id:objectid,object:null});
                        delete removelist[objectid];
                    }
                    else if(clients[id].interestedInObject(CORE.getStringPath(changedobjects[i].object))){
                        msg.push({type:changedobjects[i].type,object:changedobjects[i].object});
                    }
                }
                for(i in removelist){
                    msg.push({type:"unload",id:i,object:null});
                }

                /*TODO: is there any chance that some object remains in the loadlist???*/
                /*TODO: the client refreshing should be updated to give back full nodes...*/

                if(id === clientId){
                    msg.push({type:"command",transactionId:transaction.transactionId,success:true});
                }

                clients[id].sendMessage(msg);
            };
            CORE.persist(function(err,persistinfo){
                var i,j;
                if(err){
                    commandFailed();
                }
                else{
                    changedobjects = persistinfo;
                    for(i in clients){
                        clients[i].refreshTerritories(clientUpdated);
                    }
                }
            });

        };
        /*commands*/
        copyCommand = function(copycommand,callback){
            clients[clientId].copy(copycommand.ids);
            callback();
        };
        modifyCommand = function(modifycommand,callback){
            CORE.loadByPath(modifycommand.id,function(err,node){
                var i;
                if(err){
                    commandFailed();
                }
                else{
                    if(modifycommand.attributes){
                        for(i in modifycommand.attributes){
                            CORE.setAttribute(node,i,modifycommand.attributes[i]);
                        }
                    }
                    if(modifycommand.registry){
                        for(i in modifycommand.registry){
                            CORE.setAttribute(node,i,modifycommand.registry[i]);
                        }
                    }
                    callback();
                }
            });
        };
        deleteCommand = function(deletecommand,callback){

            CORE.loadByPath(deletecommand.id,function(err,node){
                if(err){
                    commandFailed();
                }
                else{
                    CORE.removeNode(node);
                    callback();
                }
            });
        };
        pasteCommand = function(pastecommand,callback){
            var i, j,
                subtreeids,
                copylist,
                readcount,
                pastecount,
                callCallBack,
                called,
                pasteObject,
                objectPasted,
                inheritanceCreated,
                inheritancecount,
                inheritanceArray;

            callCallBack = function(){
                if(!called){
                    called = true;
                    callback();
                }
            };

            inheritanceCreated = function(){
                if(--inheritancecount === 0){
                    callCallBack();
                }
            };
            objectPasted = function(object){
                if(copylist.indexOf(object[ID]) !== -1){
                    /*we have to connect to the parent*/
                    commandBuffer.get(pastecommand.id,function(error,parent){
                        if(error){
                            commandBuffer.commandFailed();
                            callCallBack();
                        }
                        else{
                            parent.relations.childrenIds.push(object[ID]);
                            commandBuffer.set(parent[ID],parent);
                            object.relations.parentId = parent[ID];
                            commandBuffer.set(object[ID],object);
                        }
                    })
                }
                if(--pastecount === 0){
                    commandBuffer.get(pastecommand.id,function(error,parent){
                        var i,j;
                        if(error){
                            commandBuffer.commandFailed();
                            callCallBack();
                        }
                        else{
                            inheritancecount = parent.relations.inheritorIds.length*copylist.length;
                            if(inheritancecount>0){
                                for(i=0;i<parent.relations.inheritorIds.length;i++){
                                    for(j=0;j<copylist.length;j++){
                                        childrenCommand({type:"createChild",baseId:copylist[j],parentId:parent.relations.inheritorIds[i]},inheritanceCreated);
                                    }
                                }
                            }
                            else{
                                callCallBack();
                            }
                        }
                    });
                }
            };
            pasteObject = function(mainId,cb){
                commandBuffer.get(mainId,function(error,object){
                    var i, j, index, newobject;
                    if(error){
                        commandBuffer.commandFailed();
                        callCallBack();
                    }
                    else{
                        newobject = commonUtil.copy(object);
                        /*adding extra attributes and registry info*/
                        if(pastecommand.additional){
                            if(pastecommand.additional[mainId]){
                                if(pastecommand.additional[mainId].attributes){
                                    for(i in pastecommand.additional[mainId].attributes){
                                        newobject.attributes[i] = pastecommand.additional[mainId].attributes[i];
                                    }
                                }
                                if(pastecommand.additional[mainId].registry){
                                    for(i in pastecommand.additional[mainId].registry){
                                        newobject.registry[i] = pastecommand.additional[mainId].registry[i];
                                    }
                                }
                            }
                        }
                        newobject[ID] = inheritanceArray[newobject[ID]];
                        index = copylist.indexOf(object[ID]);
                        if(index !== -1){
                            copylist[index] = newobject[ID];
                        }
                        /*relations*/
                        newobject.relations.inheritorIds = [];
                        newobject.relations.parentId = inheritanceArray[newobject.relations.parentId];
                        for(i=0;i<newobject.relations.childrenIds.length;i++){
                            newobject.relations.childrenIds[i] = inheritanceArray[newobject.relations.childrenIds[i]];
                        }
                        /*pointers*/
                        for(i in newobject.pointers){
                            if(subtreeids.indexOf(newobject.pointers[i].to) !== -1){
                                newobject.pointers[i].to = inheritanceArray[newobject.pointers[i].to];
                            }
                            for(j=0;j<newobject.pointers[i].from.length;j++){
                                if(subtreeids.indexOf(newobject.pointers[i].from[j]) !== -1){
                                    newobject.pointers[i].from[j] = inheritanceArray[newobject.pointers[i].from[j]];
                                }
                                else{
                                    newobject.pointers[i].from[j] = null;
                                }
                            }
                            j=0;
                            while(j<newobject.pointers[i].from.length){
                                if(newobject.pointers[i].from[j]){
                                    j++;
                                }
                                else{
                                    newobject.pointers[i].from.splice(j,1);
                                }
                            }
                        }
                        commandBuffer.set(newobject[ID],newobject);
                        cb(newobject);
                    }
                });
            };

            /*main*/
            called = false;
            inheritanceArray = {};
            if(pastecommand.additional){
                for(i in pastecommand.additional){
                    copylist.push(i);
                }
            }
            else{
                copylist = clients[clientId].getCopyList();
            }
            subtreeids = [];
            readcount = copylist.length;
            for(i=0;i<copylist.length;i++){
                readSubTree(copylist[i],function(error,result){
                    if(error){
                        commandBuffer.commandFailed();
                        callCallBack();
                    }
                    else{
                        subtreeids = commonUtil.mergeArrays(subtreeids,result);
                        if(--readcount == 0){
                            pastecount = subtreeids.length;
                            for(j=0;j<subtreeids.length;j++){
                                inheritanceArray[subtreeids[j]] = commonUtil.guid();
                            }
                            if(pastecommand.inheritance){
                                for(j in pastecommand.inheritance){
                                    inheritanceArray[j] = pastecommand.inheritance[j];
                                }
                            }
                            for(j=0;j<subtreeids.length;j++){
                                pasteObject(subtreeids[j],objectPasted);
                            }
                        }
                    }
                });
            }
        };
        childrenCommand = function(childrencommand,callback){
            var status,
                count,
                childrenComplete,
                childrenCreated,
                rCreateChild;

            childrenComplete = function(){
                if(status){
                    callback();
                }
                else{
                    commandBuffer.commandFailed();
                }
            };
            childrenCreated = function(){
                if(--count === 0){
                    childrenComplete();
                }
            };
            rCreateChild = function(parentId,baseId,newguid){
                var i;
                count++;
                inheritObject(baseId,newguid,function(err,inherited){
                    if(err){
                        logger.error("inheriting object failed: reason["+err+"],base["+baseId+"]");
                        status = false;
                        childrenCreated();
                    }
                    else{
                        commandBuffer.get(parentId,function(err,parent){
                            var i;
                            if(err){
                                logger.error("getting object failed: reason["+err+"],id["+parentId+"]");
                                status = false;
                                childrenComplete();
                            }
                            else{
                                if(childrencommand.attributes){
                                    for(i in childrencommand.attributes){
                                        inherited.attributes[i] = childrencommand.attributes[i];
                                    }
                                }
                                if(childrencommand.registry){
                                    for(i in childrencommand.registry){
                                        inherited.registry[i] = childrencommand.registry[i];
                                    }
                                }

                                parent.relations.childrenIds.push(inherited[ID]);
                                commandBuffer.set(parent[ID],parent);
                                inherited.relations.parentId = parent[ID];
                                commandBuffer.set(inherited[ID],inherited);
                                for(i=0;i<parent.relations.inheritorIds.length;i++){
                                    rCreateChild(parent.relations.inheritorIds[i],null,inherited[ID]);
                                }
                                childrenCreated();
                            }
                        });
                    }
                });
            };
            /*main*/
            status = true;
            count = 0;
            rCreateChild(childrencommand.parentId,childrencommand.baseId,childrencommand.newguid);
        };
        pointCommand = function(pointcommand,callback){
            var fromobj,
                oldtoobj,
                toobj,
                objectsLoaded;
            objectsLoaded = function(){
                if(fromobj.pointers[pointcommand.name] === null || fromobj.pointers[pointcommand.name] === undefined){
                    fromobj.pointers[pointcommand.name] = {to:null, from:[]};
                }
                if(oldtoobj){
                    if(oldtoobj.pointers[pointcommand.name].from){
                        commonUtil.removeFromArray(oldtoobj.pointers[pointcommand.name].from,fromobj[ID]);
                        commandBuffer.set(oldtoobj[ID],oldtoobj);
                    }
                }
                if(toobj){
                    fromobj.pointers[pointcommand.name].to = toobj[ID];
                    if(toobj.pointers[pointcommand.name] === null || toobj.pointers[pointcommand.name] === undefined){
                        toobj.pointers[pointcommand.name] = {to:null, from:[]};
                    }
                    commonUtil.insertIntoArray(toobj.pointers[pointcommand.name].from,fromobj[ID]);
                    commandBuffer.set(toobj[ID],toobj);
                }
                else{
                    fromobj.pointers[pointcommand.name].to = null;
                }
                commandBuffer.set(fromobj[ID],fromobj);
                callback();
            };
            commandBuffer.get(pointcommand.id,function(err,result){
                if(err){
                    logger.debug("Commander.pointCommand unable to get from object "+pointcommand.id);
                    commandBuffer.commandFailed();
                }
                else{
                    fromobj = result;
                    if(pointcommand.to){
                        commandBuffer.get(pointcommand.to,function(err,result){
                            if(err){
                                logger.debug("Commander.pointCommand unable to get to object "+pointcommand.to);
                                commandBuffer.commandFailed();
                            }
                            else{
                                toobj = result;
                                if(fromobj.pointers[pointcommand.name]){
                                    if(fromobj.pointers[pointcommand.name].to){
                                        commandBuffer.get(fromobj.pointers[pointcommand.name].to,function(err,result){
                                            if(err){
                                                logger.debug("Commander.pointCommand unable to get 'old to' object "+fromobj.pointers[pointcommand.name].to);
                                                commandBuffer.commandFailed();
                                            }
                                            else{
                                                oldtoobj = result;
                                                objectsLoaded();
                                            }
                                        });
                                    }
                                    else{
                                        objectsLoaded();
                                    }
                                }
                                else{
                                    objectsLoaded();
                                }
                            }
                        });
                    }
                    else{
                        if(fromobj.pointers[pointcommand.name]){
                            if(fromobj.pointers[pointcommand.name].to){
                                commandBuffer.get(fromobj.pointers[pointcommand.name].to,function(err,result){
                                    if(err){
                                        logger.debug("Commander.pointCommand unable to get 'old to' object "+fromobj.pointers[pointcommand.name].to);
                                        commandBuffer.commandFailed();
                                    }
                                    else{
                                        oldtoobj = result;
                                        objectsLoaded();
                                    }
                                });
                            }
                            else{
                                objectsLoaded();
                            }
                        }
                        else{
                            objectsLoaded();
                        }
                    }
                }
            });
        };

        /*helpers*/
        readSubTree = function(rootId,cb){
            var i,
                count,
                objectRead,
                rReadObject,
                readIds,
                state;
            rReadObject = function(id){
                count++;
                commandBuffer.get(id,function(err,object){
                    var i;
                    if(err){
                        logger.error("readSubTree.rReadObject - getting object failed: reason["+err+"],id["+id+"]");
                        state=false;
                        objectRead();
                    }
                    else{
                        commonUtil.insertIntoArray(readIds,id);
                        for(i=0;i<object.relations.childrenIds.length;i++){
                            if(object.relations.childrenIds[i]){
                                rReadObject(object.relations.childrenIds[i]);
                            }
                        }
                        objectRead();
                    }
                });
            };
            objectRead = function(){
                if(--count === 0){
                    if(state){
                        cb(null,readIds);
                    }
                    else{
                        cb(1);
                    }
                }
            };

            /*main*/
            state=true;
            count = 0;
            readIds = [];
            rReadObject(rootId);
        };
        readISubTree = function(rootId,cb){
            var i,
                count,
                objectRead,
                rReadObject,
                readIds,
                state;
            rReadObject = function(id){
                count++;
                commandBuffer.get(id,function(err,object){
                    var i;
                    if(err){
                        logger.error("readISubTree.rReadObject - getting object failed: reason["+err+"},id["+id+"]");
                        state=false;
                        objectRead();
                    }
                    else{
                        commonUtil.insertIntoArray(readIds,id);
                        for(i=0;i<object.relations.inheritorIds.length;i++){
                            rReadObject(object.relations.inheritorIds[i]);
                        }
                        objectRead();
                    }
                });
            };
            objectRead = function(){
                if(--count === 0){
                    if(state){
                        cb(null,readIds);
                    }
                    else{
                        cb(1);
                    }
                }
            };

            /*main*/
            state=true;
            count = 0;
            readIds = [];
            rReadObject(rootId);
        };
        inheritObject = function(baseId,newguid,cb){
            var i,
                count,
                inheritedobject;


            /*main*/
            readSubTree(baseId,function(err,subTreeIds){
                var quickCopyObject,
                    objectCopied,
                    newobject,
                    inheritanceArray;
                objectCopied = function(){
                    if(--count === 0){
                        cb(null,inheritedobject);
                    }
                };
                quickCopyObject = function(id){
                    var i;
                    commandBuffer.get(id,function(err,object){
                        /*no error can happen!!!*/
                        newobject = commonUtil.copy(object);
                        newobject.attributes = {};
                        newobject.registry = {};

                        if(subTreeIds.indexOf(newobject.relations.parentId) !== -1){
                            newobject.relations.parentId = inheritanceArray[newobject.relations.parentId];
                        }
                        else{
                            newobject.relations.parentId = null;
                            inheritedobject = newobject;
                        }
                        for(i=0;i<newobject.relations.childrenIds.length;i++){
                            newobject.relations.childrenIds[i] = inheritanceArray[newobject.relations.childrenIds[i]];
                        }

                        newobject.relations.baseId = object[ID];
                        newobject.relations.inheritorIds = [];

                        newobject[ID] = inheritanceArray[object[ID]];

                        commandBuffer.set(newobject[ID],newobject);

                        object.relations.inheritorIds.push(newobject[ID]);
                        commandBuffer.set(object[ID],object);
                        objectCopied();
                    });
                };

                if(err){
                    cb(1);
                }
                else{
                    inheritanceArray = {};
                    count = subTreeIds.length;
                    for(i=0;i<subTreeIds.length;i++){
                        inheritanceArray[subTreeIds[i]] = commonUtil.guid();
                    }
                    if(newguid){
                        inheritanceArray[baseId] = newguid;
                    }
                    for(i=0;i<subTreeIds.length;i++){
                        quickCopyObject(subTreeIds[i]);
                    }
                }
            });
        };


        /*main*/
        commandBuffer = new CommandBuffer(storage,clientId,transaction.transactionId,clients,CB);
        processCommand(transaction.commands[0]);
    };
    var Territory = function(cClient,territoryId){
        var cPatterns = {},
            cPreviousList = [],
            cCurrentList = [];

        /*public functions*/
        /*synchronous functions*/
        this.inTerritory = function(id){
            return (cCurrentList.indexOf(id) !== -1);
        };
        this.getId = function(){
            return territoryId;
        };

        /*asynchronous functions*/
        this.updatePatterns = function(newpatterns,callback){
            var addToNewList,
                computeRule,
                computePattern,
                updateComplete,
                patternComplete,
                newlist,
                extendedlist,
                patterncounter,
                i;

            addToNewList = function(node){
                var base = node,
                    path = CORE.getStringPath(node,"root");

                while(base && commonUtil.insertIntoArray(newlist,path)){
                    extendedlist[path] = base;
                    base = CORE.getBase(node);
                    path = CORE.getStringPath(base);
                }
            };
            computeRule = function(basenode,rulename,rulevalue,callback){
                var computeChildrenRule,
                    computePointerRule;

                computeChildrenRule = function(node,maxlevel,callback){
                    var childrenCounted,
                        count,
                        rComputeChild;

                    childrenCounted = function(){
                        if(--count === 0){
                            callback()
                        }
                    };
                    rComputeChild = function(node,currentlevel){
                        count++;
                        addToNewList(node);
                        if(currentlevel === maxlevel){
                            childrenCounted();
                        }
                        else{
                            CORE.loadChildren(node,function(err,children){
                                var i;
                                if(err){
                                    childrenCounted();
                                }
                                else{
                                    for(i=0;i<children.length;i++){
                                        rComputeChild(children[i],currentlevel+1,maxlevel);
                                    }
                                    childrenCounted();
                                }
                            });
                        }
                    };

                    rComputeChild(node,0);
                };
                computePointerRule = function(node,pointername,maxlevel,callback){
                    var pathchain = [],
                        count,
                        rComputePointer,
                        pointerCounted;

                    pointerCounted = function(){
                        if(--count === 0){
                            callback();
                        }
                    };
                    rComputePointer = function(node,currentlevel){
                        count++;
                        addToNewList(node);
                        if(currentlevel === maxlevel){
                            pointerCounted();
                        }
                        else{
                            if(commonUtil.insertIntoArray(pathchain,CORE.getStringPath(node))){
                                CORE.loadPointer(node,pointername,function(err,pointer){
                                    if(err){
                                        pointerCounted();
                                    }
                                    else{
                                        rComputePointer(pointer,currentlevel+1);
                                        pointerCounted();
                                    }
                                });
                            }
                            else{
                                pointerCounted();
                            }
                        }
                    };

                    rComputePointer(node,0);
                };

                switch(rulename){
                    case "children":
                        computeChildrenRule(basenode,rulevalue,callback);
                        break;
                    case "pointer":
                        /*TODO not implemented yet*/
                        callback();
                        break;
                    default:
                        callback();
                        break;
                }

            };
            computePattern = function(basenode,rules,callback){
                var rulecount,
                    ruleComputed,
                    i;

                ruleComputed = function(){
                    if(--rulecount === 0){
                        callback();
                    }
                };

                rulecount = 0;
                for(i in rules){
                    rulecount++;
                }
                if(rulecount === 0){
                    callback();
                }
                else{
                    for(i in rules){
                        computeRule(basenode,i,rules[i],ruleComputed);
                    }
                }
            };
            updateComplete = function(){
                var i,
                    removedobjects = {},
                    addedobjects;

                for(i=0;i<newlist.length;i++){
                    if(cCurrentList.indexOf(newlist[i]) === -1){
                        addedobjects[newlist[i]] = extendedlist[newlist[i]];
                    }
                }
                for(i=0;i<cCurrentList.length;i++){
                    if(newlist.indexOf(cCurrentList[i]) === -1){
                        removedobjects[cCurrentList[i]] = null;
                    }
                }
                cPreviousList = cCurrentList;
                cCurrentList = newlist;
                cPatterns = newpatterns;
                callback(addedobjects,removedobjects);
            };
            patternComplete = function(){
                if(--patterncounter === 0){
                    updateComplete();
                }
            };

            /*main*/
            if(newpatterns === undefined || newpatterns === null){
                newpatterns = commonUtil.copy(cPatterns);
            }
            newlist = [];
            patternCounter = 0;
            for(i in newpatterns){
                patternCounter++;
            }
            if(patternCounter === 0){
                updateComplete();
            }
            else{
                for(i in newpatterns){
                    computePattern(i,newpatterns[i],patternComplete);
                }
            }
        };
    };
    var Client = function(cIoSocket,clientId){
        var cObjects = {},
            cClipboard = [], /*it has to be on client level*/
            cTerritories = {},
            cSelf = this;
        /*message handlings*/
        cIoSocket.on('clientMessage',function(msg){
            /*you have to simply put it into the transaction queue*/
            var clientmsg = {}; clientmsg.client = clientId; clientmsg.msg = msg;
            PROJECT.onClientMessage(clientmsg);
            cIoSocket.emit('clientMessageAck');
        });
        cIoSocket.on('serverMessageAck',function(msg){
            /*we are happy :)*/
        });
        cIoSocket.on('serverMessageNack',function(msg){
            /*we are not that happy but cannot do much*/
            console.log("client: "+clientId+" - serverMessageNack");
        });
        cIoSocket.on('disconnect',function(msg){
            logger.debug("Client.on.disconnect "+clientId);
            if(PROJECT){
                PROJECT.deleteClient(clientId);
            }
        });
        /*public functions*/
        this.getId = function(){
            return clientId;
        };
        this.updateTerritory = function(territoryid,patterns){
            logger.debug("Client.updateTerritory "+territoryid+","+JSON.stringify(patterns));
            if(cTerritories[territoryid] === undefined || cTerritories[territoryid] === null){
                cTerritories[territoryid] = new Territory(cSelf,territoryid);
            }
            cTerritories[territoryid].updatePatterns(patterns,function(addedobjects,removedobjects){
                var i,
                    msg = [];
                for(i in addedobjects){
                    if(cObjects[i] === undefined){
                        cObjects[i] = 1;
                        msg.push({type:"load",id:i,object:addedobjects[i]});
                    }
                    else{
                        cObjects[i]++;
                    }
                }
                for(i in removedobjects){
                    if(cObjects[i] === undefined){
                        /*was already removed*/
                    }
                    else{
                        cObjects[i]--;
                        if(cObjects[i]<=0){
                            delete cObjects[i];
                            msg.push({type:"unload",id:i});
                        }
                    }
                }
                cSelf.sendMessage(msg);
            });
        };
        this.copy = function(objects){
            cClipboard = objects;
        };
        this.getCopyList = function(){
            return cClipboard;
        };
        this.sendMessage = function(msg){
            logger.debug("Client.sendMessage "/*+JSON.stringify(msg)*/);
            cIoSocket.emit('serverMessage',msg);
        };
        this.interestedInObject = function(objectid){
            if(cObjects[objectid]){
                return true;
            }
            return false;
        };
        this.refreshTerritories = function(cb){
            var i,
                loadlist,
                unloadlist,
                territorycount,
                territoryRefreshed;

            territoryRefreshed = function(addedobjects,removedobjects){
                var i;
                for(i in addedobjects){
                    if(cObjects[i] === undefined){
                        cObjects[i] = 1;
                        commonUtil.insertIntoArray(loadlist,i);
                    }
                    else{
                        cObjects[i]++;
                    }
                }
                for(i in removedobjects){
                    if(cObjects[i] === undefined){
                        /*was already removed*/
                    }
                    else{
                        cObjects[i]--;
                        if(cObjects[i]<=0){
                            delete cObjects[i];
                            commonUtil.insertIntoArray(unloadlist,i);
                        }
                    }
                }

                /*check if all territory have been updated sofar*/
                if(--territorycount === 0){
                    cb(loadlist,unloadlist);
                }
            };
            /*main*/
            territorycount = 0;
            loadlist = [];
            unloadlist = [];
            for(i in cTerritories){
                territorycount++;
            }
            if(territorycount>0){
                for(i in cTerritories){
                    cTerritories[i].updatePatterns(null,territoryRefreshed);
                }
            }
            else{
                cb([],[]);
            }
        };
    };
    var Project = function(cPort,cProject,cBranch){
        var cClients = {},
            cTransactionQ = new TransactionQueue(this),
            cIo = require('socket.io').listen(cPort),
            storage,
            cSelf = this;


        if(commonUtil.StorageType === "test"){
            storage = new TestStorage(cProject,cBranch);
        }
        else if(commonUtil.StorageType === "mongodirty"){
            storage = new DirtyStorage(cProject,cBranch);
        }
        CORE = new FlatCore(storage);

        /*socket.IO listener*/
        cIo.set('log level', 1); // reduce logging
        cIo.sockets.on('connection', function(socket){
            logger.debug("SOCKET.IO CONN - "+JSON.stringify(socket.id));
            if(cClients[socket.id]){
                logger.debug("Project.connection - already connected client "+socket.id);
            }
            else{
                logger.debug("new client connected "+socket.id);
                cSelf.addClient(socket,socket.id);
            }
        });
        /*public functions*/
        this.getProjectInfo = function(){
            return {project:cProject,branch:cBranch};
        };
        this.addClient = function(socket,id){
            logger.debug("Project.addClient "+id);
            var client,i;
            if(cClients[id] === undefined){
                client = new Client(socket,id,cSelf);
                cClients[id] = client;
            }
            return true;
        };
        this.deleteClient = function(id){
            var i,count;
            logger.debug("Project.deleteClient "+id);
            delete cClients[id];
            count = 0;
            for(i in cClients){
                count++;
            }
            if(count === 0){
                logger.debug("no more clients, quit");
                setTimeout(function(){
                    process.exit(0);
                },1000);
            }
        };

        /*message handling*/
        this.onClientMessage = function(msg){
            logger.debug("Project.onClientMessage "+JSON.stringify(msg));
            cTransactionQ.onClientMessage(msg);
        };
        this.onProcessMessage = function(clientId,transaction,cb){
            new Commander(cClients,clientId,transaction,cb);
        };
        this.onUpdateTerritory = function(clientId,territoryId,newpatterns){
            logger.debug("Project.onUpdateTerritory "+JSON.stringify(clientId)+","+JSON.stringify(territoryId)+","+JSON.stringify(newpatterns));
            cClients[clientId].updateTerritory(territoryId,newpatterns);
        };
    };

    /*MAIN*/
    var i,
        commandargs = process.argv.splice(" ");
    logger.debug(commandargs);
    if(commandargs.length !== 5){
        logger.error("proper usage: node proj3ct.js portnumber projectname branchname");
        process.exit(0);
    }
    else{
        PROJECT = new Project(Number(commandargs[2]),commandargs[3],commandargs[4]);
    }
});
