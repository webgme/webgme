"use strict";
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8081');
var fs=require('fs');
var commands = fs.readFileSync("t3stcommands.wcf","utf8");
commands = commands.split('\n');
console.log(JSON.stringify(commands));
var commandpointer = 0;
var objects = [];

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
    var valid;
    if(commandpointer<commands.length){
        if(commands[commandpointer].length>0){
            valid = true;
            commands[commandpointer] = JSON.parse(commands[commandpointer]);
            if(commands[commandpointer].type === "wait"){
                setTimeout(
                    function(){
                        commandpointer++;
                        sendnextcommand();
                    },5000);
            }
            else{
                if((typeof commands[commandpointer].id) === "number"){
                    if(commands[commandpointer].id < objects.length){
                        commands[commandpointer].id = objects[commands[commandpointer].id];
                    }
                    else{
                        valid = false;
                    }
                }

                if((typeof commands[commandpointer].parentId) === "number"){
                    if(commands[commandpointer].parentId < objects.length){
                        commands[commandpointer].parentId = objects[commands[commandpointer].parentId];
                    }
                    else{
                        valid = false;
                    }
                }

                if((typeof commands[commandpointer].baseId) === "number"){
                    if(commands[commandpointer].baseId < objects.length){
                        commands[commandpointer].baseId = objects[commands[commandpointer].baseId];
                    }
                    else{
                        valid = false;
                    }
                }


                if(valid){
                    socket.emit('clientMessage',{commands:[commands[commandpointer]]});
                }
                else{
                    commandpointer++;
                    sendnextcommand();
                }
            }
        }
        else{
            commandpointer++;
            sendnextcommand();
        }
    }
    else{
        setTimeout(function(){
                console.log("objects:"+JSON.stringify(objects));
                process.exit(0);
            },5000);

    }
};
var commandresponded = function(msg){
    var i;
    console.log("commandpointer "+commandpointer);
    for(i=0;i<msg.length;i++){
        if(msg[i].type === "command" && msg[i].cid === commands[commandpointer].cid){
            commandpointer++;
            sendnextcommand();
        }
        else if(msg[i].type === "load"){
            objects.push(msg[i].id);
        }
    }
};

/*MAIN*/
