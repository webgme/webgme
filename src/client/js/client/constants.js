/*globals define*/
/*jshint browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/constants'], function (STORAGE_CONSTANTS) {
    'use strict';

    return {

        STORAGE: STORAGE_CONSTANTS,

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