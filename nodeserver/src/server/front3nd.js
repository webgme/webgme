var BackEndClient = function(server,socket){
    var id = socket.remoteAddress,
        created = false;
    socket.on('data',function(data){
        console.log(data);
        var msg = {type:"createProject",project:"testproject",branch:"t3st"};
        if(!created){
            socket.write(JSON.stringify(msg),function(){
                console.log("data written");
                created = true;
                msg.branch = "other";
                socket.write(JSON.stringify(msg),function(){
                });
            });
        }
    });
    socket.on('end',function(){

    });
    server.disconnectClient(id);
};
var NetworkServer = function(port){
    var net = require('net'),
        self = this,
        clients = {},
        server = net.createServer(function(client){
            console.log("new distributor backend have been connected");
            client.setEncoding('utf8');
            clients[client.remoteAddress] = new BackEndClient(self,client);
        });

    this.disconnectClient = function(id){
        delete clients[id];
    };
    /*main*/
    server.listen(port,function(){
        console.log("ohom...");
    });
};

/*main*/
var server = new NetworkServer(8122);