define(['socket.io/socket.io.js'],function(){
    'use strict';
    var ClientLog = function(server){
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
                if(!connecting){
                    connection = io.connect(server);
                    connecting = true;
                    connection.on('connect',function(){
                        connected = true;
                        connecting = false;
                        sync();
                    });
                    connection.on('connect_failed',function(){
                        connected = false;
                        connecting = false;
                    });
                    connection.on('disconnect',function(){
                        connected = false;
                        connecting = false;
                    });
                    connection.on('reconnect_failed', function(){
                        connected = false;
                        connecting = false;
                    });
                    connection.on('reconnect', function(){
                        connected = false;
                    });
                    connection.on('reconnecting', function(){
                        connected = false;
                    });
                }
            }
        };
        return {
            log : log
        }
    };

    return ClientLog;
});

