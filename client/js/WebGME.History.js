/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

/*
 * Utility helper functions for saving WebGME state and reload on browser back
 */

define([], function () {

    var _client,
        STATE_SELECTED_OBJECT_ID = 'selectedObjectId',
        STATE_ACTIVE_SELECTION = 'activeSelection',
        _stateLoading = false;

    var _saveState = function (stateObj) {
        if (_stateLoading === false) {
            window.history.pushState(stateObj, null, null);
        }
    };


    var _onLoadState = function (stateObj) {
        _stateLoading = true;

        if (_client && stateObj) {
            if (stateObj[STATE_SELECTED_OBJECT_ID]) {
                _client.setSelectedObjectId(stateObj[STATE_SELECTED_OBJECT_ID], stateObj[STATE_ACTIVE_SELECTION]);
            }
        }

        _stateLoading = false;
    };


    var _setClient = function (c) {
        _client = c;

        _client.addEventListener(_client.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
            var stateObj = {};
            stateObj[STATE_SELECTED_OBJECT_ID] = nodeId;
            stateObj[STATE_ACTIVE_SELECTION] = _client.getActiveSelection();
            _saveState(stateObj);
        });

        _setClient = undefined;
    };

    if (WebGMEGlobal.history !== true) {
        WebGMEGlobal.history = true;
        $(window).on('popstate', function(event) {
            _onLoadState(event.originalEvent.state);
        });
    }


    //return utility functions
    return { saveState: _saveState,
             setClient: _setClient};
});