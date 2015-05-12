/*globals console,require,importScripts*/
// This is the code for using the autorouter as a web worker.

console.log('Starting to read ARWorker.js...');
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

    console.log('Starting the worker...');
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
        };

        AutoRouterWorker.prototype.handleMessage = function(msg) {
            console.log('Received msg:', msg.data);
            var result = this._invokeAutoRouterMethod.apply(this, msg.data);

            if (result) {
                console.log('Responding to', msg.data[0], 'with', result);
                worker.postMessage([msg.data, result]);
            }

        };

        _.extend(AutoRouterWorker.prototype, ActionApplier.prototype);

        var autorouterWorker = new AutoRouterWorker();

        console.log('Posting "Ready!"');
        worker.postMessage('READY');

        worker.onmessage = autorouterWorker.handleMessage.bind(autorouterWorker);
    }.bind(this));
};

// Set the WebGMEGlobal.gmeConfig.client config value for use
// in the loggers
worker.onmessage = function(msg) {
    'use strict';
    
    WebGMEGlobal.gmeConfig.client = msg.data;
    startWorker();
};

console.log('Finished reading ARWorker.js...');
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

    console.log('Starting the worker...');
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
        };

        AutoRouterWorker.prototype.handleMessage = function(msg) {
            console.log('Received msg:', msg.data);
            var result = this._invokeAutoRouterMethod.apply(this, msg.data);

            msg.data.push(result);
            console.log('Responding to', msg.data[0], 'with', result);
            worker.postMessage(msg.data);

        };

        _.extend(AutoRouterWorker.prototype, ActionApplier.prototype);

        var autorouterWorker = new AutoRouterWorker();

        console.log('Posting "Ready!"');
        worker.postMessage('READY');

        worker.onmessage = autorouterWorker.handleMessage.bind(autorouterWorker);
    }.bind(this));
};

// Set the WebGMEGlobal.gmeConfig.client config value for use
// in the loggers
worker.onmessage = function(msg) {
    'use strict';
    
    WebGMEGlobal.gmeConfig.client = msg.data;
    startWorker();
};

console.log('Starting...');


