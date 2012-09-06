"use strict";
/*
 * Utility helper functions for the client and server side
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([], function () {

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
            ip              : "129.59.104.16", /*should be the IP where the combinedserver run*/
            port            : 80,
            mongosrv        : "/datamongo",
            rootsrv         : "/root",
            logsrv          : "/log",
            /*branchfile      : "combined.tpf",*/
            mongoip         : "129.59.105.195",
            mongoport       : 27017,
            mongocollection : "IFV", /*possible collections currently: basic,SFdemo, IFV*/
            mongodatabase   : "demo",
            /*storage         : "mongo",*/
            logging         : false,
            logfile         : "comblog.log"
        }

    };
});
