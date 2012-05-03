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

        /*
         * Generated a GUID
         */
        guid: function () {
            var S4 = function () {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };

            //return GUID
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        }
    };
});
