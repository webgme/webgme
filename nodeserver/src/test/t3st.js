"use strict";
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8081');
var fs=require('fs');
var lines = fs.readFileSync("t3stcommands.wcf","utf8");
lines = lines.split('\n');
var objects = {};
var variables = {};
var messagecallback;

socket.on('connect',function(msg){
    socket.emit('connectToBranch',"t3st");
});

socket.on('connectToBranchAck',function(msg){
    console.log("connectToBranchAck");
    if(lines.length === 0){
        console.log("no real input!!!");
    }
    else{
        processLine(lines[0]);
    }
});

socket.on('clientMessageAck',function(msg){
    console.log("clientMessageAck");
});
socket.on('serverMessage',function(msg){
    var i;
    console.log("serverMessage: "+JSON.stringify(msg));
    socket.emit('serverMessageAck');
    for(i=0;i<msg.length;i++){
        if(msg[i].type === "load" || msg[i].type === "create" || msg[i].type === "update"){
            objects[msg[i].id] = msg[i].object;
        }
        else if(msg[i].type === "unload"){
            delete objects[msg[i].id];
        }
        else if(msg[i].type === "delete"){
            objects[msg[i].id] = null;
        }
    }
    messagecallback(msg);
});

var printContainment = function(){
    var printObjectContainmentLine = function(objectId){
        var i,
            line="";
        line+="["+objects[objectId]._id+"]->[";
        for(i=0;i<objects[objectId].relations.childrenIds.length;i++){
            line+=objects[objectId].relations.childrenIds[i]+",";
        }
        if(i>0){
            line = line.slice(0,line.lastIndexOf(","));
        }
        line+="]";
        console.log(line);
    };
    var rPrintConatinment = function(id){
        var i;
        if(objects[id]){
            printObjectContainmentLine(id);
            for(i=0;i<objects[id].relations.childrenIds.length;i++){
                rPrintConatinment(objects[id].relations.childrenIds[i]);
            }
        }
    };

    /*main*/
    console.log("Object containment information:");
    rPrintConatinment("root");

};
var printObjects = function(){
    var i,
        line="Objects: ";
    for(i in objects){
        line+=i+",";
    }
    i = line.lastIndexOf(",");
    if(i !== -1){
        line = line.slice(0,i);
    }
    console.log(line);
};
var printVariables = function(){
    console.log("VARIABLES: "+JSON.stringify(variables));
}
var toNextLine = function(){
    lines.shift();
    if(lines.length === 0){
        setTimeout(function(){
            process.exit();
        },1);
    }
    else{
        if(lines[0] && lines[0] !== ""){
            processLine(lines[0]);
        }
        else{
            toNextLine();
        }
    }
};
var processLine = function(line){
    var i,
        commands = JSON.parse(line),
        commandids = [];
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
        messagecallback = function(msg){
            var i,
                index;
            for(i=0;i<msg.length;i++){
                if(msg[i].type === "command"){
                    index = commandids.indexOf(msg[i].cid);
                    if(index !== -1){
                        commandids.splice(index,1);
                    }
                }
            }
            if(commandids.length === 0){
                toNextLine();
            }
        };
        socket.emit('clientMessage',{commands:commands});
    }
    else{
        /*tester commands*/
        if(commands.type === "wait"){
            setTimeout(function(){
                toNextLine();
            },5000);
        }
        else if(commands.type === "printObjects"){
            printObjects();
            toNextLine();
        }
        else if(commands.type === "printContainment"){
            printContainment();
            toNextLine();
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
            toNextLine();
        }
        else if(commands.type === "printVariables"){
            printVariables();
            toNextLine();
        }
    }
};

/*MAIN*/