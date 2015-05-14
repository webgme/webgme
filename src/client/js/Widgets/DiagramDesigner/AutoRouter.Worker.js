/*globals require,importScripts*/
// This is the code for using the autorouter as a web worker.

importScripts('../../../lib/require/require.min.js');

var worker = this,
    window = {},  //jshint ignore: line
    WebGMEGlobal = {gmeConfig: {}};

/**
 * Start the worker. This is done after the relevant config has been received.
 *
 * @return {undefined}
 */
var startWorker = function() {
    'use strict';

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
            var response = Utils.deepCopy(msg.data),
                result = this._invokeAutoRouterMethod.apply(this, msg.data.slice());

            response.push(result);
            this.logger.debug('Response:', response);
            worker.postMessage(response);
        };

        _.extend(AutoRouterWorker.prototype, ActionApplier.prototype);

        var autorouterWorker = new AutoRouterWorker();

        worker.onmessage = autorouterWorker.handleMessage.bind(autorouterWorker);
        this.logger.debug('Ready for requests!');
        worker.postMessage('READY');
    }.bind(this));
};

// Set the WebGMEGlobal.gmeConfig.client config value for use in the loggers
worker.onmessage = function(msg) {
    'use strict';
    
    WebGMEGlobal.gmeConfig.client = msg.data;
    startWorker();
};
