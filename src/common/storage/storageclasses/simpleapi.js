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
     * @param {StorageSimpleAPI~getProjectNamesCallback} callback
     */
    StorageSimpleAPI.prototype.getProjectNames = function (callback) {
        var data = {};
        this.logger.debug('invoking getProjectNames', data);
        this.webSocket.getProjectNames(data, callback);
    };

    /**
     * Callback for getProjects.
     *
     * @callback StorageSimpleAPI~getProjectsCallback
     * @param {string} err - error string.
     * @param {{object[]} projects - All projects in the database.
     * @example
     * // projects is of the form
     * // [{ name: 'ProjectName', read: true, write: false, delete: false} ]
     */

    /**
     * Retrieves all the access info for all projects.
     *
     * @param {StorageSimpleAPI~getProjectsCallback} callback
     */
    StorageSimpleAPI.prototype.getProjects = function (callback) {
        var data = {};
        this.logger.debug('invoking getProjects', data);
        this.webSocket.getProjects(data, callback);
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
     * //    name: 'ProjectName',
     * //    read: true, //will always be true
     * //    write: false,
     * //    delete: false
     * //    branches: {
     * //      master: '#validHash',
     * //      b1: '#validHashtoo'
     * //    }
     * // }]
     */

    /**
     * Retrieves all the access info for all projects.
     *
     * @param {StorageSimpleAPI~getProjectsAndBranches} callback
     */
    StorageSimpleAPI.prototype.getProjectsAndBranches = function (callback) {
        var data = {};
        this.logger.debug('invoking getProjectsAndBranches', data);
        this.webSocket.getProjectsAndBranches(data, callback);
    };


    StorageSimpleAPI.prototype.getBranches = function (projectName, callback) {
        var data = {
            projectName: projectName
        };
        this.logger.debug('invoking getBranches', data);
        this.webSocket.getBranches(data, callback);
    };

    StorageSimpleAPI.prototype.getCommits = function (projectName, before, number, callback) {
        var data = {
            projectName: projectName,
            before: before,
            number: number
        };
        this.logger.debug('invoking getCommits', data);
        this.webSocket.getCommits(data, callback);
    };

    StorageSimpleAPI.prototype.getLatestCommitData = function (projectName, branchName, callback) {
        var data = {
            projectName: projectName,
            branchName: branchName
        };
        this.logger.debug('invoking getLatestCommitData', data);
        this.webSocket.getLatestCommitData(data, callback);
    };

    // Setters
    StorageSimpleAPI.prototype.createProject = function (projectName, parameters, callback) {
        var data = {
            projectName: projectName,
            parameters: parameters
        };

        this.logger.debug('invoking createProject');
        this.webSocket.createProject(data, callback);
    };

    StorageSimpleAPI.prototype.deleteProject = function (projectName, callback) {
        var data = {
            projectName: projectName
        };
        this.logger.debug('invoking deleteProject', data);
        this.webSocket.deleteProject(data, callback);
    };

    StorageSimpleAPI.prototype.createBranch = function (projectName, branchName, newHash, callback) {
        var data = {
            projectName: projectName,
            branchName: branchName,
            newHash: newHash,
            oldHash: ''
        };
        this.logger.debug('invoking createBranch', data);
        this.webSocket.setBranchHash(data, callback);
    };

    StorageSimpleAPI.prototype.deleteBranch = function (projectName, branchName, oldHash, callback) {
        var data = {
            projectName: projectName,
            branchName: branchName,
            newHash: '',
            oldHash: oldHash
        };
        this.logger.debug('invoking deleteBranch', data);
        this.webSocket.setBranchHash(data, callback);
    };

    return StorageSimpleAPI;
});