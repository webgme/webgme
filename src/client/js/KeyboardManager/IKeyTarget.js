/*globals define, _, requirejs, WebGMEGlobal*/

define([], function () {

    "use strict";

    var IKeyTarget;

    IKeyTarget = function () {
    };

    IKeyTarget.prototype.onKeyDown = function (eventArgs) {
        this.logger.warning('IKeyTarget.prototype.onKeyDown IS NOT IMPLEMENTED!!! eventArgs: ' + JSON.stringify(eventArgs));
        //return false if handled the keyboard event and it should stop bubbling
    };

    IKeyTarget.prototype.onKeyUp = function (eventArgs) {
        this.logger.warning('IKeyTarget.prototype.onKeyUp IS NOT IMPLEMENTED!!! eventArgs: ' + JSON.stringify(eventArgs));
        //return false if handled the keyboard event and it should stop bubbling
    };

    return IKeyTarget;
});