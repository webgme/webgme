/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/
/**
 * Utility helper functions for saving WebGME state and reload on browser back
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['jquery',
    'js/logger'
], function (_jquery,
             Logger) {

    'use strict';

    var _stateLoading = false,
        _initialized = false,
        logger;

    function _saveState(/* stateObj */) {
        if (_stateLoading === false) {
            // HeaderPanel.js sets the url and updates the state using angular
        }
    }


    function _onLoadState(stateObj) {
        stateObj = stateObj || window.history.state; //TODO check why it is null - probably jquery bug
        _stateLoading = true;

        //clear state in silent mode, it will not fire the clear event
        WebGMEGlobal.State.clear({'silent': true});

        //set the attributes from the saved state
        logger.debug('loading state:' + JSON.stringify(stateObj));
        WebGMEGlobal.State.set(stateObj, {suppressVisualizerFromNode: true, suppressHistoryUpdate: true});

        _stateLoading = false;
    }


    function _initialize() {
        if (_initialized) {
            return;
        }
        logger = Logger.create('gme:WebGME.History', WebGMEGlobal.gmeConfig.client.log);
        _initialized = true;
        WebGMEGlobal.State.on('change', function (/*model, options*/) {
            _saveState(WebGMEGlobal.State.toJSON());
        });
    }

    if (WebGMEGlobal.history !== true) {
        Object.defineProperty(WebGMEGlobal, 'history', {
            value: true,
            writable: false,
            enumerable: true,
            configurable: false
        });

        $(window).on('popstate', function (event) {
            _onLoadState(event.originalEvent.state);
        });
    }


    //return utility functions
    return {initialize: _initialize};
});