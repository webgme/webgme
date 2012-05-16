var io = require('socket.io-client');
var fs=require('fs');
var T3stClient = function(storage,commands){
    var options = {
            transports: ['websocket'],
            'force new connection': true
        },
        socket = io.connect('http://localhost:8081',options),
        commandpointer,
        variables,
        state,
        idString,
        printLog,
        msgCallBack,
        printObjects,
        printContainment,
        printVariables,
        processLine,
        finalizeLine,
        lastResult;

    /*public functions*/
    this.runNextCommand = function(callback){
        if(state !== "ready"){
            callback(false);
            return;
        }
        if(commandpointer<commands.length){
            processLine(commands[commandpointer],callback);
        }
        else{
            state = "finished";
            callback(false);
        }
    };
    this.isFinished = function(){
        return state==="finished";
    };
    this.isReady = function(){
        return state === "ready";
    };
    this.getLastResult = function(){
        return lastResult;
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
        printLog('socketIO connection established');
        socket.emit('connectToBranch',"t3st");
    });
    socket.on('connectToBranchAck',function(msg){
        printLog('connection to project established');
        finalizeLine();
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

    /*command handling functions*/
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
    processLine = function(line,cb){
        var i,
            result = true,
            commands = JSON.parse(line),
            commandids = [];
        /*main*/
        state = "work";
        if(commands instanceof Array){
            /*we should send them as a command and wait for the result to come ;)*/
            for(i=0;i<commands.length;i++){
                commandids.push(commands[i].cid);
                if(variables[commands[i].parentId]){
                    commands[i].parentId = variables[commands[i].parentId];
                }
                if(variables[commands[i].baseId]){
                    commands[i].baseId = variables[commands[i].baseId];
                }
                if(variables[commands[i].id]){
                    commands[i].id = variables[commands[i].id];
                }
            }
            msgCallBack = function(msg){
                var i,
                    index;
                for(i=0;i<msg.length;i++){
                    if(msg[i].type === "command"){
                        index = commandids.indexOf(msg[i].cid);
                        if(index !== -1){
                            commandids.splice(index,1);
                            if(result && msg[i].success === false){
                                result = false;
                            }
                        }
                    }
                }
                if(commandids.length === 0){
                    commandpointer++;
                    finalizeLine(result,cb);
                }
            };
            socket.emit('clientMessage',{commands:commands});
        }
        else{
            /*tester commands*/
            if(commands.type === "wait"){
                setTimeout(function(){
                    commandpointer++;
                    finalizeLine(true,cb);
                },commands.period || 5000);
            }
            else if(commands.type === "printObjects"){
                printObjects();
                commandpointer++;
                finalizeLine(true,cb);
            }
            else if(commands.type === "printContainment"){
                printContainment();
                commandpointer++;
                finalizeLine(true,cb);
            }
            else if(commands.type === "find"){
                if(commands.variable && commands.pattern){
                    for(i in objects){
                        if(i.search(commands.pattern) !== -1){
                            variables[commands.variable] = i;
                            break;
                        }
                    }
                }
                commandpointer++;
                finalizeLine(true,cb);
            }
            else if(commands.type === "printVariables"){
                printVariables();
                commandpointer++;
                finalizeLine(true,cb);
            }
        }
    };
    finalizeLine = function(result,cb){
        msgCallBack = null;
        state = "ready";
        if(result){
            lastResult = result;
        }
        if(cb){
            cb(result);
        }
    };


    /*testing commands*/
    /*main*/
    commandpointer = 0;
    variables = {};
    lastResult = true;
    state = "init";
};

var nextCommands = function(result){
    var i,
        finishednum,
        clientnum;
    if(result){
        finishednum = 0;
        clientnum = 0;
        for(i in clients){
            clientnum++;
            if(clients[i].isReady()){
                clients[i].runNextCommand(nextCommands);
            }
            else if(clients[i].isFinished()){
                finishednum++;
            }
        }
        if(finishednum === clientnum){
            process.exit(0);
        }
    }
    else{
        finishednum = 0;
        clientnum = 0;
        for(i in clients){
            clientnum++;
            if(clients[i].isFinished()){
                finishednum++;
            }
            else{
                if(clients[i].getLastResult() === false){
                    console.log("valami nem jott be");
                    process.exit(0);
                }
            }
        }
        if(finishednum === clientnum){

            setTimeout(function(){
                process.exit(0);
            },1000);
        }
        else{
            nextCommands(true);
        }
    }
};
/*main*/
var i,
    arguments = process.argv.splice(" "),
    clients = {},
    objects = {};
for(i=2;i<arguments.length;i++){
    clients["client_"+(i-1).toString()] = new T3stClient(objects,fs.readFileSync(arguments[i],"utf8").split("\n"));
}
setTimeout(function(){
    nextCommands(true);
},1000);
