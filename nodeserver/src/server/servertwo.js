/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
/*
 * Server client message interface description:
 *
 * pattern:{id:"basenodeid",'referencename':(0-10)/"r"} - referencename is the name of the attribute which should be followed
 * command:
 *  territoryCommand:{cid:"commands id",type:"territory",id:"territoryid",patterns:["pattern"]}
 *  copyCommand:{cid:"commands id",type:"copy",ids:["objectids"]}
 *  pasteCommand:{cid:"commands id",type:"paste",id:"parentid"}
 *  modifyCommand:{cid:"commands id",type:"modify",id:"objectid",['attbiute':'newvalue']}
 *  deleteCommand:{cid:"commands id",type:"delete",id:"objectid"}
 *  saveCommand:{cid:"commands id",type:"save"}
 *
 * clientMessage:{ commands:["command"]}
 * transactionMsg:{client:"client's id", msg: "clientMessage"}
 *
 * serverMessageItem:
 *  loadItem:{type:"load",id:"objects id",object:{}}
 *  unloadItem:{type:"unload",id:"objects id"}
 *  commandItem:{type:"command",cid:"command id",success:"true/false"}
 *  deleteItem:{type:"delete",id:"objects id"}
 *  modifyItem:{type:"modify",id:"objects id",object:{}}
 * serverMessage:[serverMessageItem]
 */
/*COMMON FUNCTIONS*/
/*
simply add the item to the list
whatching that items should be exclusive
it return true if it was a new item
flase if it was already there
 */
var insertIntoArray = function(list,item){
    "use strict";
    if (list instanceof Array){
        if(list.indexOf(item) === -1){
            list.push(item);
            return true;
        }
        return false;
    }
    return false;
};
/*
var removeFromArray = function(list,item){
    if (list instanceof Array){
        var position = list.indexOf(item);
        if(position !== -1){
            list.splice(position,1);
        }
    }
};
*/
var mergeArrays = function(one,two){
    "use strict";
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
    "use strict";
    var str = number.toString(16);
    while(str.length<8){
        str = "0"+str;
    }
    return str;
};
var copyObject = function(object){
    "use strict";
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
LOGMANAGER.setLogLevel( LOGMANAGER.logLevels.ALL );
LOGMANAGER.useColors( true );
var logger = LOGMANAGER.create( "server" );

/*
 simplified basic socket without authentication
 and without complicated selection method...
 the project is always "testproject"
 */
var TestBasicSocket = function(CIoSocket,cLibrarian,CId){
    "use strict";
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
    /*private functions*/
};
/*
 this type of storage is only for testing
 it reads a simple file (_projectname+"_"+_branchname+".tpf")
 builds a memory storage from it and uses that
 -it never saves a thing!!!
 */
var TestStorage = function(cProjectName,cBranchName){
    "use strict";
    var cObjects = {},
        fs=require('fs');


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
    cObjects = fs.readFileSync("../test/"+cProjectName+"_"+cBranchName+".tpf");
    cObjects = JSON.parse(cObjects) || {};
};
/*
 this type of storage is use mongoDB
 but it doesn't make any versioning
 it only use the db=_projectname and coll=_branchname
 as a basis
 */
var DirtyStorage = function(cProjectName,cBranchName){
    "use strict";
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
                console.log("something wrong with the given branch!!!");
            }
            else{
                cObjects = result;
            }
        });
    });
};
/*
 reading interface for the storage classes
 */
var ReadStorage = function(cStorage){
    /*interface type object for read-only clients*/
    /*public functions*/
    this.get = function(id,cb){
        cStorage.get(id,cb);
    };
};
/*
 this class represents the transaction queue of a
 project, it queues all the requests from all the clients
 and serialize them, then proccess them one by one
 */
