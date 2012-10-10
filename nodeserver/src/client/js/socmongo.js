define([ "core/assert",'notificationManager', "/socket.io/socket.io.js" ], function (ASSERT,notificationManager) {
    "use strict";

    var Mongo = function (options) {
        var ROOTNAME = "***root***";
        var socket = null;
        var isopen = false;
        var availableCB = null;
        var dataSrvOutNoteId = null;
        var updatedCB = null;

        var open = function (callback) {
            var tempsocket = io.connect(options.server, options.socketiopar);
            tempsocket.on('connect',function(){
                //console.log('CONNECT - SOCMONGO');
                if(!isopen){
                    tempsocket.emit('open',function(err){
                        if(err){
                            if(callback){
                                callback(err);
                                callback = null;
                            }
                        }
                        else{
                            socket = tempsocket;
                            isopen = true;
                            if(dataSrvOutNoteId){
                                notificationManager.removeStickyMessage(dataSrvOutNoteId);
                                dataSrvOutNoteId = null;
                            }
                            if(availableCB){
                                availableCB();
                                availableCB = null;
                            }
                            if(callback){
                                callback(null);
                                callback = null;
                            }
                        }
                    });
                }
            });
            tempsocket.on('updated',function(node){
                if(updatedCB){
                    updatedCB(node);
                }
            });

            tempsocket.on('connect_failed',function(){
                isopen = false;
                //console.log('CONNECT_FAILED - SOCMONGO');
                if(!dataSrvOutNoteId){
                    dataSrvOutNoteId = notificationManager.addStickyMessage("Connection to DataServer is down!!!")
                }
            });
            tempsocket.on('disconnect',function(){
                isopen = false;
                //console.log('DISCONNECT - SOCMONGO');
                if(!dataSrvOutNoteId){
                    dataSrvOutNoteId = notificationManager.addStickyMessage("Connection to DataServer is down!!!")
                }
            });
            tempsocket.on('reconnect_failed', function(){
                isopen = false;
                //console.log('RECONNECT_FAILED - SOCMONGO');
                if(!dataSrvOutNoteId){
                    dataSrvOutNoteId = notificationManager.addStickyMessage("Connection to DataServer is down!!!")
                }
            });
            tempsocket.on('reconnect', function(){
                isopen = false;
                //console.log('RECONNECT - SOCMONGO');
                if(!dataSrvOutNoteId){
                    dataSrvOutNoteId = notificationManager.addStickyMessage("Connection to DataServer is down!!!")
                }
            });
            tempsocket.on('reconnecting', function(){
                isopen = false;
                //console.log('RECONNECTING - SOCMONGO');
                if(!dataSrvOutNoteId){
                    dataSrvOutNoteId = notificationManager.addStickyMessage("Connection to DataServer is down!!!")
                }
            });
        };
        var opened = function () {
            return isopen;
        };
        var close = function (callback) {
            var tempsocket = socket;
            socket = null;
            tempsocket.emit('close',function(){
                isopen=false;
                if(callback){
                    callback(null);
                }
            });
        };
        var load = function (key, callback) {
            setTimeout(function(){
                if(socket){
                    if(isopen){
                        socket.emit('load',key,callback);
                    } else {
                        callback("[load]the network storage is not opened!!!");
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
                    if(isopen){
                        socket.emit('save',node,callback);
                    } else {
                        callback("[save]the network storage is not opened!!!");
                    }
                }
                else{
                    callback("[save]there is no valid connection to the server!!!");
                }
            },0);
        };
        var remove = function (key, callback) {
            if(socket){
                if(isopen){
                    socket.emit('remove',key,callback);
                } else {
                    callback("[remove]the network storage is not opened!!!");
                }
            }
            else{
                callback("[remove]there is no valid connection to the server!!!");
            }
        };
        var dumpAll = function (callback) {
            if(socket){
                if(isopen){
                    socket.emit('dumpAll',callback);
                } else {
                    callback("[dumpAll]the network storage is not opened!!!");
                }
            }
            else{
                callback("[dumpAll]there is no valid connection to the server!!!");
            }
        };
        var removeAll = function (callback) {
            if(socket){
                if(isopen){
                    socket.emit('removeAll',callback);
                } else {
                    callback("[removeAll]the network storage is not opened!!!");
                }
            }
            else{
                callback("[removeAll]there is no valid connection to the server!!!");
            }
        };
        var searchId = function (beginning, callback) {
            if(socket){
                if(isopen){
                    socket.emit('searchId',beginning,callback);
                } else {
                    callback("[searchId]the network storage is not opened!!!");
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
        var fsync = function (callback) {
            ASSERT(typeof callback === "function");

            if(socket){
                if(isopen){
                    socket.emit('fsync',callback);
                } else {
                    callback("[fsync]the network storage is not opened!!!");
                }
            }
            else{
                callback("[fsync]there is no valid connection to the server!!!");
            }
        };

        var getUpdated = function(myfunction){
            updatedCB = myfunction;
        };

        var find = function(criteria,callback){
            if(socket){
                if(isopen){
                    socket.emit('find',criteria,callback);
                } else {
                    callback("[find]the network storage is not opened!!!");
                }
            }
            else{
                callback("[find]there is no valid connection to the server!!!");
            }
        };

        var subscribe = function(branchname,updatedfunction){
            if(socket){
                if(isopen){
                    socket.emit('subscribe',branchname,updatedfunction);
                }
            }
        };

        var unsubscribe = function(branchname){
            if(socket){
                if(isopen){
                    socket.emit('unsubscribe',branchname);
                }
            }
        };

        return {
            open          : open,
            opened        : opened,
            close         : close,
            KEYNAME       : "_id",
            load          : load,
            save          : save,
            remove        : remove,
            dumpAll       : dumpAll,
            removeAll     : removeAll,
            searchId      : searchId,
            loadRoot      : loadRoot,
            saveRoot      : saveRoot,
            whenAvailable : whenAvailable,
            fsync         : fsync,
            getUpdated    : getUpdated,
            find          : find,
            subscribe     : subscribe,
            unsubscribe   : unsubscribe
        };
    };

    return Mongo;
});


