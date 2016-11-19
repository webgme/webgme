/*globals define*/
/*jshint browser: true, node:true*/
/**
 * TODO: Come up with an appropriate name for this.
 * TODO: Proper implementation needed, e.g. error handling.
 *
 * Provides REST-like functionality of the database.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/storageclasses/watchers'], function (StorageWatcher) {
    'use strict';

    /**
     *
     * @param webSocket
     * @param logger
     * @param gmeConfig
     * @constructor
     * @class
     */
    function StorageSimpleAPI(webSocket, logger, gmeConfig) {
        // watcher counters determining when to join/leave a room on the sever
        this.logger = this.logger || logger.fork('storage');
        StorageWatcher.call(this, webSocket, logger, gmeConfig);
        this.webSocket = webSocket;
        this.gmeConfig = gmeConfig;
        this.logger.debug('StorageSimpleAPI ctor');
    }

    StorageSimpleAPI.prototype = Object.create(StorageWatcher.prototype);
    StorageSimpleAPI.prototype.constructor = StorageSimpleAPI;

    /**
     * Callback for getProjects.
     *
     * @callback StorageSimpleAPI~getProjectsCallback
     * @param {string} err - error string.
     * @param {{object[]} projects - All projects in the database.
     * @example
     * // projects is of the form
     * // [{ name: 'projectId', read: true, write: false, delete: false} ]
     */

    /**
     * Retrieves all the access info for all projects.
     *
     * @param {StorageSimpleAPI~getProjectsCallback} callback
     */
    StorageSimpleAPI.prototype.getProjects = function (options, callback) {
        this.logger.debug('invoking getProjects', {metadata: options});
        this.webSocket.getProjects(options, callback);
    };

    /**
     * Callback for getProjectsAndBranches.
     *
     * @callback StorageSimpleAPI~getProjectsAndBranches
     * @param {string} err - error string.
     * @param {{object[]} projectsWithBranches - Projects the user has at least read-access to.
     * @example
     * // projectsWithBranches is of the form
     * // [{
     * //    name: 'projectId',
     * //    read: true, //will always be true
     * //    write: false,
     * //    delete: false
     * //    branches: {
     * //      master: '#validHash',
     * //      b1: '#validHashtoo'
     * //    }
     * // }]
     */


    StorageSimpleAPI.prototype.getBranches = function (projectId, callback) {
        var data = {
            projectId: projectId
        };
        this.logger.debug('invoking getBranches', {metadata: data});
        this.webSocket.getBranches(data, callback);
    };

    StorageSimpleAPI.prototype.getCommits = function (projectId, before, number, callback) {
        var data = {
            projectId: projectId,
            before: before,
            number: number
        };
        this.logger.debug('invoking getCommits', {metadata: data});
        this.webSocket.getCommits(data, callback);
    };

    StorageSimpleAPI.prototype.getHistory = function (projectId, start, number, callback) {
        var data = {
            projectId: projectId,
            start: start,
            number: number
        };
        this.logger.debug('invoking getHistory', {metadata: data});
        this.webSocket.getHistory(data, callback);
    };

    StorageSimpleAPI.prototype.squashCommits = function (projectId, fromCommit, toCommitOrBranch, msg, callback) {
        var data = {
            projectId: projectId,
            fromCommit: fromCommit,
            toCommitOrBranch: toCommitOrBranch,
            message: msg
        };
        this.logger.debug('invoking squashCommits', {metadata: data});
        this.webSocket.squashCommits(data, callback);
    };

    StorageSimpleAPI.prototype.getTags = function (projectId, callback) {
        var data = {
            projectId: projectId
        };
        this.logger.debug('invoking getTags', {metadata: data});
        this.webSocket.getTags(data, callback);
    };

    StorageSimpleAPI.prototype.getBranchHash = function (projectId, branchName, callback) {
        var data = {
            projectId: projectId,
            branchName: branchName
        };
        this.logger.debug('invoking getBranchHash', {metadata: data});
        this.webSocket.getBranchHash(data, callback);
    };

    StorageSimpleAPI.prototype.getLatestCommitData = function (projectId, branchName, callback) {
        var data = {
            projectId: projectId,
            branchName: branchName
        };
        this.logger.debug('invoking getLatestCommitData', {metadata: data});
        this.webSocket.getLatestCommitData(data, callback);
    };

    StorageSimpleAPI.prototype.getCommonAncestorCommit = function (projectId, commitA, commitB, callback) {
        var data = {
            commitA: commitA,
            commitB: commitB,
            projectId: projectId
        };
        this.logger.debug('invoking getCommonAncestorCommit', {metadata: data});
        this.webSocket.getCommonAncestorCommit(data, callback);
    };

    // Setters
    StorageSimpleAPI.prototype.createProject = function (projectName, ownerId, callback) {
        var self = this,
            data = {
                projectName: projectName,
                ownerId: ownerId
            };

        if (callback === undefined && typeof ownerId === 'function') {
            callback = ownerId;
            data.ownerId = undefined;
        }

        this.logger.debug('invoking createProject', {metadata: data});

        this.webSocket.createProject(data, function (err, projectId) {
            if (err) {
                self.logger.error('cannot create project ', projectName, err);
                callback(err);
                return;
            }
            self.logger.debug('Project created, projectId', projectId);

            callback(err, projectId);
        });
    };

    StorageSimpleAPI.prototype.deleteProject = function (projectId, callback) {
        var data = {
            projectId: projectId
        };
        this.logger.debug('invoking deleteProject', {metadata: data});
        this.webSocket.deleteProject(data, callback);
    };

    StorageSimpleAPI.prototype.transferProject = function (projectId, newOwnerId, callback) {
        var data = {
            projectId: projectId,
            newOwnerId: newOwnerId
        };
        this.logger.debug('invoking transferProject', {metadata: data});
        this.webSocket.transferProject(data, callback);
    };

    StorageSimpleAPI.prototype.duplicateProject = function (projectId, projectName, ownerId, callback) {
        var data = {
            projectId: projectId,
            projectName: projectName,
            ownerId: ownerId
        };

        if (callback === undefined && typeof ownerId === 'function') {
            callback = ownerId;
            data.ownerId = undefined;
        }

        this.logger.debug('invoking duplicateProject', {metadata: data});
        this.webSocket.duplicateProject(data, callback);
    };

    StorageSimpleAPI.prototype.setBranchHash = function (projectId, branchName, newHash, oldHash, callback) {
        var data = {
            projectId: projectId,
            branchName: branchName,
            newHash: newHash,
            oldHash: oldHash
        };
        this.logger.debug('invoking setBranchHash', {metadata: data});
        this.webSocket.setBranchHash(data, callback);
    };

    StorageSimpleAPI.prototype.createBranch = function (projectId, branchName, newHash, callback) {
        var data = {
            projectId: projectId,
            branchName: branchName,
            newHash: newHash,
            oldHash: ''
        };
        this.logger.debug('invoking createBranch', {metadata: data});
        this.webSocket.setBranchHash(data, callback);
    };

    StorageSimpleAPI.prototype.deleteBranch = function (projectId, branchName, oldHash, callback) {
        var data = {
            projectId: projectId,
            branchName: branchName,
            newHash: '',
            oldHash: oldHash
        };
        this.logger.debug('invoking deleteBranch', {metadata: data});
        this.webSocket.setBranchHash(data, callback);
    };

    StorageSimpleAPI.prototype.createTag = function (projectId, tagName, commitHash, callback) {
        var data = {
            projectId: projectId,
            tagName: tagName,
            commitHash: commitHash
        };
        this.logger.debug('invoking createTag', {metadata: data});
        this.webSocket.createTag(data, callback);
    };

    StorageSimpleAPI.prototype.deleteTag = function (projectId, tagName, callback) {
        var data = {
            projectId: projectId,
            tagName: tagName
        };
        this.logger.debug('invoking deleteTag', {metadata: data});
        this.webSocket.deleteTag(data, callback);
    };

    //temporary simple request and result functions
    StorageSimpleAPI.prototype.simpleRequest = function (parameters, callback) {
        this.logger.debug('invoking simpleRequest', {metadata: parameters});
        this.webSocket.simpleRequest(parameters, callback);
    };

    StorageSimpleAPI.prototype.simpleQuery = function (workerId, parameters, callback) {
        this.logger.debug('invoking simpleQuery; workerId, parameters', workerId, {metadata: parameters});
        this.webSocket.simpleQuery(workerId, parameters, callback);
    };

    StorageSimpleAPI.prototype.sendNotification = function (data, callback) {
        this.logger.debug('invoking sendNotification; ', {metadata: data});
        this.webSocket.sendNotification(data, callback);
    };

    return StorageSimpleAPI;
});