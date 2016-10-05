/*globals define, WebGMEGlobal, Backbone, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'jquery',
    'backbone',
    'js/Constants',
    'js/logger',
    'common/util/assert'
], function (_jquery, _backbone, CONSTANTS, Logger, ASSERT) {

    'use strict';

    var _WebGMEState,
        logger,
        WebGMEStateModel = Backbone.Model.extend({

            /**
             * Sets the active node to the given id.
             * N.B. Do NOT call this unless the node is guaranteed to be loaded. Either check that getNode(objId) is
             * defined or (even better) create a territory and check if the node could be loaded.
             * @param {string} objId
             */
            registerActiveObject: function (objId) {
                objId = objId === 'root' ? '' : objId;
                logger.debug('registerActiveObject, objId: ', objId);
                this.set(CONSTANTS.STATE_ACTIVE_OBJECT, objId);
            },

            getActiveObject: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_OBJECT);
            },

            registerActiveSelection: function (objIdList) {
                ASSERT(_.isArray(objIdList));
                this.set(CONSTANTS.STATE_ACTIVE_SELECTION, objIdList);
            },

            getActiveSelection: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_SELECTION);
            },

            registerActiveAspect: function (aspect) {
                this.set(CONSTANTS.STATE_ACTIVE_ASPECT, aspect, {silent: true});
            },

            getActiveAspect: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_ASPECT);
            },

            registerActiveVisualizer: function (visualizer) {
                this.set(CONSTANTS.STATE_ACTIVE_VISUALIZER, visualizer);
            },

            getActiveVisualizer: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_VISUALIZER);
            },

            registerActiveProjectName: function (projectName) {
                this.set(CONSTANTS.STATE_ACTIVE_PROJECT_NAME, projectName);
            },

            getActiveProjectName: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_PROJECT_NAME);
            },

            registerActiveBranchName: function (branchName) {
                var newState = {};
                newState[CONSTANTS.STATE_ACTIVE_BRANCH_NAME] = branchName;
                newState[CONSTANTS.STATE_ACTIVE_COMMIT] = null;
                this.set(newState);
            },

            getActiveBranch: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_BRANCH_NAME);
            },

            registerActiveCommit: function (commitHash) {
                var newState = {};
                newState[CONSTANTS.STATE_ACTIVE_BRANCH_NAME] = null;
                newState[CONSTANTS.STATE_ACTIVE_COMMIT] = commitHash;
                this.set(newState);
            },

            getActiveCommit: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_COMMIT);
            },

            registerActiveTab: function (tab) {
                this.set(CONSTANTS.STATE_ACTIVE_TAB, parseInt(tab, 10));
            },

            getActiveTab: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_TAB);
            },

            registerSuppressVisualizerFromNode: function (trueOrFalse) {
                this.set(CONSTANTS.STATE_SUPPRESS_VISUALIZER_FROM_NODE, trueOrFalse);
            },

            getSuppressVisualizerFromNode: function () {
                return this.get(CONSTANTS.STATE_SUPPRESS_VISUALIZER_FROM_NODE);
            },

            /**
             * For this to take action the page needs to be refreshed.
             * @param {string} layout - Name of layout
             */
            registerLayout: function (layout) {
                this.set(CONSTANTS.STATE_LAYOUT, layout);
            },

            getLayout: function () {
                return this.get(CONSTANTS.STATE_LAYOUT);
            }
        }),
        _initialize = function () {
            //if already initialized, just return
            if (!_WebGMEState) {
                logger = Logger.create('gme:Utils:StateManager', WebGMEGlobal.gmeConfig.client.log);
                _WebGMEState = new WebGMEStateModel();
                _WebGMEState.registerActiveAspect(CONSTANTS.ASPECT_ALL);
                _WebGMEState.registerSuppressVisualizerFromNode(true);
                //_WebGMEState.registerActiveTab('0');
                _WebGMEState.on('change', function (model, options) {
                    logger.debug('', model, options);
                });
            }

            return _WebGMEState;
        };

    //return utility functions
    return {
        initialize: _initialize
    };
});