/*globals define*/
/*jshint node:true, browser: true*/
/**
 * This class defines the common interface for a storage-project
 *
 * @module ProjectInterface
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/project/cache',
    'common/storage/constants',
], function (ProjectCache, CONSTANTS) {
    'use strict';

    /**
     *
     * @param {string} projectId
     * @param {object} storageObjectsAccessor
     * @param {object} mainLogger
     * @param {object} gmeConfig
     * @alias ProjectInterface
     * @constructor
     */
    function ProjectInterface(projectId, storageObjectsAccessor, mainLogger, gmeConfig) {
        this.projectId = projectId;
        this.CONSTANTS = CONSTANTS;
        this.ID_NAME = CONSTANTS.MONGO_ID;
        this.logger = mainLogger.fork('Project:' + this.projectId);
        this.logger.debug('ctor', projectId);
        this.projectCache = new ProjectCache(storageObjectsAccessor, this.projectId, this.logger, gmeConfig);

        // Functions forwarded to project cache.
        this.insertObject = this.projectCache.insertObject;
        this.loadObject = this.projectCache.loadObject;

        /**
         * @typedef {object} ProjectInterface~CommitResult
         * @prop {string} hash - The commitHash for the commit.
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
         * Keys are name of the branches and values their current heads
         * @typedef {object} ProjectInterface~Branches
         * @example
         * {
         *   master: '#someHash',
         *   b1: '#someOtherHash',
         *   b2: '#yetAnOtherHash'
         * }
         */

        /**
         * @typedef {object} ProjectInterface~CommitObject
         * @prop {string} _id - Hash of the commit object, a.k.a commitHash.
         * @prop {string} root - Hash of the associated root object, a.k.a. rootHash.
         * @prop {string[]} parents - Commits from where this commit evolved.
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
         *}
         */

        /**
         * Array of commit objects
         * @typedef {ProjectInterface~CommitObject[]} ProjectInterface~Commits
         * @example
         * [{
         *   _id: '#5496cf226542fcceccf89056f0d27564abc88c99',
         *   root: '#04009ecd1e68117cd3e9d39c87aadd9ed1ee5cb3',
         *   parents: ['#87d9fd309ec6a5d84776d7731ce1f1ab2790aac2']
         *   updater: ['guest'],
         *   time: 1430169614741,
         *   message: "createChildren({\"/1008889918/1998840078\":\"/1182870936/737997118/1736829087/1966323860\"})",
         *   type: 'commit'
         * },
         * {
         *   _id: '#2826cf226542fcceccf89056f0d27564abc88c99',
         *   root: '#65c74ecd1e68117cd3e9d39c87aadd9ed1ee5cb3',
         *   parents: ['#5496cf226542fcceccf89056f0d27564abc88c99']
         *   updater: ['guest'],
         *   time: 1430169614790,
         *   message: "Some commit message",
         *   type: 'commit'
         * }]
         */

        /**
         * Makes a commit to data base. Based on the root hash and commit message a new
         * {@link ProjectInterface~CommitObject} (with returned hash)
         * is generated and insert together with the core objects to the database on the server.
         *
         * @example
         * persisted = core.persist(rootNode);
         *
         * project.makeCommit('master', ['#thePreviousCommitHash'], persisted.rootHash, persisted.objects, 'new commit')
         *   .then(function (result) {
         *     // result = {
         *     //   status: 'SYNCED',
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })
         *   .catch(function (error) {
         *     // error.message = 'Not authorized to read project: guest+project'
         *   });
         * @example
         * project.makeCommit('master', ['#notPreviousCommitHash'], persisted.rootHash, persisted.objects, 'new commit')
         *   .then(function (result) {
         *     // result = {
         *     //   status: 'FORKED',
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })...
         * @example
         * project.makeCommit(null, ['#anExistingCommitHash'], persisted.rootHash, persisted.objects, 'new commit')
         *   .then(function (result) {
         *     // result = {
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })...
         * @example
         * project.makeCommit('master', ['#aPreviousCommitHash'], previousRootHash, {}, 'just adding a commit to master')
         *   .then(function (result) {
         *     // result = {
         *     //   status: 'SYNCED',
         *     //   hash: '#thisCommitHash'
         *     // }
         *   })...
         * @param {string} branchName - Name of branch to update (none if null).
         * @param {string[]} parents - Parent commit hashes.
         * @param {string} rootHash - Hash of root object.
         * @param {object} coreObjects - Core objects associated with the commit.
         * @param {string} msg='n/a' - Commit message.
         * @param {function} [callback] - If provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link ProjectInterface~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.makeCommit = function (branchName, parents, rootHash, coreObjects, msg, callback) {
            throw new Error('makeCommit must be overridden in derived class');
        };

        /**
         * Attempts to update the head of the branch.
         * @param {string} branchName - Name of branch to update.
         * @param {string} newHash - New commit hash for branch head.
         * @param {string} oldHash - Current state of the branch head inside the database.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link ProjectInterface~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.setBranchHash = function (branchName, newHash, oldHash, callback) {
            throw new Error('setBranchHash must be overridden in derived class');
        };

        /**
         * Retrieves the commit hash for the head of the branch.
         * @param {string} branchName - Name of branch.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {string} <b>branchHash</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.getBranchHash = function (branchName, callback) {
            throw new Error('getBranchHash must be overridden in derived class');
        };

        /**
         * Attempts to create a new branch with head pointing to the provided commit hash.
         * @param {string} branchName - Name of branch to create.
         * @param {string} newHash - New commit hash for branch head.
         * @param {ProjectInterface~CommitResultCallback} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link ProjectInterface~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.createBranch = function (branchName, newHash, callback) {
            throw new Error('createBranch must be overridden in derived class');
        };

        /**
         * Attempts to delete the branch.
         * @param {string} branchName - Name of branch to create.
         * @param {string} newHash - New commit hash for branch head.
         * @param {ProjectInterface~CommitResultCallback} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link ProjectInterface~CommitResult} <b>result</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.deleteBranch = function (branchName, oldHash, callback) {
            throw new Error('deleteBranch must be overridden in derived class');
        };

        /**
         * Retrieves all branches and their current heads within project.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link ProjectInterface~Branches} <b>result</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.getBranches = function (callback) {
            throw new Error('getBranches must be overridden in derived class');
        };

        /**
         * Retrieves and array of the latest (sorted by timestamp) commits for the project.
         * If timestamp is given it will get <b>number</b> of commits strictly before <b>before</b>.
         * If commit hash is specified that commit will be included too.
         * @param {string|number} before - Timestamp or commitHash to load history from.
         * @param {number} number - Number of commits to load.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {@link ProjectInterface~Commits} <b>result</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.getCommits = function (before, number, callback) {
            throw new Error('getCommits must be overridden in derived class');
        };

        /**
         * Attempts to retrieve the common ancestor of two commits. If no ancestor exists it will result in an error.
         *
         * @param {string} commitA - Commit hash.
         * @param {string} commitB - Commit hash.
         * @param {function} [callback] - if provided no promise will be returned.
         *
         * @return {external:Promise}  On success the promise will be resolved with
         * {string} <b>commonCommitHash</b>.<br>
         * On error the promise will be rejected with {Error} <b>error</b>.
         */
        this.getCommonAncestorCommit = function (commitA, commitB, callback) {
            throw new Error('getCommonAncestorCommit must be overridden in derived class');
        };
    }

    return ProjectInterface;
});
