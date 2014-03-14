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
            var settings = {};
            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = objId;
            settings[CONSTANTS.STATE_ACTIVE_ASPECT] = CONSTANTS.ASPECT_ALL;
            this.set(settings);
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
        }
    });

    var _initialize = function () {
        //if already initialized, just return
        if (!_WebGMEState) {
            _WebGMEState = new WebGMEStateModel();
        }

        return _WebGMEState;
    };

    //return utility functions
    return { initialize: _initialize };
});