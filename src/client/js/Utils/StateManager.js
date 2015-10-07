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
                this.set(CONSTANTS.STATE_ACTIVE_BRANCH_NAME, branchName);
            },

            getActiveBranch: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_BRANCH_NAME);
            },

            registerActiveCommit: function (project) {
                this.set(CONSTANTS.STATE_ACTIVE_COMMIT, project);
            },

            getActiveCommit: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_COMMIT);
            },

            getActiveTab: function () {
                return this.get(CONSTANTS.STATE_ACTIVE_TAB);
            }

        }),
        _initialize = function () {
            //if already initialized, just return
            if (!_WebGMEState) {
                logger = Logger.create('gme:Utils:StateManager', WebGMEGlobal.gmeConfig.client.log);
                _WebGMEState = new WebGMEStateModel();
                _WebGMEState.registerActiveAspect(CONSTANTS.ASPECT_ALL);
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