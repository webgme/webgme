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
    StorageSimpleAPI.prototype.createProject = function (projectName, callback) {
        var data = {
            projectName: projectName
        },
            self = this;

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

    //temporary simple request and result functions
    StorageSimpleAPI.prototype.simpleRequest = function (parameters, callback) {
        this.logger.debug('invoking simpleRequest', {metadata: parameters});
        this.webSocket.simpleRequest(parameters, callback);
    };

    StorageSimpleAPI.prototype.simpleResult = function (resultId, callback) {
        this.logger.debug('invoking simpleResult', resultId);
        this.webSocket.simpleResult(resultId, callback);
    };

    StorageSimpleAPI.prototype.simpleQuery = function (workerId, parameters, callback) {
        this.logger.debug('invoking simpleQuery; workerId, parameters', workerId, {metadata: parameters});
        this.webSocket.simpleQuery(workerId, parameters, callback);
    };

    return StorageSimpleAPI;
});