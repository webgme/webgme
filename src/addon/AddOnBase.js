/*globals define*/
/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['addon/AddOnUpdateResult'], function (AddOnUpdateResult) {
    'use strict';

    /**
     * Class
     * @param logger
     * @param gmeConfig
     * @constructor
     */
    function AddOnBase(logger, gmeConfig) {
        this.gmeConfig = gmeConfig;
        this.logger = logger;

        // Set at configure
        this.core = null;
        this.project = null;
        this.branchName = null;
        this.blobClient = null;

        this.initialized = false;
        this.updateResult = null;

        this.logger.debug('ctor');
    }

    /**
     * Add-ons run on the server and act upon changes in a branch.
     * @param {object} configuration
     * @param {function} callback
     */
    AddOnBase.prototype.configure = function (configuration) {
        this.core = configuration.core;
        this.project = configuration.project;
        this.branchName = configuration.branchName;
        this.blobClient = configuration.blobClient;
    };

    /**
     * Readable name of this AddOn that can contain spaces.
     *
     * @returns {string}
     */
    AddOnBase.prototype.getName = function () {
        throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
            'when the js scripts are minified names are useless.');
    };

    /**
     * Current version of this AddOn using semantic versioning.
     * @returns {string}
     */
    AddOnBase.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * A detailed description of this AddOn and its purpose. It can be one or more sentences.
     *
     * @returns {string}
     */
    AddOnBase.prototype.getDescription = function () {
        return '';
    };

    /**
     * This is invoked each time changes in the branch of the project is done. AddOns are allowed to make changes on
     * an update, but should not persist by themselves. The manager/monitor will persist after each AddOn has had its
     * way (ordered by the "usedAddOn" registry in the rootNode).
     *
     * Changes made by AddOns do not trigger a new update for other addOns.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult} callback
     */
    AddOnBase.prototype.update = function (rootNode, commitObj, callback) {
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     * Called once when the AddOn is started for the first time.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult} callback
     */
    AddOnBase.prototype.initialize = function (rootNode, commitObj, callback) {
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     * Called by the AddOnManager each time changes in the branch of the project is done.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult} callback
     */
    AddOnBase.prototype._update = function (rootNode, commitObj, callback) {
        this.initialized = true;
        this.updateResult = new AddOnUpdateResult(commitObj);

        this.initialize(rootNode, commitObj, callback);
    };

    /**
     * Called by the AddOnManager when the AddOn is first started.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult} callback
     */
    AddOnBase.prototype._initialize = function (rootNode, commitObj, callback) {
        this.initialized = true;
        this.updateResult = new AddOnUpdateResult(commitObj);

        this.initialize(rootNode, commitObj, callback);
    };

    AddOnBase.prototype.addCommitMessage = function (msg) {
        this.updateResult.addCommitMessage(this, msg);
    };

    // Query related (not yet supported)
    /**
     * Structure of query parameters with names, descriptions, minimum, maximum values, default values and
     * type definitions.
     * @returns {object[]}
     */
    AddOnBase.prototype.getQueryParamsStructure = function () {
        return [];
    };

    /**
     * Queries are typically invoked by users from a client. The AddOn is not suppose to make any changes to
     * either the model's or the AddOn's state. (Since users can share a running instance of an AddOn).
     * @param {string} commitHash - State of the invoker.
     * @param {object} queryParams - Values based on the 'getQueryParametersStructure'.
     * @param {function} callback - resolves with PluginResult.
     */
    AddOnBase.prototype.query = function (commitHash, queryParams, callback) {
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     * Returns the default values of the Query Parameters.
     *
     * @returns {object}
     */
    AddOnBase.prototype.getDefaultQueryParams = function () {
        var paramStructure = this.getQueryParametersStructure(),
            defaultParams = {},
            i;

        for (i = 0; i < paramStructure.length; i += 1) {
            defaultParams[paramStructure[i].name] = paramStructure[i].value;
        }

        return defaultParams;
    };

    return AddOnBase;
});