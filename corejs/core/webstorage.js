define([ "assert", "config.js", "util.js" ], function (ASSERT, CONFIG, UTIL) {
    "use strict";

    var Mongo = function (options) {

        var _storage = null;

        options = UTIL.copyOptions(CONFIG.mongodb, options);

        var open = function (callback) {
            setTimeout(function(){
                var tmp = null;
                tmp = JSON.parse(localStorage.getItem(options.database+"-"+options.collection));
                if(tmp){
                    _storage = tmp;
                }
                else{
                    _storage = {};
                    localStorage.setItem(options.database+"-"+options.collection,JSON.stringify(_storage));
                }
                callback(null);
            },0);
        };

        var opened = function () {
            return _storage !== null;
        };

        var close = function (callback) {
            _storage = null;
            if(callback){
                callback(null);
            }
        };

        var load = function (key, callback) {
            setTimeout(function(){
                callback(null,_storage[key]);
            },0);
        };

        var save = function (node, callback) {
            _storage[node._id] = node;
            localStorage.setItem(options.database+"-"+options.collection,JSON.stringify(_storage));
            callback(null);
        };

        var remove = function (key, callback) {
            delete _storage[key];
            localStorage.setItem(options.database+"-"+options.collection,JSON.stringify(_storage));
        };

        var dumpAll = function (callback) {
        };

        var removeAll = function (callback) {
            setTimeout(function(){
                _storage = {};
                localStorage.setItem(options.database+"-"+options.collection,JSON.stringify(_storage));
                callback(null);
            },0);
        };

        var idregexp = new RegExp("^[#0-9a-zA-Z_]*$");

        var searchId = function (beginning, callback) {
            setTimeout(function(){
                var count = 0;
                var lastmatch = "";
                for(var i in _storage){
                    if(i.indexOf(beginning) === 0){
                        lastmatch = i;
                        count++;
                    }

                    if(count>1){
                        break;
                    }
                }
                if(count === 1){
                    callback(null,_storage[lastmatch]);
                }
                else{
                    callback("hibaaa");
                }
            },0);
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


