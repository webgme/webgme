/*globals define,WebGMEGlobal*/
/*jshint node:true, browser:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

define(['js/Widgets/DiagramDesigner/AutoRouter.ActionApplier', 
        './autorouter.common.inc',
        'underscore'], function (ActionApplier, 
                                 utils,
                                 _) {
    'use strict';
    var verbose,
        HEADER = 'AUTOROUTER REPLAYER:\t',
        assert = utils.assert;

    var AutoRouterBugPlayer = function () {
        this.logger = {error: console.log};

        // Web worker support
        this.usingWebWorker = false;
        this.onFinished = false;
        this.useWebWorker();
        this.expectedErrors = [];
        this._queue = null;
        this._count = null;
    };

    AutoRouterBugPlayer.prototype.log = function () {
        var msg,
            i;

        if (verbose) {
            msg = [HEADER];
            for (i = 0; i < arguments.length; i += 1) {
                msg.push(arguments[i]);
            }
            console.log.apply(null, msg);
        }
    };

    AutoRouterBugPlayer.prototype.testLocal = function (actions, options, callback) {
        var before,
            after,
            last,

            i;

        // Unpack the options
        this.init();
        options = options || {};
        verbose = options.verbose || false;
        before = options.before || function () {
        };
        after = options.after || function () {
        };
        last = options.actionCount || actions.length;

        // Run the tests
        for (i = 0; i < last; i += 1) {
            this.log('Calling Action #' + i + ':', actions[i].action, 'with', actions[i].args);
            before(this.autorouter);
            try {
                this._invokeAutoRouterMethodUnsafe(actions[i].action, actions[i].args);
            } catch (e) {
                if (!this._isExpectedError(e.message)) {
                    throw e;
                }
            }
            after(this.autorouter);
        }

        if (callback) {
            callback();
        }
    };

    // Web worker functionality
    /**
     * Set the AutoRouterBugPlayer to use a web worker or not.
     *
     * @param {Boolean} [usingWebWorker]
     * @return {undefined}
     */
    AutoRouterBugPlayer.prototype.useWebWorker = function (usingWebWorker) {
        if (usingWebWorker) {  // Enable web worker
            this.test = AutoRouterBugPlayer.prototype.testWithWebWorker;
        } else {
            this.test = AutoRouterBugPlayer.prototype.testLocal;
        }
        this.usingWebWorker = usingWebWorker;
    };

    AutoRouterBugPlayer.prototype._createWebWorker = function (callback) {
        var workerFile = '/base/src/client/js/Widgets/DiagramDesigner/AutoRouter.Worker.js';
        assert(!!Worker, 'Web Workers are not supported in your environment');

        this.log('Creating web worker');
        if (this._worker) {
            this._worker.terminate();
        }
        this._worker = new Worker(workerFile);
        this.log('Sending:',WebGMEGlobal.gmeConfig.client || {});
        this._worker.postMessage([WebGMEGlobal.gmeConfig.client|| {}, true]);

        this._worker.onmessage = function(response) {
            this.log('Created web worker');
            assert(response.data === 'READY');
            this._worker.onmessage = this._onWorkerMessage.bind(this);
            callback();
        }.bind(this);
    };

    AutoRouterBugPlayer.prototype.testWithWebWorker = function (actions, options, callback) {
        var last;

        options = options || {};
        verbose = options.verbose || false;
        last = options.actionCount || actions.length;

        this._count = 0;
        this._queue = actions.slice(0,last);

        assert(this._queue.length, 'Received an empty list of actions');
        this._createWebWorker(this._callNext.bind(this));
        this.onFinished = callback;
    };

    AutoRouterBugPlayer.prototype._onWorkerMessage = function (data) {
        var response = data.data;
        this.log('Web worker responded:'+response);
        if (typeof response[2] === 'string' && response[2].indexOf('Error') === 0) {
            assert(this._isExpectedError(response[2]), 'Unexpected error: '+response[2]);
        }

        if (this._queue.length) {
            this._callNext();
        } else {
            if (this.onFinished) {
                this.onFinished();
                this.onFinished = null;
            }
            assert(this.expectedErrors.length === 0);
        }
    };

    AutoRouterBugPlayer.prototype._isExpectedError = function (error) {
        for (var i = this.expectedErrors.length; i--;) {
            if (this.expectedErrors[i].test(error)) {
                this.expectedErrors.splice(i,1);
                return true;
            }
        }
        return false;
    };

    AutoRouterBugPlayer.prototype._callNext = function () {
        var task = this._queue.shift();
        this.log('Calling Action #' + this._count + ':', task.action, 'with', task.args);
        this._worker.postMessage([task.action, task.args]);
    };

    /* * * * * * * * Querying the AutoRouter * * * * * * * */
    AutoRouterBugPlayer.prototype.getPathPoints = function (pathId, callback) {
        if (this.usingWebWorker) {  // Enable web worker
            this._worker.onmessage = function(data) {
                if (data.data[0] === 'getPathPoints' && pathId === data.data[1][0]) {
                    callback(data.data[2]);
                }
            };
            this._worker.postMessage(['getPathPoints', [pathId]]);
        } else {
            var id = this._autorouterPaths[pathId];
            callback(this.autorouter.getPathPoints(id));
        }
    };

    AutoRouterBugPlayer.prototype.getBoxRect = function (boxId, callback) {
        if (this.usingWebWorker) {  // Enable web worker
            this._worker.onmessage = function(data) {
                if (data.data[0] === 'getBoxRect' && boxId === data.data[1][0]) {
                    callback(data.data[2]);
                }
            };
            this._worker.postMessage(['getBoxRect', [boxId]]);
        } else {
            var rect = this._autorouterBoxes[boxId].box.rect;
            callback(rect);
        }
    };

    _.extend(AutoRouterBugPlayer.prototype, ActionApplier.prototype);

    return AutoRouterBugPlayer;
});
