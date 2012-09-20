define(['socket.io/socket.io.js'],function(){
    var Logger = function(server){
        var connection = null,
            connected = false,
            connecting = false,
            buffer = [];
        var log = function(msg){
            buffer.push(msg);
            sync();
        };
        var sync = function(){
            if(connected){
                if(buffer.length > 0){
                    connection.emit('log',buffer.pop());
                    sync();
                }
            } else {
                if(connecting){
                    //console.log("STILL CONNECTING - LOGGER");
                } else {
                    connection = io.connect(server);
                    connecting = true;
                    connection.on('connect',function(){
                        connected = true;
                        connecting = false;
                        sync();
                    });
                    connection.on('connect_failed',function(){
                        connected = false;
                        //console.log('CONNECT_FAILED - LOGGER');
                    });
                    connection.on('disconnect',function(){
                        connected = false;
                        //console.log('DISCONNECT - LOGGER');
                    });
                    connection.on('reconnect_failed', function(){
                        connected = false;
                        //console.log('RECONNECT_FAILED - LOGGER');
                    });
                    connection.on('reconnect', function(){
                        connected = false;
                        //console.log('RECONNECT - LOGGER');
                    });
                    connection.on('reconnecting', function(){
                        connected = false;
                        //console.log('RECONNECTING - LOGGER');
                    });
                }
            }
        };
        return {
            log : log
        }
    };

    return Logger;
});
