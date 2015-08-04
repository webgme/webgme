/*globals define*/
/*jshint browser: true, node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/project/interface',
    'common/storage/project/branch',
    'q'
], function (ProjectInterface, Branch, Q) {
    'use strict';

    function Project(projectId, storage, mainLogger, gmeConfig) {
        var self = this;
        this.branches = {};

        ProjectInterface.call(this, projectId, storage, mainLogger, gmeConfig);

        // Functions defined in ProjectInterface
        this.makeCommit = function (branchName, parents, rootHash, coreObjects, msg, callback) {
            return Q.ninvoke(storage, 'makeCommit', self.projectId, branchName, parents, rootHash, coreObjects, msg)
                .nodeify(callback);
        };

        this.setBranchHash = function (branchName, newHash, oldHash, callback) {
            return Q.ninvoke(storage, 'setBranchHash', self.projectId, branchName, newHash, oldHash)
                .nodeify(callback);
        };

        this.getBranchHash = function (branchName, callback) {
            return Q.ninvoke(storage, 'getBranchHash', self.projectId, branchName)
                .nodeify(callback);
        };

        this.createBranch = function (branchName, newHash, callback) {
            return Q.ninvoke(storage, 'createBranch', self.projectId, branchName, newHash)
                .nodeify(callback);
        };

        this.deleteBranch = function (branchName, oldHash, callback) {
            return Q.ninvoke(storage, 'deleteBranch', self.projectId, branchName, oldHash)
                .nodeify(callback);
        };

        this.getBranches = function (callback) {
            return Q.ninvoke(storage, 'getBranches', self.projectId)
                .nodeify(callback);
        };

        this.getCommits = function (before, number, callback) {
            return Q.ninvoke(storage, 'getCommits', self.projectId, before, number)
                .nodeify(callback);
        };

        this.getCommonAncestorCommit = function (commitA, commitB, callback) {
            return Q.ninvoke(storage, 'getCommonAncestorCommit', self.projectId, commitA, commitB)
                .nodeify(callback);
        };
    }

    Project.prototype = Object.create(ProjectInterface.prototype);
    Project.prototype.constructor = Project;

    return Project;
});