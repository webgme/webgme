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
     * Callback for getProjectNames.
     *
     * @callback StorageSimpleAPI~getProjectNamesCallback
     * @param {string} err - error string.
     * @param {string[]} projectNames - Names of all projects the user has at least read-access to.
     */

    /**
     * Retrieves all the project names where the user has at least read access.
     *
     * @param {StorageSimpleAPI~getProjectNamesCallback} callback - The callback that handles the response.
     */
    StorageSimpleAPI.prototype.getProjectNames = function (callback) {
        var data = {};
        this.logger.debug('getProjectNames', data);
        this.webSocket.getProjectNames(data, callback);
    };

    /**
     * Callback for getProjects.
     *
     * @callback StorageSimpleAPI~getProjectsCallback
     * @param {string} err - error string.
     * @param {{object[]} projects - Names of all projects the user has at least read-access to.
     * @example
     * // projects is of the form
     * // [{ name: 'ProjectName', read: true, write: false, delete: false} ]
     */

    /**
     * Retrieves all the access info for all projects.
     *
     * @param {StorageSimpleAPI~getProjectsCallback} callback - The callback that handles the response.
     */
    StorageSimpleAPI.prototype.getProjects = function (callback) {
        var data = {};
        this.logger.debug('getProjects', data);
        this.webSocket.getProjects(data, callback);
    };


    StorageSimpleAPI.prototype.getBranches = function (projectName, callback) {
        var data = {
            projectName: projectName
        };
        this.logger.debug('getBranches', data);
        this.webSocket.getBranches(data, callback);
    };

    StorageSimpleAPI.prototype.getCommits = function (projectName, before, number, callback) {
        var data = {
            projectName: projectName,
            before: before,
            number: number
        };
        this.logger.debug('getCommits', data);
        this.webSocket.getCommits(data, callback);
    };

    StorageSimpleAPI.prototype.getLatestCommitData = function (projectName, branchName, callback) {
        var data = {
            projectName: projectName,
            branchName: branchName
        };
        this.logger.debug('getLatestCommitData', data);
        this.webSocket.getLatestCommitData(data, callback);
    };

    // Setters
    StorageSimpleAPI.prototype.createProject = function (projectName, data, callback) {
        this.logger.debug('createProject');
        this.webSocket.createProject(data, callback);
    };

    StorageSimpleAPI.prototype.deleteProject = function (projectName, callback) {
        var data = {
            projectName: projectName
        };
        this.logger.debug('deleteProject', data);
        this.webSocket.deleteProject(data, callback);
    };

    StorageSimpleAPI.prototype.createBranch = function (projectName, branchName, newHash, callback) {
        var data = {
            projectName: projectName,
            branchName: branchName,
            newHash: newHash,
            oldHash: ''
        };
        this.logger.debug('createBranch', data);
        this.webSocket.setBranchHash(data, callback);
    };

    StorageSimpleAPI.prototype.deleteBranch = function (projectName, branchName, oldHash, callback) {
        var data = {
            projectName: projectName,
            branchName: branchName,
            newHash: '',
            oldHash: oldHash
        };
        this.logger.debug('deleteBranch', data);
        this.webSocket.setBranchHash(data, callback);
    };

    return StorageSimpleAPI;
});