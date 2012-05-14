/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
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


var TestBasicSocket = function(CIoSocket,cLibrarian,CId){
    var cProject = "testproject",
        cBranch;

    /*basic socket messages*/
    CIoSocket.on('disconnect',function(msg){
        logger.debug("TestBasicSocket.on.disconnect "+CId);
        if(cProject !== undefined && cBranch !== undefined){
            cLibrarian.connectToBranch(cProject,cBranch,function(project){
                if(project){
                    project.deleteClient(CId);
                }
            });
        }
    });
    CIoSocket.on('connectToBranch',function(msg){
        logger.debug("TestBasicSocket.on.connectToBranch "+CId);
        cBranch = msg;

        cLibrarian.connectToBranch(cProject,cBranch,function(err,project){
            if(err){
                logger.debug("TestBasicSocket.emit.connectToBranchNack "+CId);
                CIoSocket.emit('connectToBranchNack');
                return;
            }

            if(project){
                if(project.addClient(CIoSocket,CId)){
                    logger.debug("TestBasicSocket.emit.connectToBranchAck "+CId);
                    CIoSocket.emit('connectToBranchAck',CId);
                }
                else{
                    logger.debug("TestBasicSocket.emit.connectToBranchNack "+CId);
                    CIoSocket.emit('connectToBranchNack');
                }
            }
            else{
                logger.debug("TestBasicSocket.emit.connectToBranchNack "+CId);
                CIoSocket.emit('connectToBranchNack');
            }
        });
    });


    /*public functions*/
    this.getId = function(){
        return CId;
    };
    this.getSocket = function(){
        return CIoSocket;
    };
};
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
        if(bufferedObjects[id]){
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
        for(i in bufferedObjects){
            if(objectStates[i] !== "read" && objectStates[i]!=="db"){
                cStorage.set(i,bufferedObjects[i],objectSaved);
            }
            else{
                objectSaved();
            }
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
var Commander = function(cStorage,cClients,cCid,cTerritories,cCommands,CB){
    var processCommand,
        commandProcessed,
        modifyCommand,
        copyCommand,
        pasteCommand,
        childrenCommand,
        deleteCommand,
        commandBuffer,
        readSubTree,
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
        var i,
            deleteObject,
            deletionComplete,
            objectDeleted,
            removeReference,
            removeReferral,
            removeChild,
            removeInheritor,
            count;

        deletionComplete = function(){
            callback();
        };
        objectDeleted = function(){
            if(--count === 0){
                deletionComplete();
            }
        };
        removeReference = function(refId,id,cb){
            commandBuffer.get(id,function(err,object){
                if(err){
                    cb();
                }
                else{
                    if(object.relations.referenceId === refId){
                        object.relations.referenceId = null;
                        commandBuffer.set(id,object);
                    }
                    else{
                        logger.error("Commander.deleteCommand.removeReference wrong reference info "+refId);
                    }
                    cb();
                }
            });
        };
        removeReferral = function(refId,id,cb){
            commandBuffer.get(id,function(err,object){
                var index;
                if(err){
                    cb();
                }
                else{
                    index = object.relations.referredIds.indexOf(refId);
                    if(index !== -1){
                        object.relations.referredIds.splice(index,1);
                        commandBuffer.set(id,object);
                    }
                    else{
                        logger.error("Commander.deleteCommand.removeReferral wrong reference info "+refId);
                    }
                    cb();
                }
            });
        };
        removeChild = function(childId,id,cb){
            commandBuffer.get(id,function(err,object){
                var index;
                if(err){
                    cb();
                }
                else{
                    index = object.relations.childrenIds.indexOf(childId);
                    if(index !== -1){
                        object.relations.childrenIds.splice(index,1);
                        commandBuffer.set(id,object);
                    }
                    else{
                        if(childId === deletecommand.id){
                            logger.error("Commander.deleteCommand.removeChild wrong child info "+childId+" in object "+id);
                        }
                    }
                    cb();
                }
            });
        };
        removeInheritor = function(inhId,id,cb){
            commandBuffer.get(id,function(err,object){
                var index;
                if(err){
                    cb();
                }
                else{
                    index = object.relations.inheritorIds.indexOf(inhId);
                    if(index !== -1){
                        object.relations.inheritorIds.splice(index,1);
                        commandBuffer.set(id,object);
                    }
                    else{
                        if(inhId === deletecommand.id){
                            logger.error("Commander.deleteCommand.removeInheritor wrong inheritor info "+inhId+" from object "+id);
                        }
                    }
                    cb();
                }
            });
        };

        deleteObject = function(id){
            /*main*/
            count++;
            commandBuffer.get(id,function(err,object){
                var i,
                    relationsRemoved;

                relationsRemoved = function(){
                    for(i=0;i<object.relations.childrenIds.length;i++){
                        deleteObject(object.relations.childrenIds[i]);
                    }
                    for(i=0;i<object.relations.inheritorIds.length;i++){
                        deleteObject(object.relations.inheritorIds[i]);
                    }
                    objectDeleted();
                };

                /*main*/
                if(err){
                    objectDeleted();
                }
                else{
                    removeChild(id,object.relations.parentId,function(){
                        removeInheritor(id,object.relations.baseId,function(){
                            removeReferral(id,object.relations.referenceId,function(){
                                var i,
                                    retfunc,
                                    innercount;
                                retfunc = function(){
                                    if(--innercount === 0){
                                        relationsRemoved();
                                    }
                                };
                                /*main*/
                                innercount = object.relations.referredIds.length;
                                if(innercount === 0){
                                    relationsRemoved();
                                }
                                else{
                                    for(i=0;i<object.relations.referredIds.length;i++){
                                        removeReference(id,object.relations.referredIds[i],retfunc)
                                    }
                                }
                            });
                        });
                    });
                }
            });
        };

        /*main*/
        count = 0;
        deleteObject(deletecommand.id);
    };
    pasteCommand = function(pastecommand){
        var i,
            status,
            copylist,
            prefix,
            count,
            doCopy,
            objectCopied,
            copyComlete;

        copyComlete = function(){
            if(status){
                commandProcessed();
            }
            else{
                commandBuffer.commandFailed();
            }
        };
        objectCopied = function(){
            if(--count === 0){
                copyComlete();
            }
        };
        doCopy = function(parentId,copyId){
            var i,
                newobject;
            count++;
            commandBuffer.get(parentId,function(err,parent){
                if(err){
                    status = false;
                    objectCopied();
                }
                else{
                  commandBuffer.get(copyId,function(err,fromobject){
                      var i,
                          relationsCreated;
                      relationsCreated = function(){
                          for(i=0;i<fromobject.relations.childrenIds.length;i++){
                              doCopy(newobject[ID],fromobject.relations.childrenIds[i]);
                          }
                          objectCopied();
                      };
                      /*main*/
                      if(err){
                          status = false;
                          objectCopied();
                      }
                      else{
                          newobject = copyObject(fromobject);
                          newobject.relations.childrenIds = [];
                          newobject.relations.parentId = parentId;
                          newobject.relations.inheritorIds = [];
                          newobject.relations.referredIds = [];
                          newobject[ID] = prefix+newobject[ID];
                          if(newobject.relations.referenceId){
                              commandBuffer.get(newobject.relations.referenceId,function(err,refobj){
                                  if(err){
                                      status = false;
                                      objectCopied();
                                  }
                                  else{
                                      refobj.relations.referredIds.push(newobject[ID]);
                                      commandBuffer.set(refobj[ID],refobj);
                                      if(newobject.relations.baseId){
                                          commandBuffer.get(newobject.relations.baseId,function(err,baseobj){
                                              if(err){
                                                  status=false;
                                                  objectCopied();
                                              }
                                              else{
                                                  baseobj.relations.inheritorIds.push(newobject[ID]);
                                                  relationsCreated();
                                              }
                                          });
                                      }
                                      else{
                                          relationsCreated();
                                      }
                                  }
                              });
                          }
                          else{
                              if(newobject.relations.baseId){
                                  commandBuffer.get(newobject.relations.baseId,function(err,baseobj){
                                      if(err){
                                          status=false;
                                          objectCopied();
                                      }
                                      else{
                                          baseobj.relations.inheritorIds.push(newobject[ID]);
                                          commandBuffer.set(baseobj[ID],baseobj);
                                          relationsCreated();
                                      }
                                  });
                              }
                              else{
                                  relationsCreated();
                              }
                          }
                      }
                  });
                }
            });
        };
        /*main*/
        status = true;
        prefix = cCid+"_"+pastecommand.cid+"/";
        copylist = cClients[cCid].getCopyList();
        for(i=0;i<copylist.length;i++){
            doCopy(pastecommand.id,copylist[i]);
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
    inheritObject = function(baseId,prefix,cb){
        var i,
            count,
            objectCopied,
            inheritedobject;

        objectCopied = function(){
            if(--count === 0){
                cb(null,inheritedobject);
            }
        };


        /*main*/
        count = 0;
        readSubTree(baseId,function(err,subTreeIds){
            var quickCopyObject,
                newobject;
            quickCopyObject = function(id){
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

                    if(subTreeIds.indexOf(newobject.relations.referenceId) !== -1){
                        newobject.relations.referenceId = prefix + newobject.relations.referenceId;
                    }
                    newobject.relations.referredIds = [];

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
                for(i=0;i<subTreeIds.length;i++){
                    count++;
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
                    return;
                }
                else{
                    storage.get(currentId,function(err,object){
                        if(err){
                            logger.error("Territory.updatePatterns.updatePattern.updateRule cannot get object "+currentId);
                            ruleComplete();
                            return;
                        }
                        else{
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
                                                return;
                                            }
                                            else{
                                                ruleComplete();
                                                return;
                                            }
                                        }
                                        else{
                                            updateRule(next,rulename,rulevalue);
                                            return;
                                        }
                                    }
                                    else{
                                        ruleComplete();
                                        return;
                                    }
                                });
                            }
                            else{
                                /*it was already in the current chain, so we should stop*/
                                ruleComplete();
                                return;
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
        logger.debug("Client.sendMessage "+JSON.stringify(msg));
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
        for(i in cTerritories){
            cTerritories[i].updatePatterns(null,storage,territoryRefreshed);
        }
    };
};
var Project = function(cProject,cBranch,cLibrarian){
    var cClients = {},
        cTerritories = {},
        cTransactionQ = new TransactionQueue(this),
        cStorage,
        cSelf = this;
    if(commonUtil.StorageType === "test"){
        cStorage = new TestStorage(cProject,cBranch);
    }
    else if(commonUtil.StorageType === "mongodirty"){
        cStorage = new DirtyStorage(cProject,cBranch);
    }

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
            cLibrarian.closeProject(cProject,cBranch);
        }
    };

    /*message handling*/
    this.onClientMessage = function(msg){
        logger.debug("Project.onClientMessage "+JSON.stringify(msg));
        cTransactionQ.onClientMessage(msg);
    };
    this.onProcessMessage = function(cid,commands,cb){
        new Commander(cStorage,cClients,cid,cTerritories,commands,cb);
    };
    this.onUpdateTerritory = function(clientId,commandId,territoryId,newpatterns){
        logger.debug("Project.onUpdateTerritory "+JSON.stringify(clientId)+","+JSON.stringify(commandId)+","+JSON.stringify(territoryId)+","+JSON.stringify(newpatterns));
        cClients[clientId].updateTerritory(territoryId,newpatterns,commandId);
    };
};
var TestLibrarian = function(){
    var cProjects = [],
        cSelf =this;

    /*public functions*/
    this.connectToBranch = function(project,branch,cb){
        var i,info,newproject;
        for(i=0;i<cProjects.length;i++){
            info = cProjects[i].getProjectInfo();
            if(info && info.project === project && info.branch === branch){
                cb(null,cProjects[i]);
                return;
            }
        }
        newproject = new Project(project,branch,cSelf);
        cProjects.push(newproject);
        cb(null,newproject);
    };
    this.closeProject = function(project,branch){
        var i,index,info;
        for(i=0;i<cProjects.length;i++){
            info = cProjects.getProjectInfo();
            if(info.project === project && info.branch === branch){
                index = i;
                break;
            }
        }
        cProjects.splice(index,1);
    };
};
var Server = function(cPort){
    var cConnectedSockets = [],
        httpGet,
        http = require('http').createServer(httpGet),
        io = require('socket.io').listen(http),
        cLibrarian = new TestLibrarian(),
        cServer = this,
        cClientSourceFolder = "/../client";
    io.set('log level', 1); // reduce logging


    http.listen(cPort);
    httpGet = function(req, res){
        logger.debug("HTTP REQ - "+req.url);

        if(req.url==='/'){
            req.url = '/index.html';
        }

        if (req.url.indexOf('/common/') === 0 ) {
            cClientSourceFolder = "/..";
        } else {
            cClientSourceFolder = "/../client";
        }

        FS.readFile(__dirname + cClientSourceFolder +req.url, function(err,data){
            if(err){
                res.writeHead(500);
                logger.error("Error getting the file:" +__dirname + cClientSourceFolder +req.url);
                return res.end('Error loading ' + req.url);
            }

            if(req.url.indexOf('.js')>0){
                logger.debug("HTTP RESP - "+req.url);
                res.writeHead(200, {
                    'Content-Length': data.length,
                    'Content-Type': 'application/x-javascript' });

            } else if (req.url.indexOf('.css')>0) {
                logger.debug("HTTP RESP - "+req.url);
                res.writeHead(200, {
                    'Content-Length': data.length,
                    'Content-Type': 'text/css' });

            }
            else{
                res.writeHead(200);
            }
            res.end(data);
        });
    };

    io.sockets.on('connection', function(socket){
        logger.debug("SOCKET.IO CONN - "+JSON.stringify(socket.id));
        cConnectedSockets.push(new TestBasicSocket(socket,cLibrarian,socket.id));
    });
};
/*MAIN*/
var server = new Server( commonUtil.ServerPort );

