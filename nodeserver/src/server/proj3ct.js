/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
/*
 The sturcture of the objects in the database looks like the following:
 {
 _id:string - identification of the object as used in the database and between client and server as well
 attributes:{"attributename":number/string/object} - these attributes are the ones which doesn't refer to any other object in the project
 registry:{"entryname":number/string/object} - these parts of the objects are free to use, but they will not handled nor checked by the system so the user should take care of them if they holds any info regarding other objects (the main aim is to use values here which are not really part of the model, but needed for example the visualization)
 relations:{ - the relations represent the basic structure of the model
 parentId:string - refers to the owner of the current object
 childrenIds:[string] - refers to the contained objects of the current object, together with the parentId they represent the containment hierarchy of the model
 baseId:string - refers to the base object of the current object
 inheritorIds:[string] - refers to the inheritor objects of the current object, together with baseId they represent the inheritance hierarchy of the model
 }
 pointers:{ - pointers are the freely usable relations between objects
 pointername:{
 from:[string] - the incoming part of the pointer relations which refers to the objects pointed to the current object witht the given pointer name
 to:string - refers to some object
 }
 }
 }
 the following commands available:
 *createFolder
 copy - saves a set of objects onto the clipboard for later operations (done on client level so each client has its own clipboard)
 paste - paste the content of the clipboard under the given object (creates deep-copy of each object on the clipboard the the proper place)
 modify - modifies some single attribute (which means that this command will not deal with any kind of relations so it is good only for registry and attribute changes)
 createChild - creates an empty child using the given basetype under the given parent
 createSubType - creates an empty subtype from the given base under the given parent
 */
"use strict";
/*COMMON FUNCTIONS*/
var insertIntoArray = function(list,item){
    if (list instanceof Array){
        if(list.indexOf(item) === -1){
            list.push(item);
            return true;
        }
        return false;
    }
    return false;
};
var removeFromArray = function(list,item){
    var index = list.indexOf(item);
    if(index === -1){
        return false;
    }
    else{
        list.splice(index,1);
        return true;
    }
}
var mergeArrays = function(one,two){
    var three = [],i;
    for(i in one){
        three.push(one[i]);
    }
    for(i in two){
        if(one.indexOf(two[i]) === -1){
            three.push(two[i]);
        }
    }
    return three;
};
var numberToDword = function(number){
    var str = number.toString(16);
    while(str.length<8){
        str = "0"+str;
    }
    return str;
};
var copyObject = function(object){
    var copyobject = JSON.stringify(object);
    copyobject = JSON.parse(copyobject);
    return copyobject;
};

/*COMMON INCLUDES*/
var FS = require('fs');
var LOGMANAGER = require('./../common/logmanager.js');
var commonUtil = require('./../common/CommonUtil.js');

/*COMMON VARIABLES*/
var STORAGELATENCY = 1;
LOGMANAGER.setLogLevel( LOGMANAGER.logLevels.ALL/*1*/ );
LOGMANAGER.useColors( true );
var logger = LOGMANAGER.create( "server" );
var ID = "_id";

