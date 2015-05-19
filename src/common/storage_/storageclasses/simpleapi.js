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

define(['common/storage_/storageclasses/watchers'], function (StorageWatcher) {
    'use strict';

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

    // Getters
    StorageSimpleAPI.prototype.getProjectNames = function (data, callback) {
        this.logger.debug('getProjectNames');
        this.webSocket.getProjectNames(data, callback);
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