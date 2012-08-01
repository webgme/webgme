define([ "js/assert", "/socket.io/socket.io.js" ], function (ASSERT) {
    "use strict";

    var Mongo = function (options) {
        var socket = io.connect(options.mongosrv);
        var connected = false;
        var isopen = false;

        socket.on('connect',function(){
            connected=true;
        });
        var open = function (callback) {
            if(connected){
                socket.emit('open',function(err){
                    if(err){
                        console.log("error during database opening: "+err);
                    }
                    else{
                        isopen = true;
                        callback(null);
                    }
                });
            }
            else{
                var timeout = setInterval(function(){
                    if(connected){
                        clearInterval(timeout);
                        socket.emit('open',function(err){
                            if(err){
                                console.log("error during database opening: "+err);
                            }
                            else{
                                isopen = true;
                                callback(null);
                            }
                        });
                    }
                    else{
                        console.log("unable to connect via socket.io!!!");
                    }
                },1000);
            }
        };
        var opened = function () {
            return connected && isopen;
        };
        var close = function (callback) {
            socket.emit('close',function(){
                isopen=false;
                if(callback){
                    callback(null);
                }
            });
        };
        var load = function (key, callback) {
            socket.emit('load',key,callback);
        };
        var save = function (node, callback) {
            socket.emit('save',node,callback);
        };
        var remove = function (key, callback) {
            socket.emit('remove',key,callback);
        };
        var dumpAll = function (callback) {
            socket.emit('dumpAll',callback);
        };
        var removeAll = function (callback) {
            socket.emit('removeAll',callback);
        };
        var searchId = function (beginning, callback) {
            socket.emit('searchId',beginning,callback);
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
            searchId: searchId
        };
    };

    return Mongo;
});


