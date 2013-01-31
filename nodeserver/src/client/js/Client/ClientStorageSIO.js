define([ "core/assert", "/socket.io/socket.io.js" ], function (ASSERT) {
    "use strict";

    var ClientStorageSIO = function (options) {
    	if( options.server.substring(0, 7) !== "http://" ) {
    		options.server = "http://" + options.server;
    	}
    	
        var socket = null;
        var isopen = false;
        var availableCB = null;
        var updatedCB = null;

        var open = function (callback) {
            var tempsocket = io.connect(options.server, options.options);
            tempsocket.on('connect',function(){
                if(!isopen){
                    tempsocket.emit('open',function(err){
                        if(err){
                            if(callback){
                                var tc = callback;
                                callback = null;
                                tc(err);
                            }
                        }
                        else{
                            socket = tempsocket;
                            isopen = true;
                            if(availableCB){
                                availableCB();
                                availableCB = null;
                            }
                            if(callback){
                                tc = callback;
                                callback = null;
                                tc(err);
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
            });
            tempsocket.on('disconnect',function(){
                isopen = false;
            });
            tempsocket.on('reconnect_failed', function(){
                isopen = false;
            });
            tempsocket.on('reconnect', function(){
                isopen = false;
            });
            tempsocket.on('reconnecting', function(){
                isopen = false;
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

        var requestPoll = function(branchname,updatedfunction){
            if(socket){
                if(isopen){
                    socket.emit('requestPoll',branchname,updatedfunction);
                }
            }
        };

        //branch methods
        var createBranch = function(name,callback){
            if(socket){
                if(isopen){
                    socket.emit('createBranch',name,callback);
                } else {
                    callback("[createBranch]the network storage is not opened!!!");
                }
            }
            else{
                callback("[createBranch]there is no valid connection to the server!!!");
            }
        };
        var deleteBranch = function(name,callback){
            if(socket){
                if(isopen){
                    socket.emit('deleteBranch',name,callback);
                } else {
                    callback("[deleteBranch]the network storage is not opened!!!");
                }
            }
            else{
                callback("[deleteBranch]there is no valid connection to the server!!!");
            }
        };
        var updateBranch = function(name,commit,callback){
            if(socket){
                if(isopen){
                    socket.emit('updateBranch',name,commit,callback);
                } else {
                    callback("[updateBranch]the network storage is not opened!!!");
                }
            }
            else{
                callback("[updateBranch]there is no valid connection to the server!!!");
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
            whenAvailable : whenAvailable,
            fsync         : fsync,
            find          : find,
            requestPoll   : requestPoll,
            createBranch  : createBranch,
            deleteBranch  : deleteBranch,
            updateBranch  : updateBranch
        };
    };

    return ClientStorageSIO;
});


