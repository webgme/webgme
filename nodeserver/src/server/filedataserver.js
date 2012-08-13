
/*MAIN*/
var i,
    io,
    fs = require('fs'),
    opened = false,
    storage,
    filepath,
    idregexp = new RegExp("^[#0-9a-zA-Z_]*$"),
    commandargs = process.argv.splice(" ");

if(commandargs.length !== 5){
    logger.error("proper usage: node proj3ct.js portnumber projectname branchname");
    process.exit(0);
}
else{
    filepath = "../test/"+commandargs[3]+"_"+commandargs[4]+".tpf";
    io = require('socket.io').listen(Number(commandargs[2]));
    io.sockets.on('connection', function (socket) {
        socket.on('open', function (callback) {
            if(opened){
                callback(null);
            }
            else{
                fs.readFile(filepath, 'utf8', function (err, data) {
                    if(err){
                        callback(err);
                    }
                    else{
                        storage = JSON.parse(data) || {};
                        opened = true;
                        setInterval(function(){
                            fs.writeFileSync(filepath, JSON.stringify(storage), 'utf8');
                        },10000);
                        callback(null);
                    }
                });
            }
        });
        socket.on('load',function(key,callback){
            if(storage[key]){
                callback(null,storage[key]);
            }
            else{
                callback("missing object",null);
            }
        });
        socket.on('save',function(node,callback){
            try{
                storage[node._id] = node;
                callback(null);
            }
            catch(e){
                callback("wrong object");
            }
        });
        socket.on('remove',function(key,callback){
            if(storage[key]){
                delete storage[key];
                callback(null);
            }
            else{
                callback("missing object");
            }
        });
        socket.on('close',function(callback){
            fs.writeFileSync(filepath, JSON.stringify(storage), 'utf8');
            opened = false;
            storage = null;
            if(callback){
                callback(null);
            }
        });
        socket.on('removeAll',function(callback){
            storage = {};
            callback(null);
        });
        socket.on('searchId',function(beginning,callback){
            callback(null,null);
        });
        socket.on('dumpAll',function(callback){
            console.log("storage dump...:");
            console.log(JSON.stringify(storage));
            console.log("storage dump end");
        });
    });
}

