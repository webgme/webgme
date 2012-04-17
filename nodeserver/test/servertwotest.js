







/*MAIN*/
var io = require('socket.io-client');
var helper = 0;

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
    socket.emit('createBranch',"test");
});
socket.on('selectProjectAck',function(msg){
    console.log("selectProjectAck");
    socket.emit('listBranches');
});
socket.on('selectProjectNack',function(msg){
    console.log("selectProjectNack");
    process.exit(0);
});
socket.on('createBranchAck',function(msg){
    console.log("createBranchAck");
    process.exit(0);
});
socket.on('createBranchNack',function(msg){
    console.log("createBranchNack");
    socket.emit('connectToBranch',"test");
});
socket.on('connectToBranchAck',function(msg){
    console.log("selectBranchAck");
    socket.emit('clientMessage',{commands:[{type:"territory",id:"t01",patterns:{"root":{children:"r"}}}]});
});
socket.on('connectToBranchNack',function(msg){
    console.log("selectBranchNack");
    process.exit(0);
});
socket.on('clientMessageAck',function(msg){
    console.log('clientMessageAck');
});
socket.on('clientMessageNack',function(msg){
    console.log('clientMessageNack');
    process.exit(0);
});

/*now we can test real data ;)*/
socket.on('serverMessage',function(msg){
    console.log("serverMessage "+JSON.stringify(msg));
    socket.emit('serverMessageAck');
    helper++;
    if(helper === 1){
        socket.emit('clientMessage',{commands:[{type:"territory",id:"t01",patterns:{"root":{children:1}}}]});
    }
    else if(helper === 2){
        socket.emit('clientMessage',{commands:[{type:"territory",id:"t01",patterns:{"root":{children:0}}}]});
    }
    else if(helper === 3){
        socket.emit('clientMessage',{commands:[{type:"territory",id:"t01",patterns:{"root":{children:"r"}}}]});
    }
    else if(helper === 4){
        socket.emit('clientMessage',{commands:[{cid:"egy", type:"delete", id:"id0424"}]});
    }
    else if(helper === 5){
        console.log("territory update should come as well");
    }
    else if(helper === 6){
        socket.emit('clientMessage',{commands:[{cid:"mostcopy",type:"copy",ids:["root","id0324"]}]});
    }
    else if(helper === 7){
        console.log("kuldom");
        socket.emit('clientMessage',{commands:[{cid:"mostpaste",type:"paste",id:["id0024"]}]});
    }
    else if(helper === 8){
        console.log("there should be a separate territory update message as well");
    }
    else if(helper === 9){
        socket.emit('clientMessage',{commands:[{cid:"masik",type:"modify",id:"root",name:"csunya"}]});
    }
    else if(helper === 10){
        socket.emit('clientMessage',{commands:[{cid:"ketto", type:"delete", id:"root"}]});
    }
    else if(helper === 11){
        console.log("wait for territory update again");
    }
    else{
        process.exit(0);
    }
});

