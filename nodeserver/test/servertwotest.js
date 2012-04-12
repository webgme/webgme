







/*MAIN*/
var io = require('socket.io-client');

var socket = io.connect('http://localhost:8081');
socket.on('connect', function(){
    console.log("connect");
    socket.emit('authenticate',{login:"kecso",pwd:"turoburo"});
});
socket.on('authenticateAck', function(){
    console.log("authenticateAck");
    socket.emit('listProjects');
});
socket.on('listProjectsAck',function(msg){
    console.log("listProjectsAck "+JSON.stringify(msg));
    socket.emit('createProject',"testproject");
});
socket.on('createProjectNack',function(msg){
    console.log("createProjectNack");
    socket.emit('selectProject',"testproject")
});
socket.on('createProjectAck',function(msg){
    console.log("Ack");
    process.exit(0);
});
socket.on('listBranchesAck',function(msg){
    console.log("listBranchesAck "+JSON.stringify(msg));
    process.exit(0);
});
socket.on('selectProjectAck',function(msg){
    console.log("selectProjectAck");
    socket.emit('listBranches');
});
socket.on('selectProjectNack',function(msg){
    console.log("selectProjectNack");
    process.exit(0);
});
