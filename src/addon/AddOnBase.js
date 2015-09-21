/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/storage/constants'], function (CONSTANTS) {
    'use strict';

    /**
     *
     * @param core
     * @param project
     * @param branchName
     * @param gmeConfig
     * @constructor
     */
    var AddOnBase = function (logger, gmeConfig) {
        this.gmeConfig = gmeConfig;
        this.logger = logger;

        // Set at configure
        this.core = null;
        this.project = null;
        this.branchName = null;
        this.blobClient = null;

        this.initialized = false;

        this.logger.debug('ctor');
    };

    /**
     * Readable name of this addOn that can contain spaces.
     *
     * @returns {string}
     */
    AddOnBase.prototype.getName = function () {
        throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
            'when the js scripts are minified names are useless.');
    };

    /**
     * Current version of this addOn using semantic versioning.
     * @returns {string}
     */
    AddOnBase.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * A detailed description of this addOn and its purpose. It can be one or more sentences.
     *
     * @returns {string}
     */
    AddOnBase.prototype.getDescription = function () {
        return '';
    };

    /**
     * Structure of query parameters with names, descriptions, minimum, maximum values, default values and
     * type definitions.
     * @returns {object[]}
     */
    AddOnBase.prototype.getQueryParamsStructure = function () {
        return [];
    };

    /**
     * Queries are typically invoked by users from a client. The addOn is not suppose to make any changes to
     * either the model's or the addOns state. (Since users can share a running instance of an addOn).
     * @param {string} commitHash - State of the invoker.
     * @param {object} queryParams - Values based on the 'getQueryParametersStructure'.
     * @param {function} callback - resolves with PluginResult.
     */
    AddOnBase.prototype.query = function (commitHash, queryParams, callback) {
        //TODO: Add support for queries!
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     * This is invoked each time changes in the project is done. AddOn are allowed to make changes on an updated,
     * but should not persist by themselves. (The AddOnManager will persist after each addOn has had its way
     * ordered by the usedAddOn registry in the rootNode).
     * @param {object} rootNode
     * @param {function} callback
     */
    AddOnBase.prototype.update = function (rootNode, commitObj, callback) {
        //var updateData = {
        //    commitMessage: ''
        //};
        //callback(null, updateData);
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     * Called when the addOn is first started.
     * @param {object} rootNode
     * @param {function} callback
     */
    AddOnBase.prototype.initialize = function (rootNode, commitObj, callback) {
        this.initialized = true;
        this.update(rootNode, commitObj, callback);
    };

    /**
     * A detailed description of this addOn and its purpose. It can be one or more sentences.
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

    /**
     *
     * @param {object} configuration
     * @param {function} callback
     */
    AddOnBase.prototype.configure = function (configuration) {
        this.core = configuration.core;
        this.project = configuration.project;
        this.branchName = configuration.branchName;
        this.blobClient = configuration.blobClient;
    };

    return AddOnBase;
});