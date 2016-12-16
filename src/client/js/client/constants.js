/*globals define*/
/*jshint browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/constants',
    'common/core/constants'
], function (STORAGE_CONSTANTS, CORE_CONSTANTS) {
    'use strict';

    return {

        STORAGE: STORAGE_CONSTANTS,
        CORE: CORE_CONSTANTS,

        BRANCH_STATUS: STORAGE_CONSTANTS.BRANCH_STATUS,

        UNCAUGHT_EXCEPTION: 'UNCAUGHT_EXCEPTION',

        // Events
        NETWORK_STATUS_CHANGED: 'NETWORK_STATUS_CHANGED',
        BRANCH_STATUS_CHANGED: 'BRANCH_STATUS_CHANGED',

        BRANCH_CHANGED: 'BRANCH_CHANGED',
        PROJECT_CLOSED: 'PROJECT_CLOSED',
        PROJECT_OPENED: 'PROJECT_OPENED',

        NEW_COMMIT_STATE: 'NEW_COMMIT_STATE',

        UNDO_AVAILABLE: 'UNDO_AVAILABLE',
        REDO_AVAILABLE: 'REDO_AVAILABLE',

        // general notification event
        NOTIFICATION: 'NOTIFICATION',
        CONNECTED_USERS_CHANGED: 'CONNECTED_USERS_CHANGED',

        // Constraint Checking
        META_RULES_RESULT: 'META_RULES_RESULT',
        CONSTRAINT_RESULT: 'CONSTRAINT_RESULT'
    };
});