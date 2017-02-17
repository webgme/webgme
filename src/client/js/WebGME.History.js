/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/
/**
 * Utility helper functions for saving WebGME state and reload on browser back
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */

define(['jquery',
    'js/logger',
    'js/Utils/WebGMEUrlManager'
], function (_jquery, Logger, WebGMEUrlManager) {

    'use strict';

    var _initialized = false,
        logger;

    function _initialize() {
        if (_initialized) {
            return;
        }

        logger = Logger.create('gme:WebGME.History', WebGMEGlobal.gmeConfig.client.log);
        _initialized = true;

        Object.defineProperty(WebGMEGlobal, 'history', {
            value: true,
            writable: false,
            enumerable: true,
            configurable: false
        });

        var prevQuery = '';
        WebGMEGlobal.State.on('change', function (model, opts) {
            var searchQuery = WebGMEUrlManager.serializeStateToUrl(),
                newPath;

            if (!opts.suppressHistoryUpdate && prevQuery !== searchQuery) {
                newPath = window.location.pathname;

                if (searchQuery) {
                    newPath += '?' + searchQuery;
                }

                // set the state that gets pushed into the history
                window.history.pushState(WebGMEGlobal.State.toJSON(), '', newPath);

                prevQuery = searchQuery;
            }
        });

        $(window).on('popstate', function (event) {
            //clear state in silent mode, it will not fire the clear event
            WebGMEGlobal.State.clear({silent: true});

            //set the attributes from the saved state
            WebGMEGlobal.State.set(event.originalEvent.state, {
                suppressVisualizerFromNode: true,
                suppressHistoryUpdate: true
            });
        });
    }

    //return utility functions
    return {initialize: _initialize};
});