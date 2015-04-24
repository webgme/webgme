/*globals define */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    var IKeyTarget;

    IKeyTarget = function () {
    };

    IKeyTarget.prototype.onKeyDown = function (eventArgs) {
        this.logger.warn('IKeyTarget.prototype.onKeyDown IS NOT IMPLEMENTED!!! eventArgs: ' +
                         JSON.stringify(eventArgs));
        //return false if handled the keyboard event and it should stop bubbling
    };

    IKeyTarget.prototype.onKeyUp = function (eventArgs) {
        this.logger.warn('IKeyTarget.prototype.onKeyUp IS NOT IMPLEMENTED!!! eventArgs: ' + JSON.stringify(eventArgs));
        //return false if handled the keyboard event and it should stop bubbling
    };

    return IKeyTarget;
});