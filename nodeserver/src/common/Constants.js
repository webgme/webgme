"use strict";
/*
 * STRING CONSTANT DEFINITIONS USED IN BOTH CLIENT AND SERVER JAVASCRIPT
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([], function () {

    //return string constants
    return {
        /*
         * TERRITORY EVENTS
         */
        TERRITORY_EVENT_LOAD : 'load',
        TERRITORY_EVENT_UPDATE : 'update',
        TERRITORY_EVENT_UNLOAD : 'unload',

        /*
         * GME_ID: wherever a GME object ID needs to be present
         */
        GME_ID: 'GME_ID',

        /*
         * Dedicated POINTER names
         */
         POINTER_SOURCE : 'source',
         POINTER_TARGET : 'target',
         POINTER_REF: 'ref',

         /*
          * Dedicated SET names
          */
         SET_VALIDCHILDREN : 'ValidChildren',
         SET_VALIDSOURCE : 'ValidSource',
         SET_VALIDDESTINATION : 'ValidDestination',
         SET_VALIDINHERITOR : 'ValidInheritor',
         SET_GENERAL : 'General',
    };
});