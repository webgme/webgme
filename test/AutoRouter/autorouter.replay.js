var requirejs = require('requirejs');

requirejs.config({
  baseUrl: '../../src/',
  paths:{
    "logManager": "common/LogManager",
    "util/assert": "common/util/assert",
    "underscore": "client/lib/underscore/underscore-min"
  }
});

var ActionApplier = requirejs('client/js/Widgets/DiagramDesigner/ConnectionRouteManager3.ActionApplier'),
    _ = requirejs('underscore'),
    fs = require('fs');


var AutoRouterBugPlayer = function() {
    'use strict';
    this.init();
    this.logger = {error: console.log};
};

AutoRouterBugPlayer.prototype._loadActions = function(filename) {
    'use strict';
    return require(filename);
};

AutoRouterBugPlayer.prototype.test = function(filename) {
    'use strict';

    var actions = this._loadActions(filename);

    for (var i = 0; i < actions.length; i++) {
        console.log('Calling', actions[i].action, 'with', actions[i].args);
        this._invokeAutoRouterMethodUnsafe(actions[i].action, actions[i].args);
    }
};

_.extend(AutoRouterBugPlayer.prototype, ActionApplier.prototype);

module.exports = AutoRouterBugPlayer;
