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
            root,
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
            callback();
        };
        finalizeCommand = function(){
            var changedobjects,
                clientUpdated;

            clientUpdated = function(id,loadlist,removelist){
                var msg = [],
                    i,
                    objectid,
                    index,
                    rindex;

                for(i in changedobjects){
                    objectid = /*CORE.getStringPath(changedobjects[i].object,root)*/i;
                    index = loadlist.indexOf(objectid);
                    rindex = removelist.indexOf(objectid);
                    if(index !== -1){
                        msg.push({type:"load",id:objectid,object:changedobjects[i].object});
                        loadlist.splice(index,1);
                    }
                    else if(rindex !== -1){
                        msg.push({type:"unload",id:objectid,object:null});
                        removelist.splice(rindex,1);
                    }
                    else if(clients[id].interestedInObject(objectid)){
                        msg.push({type:/*changedobjects[i].info*/"update",id:objectid,object:changedobjects[i].object});
                    }
                }
                for(i=0;i<removelist.length;i++){
                    msg.push({type:"unload",id:removelist[i],object:null});
                }

                /*TODO: is there any chance that some object remains in the loadlist???*/
                /*TODO: the client refreshing should be updated to give back full nodes...*/

                if(id === clientId){
                    msg.push({type:"command",transactionId:transaction.transactionId,success:true});
                }

                clients[id].sendMessage(msg);
                callback();
            };
            CORE.persist(root,function(err,persistinfo){
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
                            CORE.setRegistry(node,i,modifycommand.registry[i]);
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
            var i,j,
                copylist =[],
                alreadyfailed = false,
                toobject;

            /*new main*/
            if(pastecommand.additional){
                for(i in pastecommand.additional){
                    copylist.push(i);
                }
            }
            else{
                copylist = clients[clientId].getCopyList();
            }

            CORE.loadByPath(pastecommand.id,function(err,parent){
                j=0;
                for(i=0;i<copylist.length;i++){
                    CORE.loadByPath(copylist[i],function(err,node){
                        var copyid,
                            i;
                        j++;
                        if(err){
                            if(!alreadyfailed){
                                alreadyfailed = true;
                                commandFailed();
                            }
                        }
                        else{
                            toobject = CORE.copyNode(node,parent,null);
                            if(pastecommand.additional){
                                copyid = CORE.getStringPath(node,root);
                                if(pastecommand.additional[copyid]){
                                    if(pastecommand.additional[copyid].attributes){
                                        for(i in pastecommand.additional[copyid].attributes){
                                            CORE.setAttribute(toobject,i,pastecommand.additional[copyid].attributes[i]);
                                        }
                                    }
                                    if(pastecommand.additional[copyid].registry){
                                        for(i in pastecommand.additional[copyid].registry){
                                            CORE.setRegistry(toobject,i,pastecommand.additional[copyid].registry[i]);
                                        }
                                    }
                                }
                            }
                            if(j === copylist.length){
                                if(!alreadyfailed){
                                    callback();
                                }
                            }
                        }
                    });
                }
            });
        };
        childrenCommand = function(childrencommand,callback){
            var child;

            if(childrencommand.parentId){
                CORE.loadByPath(childrencommand.parentId,function(err,parent){
                    if(err){
                        logger.error("GmeProject:284");
                        commandFailed();
                    }
                    else{
                        if(childrencommand.baseId){
                            CORE.loadByPath(childrencommand.baseId,function(err,base){
                                if(err){
                                    logger.error("GmeProject:291");
                                    commandFailed();
                                }
                                else{
                                    child = CORE.createNode(parent,base,childrencommand.newguid);
                                    callback();
                                }
                            });
                        }
                        else{
                            child = CORE.createNode(parent,null,childrencommand.newguid);
                            callback();
                        }
                    }
                });
            }
            else{
                logger.error("GmeProject:308");
                commandFailed();
            }
        };
        pointCommand = function(pointcommand,callback){
            CORE.loadByPath(pointcommand.id,function(err,source){
                if(err){
                    logger.error("l301");
                    commandFailed();
                }
                else{
                    if(pointcommand.to){
                        CORE.loadByPath(pointcommand.to,function(err,target){
                            if(err){
                                logger.error("l308");
                                commandFailed();
                            }
                            else{
                                CORE.setPointer(source,pointcommand.name,target);
                                callback();
                            }
                        })
                    }
                    else{
                        CORE.deletePointer(source,pointcommand.name);
                        callback();
                    }
                }
            });
        };

        CORE.loadRoot("root",function(err,node){
            if(err){
                logger.error("GmeProject:341");
            }
            else{
                root = node;
                processCommand(transaction.commands[0]);
            }
        });
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
                newlist = [],
                extendedlist = {},
                patterncounter,
                root,
                i;

            addToNewList = function(node){
                var base = node,
                    path = CORE.getStringPath(node,root);

                while(base && commonUtil.insertIntoArray(newlist,path)){
                    extendedlist[path] = base;
                    base = CORE.getBase(node);
                    if(base){
                        path = CORE.getStringPath(base,root);
                    }
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

                    count = 0;
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
                            if(commonUtil.insertIntoArray(pathchain,CORE.getStringPath(node,root))){
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

                    count = 0;
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
                        CORE.loadByPath(basenode,function(err,node){
                            if(err){
                                ruleComputed();
                            }
                            else{
                                computeRule(node,i,rules[i],ruleComputed);
                            }
                        });
                    }
                }
            };
            updateComplete = function(){
                var i,
                    removedobjects = {},
                    addedobjects = {};

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
            CORE.loadRoot("root",function(err,rootnode){
                if(err){
                    logger.error("GmeProject:540");
                }
                else{
                    root = rootnode;
                    if(newpatterns === undefined || newpatterns === null){
                        newpatterns = commonUtil.copy(cPatterns);
                    }
                    newlist = [];
                    patterncounter = 0;
                    for(i in newpatterns){
                        patterncounter++;
                    }
                    if(patterncounter === 0){
                        updateComplete();
                    }
                    else{
                        for(i in newpatterns){
                            computePattern(i,newpatterns[i],patternComplete);
                        }
                    }
                }
            });
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
                    cb(clientId,loadlist,unloadlist);
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
                cb(clientId,[],[]);
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
