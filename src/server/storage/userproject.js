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
    var logger = mainLogger.fork('UserProject:' + dbProject.name),
        projectCache,
    objectLoader = {
        loadObject: function (projectName, key, callback) {
            dbProject.loadObject(key, callback);
        }
    };

    projectCache = new ProjectCache(objectLoader, dbProject.name, logger, gmeConfig);

    this.insertObject = projectCache.insertObject;
    this.loadObject = projectCache.loadObject;
    this.ID_NAME = CONSTANTS.MONGO_ID;

    // Functions forwarded to storage.
    this.makeCommit = function (branchName, parents, rootHash, coreObjects, msg, callback) {
        var self = this,
            data = {
                projectName: dbProject.name,
                commitObject: self.createCommitObject(parents, rootHash, null, msg),
                coreObjects: coreObjects
            };
        if (branchName) {
            data.branchName = branchName;
        }
        storage.makeCommit(data, callback);
    };

    this.setBranchHash = function (branchName, newHash, oldHash, callback) {
        var data = {
            projectName: dbProject.name,
            branchName: branchName,
            newHash: newHash,
            oldHash: oldHash
        };

        storage.setBranchHash(data, callback);
    };

    this.createBranch = function (branchName, newHash, callback) {
        var data = {
            projectName: dbProject.name,
            branchName: branchName,
            hash: hash
        };

        storage.setBranchHash(data, callback);
    };

    // Helper functions
    this.createCommitObject = function (parents, rootHash, user, msg) {
        user = user || 'n/a';
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