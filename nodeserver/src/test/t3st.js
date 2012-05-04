"use strict";
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8081');
var fs=require('fs');
var commands = fs.readFileSync("t3stcommands.wcf","utf8");
commands = commands.split('\n');
console.log(JSON.stringify(commands));
var commandpointer = 0;

socket.on('connect',function(msg){
    socket.emit('connectToBranch',"t3st");
});

socket.on('connectToBranchAck',function(msg){
    console.log("connectToBranchAck");
    sendnextcommand();
});

socket.on('clientMessageAck',function(msg){
    console.log("clientMessageAck");
});
socket.on('serverMessage',function(msg){
    console.log("serverMessage: "+JSON.stringify(msg));
    socket.emit('serverMessageAck');
    commandresponded(msg);
});


var sendnextcommand = function(){
    if(commandpointer<commands.length){
        if(commands[commandpointer].length>0){
            commands[commandpointer] = JSON.parse(commands[commandpointer]);
            socket.emit('clientMessage',{commands:[commands[commandpointer]]});
        }
        else{
            commandpointer++;
            sendnextcommand();
        }
    }
    else{
        process.exit(0);
    }
};
var commandresponded = function(msg){
    var i;
    for(i=0;i<msg.length;i++){
        if(msg[i].type === "command" && msg[i].cid === commands[commandpointer].cid){
            commandpointer++;
            sendnextcommand();
        }
    }
};

/*MAIN*/
