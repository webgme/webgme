/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 * @module Storage
 */

/**
 * @typedef {string} CommitHash - Unique SHA-1 hash for commit object.
 * @example
 * '#5496cf226542fcceccf89056f0d27564abc88c99'
 */

/**
 * @typedef {object} CommitResult
 * @prop {module:Storage~CommitHash} hash - The commitHash for the commit.
 * @prop {string} status - 'SYNCED', 'FORKED', 'CANCELED', undefined
 *
 * @example
 * {
 *   status: 'SYNCED',
 *   hash: '#someHash'
 * }
 * @example
 * {
 *   hash: '<hash from makeCommit with no branch provided>'
 * }
 */

/**
 * @typedef {object} CommitObject
 * @prop {module:Storage~CommitHash} _id - Hash of the commit object, a.k.a commitHash.
 * @prop {module:Core~ObjectHash} root - Hash of the associated root object, a.k.a. rootHash.
 * @prop {module:Storage~CommitHash[]} parents - Commits from where this commit evolved.
 * @prop {number} time - When the commit object was created (new Date()).getTime().
 * @prop {string} message - Commit message.
 * @prop {string[]} updater - Commit message.
 * @prop {string} type - 'commit'
 *
 * @example
 * {
 *   _id: '#5496cf226542fcceccf89056f0d27564abc88c99',
 *   root: '#04009ecd1e68117cd3e9d39c87aadd9ed1ee5cb3',
 *   parents: ['#87d9fd309ec6a5d84776d7731ce1f1ab2790aac2']
 *   updater: ['guest'],
 *   time: 1430169614741,
 *   message: "createChildren({\"/1008889918/1998840078\":\"/1182870936/737997118/1736829087/1966323860\"})",
 *   type: 'commit'
 * }
 */

/**
 * @typedef {object} PatchObject
 * @prop {module:Core~ObjectHash} _id - Hash of the expected result object.
 * @prop {module:Core~ObjectHash} base - Hash of the base object where the patch should be applied.
 * @prop {string} type - 'patch'.
 * @prop {object} patch - The patch instructions (based on [RFC6902]{@link http://tools.ietf.org/html/rfc6902}).
 *
 * @example
 * {
 *   _id: '#5496cf226542fcceccf89056f0d27564abc88c99',
 *   base: '#04009ecd1e68117cd3e9d39c87aadd9ed1ee5cb3',
 *   type: 'patch',
 *   patch: [{op: 'add', path: '/atr/new', value: 'value'}]
 * }
 */

define([], function () {
    'use strict';

    return {
        //Version
        VERSION: '1.0.0',
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
        INCOMPATIBLE_CONNECTION: 'INCOMPATIBLE_CONNECTION',
        CONNECTION_ERROR: 'CONNECTION_ERROR',

        // Branch commit status - this is the status returned after setting the hash of a branch
        SYNCED: 'SYNCED', // The commitData was inserted in the database and the branchHash updated.
        FORKED: 'FORKED', // The commitData was inserted in the database, but the branchHash NOT updated.
        CANCELED: 'CANCELED', // The commitData was never inserted to the database.
        MERGED: 'MERGED', // The commit was initially forked, but successfully merged.

        BRANCH_STATUS: {
            SYNC: 'SYNC',
            AHEAD_SYNC: 'AHEAD_SYNC',
            AHEAD_NOT_SYNC: 'AHEAD_NOT_SYNC',
            PULLING: 'PULLING',
            MERGING: 'MERGING',
            ERROR: 'ERROR'
        },

        // Events
        JWT_ABOUT_TO_EXPIRE: 'JWT_ABOUT_TO_EXPIRE',
        JWT_EXPIRED: 'JWT_EXPIRED',

        PROJECT_DELETED: 'PROJECT_DELETED',
        PROJECT_CREATED: 'PROJECT_CREATED',

        BRANCH_DELETED: 'BRANCH_DELETED',
        BRANCH_CREATED: 'BRANCH_CREATED',
        BRANCH_HASH_UPDATED: 'BRANCH_HASH_UPDATED',
        TAG_DELETED: 'TAG_DELETED',
        TAG_CREATED: 'TAG_CREATED',
        COMMIT: 'COMMIT',

        BRANCH_UPDATED: 'BRANCH_UPDATED',

        NOTIFICATION: 'NOTIFICATION',
        // Types of notifications
        BRANCH_ROOM_SOCKETS: 'BRANCH_ROOM_SOCKETS',
        PLUGIN_NOTIFICATION: 'PLUGIN_NOTIFICATION',
        ADD_ON_NOTIFICATION: 'ADD_ON_NOTIFICATION',
        CLIENT_STATE_NOTIFICATION: 'CLIENT_STATE_NOTIFICATION'
    };
});
