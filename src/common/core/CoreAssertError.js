/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';
    function CoreAssertError() {
        var error = Error.apply(this, arguments);
        error.name = this.name = 'CoreAssertError';
        this.message = error.message;
        this.stack = error.stack;

        return error;
    }

    CoreAssertError.prototype = Object.create(Error.prototype);
    CoreAssertError.prototype.constructor = CoreAssertError;

    return CoreAssertError;
});