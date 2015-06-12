/*globals define*/
/*jshint browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/constants'], function (STORAGE_CONSTANTS) {
    'use strict';

    return {

        STORAGE: STORAGE_CONSTANTS,

        BRANCH_STATUS: {
            SYNC: 'SYNC',
            AHEAD_SYNC: 'AHEAD_SYNC',
            AHEAD_NOT_SYNC: 'AHEAD_NOT_SYNC',
            PULLING: 'PULLING'
        },

        // Events
        NETWORK_STATUS_CHANGED: 'NETWORK_STATUS_CHANGED',
        BRANCH_STATUS_CHANGED: 'BRANCH_STATUS_CHANGED',

        BRANCH_CHANGED: 'BRANCH_CHANGED',
        PROJECT_CLOSED: 'PROJECT_CLOSED',
        PROJECT_OPENED: 'PROJECT_OPENED',

        UNDO_AVAILABLE: 'UNDO_AVAILABLE',
        REDO_AVAILABLE: 'REDO_AVAILABLE'
    };
});