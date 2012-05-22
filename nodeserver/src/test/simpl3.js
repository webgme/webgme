/*
format of the testcase setup:
setup:{clients:['id',]}

format of the latest lines in the testcase file:
{clientId:'id',servercommands:[],internalcommand:{},repeat:number of repeats}

available internal commands:
printVariables : pirnts out the stored variables and their values
printObject: prints the object ids which should be stored on the client machine
printContainment : prints the containment hierarchy among the downloaded object starting with the root
find: searches for a pattern among the downloaded object id's and store it to the given variable

internal command format:
{type: 'command name', pattern:'search criteria', variable:'variable name'}
 */
var io = require('socket.io-client');
var fs=require('fs');
var Client = function(host,storage){
    var options = {
            transports: ['websocket'],
            'force new connection': true
        },
        socket = io.connect(host,options),
        state = "init",
        idString,
        printLog,
        msgCallBack = null;

    this.runServerCommand = function(commands,callback){
        var i,
            commandids,
            commandstatus,
            handleResponse;

        handleResponse = function(msg){
            var i,
                alldone;
            for(i=0;i<msg.length;i++){
                if(msg[i].type === "command"){
                    commandids[msg[i].cid] = true;
                    if(commandstatus && msg[i].success === false){
                        commandstatus = false;
                    }
                }
            }
            alldone = true;
            for(i in commandids){
                if(!commandids[i]){
                    alldone=false;
                    break;
                }
            }
            if(alldone){
                msgCallBack = null;
                state = "ready";
                callback(commandstatus);
            }
        };
        /*main*/
        if(state!=="ready"){
            callback(false);
            return;
        }
        state = "working";
        msgCallBack = handleResponse;
        commandids = {};
        for(i=0;i<commands.length;i++){
            commandids[commands[i].cid] = false;
        }
        socket.emit(commands);
    };
    this.isReady = function(){
        return state === "ready";
    };
    /*private functions*/
    idString = function(){
        return "["+socket.socket.sessionid+"]";
    };
    printLog = function(text){
        console.log(idString()+" "+text);
    };
    /*socket functions*/
    socket.on('connect',function(msg){
        state = "ready";
    });
    socket.on('clientMessageAck',function(msg){
        printLog("clientMessageAck");
    });
    socket.on('serverMessage',function(msg){
        var i,
            commandsuccess;
        printLog("serverMessage: "+JSON.stringify(msg));
        socket.emit('serverMessageAck');
        commandsuccess = true;
        for(i=0;i<msg.length;i++){
            if(msg[i].type === "load" || msg[i].type === "create" || msg[i].type === "update"){
                storage[msg[i].id] = msg[i].object;
            }
            else if(msg[i].type === "unload"){
                delete storage[msg[i].id];
            }
            else if(msg[i].type === "delete"){
                storage[msg[i].id] = null;
            }

        }
        if(msgCallBack){
            msgCallBack(msg);
        }
    });

    /*main*/
};
var Test = function(host,tc){
    var i,
        config,
        clients,
        clientstates,
        linepointer,
        objects,
        variables,
        processLine,
        lineProcessed,
        doInternalCommand,
        printVariables,
        printObjects,
        printContainment,
        setVariable,
        testFailed;

    lineProcessed = function(){
        linepointer++;
        if(linepointer<tc.length){
            processLine();
        }
        else{
            process.exit(0);
        }
    };
    testFailed = function(){
        console.log("the test failed");
        process.exit(0);
    }
    processLine = function(){
        var line,
            serverCommandDone,
            executeServerCommands;

        serverCommandDone = function(result){
            if(!result){
                testFailed();
            }
            if(--line.repreats === 0){
                lineProcessed();
            }
            else{
                executeServerCommands();
            }
        };
        executeServerCommands = function(){
            var i,
                myline = JSON.parse(JSON.stringify(line));
            if(line.repeats > 1){
                for(i=0;i<myline.servercommands.length;i++){
                    myline.servercommands[i].cid += "_"+myline.repeats;
                }
            }
            clients[myline.clientId].runServerCommand(myline.servercommands,serverCommandDone);
        };
        /*main*/
        line = JSON.parse(tc[linepointer]);
        if(line.internalcommand){
            doInternalCommand(line.interalcommand);
        }
        else{
            line.repreats = line.repeats || 1;
            if(line.servercommands){
                executeServerCommands();
            }
        }
    };
    doInternalCommand = function(command){
        switch(command.type){
            case "printVariables":
                printVariables();
                break;
            case "printContainment":
                printContainment();
                break;
            case "printObjects":
                printObjects();
                break;
            case "find":
                setVariable(command.pattern,command.variable);
                break;
        }
        lineProcessed();
    };
    printContainment = function(){
        var printObjectContainmentLine,
            rPrintConatinment;
        printObjectContainmentLine = function(objectId){
            var i,
                line="";
            line+="["+storage[objectId]._id+"]->[";
            for(i=0;i<storage[objectId].relations.childrenIds.length;i++){
                line+=storage[objectId].relations.childrenIds[i]+",";
            }
            if(i>0){
                line = line.slice(0,line.lastIndexOf(","));
            }
            line+="]";
            printLog(line);
        };
        rPrintConatinment = function(id){
            var i;
            if(objects[id]){
                printObjectContainmentLine(id);
                for(i=0;i<storage[id].relations.childrenIds.length;i++){
                    rPrintConatinment(storage[id].relations.childrenIds[i]);
                }
            }
        };

        /*main*/
        printLog("Object containment information:");
        rPrintConatinment("root");
    };
    printObjects = function(){
        var i,
            line="Objects: ";
        for(i in storage){
            line+=i+",";
        }
        i = line.lastIndexOf(",");
        if(i !== -1){
            line = line.slice(0,i);
        }
        printLog(line);
    };
    printVariables = function(){
        printLog("VARIABLES: "+JSON.stringify(variables));
    };
    setVariable = function(pattern,name){
        var i;
        for(i in objects){
            if(i.search(pattern) !== -1){
                variables[name] = i;
            }
        }
    };
    /*main*/
    if(tc.length<2){
        process.exit(0);
    }
    config = JSON.parse(tc[0]);
    linepointer = 1;
    objects={};
    clients = {};
    clientstates = {};
    for(i=0;i<config.clients.length;i++){
        clients[config.clients[i]] = new Client(host,objects);
        clientstates[config.clients[i]] = "empty";
    }



};

