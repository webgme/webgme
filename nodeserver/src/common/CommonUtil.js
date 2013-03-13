"use strict";
/*
 * Utility helper functions for the client and server side
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([], function () {

    var minimalSetId = "2200000000";
    //return utility functions
    return {
        /*
         * is the application running in debug more or not
         */
        DEBUG: false, // true / false / 'DEMOHACK',

        /*
         * Generated a GUID
         */
        guid: function () {
            var S4 = function () {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };

            //return GUID
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        },

        copy: function (object) {
            return JSON.parse(JSON.stringify(object));
        },
        insertIntoArray: function (list, item) {
            if (list instanceof Array) {
                if (list.indexOf(item) === -1) {
                    list.push(item);
                    return true;
                }
                return false;
            }
            return false;
        },
        removeFromArray: function (list, item) {
            var index = list.indexOf(item);
            if (index === -1) {
                return false;
            } else {
                list.splice(index, 1);
                return true;
            }
        },
        mergeArrays: function (one, two) {
            var three = [], i;
            for (i in one) {
                three.push(one[i]);
            }
            for (i in two) {
                if (one.indexOf(two[i]) === -1) {
                    three.push(two[i]);
                }
            }
            return three;
        },
        isSameArray: function(arr1,arr2){
            return $(arr1).not(arr2).length == 0 && $(arr2).not(arr1).length == 0
        },

        assert : function (cond) {
            if( !cond ) {
                var error = new Error("ASSERT failed");
                var message = "ASSERT failed at " + error.stack;

                if( console && !process ) {
                    console.log(message);
                }
                throw error;
            }
        },
        timestamp : function(){
            return "" + (new Date()).getTime();
        },
        minsetid : minimalSetId,
        setidtorelid : function(setid){
            switch(setid){
                case "ValidChildren":
                    return "2200000001";
                    break;
                case "ValidSource":
                    return "2200000002";
                    break;
                case "ValidDestination":
                    return "2200000003";
                    break;
                case "ValidInheritor":
                    return "2200000004";
                    break;
                default:
                    return "2200000000";
                    break;
            }
        },
        relidtosetid : function(relid){
            switch(relid){
                case "2200000001":
                    return "ValidChildren";
                    break;
                case "2200000002":
                    return "ValidSource";
                    break;
                case "2200000003":
                    return "ValidDestination";
                    break;
                case "2200000004":
                    return "ValidInheritor";
                    break;
                case "2200000000":
                    return "General";
                    break;
            }
        },
        issetrelid : function(relid){
            if(parseInt(relid)>= parseInt(minimalSetId)){
                return true;
            }
            return false;
        },
        relidfromid : function(id){
            var ind = id.lastIndexOf('/');
            if(ind === -1){
                return id;
            } else {
                return id.substr(ind+1);
            }
        },
        validSetNames     : ['ValidChildren', 'ValidSource', 'ValidDestination','ValidInheritor', 'General'],
        validMetaSetNames : ['ValidChildren', 'ValidSource', 'ValidDestination','ValidInheritor'],
        validRealSetNames : ['General'],

        combinedserver: {
            port            : 80,
            mongosrv        : "/datamongo",
            rootsrv         : "/root",
            projsrv         : "/project",
            mongoip         : "129.59.105.239",
            mongoport       : 27017,
            mongodatabase   : "multi",
            mongoopt        : {
                'auto_reconnect' : true,
                'poolSize'       : 5,
                'socketOptions'  : {
                    'keepAlive' : 1
                }
            },
            cache           : true,
            faulttolerant   : true,
            socketiopar     : {
                'reconnection delay' : 10,
                'max reconnection attempts' : 50,
                'force new connection' : true
            },
            srvsocketpar    : {
                'heartbeat timeout'  : 240,
                'heartbeat interval' : 60,
                'heartbeats'         : true,
                'log level'          : 1
            },
            nosaveddata     : true,
            project         : "dd2"

        }

    };
});
