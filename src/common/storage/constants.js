/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';
    return {

        // Database related
        MONGO_ID: '_id',
        PROJECT_INFO_ID: '*info*',
        EMPTY_PROJECT_DATA: 'empty',
        PROJECT_ID_SEP: '+',
        PROJECT_DISPLAYED_NAME_SEP: '/',

        // Socket IO
        DATABASE_ROOM: 'database',
        ROOM_DIVIDER: '%',
        CONNECTED: 'CONNECTED',
        DISCONNECTED: 'DISCONNECTED',
        RECONNECTED: 'RECONNECTED',

        // Branch commit status - this is the status returned after setting the hash of a branch
        SYNCED: 'SYNCED', // The commitData was inserted in the database and the branchHash updated.
        FORKED: 'FORKED', // The commitData was inserted in the database, but the branchHash NOT updated.
        CANCELED: 'CANCELED', // The commitData was never inserted to the database.
        MERGED: 'MERGED', // This is currently not used

        BRANCH_STATUS: {
            SYNC: 'SYNC',
            AHEAD_SYNC: 'AHEAD_SYNC',
            AHEAD_NOT_SYNC: 'AHEAD_NOT_SYNC',
            PULLING: 'PULLING'
        },

        // Events
        PROJECT_DELETED: 'PROJECT_DELETED',
        PROJECT_CREATED: 'PROJECT_CREATED',

        BRANCH_DELETED: 'BRANCH_DELETED',
        BRANCH_CREATED: 'BRANCH_CREATED',
        BRANCH_HASH_UPDATED: 'BRANCH_HASH_UPDATED',

        BRANCH_UPDATED: 'BRANCH_UPDATED',

        BRANCH_ROOM_SOCKETS: 'BRANCH_ROOM_SOCKETS'
    };
});
