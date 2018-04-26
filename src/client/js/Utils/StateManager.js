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
             * @param {object} [opts] - Optional options when setting the state.
             * @param {boolean} [opts.suppressVisualizerFromNode=false] - If true, stops the visualizer panel from 
             * automatically setting the visualizer based on the order of the registered 'validVisualizers'.
             * @param {object} [opts.invoker] - Optional reference to the instance that set the state.
             * @param {object} [opts.suppressHistoryUpdate=false] - If true, state update will not be added to history.
             */
            registerActiveObject: function (objId, opts) {
                objId = objId === 'root' ? '' : objId;
                logger.debug('registerActiveObject, objId: ', objId);
                opts = opts || {};
                this.set(CONSTANTS.STATE_ACTIVE_OBJECT, objId, opts);
            },

            getActiveObject: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_OBJECT);
            },

            /**
             * Sets the active selection
             * @param {string[]} objIdList - Array of ids/paths to nodes in selection
             * @param {object} [opts] - Optional options when setting the state.
             * @param {object} [opts.invoker] - Optional reference to the instance that set the state.
             * @param {object} [opts.suppressHistoryUpdate=false] - If true, state update will not be added to history.
             */
            registerActiveSelection: function (objIdList, opts) {
                ASSERT(_.isArray(objIdList));
                opts = opts || {};
                this.set(CONSTANTS.STATE_ACTIVE_SELECTION, objIdList.slice(), opts);
            },

            getActiveSelection: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_SELECTION) || [];
            },

            /**
             * Sets the active aspect.
             * @param {string} aspect - Name of aspect.
             * @param {object} [opts] - Optional options when setting the state.
             * @param {object} [opts.invoker] - Optional reference to the instance that set the state.
             * @param {object} [opts.suppressHistoryUpdate=false] - If true, state update will not be added to history.
             */
            registerActiveAspect: function (aspect, opts) {
                opts = opts || {silent: true};
                this.set(CONSTANTS.STATE_ACTIVE_ASPECT, aspect, opts);
            },

            getActiveAspect: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_ASPECT);
            },

            /**
             * Sets the active visualiser.
             * @param {string} visualizer - Name of visualizer.
             * @param {object} [opts] - Optional options when setting the state.
             * @param {object} [opts.invoker] - Optional reference to the instance that set the state.
             * @param {object} [opts.suppressHistoryUpdate=false] - If true, state update will not be added to history.
             */
            registerActiveVisualizer: function (visualizer, opts) {
                opts = opts || {};
                this.set(CONSTANTS.STATE_ACTIVE_VISUALIZER, visualizer, opts);
            },

            getActiveVisualizer: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_VISUALIZER);
            },

            registerActiveProjectName: function (projectId, opts) {
                opts = opts || {};
                this.set(CONSTANTS.STATE_ACTIVE_PROJECT_NAME, projectId, opts);
            },

            getActiveProjectName: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_PROJECT_NAME);
            },

            registerActiveBranchName: function (branchName, opts) {
                var newState = {};
                newState[CONSTANTS.STATE_ACTIVE_BRANCH_NAME] = branchName;
                newState[CONSTANTS.STATE_ACTIVE_COMMIT] = null;
                opts = opts || {};
                this.set(newState, opts);
            },

            getActiveBranch: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_BRANCH_NAME);
            },

            registerActiveCommit: function (commitHash, opts) {
                var newState = {};
                newState[CONSTANTS.STATE_ACTIVE_BRANCH_NAME] = null;
                newState[CONSTANTS.STATE_ACTIVE_COMMIT] = commitHash;
                opts = opts || {};
                this.set(newState, opts);
            },

            getActiveCommit: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_COMMIT);
            },

            /**
             * Sets the active tab.
             * @param {number} tab - Current tab-index (0, .. ).
             * @param {object} [opts] - Optional options when setting the state.
             * @param {object} [opts.invoker] - Optional reference to the instance that set the state.
             * @param {object} [opts.suppressHistoryUpdate=false] - If true, state update will not be added to history.
             */
            registerActiveTab: function (tab, opts) {
                opts = opts || {};
                this.set(CONSTANTS.STATE_ACTIVE_TAB, parseInt(tab, 10), opts);
            },

            getActiveTab: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_TAB);
            },

            registerSuppressVisualizerFromNode: function (trueOrFalse) {
                logger.error('registerSuppressVisualizerFromNode is no longer valid pass extra argument to ' +
                    'registerActiveObject(objectId, {suppressVisualizerFromNode: true} to suppress.');
            },

            getSuppressVisualizerFromNode: function () {
                logger.error('getSuppressVisualizerFromNode is no longer valid pass extra argument to ' +
                    'registerActiveObject(objectId, {suppressVisualizerFromNode: true} to suppress.');
            },

            /**
             * For this to take action the page needs to be refreshed.
             * @param {string} layout - Name of layout
             */
            registerLayout: function (layout, opts) {
                opts = opts || {};
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
                _WebGMEState.registerActiveAspect(CONSTANTS.ASPECT_ALL, {suppressHistoryUpdate: true});
                _WebGMEState.registerActiveTab(0, {suppressHistoryUpdate: true});
                _WebGMEState.on('change', function (model, options) {
                    logger.debug('', model, options);
                });

                var orgSet = _WebGMEState.set.bind(_WebGMEState);

                _WebGMEState.set = function (stateDesc, value, opts) {
                    if (stateDesc === CONSTANTS.STATE_ACTIVE_OBJECT) {
                        orgSet(CONSTANTS.STATE_TO_BE_ACTIVE_OBJECT, value, opts);
                    } else if (stateDesc && typeof stateDesc === 'object' &&
                        stateDesc.hasOwnProperty(CONSTANTS.STATE_ACTIVE_OBJECT)) {
                        // Here value is the opts..
                        orgSet(CONSTANTS.STATE_TO_BE_ACTIVE_OBJECT, stateDesc[CONSTANTS.STATE_ACTIVE_OBJECT], value);
                    }

                    orgSet(stateDesc, value, opts);
                };
            }

            return _WebGMEState;
        };

    //return utility functions
    return {
        initialize: _initialize
    };
});