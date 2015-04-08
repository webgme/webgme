/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

define(['js/Widgets/DiagramDesigner/ConnectionRouteManager3.ActionApplier', 'underscore'], function (ActionApplier, _) {
    'use strict';
    var verbose,
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

    AutoRouterBugPlayer.prototype.test = function (actions, options) {
        'use strict';
        var before,
            after,
            last,

            i;

        // Unpack the options
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
            this._invokeAutoRouterMethodUnsafe(actions[i].action, actions[i].args);
            after(this.autorouter);
        }
    };

    _.extend(AutoRouterBugPlayer.prototype, ActionApplier.prototype);

    return AutoRouterBugPlayer;
});