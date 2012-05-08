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
var CommandBuffer = function(cStorage,cCid,cTerritories,cCommand,cClients,CB){
    var commandStatus,
        bufferedObjects,
        objectStates,
        completeCommand,
        flushBuffer;

    /*public functions*/
    this.get = function(id,cb){
        if(bufferedObjects[id]){
            cb(null,copyObject(bufferedObjects[id]));
        }
        else{
            cStorage.get(id,function(err,object){
                if(err){
                    cb(err);
                }
                else{
                    bufferedObjects[id]=object;
                    objectStates[id]="read";
                    cb(null,copyObject(bufferedObjects[id]));
                }
            });
        }
    };
    this.set = function(id,object){
        if(bufferedObjects[id] && objectStates[id]!=="delete"){
            bufferedObjects[id]=copyObject(object);
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
            bufferedObjects[id]=copyObject(object);
            objectStates[id]="create";
        }
    };
    this.commandFailed = function(){
        commandStatus = false;
        completeCommand();
    };
    this.commandSucceeds = function(){
        flushBuffer();
        completeCommand();
    };
    /*private function*/
    flushBuffer = function(){
        var count,
            objectSaved,
            i;

        objectSaved = function(err){
            if(--count === 0){
                completeCommand();
            }
        };

        /*main*/
        for(i in bufferedObjects){
            if(objectStates[i] !== "read"){
                count++;
                cStorage.set(i,bufferedObjects[i],objectSaved);
            }
        }
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
                    if(objectStates[j] !== "read"){
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
    commandStatus = true;
    bufferedObjects = {};
    objectStates = {};
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
        inheritObject;

    processCommand = function(command){
        commandBuffer = new CommandBuffer(cStorage,cCid,cTerritories,command,cClients,commandProcessed);
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
        else if(command.type === "createChild" || command.type === "createSubType"){
            childrenCommand(command);
        }
    };
    commandProcessed = function(){
        var i;
        cCommands.shift();
        commandBuffer={};
        if(cCommands.length>0){
            processCommand(cCommands[0]);
        }
        else{
            for(i in cTerritories){
                cTerritories[i].updatePatterns();
            }
            CB();
        }
    };

    /*commands*/
    copyCommand = function(copycommand){
        cClients[cCid].copy(copycommand.ids);
        commandBuffer.commandSucceeds();
    };
    modifyCommand = function(modifycommand){
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
                commandBuffer.commandSucceeds();
            }
        });
    };
    deleteCommand = function(deletecommand){
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
            commandBuffer.commandSucceeds();
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
                if(err){
                    cb();
                }
                else{
                    if(object.relations.referredIds.indexOf(refId) !== -1){
                        object.relations.referredIds.splice(object.relations.referredIds.indexOf(refId),1);
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
                if(err){
                    cb();
                }
                else{
                    if(object.relations.childrenIds.indexOf(childId) !== -1){
                        object.relations.childrenIds.splice(object.relations.childrenIds.indexOf(childId),1);
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
                if(err){
                    cb();
                }
                else{
                    if(object.relations.inheritorIds.indexOf(inhId) !== -1){
                        object.relations.inheritorIds.splice(object.relations.inheritorIds.indexOf(inhId),1);
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
                commandBuffer.commandSucceeds();
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
    childrenCommand = function(childrencommand){
        var prefix,
            status,
            count,
            childrenComplete,
            childrenCreated,
            rCreateChild;

        childrenComplete = function(){
            if(status){
                commandBuffer.commandSucceeds();
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
    processCommand(cCommands[0]);
};
var Territory = function(cClient,cId,cReadStorage){
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
    this.sendTerritory = function(){
        var i,
            amount,
            objectlist = {},
            receiveElement;
        receiveElement = function(err,object){
            if(err){
                logger.error("Territory.sendTerritory error in getting object "+err);
            }
            else{
                objectlist[object[ID]] = copyObject(object);
            }
            if(--amount === 0){
                cClient.onUpdateTerritory(objectlist,{});
            }
        };

        amount = cCurrentList.length;
        for(i=0;i<cCurrentList.length;i++){
            cReadStorage.get(cCurrentList[i],receiveElement);
        }
    };
    this.updatePatterns = function(newpatterns,cid){
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
                    addedObjects[id] = copyObject(object);
                }

                if(object.relations.baseId !== null && currentList.indexOf(object.relations.baseId) === -1){
                    cReadStorage.get(object.relations.baseId,function(err,base){
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
            cClient.onUpdateTerritory(addedObjects,removedObjects,cid);
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
                    next,
                    called;
                if(rulevalue === 0){
                    ruleComplete();
                    return;
                }
                else{
                    cReadStorage.get(currentId,function(err,object){
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
                                        called=false;
                                        if(next instanceof Array){
                                            for(i=0;i<next.length;i++){
                                                called = true;
                                                updateRule(next[i],rulename,rulevalue);
                                            }
                                            if(called){
                                                return;
                                            }
                                            else{
                                                updateComplete();
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
                ruleChains[i] = [];
                ruleCounter++;
                updateRule(originId,i,rules[i]);
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
            updatePattern(i,newpatterns[i]);
        }
        if(patternCounter === 0){
            updateComplete();
        }
    };
};
var Client = function(cIoSocket,cId,cProject){
    var cObjects = {},
        cClipboard = []; /*it has to be on client level*/
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
    this.onUpdateTerritory = function(added,removed,cid){
        logger.debug("Client.onUpdateTerritory "+JSON.stringify(added)+","+JSON.stringify(removed));
        var msg = [],i,additem,delitem;
        for(i in added){
            if(cObjects[i] === undefined){
                cObjects[i] = 1;
                additem = {}; additem.type = 'load'; additem.id = i; additem.object = added[i];
                msg.push(additem);
            }
            else{
                cObjects[i]++;
            }
        }
        for(i in removed){
            if(cObjects[i] === undefined){
                /*was already removed*/
            }
            else{
                cObjects[i]--;
                if(cObjects[i]<=0){
                    delete cObjects[i];
                    delitem = {}; delitem.type = 'unload'; delitem.id = i;
                    msg.push(delitem);
                }
            }
        }
        if(cid){
            msg.push({type:"command",cid:cid,success:true});
        }
        if(msg.length>0){
            cIoSocket.emit('serverMessage',msg);
        }
    };
    this.copy = function(objects){
        cClipboard = objects;
    };
    this.getCopyList = function(){
        return cClipboard;
    };
    this.sendMessage = function(msg){
        cIoSocket.emit('serverMessage',msg);
    };
    this.interestedInObject = function(objectid){
        if(cObjects[objectid]){
            return true;
        }
        return false;
    };
};
var Project = function(cProject,cBranch,cLibrarian){
    var cClients = {},
        cTerritories = {},
        cTransactionQ = new TransactionQueue(this),
        cStorage;
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
            client = new Client(socket,id,this);
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
    this.onUpdateTerritory = function(clid,cid,tid,newpatterns){
        logger.debug("Project.onUpdateTerritory "+JSON.stringify(clid)+","+JSON.stringify(cid)+","+JSON.stringify(tid)+","+JSON.stringify(newpatterns));
        if(cTerritories[tid] === undefined || cTerritories[tid] === null){
            var territory = new Territory(cClients[clid],tid,new ReadStorage(cStorage));
            cTerritories[clid+tid] = territory;
        }
        cTerritories[clid+tid].updatePatterns(newpatterns,cid);
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