var TransactionQueue = function(cProject){
    "use strict";
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
            /*
             we go throuhg the message and search for the territory update
             items, as they are only readings they can go paralelly
             so we send them each to the proper place...
             */
            var territorymsg = cQueue[0],
                cid = territorymsg.client,
                updatecommands = [],
                i;
            for(i in territorymsg.msg.commands){
                /*
                 TODO
                 we should collect the same territory updates as they overwrite
                 each other but they should be not that many ;)
                 */
                if(territorymsg.msg.commands[i].type === 'territory'){
                    cProject.onUpdateTerritory(cid,territorymsg.msg.commands[i].id,territorymsg.msg.commands[i].patterns);
                }
                else{
                    updatecommands.push(territorymsg.msg.commands[i]);
                }
            }
            if(updatecommands.length>0){
                cProject.onProcessMessage(cid,updatecommands,messageHandled);
                //_canwork = false;
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
/*
 this is the class which handles a message of modifications
 from the client
 */
var Commander = function(cStorage,cClients,cCid,cTerritories,cCommands,CB){
    "use strict";
    var processCommand,copyCommand,modifyCommand,deleteCommand,pasteCommand,saveCommand,
        commandProcessed;
    processCommand = function(command){
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
            pasteCommand(command,"p_"+cCid+"_"+"_"+command.cid+"_");
        }
        else if(command.type === "save"){
            saveCommand(command);
        }
    };
    commandProcessed = function(){
        cCommands.shift();
        if(cCommands.length>0){
            processCommand(cCommands[0]);
        }
        else{
            /*
             the modifications were already sent
             so we only have to call the territory updates
             */
            /*TODO*/
            for(var i in cTerritories){
                cTerritories[i].updatePatterns();
            }
            CB();
        }
    };

    /*command handling messages*/
    copyCommand = function(copycommand){
        cClients[cCid].copy(copycommand.ids);
        var msg = [];
        var commanditem = {type:"command",cid:copycommand.cid,success:true};
        msg.push(commanditem);
        cClients[cCid].sendMessage(msg);
        commandProcessed();
    };
    modifyCommand = function(modifycommand){
        var myobject = undefined;
        var commanditem = {type:"command",cid:modifycommand.cid,success:true};
        var msg = [];
        cStorage.get(modifycommand.id,function(error,object){
            if(error){
                commanditem.success = false;
                msg.push(commanditem);
                cClients[cCid].sendMessage(msg);
                commandProcessed();
            }
            else{
                myobject = object;
                for(var i in modifycommand){
                    if(i!=="id" && i!=="type" && i!=="cid"){
                        myobject[i] = modifycommand[i];
                    }
                }
                cStorage.set(modifycommand.id,myobject,function(error){
                    if(error){
                        commanditem.success = false;
                        msg.push(commanditem);
                        cClients[cCid].sendMessage(msg);
                        commandProcessed();
                    }
                    else{
                        /*sending the new object to all affected client*/
                        var modifyitem = {type:"modify",id:modifycommand.id,object:myobject};
                        msg.push(modifyitem);
                        for(var i in cClients){
                            if(i!=cCid){
                                if(cClients[i].interestedInObject(modifycommand.id)){
                                    cClients[i].sendMessage(msg);
                                }
                            }
                        }

                        msg.push(commanditem);
                        cClients[cCid].sendMessage(msg);
                        commandProcessed();
                    }
                });
            }
        });
    };
    deleteCommand = function(deletecommand){
        var deletedids = [];
        var modifiedparent = undefined;
        var counter = 0;
        var commanditem = {type:"command",cid:deletecommand.cid,success:true};
        var msg = [];

        var finishing = function(){
            /*we have to send the delete events to affected clients*/
            for(var i in cClients){
                msg = [];
                if(modifiedparent !== undefined && cClients[i].interestedInObject(modifiedparent._id)){
                    msg.push({type:"modify",id:modifiedparent._id,object:modifiedparent});
                }
                for(var j in deletedids){
                    if(cClients[i].interestedInObject(deletedids[j])){
                        msg.push({type:"delete",id:deletedids[j]});
                    }
                }
                if( i === cCid){
                    msg.push(commanditem);
                }
                cClients[i].sendMessage(msg);
            }
            commandProcessed();
        };
        var processing = function(objectid){
            counter++;
            cStorage.get(objectid,function(error,object){
                if(error){
                    commanditem.success = false;
                    msg.push(commanditem);
                    cClients[cCid].sendMessage(msg);
                    commandProcessed();
                }
                else{
                    if(object.children instanceof Array){
                        for(var i in object.children){
                            processing(object.children[i]);
                        }
                    }
                    cStorage.del(objectid,function(error){
                        if(error){
                            /*TODO*/
                        }
                        else{
                            deletedids.push(objectid);
                            if(--counter == 0){
                                finishing();
                            }
                        }
                    });
                }
            });
        };

        /*main*/
        cStorage.get(deletecommand.id,function(error,object){
            if(error){
                commanditem.success = false;
                msg.push(commanditem);
                cClients[cCid].sendMessage(msg);
                commandProcessed();
            }
            else{
                if(object.parent){
                    cStorage.get(object.parent,function(error,parent){
                        if(error){
                            commanditem.success = false;
                            msg.push(commanditem);
                            cClients[cCid].sendMessage(msg);
                            commandProcessed();
                        }
                        else{
                            if(parent.children instanceof Array){
                                if(parent.children.indexOf(deletecommand.id) !== -1){
                                    parent.children.splice(parent.children.indexOf(deletecommand.id),1);
                                }
                            }
                            cStorage.set(parent._id,parent,function(error){
                                if(error){
                                    commanditem.success = false;
                                    msg.push(commanditem);
                                    cClients[cCid].sendMessage(msg);
                                    commandProcessed();
                                }
                                else{
                                    modifiedparent = parent;
                                    processing(deletecommand.id);
                                }
                            });
                        }
                    });
                }
                else{
                    processing(deletecommand.id);
                }
            }
        });
    };
    pasteCommand = function(pastecommand,prefix){
        var msg = [];
        var commanditem = {type:"command",cid:pastecommand.cid,success:true};
        var modifiedparent = undefined;
        var createdobjects = {};
        var counter = 0;

        var finishing = function(){
            for(var i in cClients){
                msg = [];
                if(cClients[i].interestedInObject(modifiedparent._id)){
                    msg.push({type:"modify",id:modifiedparent._id,object:modifiedparent});
                }

                for(var j in createdobjects){
                    if(cClients[i].interestedInObject(j)){
                        msg.push({type:"crete",id:j,object:createdobjects[j]});
                    }
                }
                if(i === cCid){
                    msg.push(commanditem);
                }
                if(msg.length>0){
                    cClients[i].sendMessage(msg);
                }
            }
            commandProcessed();
        };
        var copyobject = function(parentid,tocopyid){
            counter++;
            cStorage.get(tocopyid,function(error,object){
                if(error){
                    /*TODO*/
                }
                else{
                    var newobj = {};
                    for(var i in object){
                        newobj[i] = object[i];
                    }
                    newobj._id = prefix+newobj._id;
                    newobj.parent = parentid;
                    newobj.children = [];
                    for(var i in object.children){
                        if(createdobjects[object.children[i]] === undefined && object.children[i] !== newobj._id){
                            newobj.children.push(prefix+object.children[i]);
                        }
                    }

                    cStorage.set(newobj._id,newobj,function(error){
                        if(error){
                            /*TODO*/
                        }
                        else{
                            createdobjects[newobj._id] = newobj;
                            if(newobj.children.length>0){
                                for(var i in object.children){
                                    if(createdobjects[object.children[i]] === undefined){
                                        copyobject(newobj._id,object.children[i]);
                                    }
                                }
                            }
                            if(--counter === 0){
                                finishing();
                            }
                        }
                    });
                }
            });
        };
        /*main*/
        cStorage.get(pastecommand.id,function(error,object){
            if(error){
                commanditem.success = false;
                msg.push(commanditem);
                cClients[cCid].sendMessage(msg);
                commandProcessed();
            }
            else{
                var copyarray = cClients[cCid].getCopyList();
                for(var i in copyarray){
                    object.children.push(prefix+copyarray[i]);
                }
                cStorage.set(object._id,object,function(error){
                    if(error){
                        commanditem.success = false;
                        msg.push(commanditem);
                        cClients[cCid].sendMessage(msg);
                        commandProcessed();
                    }
                    else{
                        modifiedparent = object;
                        for(var i in copyarray){
                            copyobject(modifiedparent._id,copyarray[i]);
                        }
                    }

                });
            }
        });
    };
    saveCommand = function(savecommand){
        cStorage.save(function(error){
            if(error){
                cClients[cCid].sendMessage([{type:"command",cid:savecommand.cid,success:false}]);
            }
            else{
                cClients[cCid].sendMessage([{type:"command",cid:savecommand.cid,success:true}]);
            }
            commandProcessed();
        });
    };

    /*main*/
    processCommand(cCommands[0]);
};
/*
 this class represents the attached socket
 it is directly related to a given Project
 */
var Client = function(cIoSocket,cId,cProject){
    "use strict";
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
    this.onUpdateTerritory = function(added,removed){
        logger.debug("Client.onUpdateTerritory "/*+JSON.stringify(added)+","+JSON.stringify(removed)*/);
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
/*
 this class represents an active branch of a real project
 */
var Project = function(cProject,cBranch){
    "use strict";
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
        logger.debug("Project.deleteClient "+id);
        delete cClients[id];
    };

    /*message handling*/
    this.onClientMessage = function(msg){
        logger.debug("Project.onClientMessage "+JSON.stringify(msg));
        cTransactionQ.onClientMessage(msg);
    };
    this.onProcessMessage = function(cid,commands,cb){
        new Commander(cStorage,cClients,cid,cTerritories,commands,cb);
    };
    this.onUpdateTerritory = function(cid,tid,newpatterns){
        logger.debug("Project.onUpdateTerritory "+JSON.stringify(cid)+","+JSON.stringify(tid)+","+JSON.stringify(newpatterns));
        if(cTerritories[tid] === undefined || cTerritories[tid] === null){
            var territory = new Territory(cClients[cid],tid);
            territory.attachStorage(new ReadStorage(cStorage));
            cTerritories[cid+tid] = territory;
        }
        cTerritories[cid+tid].updatePatterns(newpatterns);
    };
};
/*
 this librarian has a simplified interface
 it can only stores the open projects
 and can give them back to the connectToBranch request
 */
var TestLibrarian = function(){
    "use strict";
    var CProjects = [];

    /*public functions*/
    this.connectToBranch = function(project,branch,cb){
        var i,info,newproject;
        for(i=0;i<CProjects.length;i++){
            info = CProjects[i].getProjectInfo();
            if(info && info.project === project && info.branch === branch){
                cb(null,CProjects[i]);
                return;
            }
        }
        newproject = new Project(project,branch);
        CProjects.push(newproject);
        cb(null,newproject);
    };
};
/*
represents the static HTTP server and the socket.io server
it accepts the connections
serves the static file requests
 */
var Server = function(cPort){
    "use strict";
    var cConnectedSockets = [],
         http = require('http').createServer(httpGet),
         io = require('socket.io').listen(http),
         cLibrarian = new TestLibrarian(),
         cServer = this,
         cClientSourceFolder = "/../client";
    io.set('log level', 1); // reduce logging


    http.listen(cPort);
    function httpGet(req, res){
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
    }

    io.sockets.on('connection', function(socket){
        logger.debug("SOCKET.IO CONN - "+JSON.stringify(socket.id));
        cConnectedSockets.push(new TestBasicSocket(socket,cLibrarian,socket.id));
    });
};
/*
it represents the entity which knows about all the
projects and all the branches on the server
it can connect a BasicSocket to a Project
which finally made the BasicSocket to a Client...
 */
/*
var Librarian = function(){
    var _basedir = "../projects";
    var _projects = [];

    this.getAvailableProjects = function(){
        var directory = FS.readdirSync(_basedir);
        var projects = [];
        for(var i in directory){
            if(directory[i].indexOf('.') === -1){
                projects.push(directory[i]);
            }
        }
        return projects;
    };
    this.createProject = function(project){
        try{
            FS.mkdirSync(_basedir+"/"+project);
            return true;
        }
        catch(e){
            return false;
        }
    };
    this.getActiveBranches = function(project){
    	var branches = {};
        if(project === undefined || project === null || project === ""){
            return branches;
        }
        for(var i in _projects){
            var info = _projects[i].getProjectInfo();
            if(info.project === project){
                branches[info.branch] = true;
            }
        }
        var directory = FS.readdirSync(_basedir+"/"+project);
        for(var i in directory){
            if(directory[i].indexOf(".bif") !== -1){
                var branch = directory[i].substr(0,directory[i].indexOf(".bif"));
                if(branches[branch] === undefined){
                    branches[branch] = false;
                }
            }
        }
        return branches;
    };
    this.createBranch = function(project,branch){
        var branches = this.getActiveBranches(project);
        if(branches[branch] === undefined){
            if(FS.writeFileSync(_basedir+"/"+project+"/"+branch+".bif","{}")){
                return true;
            }
            else{
                return false;
            }
        }
        else{
            return false;
        }
    };
    this.connectToBranch = function(project,branch){
        for(var i in _projects){
            var info = _projects[i].getProjectInfo();
            if(info.project === project && info.branch === branch){
                return _projects[i];
            }
        }
        var branches = this.getActiveBranches(project);
        if(branches[branch] === undefined){
            return undefined;
        }

        var project = createProject(project,branch);
        return project;
    };
    this.disconnect = function(){

    };

    var createProject = function(project,branch){
        var basedir = _basedir+"/"+project;
        var project = new Project(project,branch,basedir);
        _projects.push(project);
        return project;
    };
};
*/
/*
similar to the Librarian but it operates on the mongoDB
 */
/*
var MongoLibrarian = function(){
    var _info = undefined;
    var _users = undefined;
    var _projects = [];

    var _HOST = 'localhost';
    var _PORT = 27017;
    var _MONGO = require('mongodb');
    var _DB = new _MONGO.Db('Librarian', new _MONGO.Server(_HOST, _PORT, {},{}));


    this.authenticateUser = function(login,pwd,cb){
        if(_users){
            _users.findOne({_id:login},function(err,result){
                if(err){
                    cb(err);
                }
                else{
                    if(result.pwd === pwd){
                        cb(null);
                    }
                    else{
                        cb(2);
                    }
                }
            });
        }
        else{
            cb(1);
        }
    };
    this.getAvailableProjects = function(cb){
        if(_info){
            _info.findOne({_id:"aProjects"},function(err,result){
                if(err){
                    cb(err);
                }
                else{
                    cb(null,result.aProjects);
                }
            });
        }
        else{
            return cb(1,null);
        }
    };
    this.createProject = function(project,cb){
    };
    this.getActiveBranches = function(project,cb){
        if(_info){
            _info.findOne({_id:project},function(err,result){
                if(err){
                    cb(err);
                }
                else{
                    var branches = {};
                    for(var i=0;i<result.branches.length;i++){
                        branches[result.branches[i]] = false;
                    }
                    for(var i=0;i<_projects.length;i++){
                        var info = _projects[i].getProjectInfo();
                        if(info){
                            if(info.project === project){
                                branches[info.branch] = true;
                            }
                        }
                    }
                    cb(null,branches);
                }
            });
        }
        else{
            cb(1);
        }
    };
    this.createBranch = function(project,branch,cb){
    };
    this.connectToBranch = function(project,branch,cb){
        for(var i=0;i<_projects.length;i++){
            var info = _projects[i].getProjectInfo();
            if(info && info.project === project && info.branch === branch){
                cb(null,_projects[i]);
                return;
            }
        }
        this.getActiveBranches(project,function(err,branches){
            if(err){
                cb(err);
                return;
            }
            else{
                for(var i in branches){
                    if(i === branch){
                        if(branches[i] === true){
                            cb(1);
                            return;
                        }
                        else{
                            var newproject = new Project(project,branch);
                            _projects.push(newproject);
                            cb(null,newproject);
                            return;
                        }
                    }
                }
                cb(2);
                return;
            }
        });
    };
    this.disconnect = function(){
    };

    _DB.open(function(){
        _DB.collection('info',function(err,result){
            if(err){
                console.log("ejnye-bejnye info nelkul nehez lesz!!!");
            }
            else{
                _info = result;
            }
        });
        _DB.collection('users',function(err,result){
            if(err){
                console.log("ejnye-bejnye users nelkul is nehez lesz!!!");
            }
            else{
                _users = result;
            }
        });
    });
};
*/
/*
this type of socket is only good for selecting a
project and connecting to it
creating a new branch or connecting to an existing one
 */
/*
var BasicSocket = function(_iosocket,_librarian,_id){
    var _login         = "";
    var _pwd           = "";
    var _project       = undefined;
    var _branch        = undefined;
    var _authenticated = false;

    _iosocket.on('disconnect',function(msg){
        logger.debug("BasicSocket.on.disconnect "+_id);
        var project = _librarian.connectToBranch(_project,_branch);
        if(project){
            project.deleteClient(_id);
        }
    });
    _iosocket.on('authenticate',function(msg){
        logger.debug("BasicSocket.on.authenticate "+_id);
        _login = msg.login;
        _pwd = msg.pwd;
        authenticate();
        if(_authenticated){
            logger.debug("BasicSocket.emit.AuthenticateAck "+_id);
            _iosocket.emit('authenticateAck');
        }
        else{
            logger.debug("BasicSocket.emit.AuthenticateNack "+_id);
            _iosocket.emit('authenticateNack');
        }
    });
    _iosocket.on('listProjects',function(msg){
        logger.debug("BasicSocket.on.listProjects "+_id);
    	var projects = _librarian.getAvailableProjects();
        logger.debug("BasicSocket.emit.listProjectsAck "+_id);
    	_iosocket.emit('listProjectsAck',projects);
    });
    _iosocket.on('createProject',function(msg){
        logger.debug("BasicSocket.on.createProject "+_id);
    	if(_librarian.createProject(msg)){
    		_project = msg;
    		_branch = undefined;
            logger.debug("BasicSocket.emit.createProjectAck "+_id);
    		_iosocket.emit('createProjectAck');
    	}
    	else{
    		_project = undefined;
    		_branch = undefined;
            logger.debug("BasicSocket.emit.createProjectNack "+_id);
    		_iosocket.emit('createProjectNack');
    	}
    });
    _iosocket.on('selectProject',function(msg){
        logger.debug("BasicSocket.on.selectProject "+_id);
    	var projects = _librarian.getAvailableProjects();
    	if(projects.indexOf(msg) !== -1){
    		_project = msg;
    		_branch = undefined;
            logger.debug("BasicSocket.emit.selectProjectAck "+_id);
    		_iosocket.emit('selectProjectAck');
    	}
    	else{
    		_project = undefined;
    		_branch = undefined;
            logger.debug("BasicSocket.emit.selectProjectNack "+_id);
    		_iosocket.emit('selectProjectNack');
    	}
    });
    _iosocket.on('listBranches',function(msg){
        logger.debug("BasicSocket.on.listBranches "+_id);
    	var branches = {};
        if(_project){
            branches = _librarian.getActiveBranches(_project);
        }
        logger.debug("BasicSocket.emit.listBranchesAck "+_id);
    	_iosocket.emit('listBranchesAck',branches);
    });
    _iosocket.on('createBranch',function(msg){
        logger.debug("BasicSocket.on.createBranch "+_id);
    	if(_librarian.createBranch(_project,msg)){
    		_branch = msg;
            logger.debug("BasicSocket.emit.createBranchAck "+_id);
    		_iosocket.emit('createBranchAck');
    	}
    	else{
    		_branch = undefined;
            logger.debug("BasicSocket.emit.createBranchNack "+_id);
    		_iosocket.emit('createBranchNack');
    	}
    });
    _iosocket.on('connectToBranch',function(msg){
        logger.debug("BasicSocket.on.connectToBranch "+_id);
        _branch = msg;
        var project = _librarian.connectToBranch(_project,_branch);
        if(project){
            if(project.addClient(_iosocket,_id)){
                logger.debug("BasicSocket.emit.connectToBranchAck "+_id);
                _iosocket.emit('connectToBranchAck',_id);
            }
            else{
                logger.debug("BasicSocket.emit.connectToBranchNack "+_id);
                _iosocket.emit('connectToBranchNack');
            }
        }
        else{
            logger.debug("BasicSocket.emit.connectToBranchNack "+_id);
            _iosocket.emit('connectToBranchNack');
        }
    });
    


    this.getId = function(){
        return _id;
    };

    var authenticate = function(){
        _authenticated = true;
    };
};
*/
/*
this class shows some objects and the
rules from which the server can figure out
which exact objects are important to the given
requestor...
Every client can have many Territory
 */
var Territory = function(cClient,cId){
    "use strict";
    var cPatterns = {},
        cPreviousList = [],
        cCurrentList = [],
        cReadStorage;

    /*public functions*/
    /*synchronous functions*/
    this.getLoadList = function(){
        var loadlist = [],i;
        for(i in cCurrentList){
            if(cPreviousList.indexOf(cCurrentList[i]) === -1){
                loadlist.push(cCurrentList[i]);
            }
        }
        return loadlist;
    };
    this.getUnloadList = function(){
        var unloadlist = [],i;
        for(i in cPreviousList){
            if(cCurrentList.indexOf(cPreviousList[i]) === -1){
                unloadlist.push(cPreviousList[i]);
            }
        }
        return unloadlist;
    };
    this.inTerritory = function(id){
        return (cCurrentList.indexOf(id) !== -1);
    };
    this.getId = function(){
        return cId;
    };
    this.attachStorage = function(storage){
        cReadStorage = storage;
    };
    this.detachStorage = function(){
        cReadStorage = undefined;
    };
    /*asynchronous functions*/
    this.updatePatterns = function(newpatterns){
        logger.debug("Territory.updatePatterns "+JSON.stringify(newpatterns));
        var clist = [];
        var plist = [];
        var added = {};
        var removed = {};
        for(var i in cCurrentList){
            plist.push(cCurrentList[i]);
        }
        if(newpatterns === undefined || newpatterns === null){
            newpatterns={};
            for(var i in cPatterns){
                var rule = {};
                for(var j in cPatterns[i]){
                    rule[j] = cPatterns[i][j];
                }
                newpatterns[i] = rule;
            }
        }
        else{
            for(var i in newpatterns){
                for(var j in newpatterns[i]){
                    if(newpatterns[i][j] !== 'r'){
                        newpatterns[i][j]++;
                    }
                }
            }
        }
        var progress = {};
        for(var i in newpatterns){
            progress[i] = false;
        }


        /*inner functions for handling patterns and rules*/
        var updateComplete = function(){
            /*
            this is the function which called when the whole
            update process is completed
            at this point the clist complete
            and the added list are complete as well
             */
            cPreviousList = plist;
            cCurrentList = clist;
            cPatterns = newpatterns;
            for(var i in plist){
                if(clist.indexOf(plist[i]) === -1){
                    removed[plist[i]] = null; /*no need for the object itself to unload*/
                }
            }
            cClient.onUpdateTerritory(added,removed);
        };
        var patternComplete = function(id){
            /*
            this function called when a single pattern
            have been fully processed
            it is called with the basenodeid, so the
            progress can be updated and if every pattern have been
            updated it can call the updateComplete function
             */
            progress[id] = true;
            for(var i in progress){
                if(progress[i] === false){
                    return;
                }
            }
            updateComplete();
        };
        var processPattern = function(basenodeid, rule){
            /*
            this is not the recurse real proessing function
            as we need namespace for our pattern related data
            to count when we really processed all the rules
             */
            var patterncounter = 0;
            var rulechains = {}; /*we will check for the loops with the help of this*/
            for(var i in rule){
                rulechains[i] = [];
            }

            var processing = function(id,rulename,innerrule){
                /*
                this is the recursive call
                 */
                patterncounter++;
                cReadStorage.get(id,function(error,object){
                    if(error){
                        /*
                        we stop as some error encountered
                         */
                        if(--patterncounter === 0){
                            patternComplete(basenodeid);
                        }
                    }
                    else{
                        /*check if we should put this object to added*/
                        insertIntoArray(clist,object._id);
                        if(plist.indexOf(object._id) === -1){
                            added[object._id] = object;
                        }
                        if(insertIntoArray(rulechains[rulename],object._id)){
                            /*no loop yet we can go on*/
                            var myrule = {};
                            myrule[rulename] = innerrule[rulename];
                            if(myrule[rulename] !== 'r'){
                                myrule[rulename]--;
                            }
                            /*check if we reached the end*/
                            if(myrule[rulename] === 0){
                                if(--patterncounter === 0){
                                    patternComplete(basenodeid);
                                }
                            }
                            else{
                                /*we should follow the rule still*/
                                if(object[rulename]){
                                    if(object[rulename] instanceof Array){
                                        /*we should call all 'children' recursively*/
                                        var haselement = false;
                                        for(var child in object[rulename]){
                                            haselement = true;
                                            processing(object[rulename][child],rulename,myrule);
                                        }
                                        if(!haselement){
                                            /*this is the end of the chain*/
                                            if(--patterncounter === 0){
                                                patternComplete(basenodeid);
                                            }
                                        }
                                        else{
                                            --patterncounter;
                                        }
                                    }
                                    else{
                                        processing(object[rulename],rulename,myrule);
                                        --patterncounter;
                                    }
                                }
                                else{
                                    /*this is the end of the chain*/
                                    if(--patterncounter === 0){
                                        patternComplete(basenodeid);
                                    }
                                }
                            }
                        }
                        else{
                            /*there is a loop so we finished with this chain*/
                            if(--patterncounter === 0){
                                patternComplete(basenodeid);
                            }
                        }

                    }
                });
            };

            /*main*/
            for(var i in rule){
                /*we should follow all the different rules*/
                processing(basenodeid,i,rule);
            }
        };

        /*main*/
        for(var i in newpatterns){
            processPattern(i,newpatterns[i]);
        }
    };

};
/*
this is the storage class
every active Project has one...
 */
/*
var Storage = function(cProjectName,cBranchName,cBaseDir){
    "use strict";
    var cObjects = {},
        cBranch,
        cCurrent;


    this.get = function(id,cb){
        setTimeout(function(){
            if(cObjects[id]){
                cb(null,cObjects[id]);
            }
            else{
                cb("noitemfound",null);
            }
        },STORAGELATENCY);
    };
    this.save = function(cb){
        saveRevision(true);
        setTimeout(cb(),STORAGELATENCY);

    };
    this.set = function(id,object,cb){
        cObjects[id] = object;
        setTimeout(cb(),STORAGELATENCY);
    };
    this.del = function(id,cb){
        delete cObjects[id];
        setTimeout(cb(),STORAGELATENCY);
    }

    var initialize = function(){
        cBranch = FS.readFileSync(cBaseDir+"/"+cBranchName+".bif");
        cBranch = JSON.parse(cBranch) || {};
        if(cBranch.revisions && cBranch.revisions.length > 0){
            loadRevision(cBranch.revisions[cBranch.revisions.length-1]);
            reserveRevision();
        }
        else{
            cBranch.revisions = [];
            cObjects = {};
            reserveRevision();
        }
    };
    var reserveRevision = function(){
        var directory = FS.readdirSync(cBaseDir);
        var maxrevision = 0;
        for(var i in directory){
            if(directory[i].indexOf(".rdf") !== -1){
                if(maxrevision<Number("0x"+directory[i].substr(0,8))){
                    maxrevision = Number("0x"+directory[i].substr(0,8));
                }
            }
        }
        maxrevision++;
        FS.writeFileSync(cBaseDir+"/"+numberToDword(maxrevision)+".rdf",JSON.stringify(cObjects));
        cCurrent = maxrevision;
        updateBranchInfo();
    };
    var loadRevision = function(revision){
        cObjects = FS.readFileSync(cBaseDir+"/"+numberToDword(revision)+".rdf");
        cObjects = JSON.parse(cObjects) || {};
    };
    var updateBranchInfo = function(){
        if(cBranch.revisions === undefined){
            cBranch.revisions = [];
        }
        cBranch.revisions.push(cCurrent);
        FS.writeFileSync(cBaseDir+"/"+cBranchName+".bif",JSON.stringify(cBranch));
    };
    var saveRevision = function(neednew){
        if(cCurrent === undefined){
            return;
        }

        FS.writeFileSync(cBaseDir+"/"+numberToDword(cCurrent)+".rdf",JSON.stringify(cObjects));
        if(neednew === true){
            reserveRevision();
        }
    };


    initialize();
    setInterval(function(){
        saveRevision(false);
    },5000);
};
*/


/*MAIN*/
var server = new Server( commonUtil.ServerPort );
