define([ "core/assert", "/socket.io/socket.io.js" ], function (ASSERT) {
    "use strict";

    var Mongo = function (options) {
        var ROOTNAME = "***root***";
        var socket = null;
        var connected = false;
        var isopen = false;

        var open = function (callback) {
            var tempsocket = io.connect(options.mongosrv);
            tempsocket.on('connect',function(){
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
            if(socket){
                socket.emit('load',key,callback);
            }
            else{
                callback("[load]there is no valid connection to the server!!!");
            }
        };
        var save = function (node, callback) {
            if(socket){
                socket.emit('save',node,callback);
            }
            else{
                callback("[save]there is no valid connection to the server!!!");
            }
        };
        var remove = function (key, callback) {
            if(socket){
                socket.emit('remove',key,callback);
            }
            else{
                callback("[remove]there is no valid connection to the server!!!");
            }
        };
        var dumpAll = function (callback) {
            if(socket){
                socket.emit('dumpAll',callback);
            }
            else{
                callback("[dumpAll]there is no valid connection to the server!!!");
            }
        };
        var removeAll = function (callback) {
            if(socket){
                socket.emit('removeAll',callback);
            }
            else{
                callback("[removeAll]there is no valid connection to the server!!!");
            }

        };
        var searchId = function (beginning, callback) {
            if(socket){
                socket.emit('searchId',beginning,callback);
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
            saveRoot: saveRoot
        };
    };

    return Mongo;
});