var TestStorage = function(cProjectName,cBranchName){
    var cObjects = {};


    /*public functions*/
    this.get = function(id,cb){
        setTimeout(function(){
            if(cObjects[id]){
                cb(null,cObjects[id]);
            }
            else{
                cb(1);
            }
        },1);
    };
    this.set = function(id,object,cb){
        setTimeout(function(){
            cObjects[id] = object;
            cb();},1);
    };
    this.del = function(id,cb){
        setTimeout(function(){
            cObjects[id] = null;
            cb();},1);
    };

    /*private functions*/

    /*main*/
    cObjects = FS.readFileSync("../test/"+cProjectName+"_"+cBranchName+".tpf");
    cObjects = JSON.parse(cObjects) || {};
};
var DirtyStorage = function(cProjectName,cBranchName){
    var cObjects,
        MONGO = require('mongodb'),
        DB = new MONGO.Db(cProjectName, new MONGO.Server(commonUtil.MongoDBLocation, commonUtil.MongoDBPort, {},{}));

    /*public functions*/
    this.get = function(id,cb){
        if(cObjects){
            cObjects.findOne({"_id":id},function(err,result){
                if(err){
                    cb(err);
                }
                else{
                    cb(null,result.object);
                }
            });
        }
        else{
            cb(1);
        }
    };
    this.set = function(id,object,cb){
        if(cObjects){
            cObjects.save({"_id":id,object:object},function(err){
                cb(err);
            });
        }
        else{
            cb(1);
        }
    };
    this.del = function(id,cb){
        if(cObjects){
            cObjects.save({"_id":id,object:null},function(err){
                cb(err);
            });
        }
        else{
            cb(1);
        }
    };
    /*private functions*/

    /*main*/
    DB.open(function(){
        DB.collection(cBranchName,function(err,result){
            if(err){
                logger.error("Storage cannot open given branch "+cBranchName);
            }
            else{
                cObjects = result;
            }
        });
    });
};
var ReadStorage = function(cStorage){
    /*interface type object for read-only clients*/
    /*public functions*/
    this.get = function(id,cb){
        cStorage.get(id,cb);
    };
};
var TransactionQueue = function(cProject){
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
                cid = territorymsg.client,
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
                cProject.onUpdateTerritory(cid,territorycommands[i].cid,territorycommands[i].id,territorycommands[i].patterns);
            }
            if(updatecommands.length>0){
                cProject.onProcessMessage(cid,updatecommands,messageHandled);
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
        cQueue.push(copyObject(msg));
        processNextMessage();
    };
};
var CommandBuffer = function(cStorage,cCid,cCommandIds,cClients,CB){
    var i,
        commandStatus,
        bufferedObjects,
        objectStates,
        completeCommand,
        flushBuffer,
        readQueue,
        self,
        objectArrived,
        flushReadQueue,
        finalizeClient,
        clientcount;

    /*public functions*/
    this.get = function(id,cb){
        if(bufferedObjects[id] === null){
            cb(null,null);
        }
        else if(bufferedObjects[id]){
            cb(null,bufferedObjects[id]);
        }
        else{
            readQueue.push({id:id,cb:cb});
            if(objectStates[id] === undefined){
                objectStates[id] = "db";
                cStorage.get(id,function(err,object){
                    objectArrived(id,err,object);
                });
            }
        }
    };
    this.set = function(id,object){
        if(bufferedObjects[id] && objectStates[id]!=="delete"){
            bufferedObjects[id]=object;
            if(object){
                if(objectStates[id] !== "create"){
                    objectStates[id]="update";
                }
            }
            else{
                objectStates[id]="delete";
            }
        }
        else{
            bufferedObjects[id]=object;
            objectStates[id]="create";
        }
    };
    this.commandFailed = function(){
        commandStatus = false;
        self.finalizeCommand();
    };
    this.commandSucceeds = function(){
    };
    this.finalizeCommand = function(){
        var i,
            msg;
        if(commandStatus){
            flushBuffer(function(){
                var i;
                for(i in cClients){
                    finalizeClient(cClients[i]);
                }
            });
        }
        else{
            msg = [];
            for(i=0;i<cCommandIds.length;i++){
                msg.push({type:"command",cid:cCommandIds[i].cid,success:false});
            }
            cClients[cCid].sendMessage(msg);
        }
    };
    /*private function*/
    flushReadQueue = function(id){
        var i = 0;
        while(i<readQueue.length){
            if(readQueue[i].id === id){
                self.get(readQueue[i].id,readQueue[i].cb);
                readQueue.splice(i,1);
            }
            else{
                i++;
            }
        }
    };
    objectArrived = function(id,err,object){
        var i,
            req;
        if(err){
            /*TODO have to separate different type of errors*/
            i = 0;
            while(i<readQueue.length){
                if(readQueue[i].id === id){
                    readQueue[i].cb(err);
                    readQueue.splice(i,1);
                }
                else{
                    i++;
                }
            }
        }
        else{
            bufferedObjects[id] = object;
            objectStates[id] = "read";
            flushReadQueue(id);
        }
    };
    flushBuffer = function(cb){
        var count,
            objectSaved,
            i;

        objectSaved = function(err){
            if(--count === 0){
                cb();
            }
        };

        /*main*/
        count = 0;
        for(i in bufferedObjects){
            count++;
        }
        if(count>0){
            for(i in bufferedObjects){
                if(objectStates[i] !== "read" && objectStates[i]!=="db"){
                    cStorage.set(i,bufferedObjects[i],objectSaved);
                }
                else{
                    objectSaved();
                }
            }
        }
        else{
            cb();
        }
    };
    finalizeClient = function(client){
        client.refreshTerritories(self,function(loadlist,unloadlist){
            var i,
                msg = [];
            for(i in bufferedObjects){
                if(loadlist.indexOf(i) !== -1){
                    msg.push({type:"load",id:i,object:bufferedObjects[i]});
                }
                else if(unloadlist.indexOf(i) !== -1){
                    msg.push({type:"unload",id:i,object:bufferedObjects[i]});
                }
                else if(objectStates[i] !== "read" && client.interestedInObject(i)){
                    msg.push({type:objectStates[i],id:i,object:bufferedObjects[i]});
                }
            }
            if(client.getId() === cCid){
                for(i=0;i<cCommandIds.length;i++){
                    msg.push({type:"command",cid:cCommandIds[i],success:true});
                }
            }
            if(msg.length>0){
                client.sendMessage(msg);
            }

            if(--clientcount === 0){
                CB(); /*probably these message sendings could go paralelly with the next command, but who knows*/
            }

        });
    };
    completeCommand = function(){
        var msg,
            i,j;
        if(!commandStatus){
            cClients[cCid].sendMessage([{type:"command",cid:cCommand.cid,success:false}]);
            CB();
        }
        else{
            for(i in cClients){
                msg = [];
                for(j in bufferedObjects){
                    if(objectStates[j] !== "read" && objectStates[j] !== "db"){
                        if(cClients[i].interestedInObject(j)){
                            msg.push({type:objectStates[j],id:j,object:bufferedObjects[j]});
                        }
                    }
                }
                if(i === cCid){
                    msg.push({type:"command",cid:cCommand.cid,success:true});
                }

                if(msg.length>0){
                    cClients[i].sendMessage(msg);
                }
            }
            CB();
        }
    };

    /*main*/
    self = this;
    commandStatus = true;
    bufferedObjects = {};
    objectStates = {};
    clientcount = 0;
    readQueue = [];
    for(i in cClients){
        clientcount++;
    }


};
var Commander = function(cStorage,cClients,cCid,cCommands,CB){
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
        cCommands.shift();
        if(cCommands.length>0){
            processCommand(cCommands[0]);
        }
        else{
            commandBuffer.finalizeCommand();
        }
    };

    /*commands*/
    copyCommand = function(copycommand,callback){
        cClients[cCid].copy(copycommand.ids);
        callback();
    };
    modifyCommand = function(modifycommand,callback){
        var i,
            modified;
        /*main*/
        modified = false;
        commandBuffer.get(modifycommand.id,function(err,object){
            if(err){
                commandBuffer.commandFailed();
            }
            else{
                if(modifycommand.attributes){
                    object.attributes = modifycommand.attributes;
                    modified = true;
                }
                if(modifycommand.registry){
                    object.registry = modifycommand.registry;
                    modified = true;
                }
                if(modified){
                    commandBuffer.set(modifycommand.id,object);
                }
                callback();
            }
        });
    };
    deleteCommand = function(deletecommand,callback){
        var subIds,
            readcount,
            allObjectsRead,
            alreadycalled,
            allObjectDisconnected,
            objectDisconnected,
            disconnectObject,
            disconnectcount,
            callCallBack;
        callCallBack = function(){
            if(!alreadycalled){
                alreadycalled = true;
                callback();
            }
        };
        allObjectsRead = function(){
            var i;
            disconnectcount = subIds.length;
            for(i=0;i<subIds.length;i++){
                disconnectObject(subIds[i],objectDisconnected);
            }
        };
        allObjectDisconnected = function(){
            var i;
            for(i=0;i<subIds.length;i++){
                commandBuffer.set(subIds[i],null);
            }
            callCallBack();
        };
        objectDisconnected = function(){
            if(--disconnectcount === 0){
                allObjectDisconnected();
            }
        };
        disconnectObject = function(disconnectId,cb){
            var pointercount,
                disconnectPointer,
                mainobject,
                pointerRemoved;
            pointerRemoved = function(){
                if(--pointercount === 0){
                    cb();
                }
            };
            disconnectPointer = function(name){
                var i,
                    disconnectcount,
                    removePointer;

                removePointer = function(id){
                    commandBuffer.get(id,function(error,object){
                        if(error){
                            commandBuffer.commandFailed();
                            callCallBack();
                        }
                        else{
                            if(object.pointers[name].to === disconnectId){
                                object.pointers[name].to = null;
                                commandBuffer.set(object[ID],object);
                            }
                            if(--disconnectcount === 0){
                                pointerRemoved();
                            }
                        }
                    });
                };

                /*main*/
                disconnectcount = mainobject.pointers[name].from.length+1;
                for(i=0;i<mainobject.pointers[name].from.length;i++){
                    if(subIds.indexOf(mainobject.pointers[name].from[i]) === -1){
                        removePointer(mainobject.pointers[name].from[i]);
                    }
                    else{
                        if(--disconnectcount === 0){
                            pointerRemoved();
                        }
                    }
                }
                if(subIds.indexOf(mainobject.pointers[name].to) === -1){
                    commandBuffer.get(mainobject.pointers[name].to,function(error,object){
                        if(error){
                            commandBuffer.commandFailed();
                            callCallBack();
                        }
                        else{
                            removeFromArray(object.pointers[name].from,mainobject[ID]);
                            commandBuffer.set(object[ID],object);
                            if(--disconnectcount === 0){
                                pointerRemoved();
                            }
                        }
                    });
                }
                else{
                    if(--disconnectcount === 0){
                        pointerRemoved();
                    }
                }
            };

            /*main*/
            commandBuffer.get(disconnectId,function(error,object){
                var i;
                if(error){
                    commandBuffer.commandFailed();
                    callCallBack();
                }
                else{
                    mainobject = object;
                    pointercount = 0;
                    for(i in mainobject.pointers){
                        pointercount++;
                    }
                    pointercount++;
                    if(mainobject.relations.baseId){
                        commandBuffer.get(mainobject.relations.baseId,function(error,object){
                            if(error){
                                commandBuffer.commandFailed();
                                callCallBack();
                            }
                            else{
                                removeFromArray(object.relations.inheritorIds,disconnectId);
                                commandBuffer.set(object[ID],object);
                                if(--pointercount === 0){
                                    cb();
                                }
                            }
                        });
                    }
                    else{
                        if(--pointercount === 0){
                            cb();
                        }
                    }

                    for(i in mainobject.pointers){
                        disconnectPointer(i);
                    }
                }
            });
        };
        /*main*/
        subIds = [];
        readcount = 4;
        alreadycalled = false;
        readSubTree(deletecommand.id,function(error,subtree){
            if(error){
                commandBuffer.commandFailed();
                callCallBack();
            }
            else{
                subIds = subIds.concat(subtree);
                if(--readcount === 0){
                    allObjectsRead();
                }
            }
        });
        readISubTree(deletecommand.id,function(error,subtree){
            if(error){
                commandBuffer.commandFailed();
                callCallBack();
            }
            else{
                subIds = subIds.concat(subtree);
                if(--readcount === 0){
                    allObjectsRead();
                }
            }
        });
        commandBuffer.get(deletecommand.id,function(error,mainobject){
            if(error){
                commandBuffer.commandFailed();
                callCallBack();
            }
            else{
                if(mainobject.relations.baseId){
                    commandBuffer.get(mainobject.relations.baseId,function(error,baseobject){
                        if(error){
                            commandBuffer.commandFailed();
                            callCallBack();
                        }
                        else{
                            removeFromArray(baseobject.relations.inheritorIds,deletecommand.id);
                            commandBuffer.set(baseobject[ID],baseobject);
                            if(--readcount === 0){
                                allObjectsRead();
                            }
                        }
                    });
                }
                else{
                    if(--readcount === 0){
                        allObjectsRead();
                    }
                }
                if(mainobject.relations.parentId){
                    commandBuffer.get(mainobject.relations.parentId,function(error,parentobject){
                        if(error){
                            commandBuffer.commandFailed();
                            callCallBack();
                        }
                        else{
                            removeFromArray(parentobject.relations.childrenIds,deletecommand.id);
                            commandBuffer.set(parentobject[ID],parentobject);
                            if(--readcount === 0){
                                allObjectsRead();
                            }
                        }
                    });
                }
                else{
                    if(--readcount === 0){
                        allObjectsRead();
                    }
                }
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
            prefix,
            pasteObject,
            objectPasted,
            inheritanceCreated,
            inheritancecount;

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
                                    childrenCommand({cid:pastecommand.cid+"_"+i+""+j,baseId:copylist[j],parentId:parent.relations.inheritorIds[i]},inheritanceCreated);
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
                    newobject = copyObject(object);
                    newobject[ID] = prefix+newobject[ID];
                    index = copylist.indexOf(object[ID]);
                    if(index !== -1){
                        copylist[index] = newobject[ID];
                    }
                    /*relations*/
                    newobject.relations.inheritorIds = [];
                    newobject.relations.parentId = prefix + newobject.relations.parentId;
                    for(i=0;i<newobject.relations.childrenIds.length;i++){
                        newobject.relations.childrenIds[i] = prefix + newobject.relations.childrenIds[i];
                    }
                    /*pointers*/
                    for(i in newobject.pointers){
                        if(subtreeids.indexOf(newobject.pointers[i].to) !== -1){
                            newobject.pointers[i].to = prefix + newobject.pointers[i].to;
                        }
                        for(j=0;j<newobject.pointers[i].from.length;j++){
                            if(subtreeids.indexOf(newobject.pointers[i].from[j]) !== -1){
                                newobject.pointers[i].from[j] = prefix + newobject.pointers[i].from[j];
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
        prefix = cCid+"_"+pastecommand.cid+"/";
        copylist = cClients[cCid].getCopyList();
        subtreeids = [];
        readcount = copylist.length;
        for(i=0;i<copylist.length;i++){
            readSubTree(copylist[i],function(error,result){
                if(error){
                    commandBuffer.commandFailed();
                    callCallBack();
                }
                else{
                    subtreeids = mergeArrays(subtreeids,result);
                    if(--readcount == 0){
                        pastecount = subtreeids.length;
                        for(j=0;j<subtreeids.length;j++){
                            pasteObject(subtreeids[j],objectPasted);
                        }
                    }
                }
            });
        }
    };
    childrenCommand = function(childrencommand,callback){
        var prefix,
            status,
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
        rCreateChild = function(parentId,baseId){
            var i;
            count++;
            inheritObject(baseId,prefix,function(err,inherited){
                if(err){
                    status = false;
                    childrenCreated();
                }
                else{
                    commandBuffer.get(parentId,function(err,parent){
                        if(err){
                            status = false;
                            childrenComplete();
                        }
                        else{
                            parent.relations.childrenIds.push(inherited[ID]);
                            commandBuffer.set(parent[ID],parent);
                            inherited.relations.parentId = parent[ID];
                            commandBuffer.set(inherited[ID],inherited);
                            for(i=0;i<parent.relations.inheritorIds.length;i++){
                                rCreateChild(parent.relations.inheritorIds[i],inherited[ID]);
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
        prefix = cCid+"_"+childrencommand.cid+"/";
        rCreateChild(childrencommand.parentId,childrencommand.baseId);
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
                    removeFromArray(oldtoobj.pointers[pointcommand.name].from,fromobj[ID]);
                    commandBuffer.set(oldtoobj[ID],oldtoobj);
                }
            }
            if(toobj){
                fromobj.pointers[pointcommand.name].to = toobj[ID];
                if(toobj.pointers[pointcommand.name] === null || toobj.pointers[pointcommand.name] === undefined){
                    toobj.pointers[pointcommand.name] = {to:null, from:[]};
                }
                insertIntoArray(toobj.pointers[pointcommand.name].from,fromobj[ID]);
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
        rReadObject = function(id){
            count++;
            commandBuffer.get(id,function(err,object){
                if(err){
                    state=false;
                    objectRead();
                }
                else{
                    insertIntoArray(readIds,id);
                    for(i=0;i<object.relations.childrenIds.length;i++){
                        rReadObject(object.relations.childrenIds[i]);
                    }
                    objectRead();
                }
            });
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
        rReadObject = function(id){
            count++;
            commandBuffer.get(id,function(err,object){
                if(err){
                    state=false;
                    objectRead();
                }
                else{
                    insertIntoArray(readIds,id);
                    for(i=0;i<object.relations.inheritorIds.length;i++){
                        rReadObject(object.relations.inheritorIds[i]);
                    }
                    objectRead();
                }
            });
        };

        /*main*/
        state=true;
        count = 0;
        readIds = [];
        rReadObject(rootId);
    };

    inheritObject = function(baseId,prefix,cb){
        var i,
            count,
            inheritedobject;


        /*main*/
        readSubTree(baseId,function(err,subTreeIds){
            var quickCopyObject,
                objectCopied,
                newobject;
            objectCopied = function(){
                if(--count === 0){
                    cb(null,inheritedobject);
                }
            };
            quickCopyObject = function(id){
                var i;
                commandBuffer.get(id,function(err,object){
                    /*no error can happen!!!*/
                    newobject = copyObject(object);
                    newobject.attributes = {};
                    newobject.registry = {};

                    if(subTreeIds.indexOf(newobject.relations.parentId) !== -1){
                        newobject.relations.parentId = prefix + newobject.relations.parentId;
                    }
                    else{
                        newobject.relations.parentId = null;
                        inheritedobject = newobject;
                    }
                    for(i=0;i<newobject.relations.childrenIds.length;i++){
                        newobject.relations.childrenIds[i] = prefix + newobject.relations.childrenIds[i];
                    }

                    newobject.relations.baseId = object[ID];
                    newobject.relations.inheritorIds = [];

                    newobject[ID] = prefix+object[ID];

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
                count = subTreeIds.length;
                for(i=0;i<subTreeIds.length;i++){
                    quickCopyObject(subTreeIds[i]);
                }
            }
        });
    };


    /*main*/
    commandIds = [];
    for(i=0;i<cCommands.length;i++){
        commandIds.push(cCommands[i].cid);
    }
    commandBuffer = new CommandBuffer(cStorage,cCid,commandIds,cClients,CB);
    processCommand(cCommands[0]);
};
var Territory = function(cClient,cId){
    var cPatterns = {},
        cPreviousList = [],
        cCurrentList = [];

    /*public functions*/
    /*synchronous functions*/
    this.inTerritory = function(id){
        return (cCurrentList.indexOf(id) !== -1);
    };
    this.getId = function(){
        return cId;
    };

    /*asynchronous functions*/
    this.updatePatterns = function(newpatterns,storage,CB){
        var addToCurrentList,
            updateComplete,
            patternComplete,
            updatePattern,
            currentList,
            previousList,
            addedObjects,
            patternCounter,
            i;

        addToCurrentList = function(id,object,cb){
            if(currentList.indexOf(id) === -1){
                currentList.push(id);
                if(previousList.indexOf(id) === -1){
                    addedObjects[id] = object;
                }

                if(object.relations.baseId !== null && currentList.indexOf(object.relations.baseId) === -1){
                    storage.get(object.relations.baseId,function(err,base){
                        if(err){
                            logger.error("Territory.updatePatterns.addtoCurrentList base object not found "+object.relations.baseId);
                            cb(); return;
                        }
                        else{
                            addToCurrentList(object.relations.baseId,base,cb);
                        }
                    });
                }
                else{
                    cb();
                }
            }
            else{
                cb();
            }
        };
        updateComplete = function(){
            var i,
                removedObjects = {};

            for(i=0;i<previousList.length;i++){
                if(currentList.indexOf(previousList[i]) === -1){
                    removedObjects[previousList[i]] = null;
                }
            }
            cCurrentList = currentList;
            cPreviousList = previousList;
            cPatterns = newpatterns;
            CB(addedObjects,removedObjects);
        };

        patternComplete = function(){
            console.log("kecso2-"+patternCounter);
            if(--patternCounter === 0){
                updateComplete();
            }
        };
        updatePattern = function(originId,rules){
            var i,
                ruleComplete,
                ruleCounter,
                ruleChains,
                updateRule;

            ruleComplete = function(){
                console.log("kecso1-"+ruleCounter);
                if(--ruleCounter === 0){
                    patternComplete();
                    return;
                }
            };
            updateRule = function(currentId,rulename,rulevalue){
                var i,
                    next;
                if(rulevalue === 0){
                    ruleComplete();
                }
                else{
                    console.log("kecso4");
                    storage.get(currentId,function(err,object){
                        console.log("kecso5");
                        if(err){
                            logger.error("Territory.updatePatterns.updatePattern.updateRule cannot get object "+currentId);
                            ruleComplete();
                        }
                        else{
                            console.log("kecso3-"+JSON.stringify(object));
                            if(object){
                                if(insertIntoArray(ruleChains[rulename],currentId)){
                                    addToCurrentList(currentId,object,function(){
                                        next = object.relations[rulename];
                                        if(next){
                                            rulevalue--;
                                            if(next instanceof Array){
                                                if(next.length > 0){
                                                    ruleCounter+=next.length-1;
                                                    for(i=0;i<next.length;i++){
                                                        updateRule(next[i],rulename,rulevalue);
                                                    }
                                                }
                                                else{
                                                    ruleComplete();
                                                }
                                            }
                                            else{
                                                updateRule(next,rulename,rulevalue);
                                            }
                                        }
                                        else{
                                            ruleComplete();
                                        }
                                    });
                                }
                                else{
                                    /*it was already in the current chain, so we should stop*/
                                    ruleComplete();
                                }
                            }
                            else{
                                /*the object under deletion*/
                                ruleComplete();
                            }
                        }
                    });
                }
            };

            /*main*/
            ruleCounter = 0;
            ruleChains = {};
            for(i in rules){
                ruleCounter++;
            }
            if(ruleCounter === 0){
                patternComplete();
            }
            else{
                for(i in rules){
                    ruleChains[i] = [];
                    updateRule(originId,i,rules[i]);
                }
            }
        };

        /*main*/
        if(newpatterns === undefined || newpatterns === null){
            newpatterns = copyObject(cPatterns);
        }
        previousList = copyObject(cCurrentList);
        currentList = [];
        addedObjects = {};
        patternCounter = 0;
        for(i in newpatterns){
            patternCounter++;
        }
        if(patternCounter === 0){
            updateComplete();
        }
        else{
            for(i in newpatterns){
                updatePattern(i,newpatterns[i]);
            }
        }
    };
};
var Client = function(cIoSocket,cId,cReadStorage,cProject){
    var cObjects = {},
        cClipboard = [], /*it has to be on client level*/
        cTerritories = {},
        cSelf = this;
    /*message handlings*/
    cIoSocket.on('clientMessage',function(msg){
        /*you have to simply put it into the transaction queue*/
        var clientmsg = {}; clientmsg.client = cId; clientmsg.msg = msg;
        cProject.onClientMessage(clientmsg);
        cIoSocket.emit('clientMessageAck');
    });
    cIoSocket.on('serverMessageAck',function(msg){
        /*we are happy :)*/
    });
    cIoSocket.on('serverMessageNack',function(msg){
        /*we are not that happy but cannot do much*/
        console.log("client: "+cId+" - serverMessageNack");
    });
    cIoSocket.on('disconnect',function(msg){
        logger.debug("Client.on.disconnect "+cId);
        if(cProject){
            cProject.deleteClient(cId);
        }
    });
    /*public functions*/
    this.getId = function(){
        return cId;
    }
    this.updateTerritory = function(territoryid,patterns,commandid){
        logger.debug("Client.updateTerritory "+territoryid+","+JSON.stringify(patterns)+","+commandid);
        if(cTerritories[territoryid] === undefined || cTerritories[territoryid] === null){
            cTerritories[territoryid] = new Territory(cSelf,territoryid);
        }
        cTerritories[territoryid].updatePatterns(patterns,cReadStorage,function(addedobjects,removedobjects){
            logger.debug("Client.updatePattern at territory result "+JSON.stringify(addedobjects)+","+JSON.stringify(removedobjects));
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
            msg.push({type:"command",cid:commandid,success:true});
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
        //logger.debug("Client.sendMessage "+JSON.stringify(msg));
        cIoSocket.emit('serverMessage',msg);
    };
    this.interestedInObject = function(objectid){
        if(cObjects[objectid]){
            return true;
        }
        return false;
    };
    this.refreshTerritories = function(storage,cb){
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
                    insertIntoArray(loadlist,i);
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
                        insertIntoArray(unloadlist,i);
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
                cTerritories[i].updatePatterns(null,storage,territoryRefreshed);
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
        cStorage,
        cIo = require('socket.io').listen(cPort),
        cSelf = this;
    if(commonUtil.StorageType === "test"){
        cStorage = new TestStorage(cProject,cBranch);
    }
    else if(commonUtil.StorageType === "mongodirty"){
        cStorage = new DirtyStorage(cProject,cBranch);
    }

    /*socket.IO listener*/
    cIo.set('log level', 1); // reduce logging
    cIo.sockets.on('connection', function(socket){
        logger.debug("SOCKET.IO CONN - "+JSON.stringify(socket.id));
        if(cClients[socket.id]){
            logger.debug("Project.connection - already connected client "+socket.id);
        }
        else{
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
            client = new Client(socket,id,new ReadStorage(cStorage),cSelf);
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
            process.exit(0);
        }
    };

    /*message handling*/
    this.onClientMessage = function(msg){
        logger.debug("Project.onClientMessage "+JSON.stringify(msg));
        cTransactionQ.onClientMessage(msg);
    };
    this.onProcessMessage = function(cid,commands,cb){
        new Commander(cStorage,cClients,cid,commands,cb);
    };
    this.onUpdateTerritory = function(clientId,commandId,territoryId,newpatterns){
        logger.debug("Project.onUpdateTerritory "+JSON.stringify(clientId)+","+JSON.stringify(commandId)+","+JSON.stringify(territoryId)+","+JSON.stringify(newpatterns));
        cClients[clientId].updateTerritory(territoryId,newpatterns,commandId);
    };
};
/*MAIN*/
var i,
    commandargs = process.argv.splice(" "),
    project;
logger.debug(commandargs);
if(commandargs.length !== 5){
    logger.error("proper usage: node proj3ct.js portnumber projectname branchname");
    process.exit(0);
}
else{
    project = new Project(Number(commandargs[2]),commandargs[3],commandargs[4]);
}


