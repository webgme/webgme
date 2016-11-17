/*globals requireJS*/
/*jshint node:true*/
/**
 *
 * @module Server:UserProject
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var CONSTANTS = requireJS('common/storage/constants'),
    GENKEY = requireJS('common/util/key'),
    UTIL = requireJS('common/storage/util'),
    ProjectInterface = requireJS('common/storage/project/interface');

/**
 * This project is connected directly to the database and does not require the server to be running.
 * It is used by the bin scripts and for testing.
 *
 * @param {object} dbProject - Underlying data store project.
 * @param {object} storage - Safe storage.
 * @param {object} mainLogger - Logger instance.
 * @param {GmeConfig} gmeConfig
 * @constructor
 * @augments ProjectInterface
 */
function UserProject(dbProject, storage, mainLogger, gmeConfig) {
    var self = this,
        objectLoader = {
            loadObject: function (projectId, key, callback) {
                dbProject.loadObject(key, callback);
            },
            loadPaths: function (projectId, pathsInfo, excludes, callback) {
                var data = {
                    username: self.userName,
                    projectId: projectId,
                    pathsInfo: pathsInfo,
                    excludes: excludes
                };

                storage.loadPaths(data, callback);
            }
        };

    ProjectInterface.call(this, dbProject.projectId, objectLoader, mainLogger, gmeConfig);
    this.userName = gmeConfig.authentication.guestAccount;
    this._dbProject = dbProject;

    /**
     * Sets the user that accesses the database. If not altered it defaults to authentication.guestAccount
     * in the {GmeConfig}.
     * @param {string} userName - User that access the database.
     */
    this.setUser = function (userName) {
        this.userName = userName;
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
                type: CONSTANTS.COMMIT_TYPE,
                __v: CONSTANTS.VERSION
            },
            commitHash = '#' + GENKEY(commitObj, gmeConfig);

        commitObj[CONSTANTS.MONGO_ID] = commitHash;

        return commitObj;
    };

    // Functions defined in ProjectInterface
    this.makeCommit = function (branchName, parents, rootHash, coreObjects, msg, callback) {
        var self = this,
            keys = Object.keys(coreObjects),
            data = {
                username: self.userName,
                projectId: self.projectId,
                commitObject: self.createCommitObject(parents, rootHash, null, msg),
                coreObjects: {},
                changedNodes: null
            },
            i;

        for (i = 0; i < keys.length; i += 1) {
            if (UTIL.coreObjectHasOldAndNewData(coreObjects[keys[i]])) {
                // Patch type object.
                data.coreObjects[keys[i]] = UTIL.getPatchObject(coreObjects[keys[i]].oldData,
                    coreObjects[keys[i]].newData);
            } else if (coreObjects[keys[i]].newData && coreObjects[keys[i]].newHash) {
                // A new object with no previous data (send the entire data).
                data.coreObjects[keys[i]] = coreObjects[keys[i]].newData;
            } else {
                // A regular object.
                data.coreObjects[keys[i]] = coreObjects[keys[i]];
            }
        }

        data.changedNodes = UTIL.getChangedNodes(data.coreObjects, rootHash);
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

    this.createBranch = function (branchName, newHash, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            branchName: branchName,
            hash: newHash
        };

        return storage.createBranch(data)
            .nodeify(callback);
    };

    this.deleteBranch = function (branchName, oldHash, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            branchName: branchName,
            hash: oldHash
        };

        return storage.deleteBranch(data)
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

    this.createTag = function (tagName, commitHash, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            tagName: tagName,
            commitHash: commitHash
        };

        return storage.createTag(data)
            .nodeify(callback);
    };

    this.deleteTag = function (tagName, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            tagName: tagName
        };

        return storage.deleteTag(data)
            .nodeify(callback);
    };

    this.getTags = function (callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId
        };

        return storage.getTags(data)
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

    this.getHistory = function (start, number, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            start: start,
            number: number
        };

        return storage.getHistory(data)
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

    this.squashCommits = function (fromCommit, toCommitOrBranch, message, callback) {
        var data = {
            username: self.userName,
            projectId: self.projectId,
            fromCommit: fromCommit,
            toCommitOrBranch: toCommitOrBranch,
            message: message
        };

        return storage.squashCommits(data)
            .nodeify(callback);
    };
}

UserProject.prototype = Object.create(ProjectInterface.prototype);
UserProject.prototype.constructor = UserProject;

module.exports = UserProject;