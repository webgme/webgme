"use strict";
/*
 * Utility helper functions for the client and server side
 */

define(['common/Constants',
        'config/config'], function (CONSTANTS,
                                    config) {

    //return utility functions
    return {
        /*
         * is the application running in debug more or not
         */
        //TODO: remove from here
        //TODO: server and client debug swithc has to be separate
        //TODO: client DEBUG should be a global variable
        DEBUG: true, // true / false / 'DEMOHACK',

        /*
         * Generated a GUID
         */
        //TODO: to be removed
        //TODO: user/basic.js still uses it....
        guid: function () {
            var S4 = function () {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };

            //return GUID
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        },

        //TODO: remove this
        //TODO: user/basic.js still uses this method....
        relidtosetid : function(relid){
            switch(relid){
                case "2200000001":
                    return CONSTANTS.SET_VALIDCHILDREN;
                    break;
                case "2200000002":
                    return CONSTANTS.SET_VALIDSOURCE;
                    break;
                case "2200000003":
                    return CONSTANTS.SET_VALIDDESTINATION;
                    break;
                case "2200000004":
                    return CONSTANTS.SET_VALIDINHERITOR;
                    break;
                case "2200000000":
                    return CONSTANTS.SET_GENERAL;
                    break;
            }
        },

        //TODO: Panels/SetEditorPanelControl.js uses it
        //TODO: implement API in clientNode to get valid set names
        validSetNames     : [CONSTANTS.SET_VALIDCHILDREN, CONSTANTS.SET_VALIDSOURCE, CONSTANTS.SET_VALIDDESTINATION, CONSTANTS.SET_VALIDINHERITOR, CONSTANTS.SET_GENERAL],

        //TODO: refactor
        //TODO: load localConfig if present
        combinedserver: _.extend({
            //used by the client currently


            mongosrv        : "/datamongo",
            rootsrv         : "/root",
            projsrv         : "/project",

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
            nosaveddata     : true
        }, config)
    };
});
