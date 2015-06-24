/*globals define*/
/*jshint node:true*/
/**
 * This class defines the common interface for a storage-project
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/project/cache',
    'common/storage/constants',
], function (ProjectCache, CONSTANTS) {
    'use strict';

    function ProjectInterface(projectId, storageObjectsAccessor, mainLogger, gmeConfig) {
        this.projectId = projectId;
        this.ID_NAME = CONSTANTS.MONGO_ID;
        this.logger = mainLogger.fork('Project:' + this.projectId),
        this.projectCache = new ProjectCache(storageObjectsAccessor, this.projectId, this.logger, gmeConfig);

        this.getBranch = function (branchName, shouldExist) {
            throw new Error('getBranch must be overridden in derived class');
        };

        // Functions forwarded to project cache.
        this.insertObject = this.projectCache.insertObject;
        this.loadObject = this.projectCache.loadObject;

        // Functions forwarded to storage.
        this.makeCommit = function (branchName, parents, rootHash, coreObjects, msg, callback) {
            throw new Error('makeCommit must be overridden in derived class');
        };

        this.setBranchHash = function (branchName, newHash, oldHash, callback) {
            throw new Error('setBranchHash must be overridden in derived class');
        };

        this.getBranchHash = function (branchName, callback) {
            throw new Error('setBranchHash must be overridden in derived class');
        };

        this.createBranch = function (branchName, newHash, callback) {
            throw new Error('createBranch must be overridden in derived class');
        };

        this.getBranches = function (callback) {
            throw new Error('getBranches must be overridden in derived class');
        };

        this.getCommits = function (before, number, callback) {
            throw new Error('getCommits must be overridden in derived class');
        };

        this.getCommonAncestorCommit = function (commitA, commitB, callback) {
            throw new Error('getCommonAncestorCommit must be overridden in derived class');
        };
    }

    return ProjectInterface;
});