/*globals requireJS*/
/*jshint node:true*/
/**
 * This class is used when you need a project for e.g. core manipulations without going
 * through the web-sockets. This implies that it runs in same process and has direct access to the storage on the server.
 *
 * @module Server:UserProject
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var CONSTANTS = requireJS('common/storage/constants'),
    GENKEY = requireJS('common/util/key'),
    ProjectInterface = requireJS('common/storage/project/interface');

function UserProject(dbProject, storage, mainLogger, gmeConfig) {
    var self = this,
        objectLoader = {
            loadObject: function (projectId, key, callback) {
                dbProject.loadObject(key, callback);
            }
        };

    ProjectInterface.call(this, dbProject.projectId, objectLoader, mainLogger, gmeConfig);
    this.userName = gmeConfig.authentication.guestAccount;

    this.setUser = function (userName) {
        this.userName = userName;
    };

    this.getBranch = function () {
        return null;
    };

    // Helper functions
    this.createCommitObject = function (parents, rootHash, user, msg) {
        user = user || self.userName || 'n/a';
        msg = msg || 'n/a';

        var commitObj = {
                root: rootHash,
                parents: parents,
                updater: [user],
                time: (new Date()).getTime(),
                message: msg,
                type: 'commit'
            },
            commitHash = '#' + GENKEY(commitObj, gmeConfig);

        commitObj[CONSTANTS.MONGO_ID] = commitHash;

        return commitObj;
    };

    // Functions defined in ProjectInterface
    this.makeCommit = function (branchName, parents, rootHash, coreObjects, msg, callback) {
        var self = this,
            data = {
                username: self.userName,
                projectId: self.projectId,
                commitObject: self.createCommitObject(parents, rootHash, null, msg),
                coreObjects: coreObjects
            };

        if (branchName) {
            data.branchName = branchName;
        }

        return storage.makeCommit(data)
            .nodeify(callback);
    };

    this.setBranchHash = function (branchName, newHash, oldHash, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            branchName: branchName,
            newHash: newHash,
            oldHash: oldHash
        };

        return storage.setBranchHash(data)
            .nodeify(callback);
    };

    this.getBranchHash = function (branchName, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            branchName: branchName
        };

        return storage.getBranchHash(data)
            .nodeify(callback);
    };

    this.createBranch = function (branchName, hash, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            branchName: branchName,
            hash: hash
        };

        return storage.createBranch(data)
            .nodeify(callback);
    };

    this.getBranches = function (callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId
        };

        return storage.getBranches(data)
            .nodeify(callback);
    };

    this.getCommits = function (before, number, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            before: before,
            number: number
        };

        return storage.getCommits(data)
            .nodeify(callback);
    };

    this.getCommonAncestorCommit = function (commitA, commitB, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            commitA: commitA,
            commitB: commitB
        };
        return storage.getCommonAncestorCommit(data)
            .nodeify(callback);
    };
}

UserProject.prototype = Object.create(ProjectInterface.prototype);
UserProject.prototype.constructor = UserProject;

module.exports = UserProject;