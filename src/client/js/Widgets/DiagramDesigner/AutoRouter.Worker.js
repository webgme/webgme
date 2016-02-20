/*globals require,importScripts*/
// This is the code for using the autorouter as a web worker.

importScripts('../../../lib/require/require.min.js');

var worker = this,
    window = {},  //jshint ignore: line
    WebGMEGlobal = {gmeConfig: {}},
    respondToAll = false,
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
            underscore: '../../../bower_components/underscore/underscore-min',
            debug: '../../../bower_components/visionmedia-debug/dist/debug',
            AutoRouterActionApplier: '../../../lib/autorouter/action-applier.min' // create a map file for debugging
        },
        shim: {
            debug: {
                exports: 'window.debug'
            }
        }
    },
    [
        'AutoRouterActionApplier',
        'js/logger',
        'underscore'
    ],
    function(
        ActionApplier,
        Logger,
        _
    ) {

        var AutoRouterWorker = function() {
            // Add recording actions?
            this.logger = Logger.create('gme:Widgets:DiagramDesigner:AutoRouter:Worker', WebGMEGlobal.gmeConfig.client.log);
            this._recordActions = true;
            this.init();

            this.respondTo = {
                getPathPoints: true,
                routePaths: true,
                addBox: true,
                addPath: true
            };
        };

        AutoRouterWorker.prototype.handleMessage = function(msg) {
            this.logger.debug('Received:', msg.data);

            this._handleMessage(msg.data);
        };

        AutoRouterWorker.prototype._handleMessage = function(msg) {
            var response,
                action = msg[0],
                result;

            response = [action, msg[1].slice()];  // Copy the input args

            // If routing async, decorate the request
            if (action === 'routeAsync') {
                // Send getPathPoints response for each path on each update
                msg[1] = [{callback: this._updatePaths.bind(this)}];
            }

            try {
                result = this._invokeAutoRouterMethodUnsafe.apply(this, msg);
            } catch(e) {
                // Send error message
                worker.postMessage(['BugReplayList', this._getActionSequence()]);
            }

            response.push(result);
            if (respondToAll || this.respondTo[action]) {
                this.logger.debug('Response:', response);
                worker.postMessage(response);
            }
        };

        /**
         * Update all the paths on the graph.
         *
         * @return {undefined}
         */
        AutoRouterWorker.prototype._updatePaths = function(paths) {
            this.logger.debug('Updating paths');
            var id,
                points,
                content = [],
                msg = ['routePaths', null];

            for (var i = paths.length; i--;) {
                id = this._arPathId2Original[paths[i].id];
                points = this._invokeAutoRouterMethod('getPathPoints', [id]);
                content.push([id, points]);
            }
            msg[1] = content;
            worker.postMessage(msg);
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

    WebGMEGlobal.gmeConfig.client = msg.data[0];
    respondToAll = msg.data[1];
    startWorker();
};
