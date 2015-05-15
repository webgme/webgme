/*globals require,importScripts*/
// This is the code for using the autorouter as a web worker.

importScripts('../../../lib/require/require.js');

var worker = this,
    window = {},  //jshint ignore: line
    WebGMEGlobal = {gmeConfig: {}},
    msgQueue = [];

/**
 * Start the worker. This is done after the relevant config has been received.
 *
 * @return {undefined}
 */
var startWorker = function() {
    'use strict';

    // Queue any messages received while loading the dependencies
    worker.onmessage = function(msg) {
        msgQueue.push(msg);
    };

    require({
        baseUrl: '.',
        paths: {
            common: '../../../../common',
            assert: '../../../../common/util/assert',
            js: '../..',
            underscore: '../../../lib/underscore/underscore-min',
            debug: '../../../lib/debug/debug'
        }, 
        shim: {
            debug: {
                exports: 'window.debug'
            }
        }
    }, 
    [
        'AutoRouter.ActionApplier', 
        'AutoRouter.Utils', 
        'js/logger',
        'underscore'
    ],
    function(
        ActionApplier, 
        Utils,
        Logger,
        _
    ) {

        var AutoRouterWorker = function() {
            // Add recording actions?
            this.logger = Logger.create('gme:Widgets:DiagramDesigner:AutoRouter:Worker', WebGMEGlobal.gmeConfig.client.log);
            this._recordActions = true;
            this.init();
        };

        AutoRouterWorker.prototype.handleMessage = function(msg) {
            this.logger.debug('Received:', msg.data);

            this._handleMessage(msg.data);
        };

        AutoRouterWorker.prototype._handleMessage = function(msg) {
            var response,
                result;

            response = Utils.deepCopy(msg);
            // If routing async, decorate the request
            if (msg[0] === 'routeAsync') {
                // Send getPathPoints response for each path on each update
                msg[1] = [{callback: this._updatePaths.bind(this),
                           first: this._updatePaths.bind(this)}];
            }

            result = this._invokeAutoRouterMethod.apply(this, msg.slice());

            response.push(result);
            this.logger.debug('Response:', response);
            worker.postMessage(response);
        };

        /**
         * Update all the paths on the graph.
         *
         * @return {undefined}
         */
        AutoRouterWorker.prototype._updatePaths = function(paths) {
            var msg = ['getPathPoints', null];
            for (var i = paths.length; i--;) {
                msg[1] = [this._arPathId2Original[paths[i].id]];
                this._handleMessage(msg);
            }
        };

        _.extend(AutoRouterWorker.prototype, ActionApplier.prototype);

        var autorouterWorker = new AutoRouterWorker();

        autorouterWorker.logger.debug('AR Worker is now listening...');

        // Handle the queued messages
        while (msgQueue.length) {
            autorouterWorker.handleMessage(msgQueue.shift());
        }

        worker.onmessage = autorouterWorker.handleMessage.bind(autorouterWorker);
        autorouterWorker.logger.debug('Ready for requests!');
        worker.postMessage('READY');
    }.bind(this));
};

// Set the WebGMEGlobal.gmeConfig.client config value for use in the loggers
worker.onmessage = function(msg) {
    'use strict';
    
    WebGMEGlobal.gmeConfig.client = msg.data;
    startWorker();
};
