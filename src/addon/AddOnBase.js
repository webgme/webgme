/*globals define*/
/*jshint node:true*/

/**
 * This is the base class that add-ons should inherit from.
 * (Using the AddOnGenerator - the generated add-on will do that.)
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'addon/AddOnUpdateResult',
    'common/storage/constants'
], function (AddOnUpdateResult, STORAGE_CONSTANTS) {
    'use strict';

    /**
     * BaseClass for AddOns which run on the server and act upon changes in a branch.
     * Use the AddOnGenerator to generate a new AddOn that implements this class.
     * @param {GmeLogger} logger
     * @param {GmeConfig} gmeConfig
     * @constructor
     * @alias AddOnBase
     */
    function AddOnBase(logger, gmeConfig) {
        /**
         * @type {GmeConfig}
         */
        this.gmeConfig = gmeConfig;

        /**
         * @type {GmeLogger}
         */
        this.logger = logger;

        // Set at configure
        /**
         * @type {Core}
         */
        this.core = null;

        /**
         * @type {Project}
         */
        this.project = null;

        /**
         * @type {string}
         */
        this.branchName = null;

        /**
         * @type {BlobClient}
         */
        this.blobClient = null;

        this.initialized = false;

        /**
         * @type {AddOnUpdateResult}
         */
        this.updateResult = null;

        this.logger.debug('ctor');
    }

    /**
     * Configures the AddOn
     * @param {object} configuration
     * @param {function} callback
     */
    AddOnBase.prototype.configure = function (configuration) {
        this.core = configuration.core;
        this.project = configuration.project;
        this.branchName = configuration.branchName;
        this.blobClient = configuration.blobClient;
        this.projectId = this.project.projectId;
    };

    /**
     * Readable name of this AddOn that can contain spaces.
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
     * @returns {string}
     */
    AddOnBase.prototype.getDescription = function () {
        return '';
    };

    /**
     * This is invoked after each commit to the branch. AddOns are allowed to make changes on updates,
     * but should not persist by themselves. The manager/monitor will persist after each AddOn has had its
     * way (ordered by the "usedAddOn" registry in the rootNode).
     *
     * Changes made by AddOns do not trigger a new update for other addOns.
     * @param {module:Core~Node} rootNode
     * @param {module:Storage~CommitObject} commitObj
     * @param {function(Error, AddOnUpdateResult)} callback
     */
    AddOnBase.prototype.update = function (rootNode, commitObj, callback) {
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     * Called once when the AddOn is started for the first time.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult)} callback
     */
    AddOnBase.prototype.initialize = function (rootNode, commitObj, callback) {
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     * Called by the manager/monitor after each commit to the branch.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult)} callback
     * @private
     */
    AddOnBase.prototype._update = function (rootNode, commitObj, callback) {
        this.updateResult = new AddOnUpdateResult(commitObj);

        this.update(rootNode, commitObj, callback);
    };

    /**
     * Called once by the manager/monitor when the AddOn is first started.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult)} callback
     * @private
     */
    AddOnBase.prototype._initialize = function (rootNode, commitObj, callback) {
        this.initialized = true;
        this.updateResult = new AddOnUpdateResult(commitObj);

        this.initialize(rootNode, commitObj, callback);
    };

    /**
     * Creats or appends commit message for the current update-cycle.
     * @param {string} msg
     */
    AddOnBase.prototype.addCommitMessage = function (msg) {
        this.updateResult.addCommitMessage(this, msg);
    };

    /**
     * Adds a notification to all sockets connected to the branch room. The notification will be sent after
     * the update-callback has been invoked.
     * @param {string|object} message - Message string or object containing message.
     * @param {string} message.message - If object it must contain a message.
     * @param {string} [message.severity='info'] - Severity level ('success', 'info', 'warn', 'error')
     */
    AddOnBase.prototype.addNotification = function (message) {
        var self = this,
            data = {
                type: STORAGE_CONSTANTS.ADD_ON_NOTIFICATION,
                notification: typeof message === 'string' ? {message: message} : message,
                projectId: self.projectId,
                branchName: self.branchName,
                commitHash: self.updateResult.commitObj._id,
                addOnName: self.getName(),
                addOnVersion: self.getVersion()
            };

        self.updateResult.addNotification(self, data);
    };

    // TODO: Query related
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