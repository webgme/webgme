define([ ], function () {
    'use strict';
    var ClientLocalStorage = function(){
        var noLocalStorage = localStorage === null || localStorage === undefined;
        var save = function(key, value){
            if(noLocalStorage){
                return "noLocalStorage";
            }
            try{
                localStorage.setItem(key,JSON.stringify(value));
            }
            catch (e) {
                return e;
            }
        };
        var load = function(key){
            if(noLocalStorage){
                return null;
            }

            return JSON.parse(localStorage.getItem(key));
        };
        var remove = function(key){
            if(!noLocalStorage){
                localStorage.removeItem(key);
            }
        };
        return {
            save   : save,
            load   : load,
            remove : remove
        }
    };

    return ClientLocalStorage;
});
