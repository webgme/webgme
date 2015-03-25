/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

var testFixture = require('../../_globals.js'),
    requirejs = testFixture.requirejs;

requirejs.config({
    //baseUrl: 'src/',
    paths: {
        //'logManager': 'common/LogManager',
        //'util/assert': 'common/util/assert',
        'underscore': 'client/lib/underscore/underscore-min'
    }
});

var ActionApplier = requirejs('client/js/Widgets/DiagramDesigner/ConnectionRouteManager3.ActionApplier'),
    _ = requirejs('underscore'),
    verbose,
    HEADER = 'AUTOROUTER REPLAYER:\t';


var AutoRouterBugPlayer = function () {
    'use strict';
    this.init();
    this.logger = {error: console.log};
};

AutoRouterBugPlayer.prototype.log = function () {
    'use strict';
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

AutoRouterBugPlayer.prototype._loadActions = function (filename) {
    'use strict';
    return require(filename);
};

AutoRouterBugPlayer.prototype.test = function (filename, options) {
    'use strict';
    var actions = this._loadActions(filename),
        before,
        after,
        last,

        i;

    // Unpack the options
    options = options || {};
    verbose = options.verbose || false;
    before = options.before || function () { };
    after = options.after || function () { };
    last = options.actionCount || actions.length;

    // Run the tests
    for (i = 0; i < last; i += 1) {
        this.log('Calling Action #' + i + ':', actions[i].action, 'with', actions[i].args);
        before(this.autorouter);
        this._invokeAutoRouterMethodUnsafe(actions[i].action, actions[i].args);
        after(this.autorouter);
    }
};

_.extend(AutoRouterBugPlayer.prototype, ActionApplier.prototype);

module.exports = AutoRouterBugPlayer;
