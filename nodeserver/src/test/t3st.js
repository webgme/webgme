"use strict";
var io = require('socket.io-client');
var socket = io.connect('http://localhost:8081');

socket.on('connect',function(msg){
    socket.emit('connectToBranch',"t3st");
});

socket.on('connectToBranchAck',function(msg){
    console.log("connectToBranchAck");
    socket.emit('clientMessage',{commands:[{type:"territory",id:"t01",patterns:{"root":{children:-1}}}]});
});

socket.on('clientMessageAck',function(msg){
    console.log("clientMessageAck");
});
socket.on('serverMessage',function(msg){
    console.log("serverMessage: "+JSON.stringify(msg));
    socket.emit('serverMessageAck');
});
