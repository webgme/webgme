"use strict";
/*
 * Utility helper functions for the client and server side
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([], function () {
    return {
        server : {
            script : "./../server/gmeProject.js",
            port   : 8888,
        },
        cases : {
            container : "caseList.js",
            path : "./cases/"

        },
        measurement : {

        },
        output : {

        }
    }
});
