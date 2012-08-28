define([ "core/assert", "/socket.io/socket.io.js" ], function (ASSERT) {
    "use strict";

    var Mongo = function (options) {
        var ROOTNAME = "***root***";
        var socket = null;
        var connected = false;
        var isopen = false;
        var availableCB = null;

        var open = function (callback) {
            var tempsocket = io.connect(options.ip && options.port ? options.ip+":"+options.port+options.mongosrv : options.mongosrv);
            tempsocket.on('connect',function(){
                connected = true;
                if(availableCB){
                    availableCB();
                    availableCB = null;
                }
                console.log('CONNECT - SOCMONGO');
                if(!isopen){
                    tempsocket.emit('open',function(err){
                        if(err){
                            callback(err);
                        }
                        else{
                            socket = tempsocket;
                            isopen = true;
                            callback(null);
                        }
                    });
                }
            });
            tempsocket.on('connect_failed',function(){
                connected = false;
                console.log('CONNECT_FAILED - SOCMONGO');
            });
            tempsocket.on('disconnect',function(){
                connected = false;
                console.log('DISCONNECT - SOCMONGO');
            });
            tempsocket.on('reconnect_failed', function(){
                connected = false;
                console.log('RECONNECT_FAILED - SOCMONGO');
            });
            tempsocket.on('reconnect', function(){
                connected = false;
                console.log('RECONNECT - SOCMONGO');
            });
            tempsocket.on('reconnecting', function(){
                connected = false;
                console.log('RECONNECTING - SOCMONGO');
            });
        };
        var opened = function () {
            return isopen;
        };
        var close = function (callback) {
            var tempsocket = socket;
            socket = null;
            tempsocket.emit('close',function(){
                connected = false;
                isopen=false;
                if(callback){
                    callback(null);
                }
            });
        };
        var load = function (key, callback) {
            setTimeout(function(){
                if(socket){
                    if(connected){
                        if(isopen){
                            socket.emit('load',key,callback);
                        } else {
                            callback("[load]the network storage is not opened!!!");
                        }
                    } else {
                        callback("[load]temporary network problems!!!");
                    }
                }
                else{
                    callback("[load]there is no valid connection to the server!!!");
                }
            },0);
        };
        var save = function (node, callback) {
            setTimeout(function(){
                if(socket){
                    if(connected){
                        if(isopen){
                            socket.emit('save',node,callback);
                        } else {
                            callback("[save]the network storage is not opened!!!");
                        }
                    } else {
                        callback("[save]temporary network problems!!!");
                    }
                }
                else{
                    callback("[save]there is no valid connection to the server!!!");
                }
            },0);
        };
        var remove = function (key, callback) {
            if(socket){
                if(connected){
                    if(isopen){
                        socket.emit('remove',key,callback);
                    } else {
                        callback("[remove]the network storage is not opened!!!");
                    }
                } else {
                    callback("[remove]temporary network problems!!!");
                }
            }
            else{
                callback("[remove]there is no valid connection to the server!!!");
            }
        };
        var dumpAll = function (callback) {
            if(socket){
                if(connected){
                    if(isopen){
                        socket.emit('dumpAll',callback);
                    } else {
                        callback("[dumpAll]the network storage is not opened!!!");
                    }
                } else {
                    callback("[dumpAll]temporary network problems!!!");
                }
            }
            else{
                callback("[dumpAll]there is no valid connection to the server!!!");
            }
        };
        var removeAll = function (callback) {
            if(socket){
                if(connected){
                    if(isopen){
                        socket.emit('removeAll',callback);
                    } else {
                        callback("[removeAll]the network storage is not opened!!!");
                    }
                } else {
                    callback("[removeAll]temporary network problems!!!");
                }
            }
            else{
                callback("[removeAll]there is no valid connection to the server!!!");
            }
        };
        var searchId = function (beginning, callback) {
            if(socket){
                if(connected){
                    if(isopen){
                        socket.emit('searchId',beginning,callback);
                    } else {
                        callback("[searchId]the network storage is not opened!!!");
                    }
                } else {
                    callback("[searchId]temporary network problems!!!");
                }
            }
            else{
                callback("[searchId]there is no valid connection to the server!!!");
            }
        };
        var loadRoot = function(callback){
            load(ROOTNAME,function(err,node){
                if(err){
                    callback(err);
                }
                else{
                    callback(null,node.value);
                }
            });
        };
        var saveRoot = function(value,callback){
            save({"_id":ROOTNAME,"value":value},callback);
        };
        var whenAvailable = function(callback){
            availableCB = callback;
        };

        return {
            open: open,
            opened: opened,
            close: close,
            KEYNAME: "_id",
            load: load,
            save: save,
            remove: remove,
            dumpAll: dumpAll,
            removeAll: removeAll,
            searchId: searchId,
            loadRoot: loadRoot,
            saveRoot: saveRoot,
            whenAvailable: whenAvailable
        };
    };

    return Mongo;
});


