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
         * Determines if the app runs in debug or release mode
         */
        DEBUG : false,

        /*
         * Define the server to connect to
         * Value is either IP of the host, or "self" for connecting to the host where the page loaded from
         */
        ServerIP : "self",

        /*
         * Port number of socket.io server
         */
        ServerPort : 8081,

        /*
         * Type of storage used by the server, possible values are:
         * "test" - mean that it will open the test project file and never saves anything to that
         * "mongodirty" - means that it will use the mongo as source of data, but it will simply left out the versioning
         */
        StorageType : "test",

        /*
         * location of the mongoDB server
         */
        MongoDBLocation : 'localhost',
        MongoDBPort : 27017,

        AutoSave : true,
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
        standalone: {
            ServerIP: "self",
            ServerPort: 8081,
            ProjectIP: "self",
            ProjectPort: 8082,
            ProjectName: "testp",
            BranchName: "basic"
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
        validSetNames : ['ValidChildren', 'ValidSource', 'ValidDestination', 'General'],
        hashbasedconfig: {
            inuse          : true,
            serverlocation : "http://localhost",
            dataport       : 888,
            rootport       : 999,
            mongosrv       : "http://localhost:8081/data",
            rootsrv        : "http://localhost:8081/root",
            project        : "hash",
            branch         : "test"
        },
        combinedserver: {
            port            : 80,
            mongosrv        : "/datamongo",
            rootsrv         : "/root",
            logsrv          : "/log",
            mongoip         : "129.59.105.195",
            mongoport       : 27017/*888*/,
            mongocollection : "harmadik", /*possible collections currently: basic,SFdemo, IFV*/
            mongodatabase   : "multi",
            mongoopt        : {
                'auto_reconnect' : true,
                'poolSize'       : 1
            },
            logging         : true,
            logfile         : "comblog.log",
            cache           : true,
            faulttolerant   : true,
            timelog         : false,
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
            projsrv         : "/project",
            projects        : [
                "egyik",
                "masik",
                "harmadik"
            ]
        }

    };
});
