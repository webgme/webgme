/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['jquery',
    'backbone',
    'js/Constants',
    'util/assert'], function (_jquery,
                               _backbone,
                               CONSTANTS,
                               ASSERT) {

    var _WebGMEState,
        WebGMEStateModel = Backbone.Model.extend({
            registerActiveObject: function(objId) {
                this.set(CONSTANTS.STATE_ACTIVE_OBJECT, objId);
            },

            getActiveObject: function() {
                return this.get(CONSTANTS.STATE_ACTIVE_OBJECT);
            },

            registerActiveSelection: function(objIdList) {
                ASSERT(_.isArray(objIdList));
                this.set(CONSTANTS.STATE_ACTIVE_SELECTION, objIdList);
            },

            getActiveSelection: function() {
                return this.get(CONSTANTS.STATE_ACTIVE_SELECTION);
            },

            registerActiveAspect: function(aspect) {
                this.set(CONSTANTS.STATE_ACTIVE_ASPECT, aspect);
            },

            getActiveAspect: function() {
                return this.get(CONSTANTS.STATE_ACTIVE_ASPECT);
            },

            registerActiveVisualizer: function(visualizer) {
                this.set(CONSTANTS.STATE_ACTIVE_VISUALIZER, visualizer);
            },

            getActiveVisualizer: function() {
                return this.get(CONSTANTS.STATE_ACTIVE_VISUALIZER);
            },

            registerActiveProject: function(project) {
                this.set(CONSTANTS.STATE_ACTIVE_PROJECT, project);
            },

            getActiveProject: function() {
                return this.get(CONSTANTS.STATE_ACTIVE_PROJECT);
            },

            registerActiveBranch: function(project) {
                this.set(CONSTANTS.STATE_ACTIVE_BRANCH, project);
            },

            getActiveBranch: function() {
                return this.get(CONSTANTS.STATE_ACTIVE_BRANCH);
            },

            registerActiveCommit: function(project) {
                this.set(CONSTANTS.STATE_ACTIVE_COMMIT, project);
            },

            getActiveCommit: function() {
                return this.get(CONSTANTS.STATE_ACTIVE_COMMIT);
            }


        }),
        _initialize = function () {
            //if already initialized, just return
            if (!_WebGMEState) {
                _WebGMEState = new WebGMEStateModel();
                _WebGMEState.registerActiveAspect(CONSTANTS.ASPECT_ALL);
            }

            return _WebGMEState;
        };



    //return utility functions
    return {
        initialize: _initialize
    };
});