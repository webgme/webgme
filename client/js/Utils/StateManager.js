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
        WebGMEStateModel;

    WebGMEStateModel = Backbone.Model.extend({
        setActiveObject: function(objId) {
            this.set(CONSTANTS.STATE_ACTIVE_OBJECT, objId);
        },

        getActiveObject: function() {
            return this.get(CONSTANTS.STATE_ACTIVE_OBJECT);
        },

        setActiveSelection: function(objIdList) {
            ASSERT(_.isArray(objIdList));
            this.set(CONSTANTS.STATE_ACTIVE_SELECTION, objIdList);
        },

        getActiveSelection: function() {
            return this.get(CONSTANTS.STATE_ACTIVE_SELECTION);
        },

        setActiveAspect: function(aspect) {
            this.set(CONSTANTS.STATE_ACTIVE_ASPECT, aspect);
        },

        getActiveAspect: function() {
            return this.get(CONSTANTS.STATE_ACTIVE_ASPECT);
        },

        setActiveVisualizer: function(visualizer) {
            this.set(CONSTANTS.STATE_ACTIVE_VISUALIZER, visualizer);
        },

        getActiveVisualizer: function() {
            return this.get(CONSTANTS.STATE_ACTIVE_VISUALIZER);
        }
    });

    var _initialize = function () {
        //if already initialized, just return
        if (!_WebGMEState) {
            _WebGMEState = new WebGMEStateModel();
            _WebGMEState.setActiveAspect(CONSTANTS.ASPECT_ALL);
        }

        return _WebGMEState;
    };

    //return utility functions
    return { initialize: _initialize };
});