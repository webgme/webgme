/*globals define*/
/*jshint node: true, browser: true*/

/**
 * STRING CONSTANT DEFINITIONS USED IN BOTH CLIENT AND SERVER JAVASCRIPT
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['common/core/constants', 'common/storage/constants'], function (CORE, STORAGE) {
    'use strict';
    //return string constants
    return {
        /*
         * TERRITORY EVENTS
         */
        TERRITORY_EVENT_LOAD: 'load',
        TERRITORY_EVENT_UPDATE: 'update',
        TERRITORY_EVENT_UNLOAD: 'unload',
        TERRITORY_EVENT_COMPLETE: 'complete',
        TERRITORY_EVENT_INCOMPLETE: 'incomplete',

        /*
         * GME_ID: wherever a GME object ID needs to be present
         */
        GME_ID: 'GME_ID',

        /*
         * DEDICATED GME OBJECT IDs
         */
        PROJECT_ROOT_ID: '',
        PROJECT_FCO_ID: 'FCO_ID',
        PROJECT_FCO_GUID: 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045',
        PROJECT_FCO_RELID: '1',

        /*
         * DEDICATED GME ROOT properties
         */
        PROJECT_ROOT_NAME: 'ROOT',


        /*
         * Dedicated POINTER names
         */
        POINTER_SOURCE: 'src',      //dedicated connection source pointer name
        POINTER_TARGET: 'dst',      //dedicated connection target pointer name
        POINTER_BASE: 'base',       //dedicated inheritance pointer name
        POINTER_CONSTRAINED_BY: 'constrainedby', //dedicated replaceable/constrainedBy pointer name

        /*
         * Dedicated RELATION names
         */
        RELATION_CONTAINMENT: 'containment',

        CORE: CORE,
        STORAGE: STORAGE,

        WEBHOOK_EVENTS: {
            BRANCH_DELETED: STORAGE.BRANCH_DELETED,
            BRANCH_CREATED: STORAGE.BRANCH_CREATED,
            BRANCH_HASH_UPDATED: STORAGE.BRANCH_HASH_UPDATED,
            TAG_DELETED: STORAGE.TAG_DELETED,
            TAG_CREATED: STORAGE.TAG_CREATED,
            COMMIT: STORAGE.COMMIT,
            PROJECT_DELETED: STORAGE.PROJECT_DELETED,
            BRANCH_JOINED: STORAGE.BRANCH_JOINED,
            BRANCH_LEFT: STORAGE.BRANCH_LEFT
        }
    };
});