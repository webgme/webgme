var io = require('socket.io').listen(999);
var rootHistory = [];
var currentRoot = "#194611450a2abf268a075bb102c1513f06297ca1";
io.sockets.on('connection', function(socket){
    console.log("connection arrived...");
    if(currentRoot){
        socket.emit('newRoot',currentRoot);
    }
    socket.on('modifyRoot',function(oldroot,newroot){
        if(oldroot === currentRoot){
            rootHistory.push(newroot);
            currentRoot = newroot;
            socket.broadcast.emit('newRoot',currentRoot);
        }
    });
});

