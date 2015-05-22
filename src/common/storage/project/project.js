/*globals define*/
/*jshint browser: true, node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/project/cache',
    'common/storage/project/branch',
    'common/storage/constants',
    'common/util/assert'
], function (ProjectCache, Branch, CONSTANTS, ASSERT) {
    'use strict';

    function Project(name, storage, mainLogger, gmeConfig) {
        this.name = name;
        this.branches = {};
        this.ID_NAME = CONSTANTS.MONGO_ID;

        var logger = mainLogger.fork('Project:' + name),
            projectCache = new ProjectCache(storage, name, logger, gmeConfig);

        logger.debug('ctor');
        this.getBranch = function (branchName, shouldExist) {
            if (shouldExist === true) {
                ASSERT(this.branches.hasOwnProperty(branchName), 'branch does not exist ' + branchName);
            } else if (shouldExist === false) {
                ASSERT(this.branches.hasOwnProperty(branchName) === false, 'branch already existed ' + branchName);
            }

            if (this.branches.hasOwnProperty(branchName) === false) {
                this.branches[branchName] = new Branch(branchName, logger);
            }

            return this.branches[branchName];
        };

        this.removeBranch = function (branchName) {
            var existed = this.branches.hasOwnProperty(branchName);
            if (existed) {
                delete this.branches[branchName];
            }
            return existed;
        };

        // Functions forwarded to storage.
        this.setBranchHash = function (branchName, newHash, oldHash, callback) {
            storage.setBranchHash(name, newHash, oldHash, callback);
        };

        this.createBranch = function (branchName, newHash, callback) {
            storage.createBranch(branchName, newHash, callback);
        };

        this.makeCommit = function (branchName, parents, rootHash, stageBucket, msg, callback) {
            storage.makeCommit(name, branchName, parents, rootHash, stageBucket, msg, callback);
        };

        // Functions forwarded to project cache.
        this.insertObject = function (obj, stageBucket) {
            projectCache.insertObject(obj, stageBucket);
        };

        this.loadObject = function (key, callback) {
            projectCache.loadObject(key, callback);
        };
    }

    return Project;
});