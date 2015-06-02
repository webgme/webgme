/*globals requireJS*/
/*jshint node:true*/
/**
 * This class is used when you need a project for e.g. core manipulations without going
 * through the web-sockets. This implies that it runs in same process as the storage.
 *
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var ProjectCache = requireJS('common/storage/project/cache'),
    GENKEY = requireJS('common/util/key'),
    CONSTANTS = requireJS('common/storage/constants');

function UserProject(dbProject, storage, mainLogger, gmeConfig) {
    var self = this,
        logger = mainLogger.fork('UserProject:' + dbProject.name),
        projectCache,
        objectLoader = {
            loadObject: function (projectName, key, callback) {
                dbProject.loadObject(key, callback);
            }
        };

    this.name = dbProject.name;
    this.userName = gmeConfig.authentication.guestAccount;

    this.setUser = function (userName) {
        this.userName = userName;
    };

    projectCache = new ProjectCache(objectLoader, this.name, logger, gmeConfig);

    this.insertObject = projectCache.insertObject;
    this.loadObject = projectCache.loadObject;
    this.ID_NAME = CONSTANTS.MONGO_ID;

    this.getBranch = function () {
        return null;
        // This is for the PluginManagerBase tests on the server.
        // TODO: PluginManagerBase tests should run on the client.
    };

    // Functions forwarded to storage
    this.makeCommit = function (branchName, parents, rootHash, coreObjects, msg, callback) {
        var self = this,
            data = {
                username: self.userName,
                projectName: self.name,
                commitObject: self.createCommitObject(parents, rootHash, null, msg),
                coreObjects: coreObjects
            };

        if (branchName) {
            data.branchName = branchName;
        }

        return storage.makeCommit(data)
            .nodeify(callback);
    };

    this.getBranches = function (callback) {
        var data = {
            username: self.userName,
            projectName: self.name
        };

        return storage.getBranches(data)
            .nodeify(callback);
    };

    this.setBranchHash = function (branchName, newHash, oldHash, callback) {
        var data = {
            username: self.userName,
            projectName: self.name,
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
            projectName: self.name,
            branchName: branchName
        };

        return storage.getBranchHash(data)
            .nodeify(callback);
    };

    this.createBranch = function (branchName, hash, callback) {
        var data = {
            username: self.userName,
            projectName: self.name,
            branchName: branchName,
            hash: hash
        };

        return storage.createBranch(data)
            .nodeify(callback);
    };

    this.getCommits = function (before, number, callback) {
        var data = {
            username: self.userName,
            projectName: self.name,
            before: before,
            number: number
        };

        return storage.getCommits(data)
            .nodeify(callback);
    };

    this.getCommonAncestorCommit = function (commitA, commitB, callback) {
        var data = {
            username: self.userName,
            projectName: self.name,
            commitA: commitA,
            commitB: commitB
        };
        return storage.getCommonAncestorCommit(data)
            .nodeify(callback);
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
}

module.exports = UserProject;