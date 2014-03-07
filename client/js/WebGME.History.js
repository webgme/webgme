/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

/*
 * Utility helper functions for saving WebGME state and reload on browser back
 */

define(['jquery',
        'logManager'], function (_jquery,
                                 logManager) {

    var _client,
        STATE_SELECTED_OBJECT_ID = 'selectedObjectId',
        STATE_ACTIVE_SELECTION = 'activeSelection',
        _stateLoading = false,
        _initialized = false,
        logger = logManager.create("WebGME.History");

    var _saveState = function (stateObj) {
        if (_stateLoading === false) {
            window.history.pushState(stateObj, null, null);
        }
    };


    var _onLoadState = function (stateObj) {
        _stateLoading = true;

        //TODO: load state into WebGMEGlobal.State

        _stateLoading = false;
    };


    var _initialize = function () {
        if (_initialized) {
            return;
        }

        WebGMEGlobal.State.on("all", function(eventName) {
            var stateObj = {};
            //TODO: save state  ---> persist WebGMEGlobal.State into stateObj
            //_saveState(stateObj);
        });

        logger.error('!!! NOT YET IMPLEMENTED !!!');
    };

    if (WebGMEGlobal.history !== true) {
        WebGMEGlobal.history = true;
        $(window).on('popstate', function(event) {
            _onLoadState(event.originalEvent.state);
        });
    }


    //return utility functions
    return { initialize: _initialize};
});