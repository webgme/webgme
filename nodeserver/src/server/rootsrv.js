var io = require('socket.io').listen(999);
var ioc = require('socket.io-client');
var CU = require('../common/commonUtil');
var rootHistory = [];
var currentRoot = null;

var storagesrv = ioc.connect(CU.hashbasedconfig.mongosrv);
storagesrv.emit('open',function(err){
    setInterval(function(){
        if(currentRoot === null){
            storagesrv.emit('load',"***root***",function(err,rootkey){
                if(err){

                }
                else{
                    if(rootkey){
                        currentRoot = rootkey.value;
                    }
                }
            });
        }
    },1000);

    io.sockets.on('connection', function(socket){
        console.log("connection arrived...");
        if(currentRoot){
            socket.emit('newRoot',currentRoot);
        }

        socket.on('modifyRoot',function(oldroot,newroot){
            console.log("root arived: "+oldroot+" -> "+newroot);
            if(oldroot === currentRoot || currentRoot === null){
                if(newroot){
                    rootHistory.push(newroot);
                    storagesrv.emit('save',{"_id":"***root***","value":newroot},function(err){
                        if(err){
                            console.log("saving new root failed: "+err);
                        }else{
                            currentRoot = newroot;
                            socket.broadcast.emit('newRoot',currentRoot);
                            socket.emit('newRoot',currentRoot);
                        }
                    });
                }
                else{
                    console.log("invalid new root: "+newroot);
                }
            }else{
                console.log("wrong oldroot:"+currentRoot+" != "+oldroot);
            }
        });
    });
});

