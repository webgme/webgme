/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';
    function CoreInternalError() {
        var error = Error.apply(this, arguments);
        error.name = this.name = 'CoreInternalError';
        this.message = error.message;
        this.stack = error.stack;

        return error;
    }

    CoreInternalError.prototype = Object.create(Error.prototype);
    CoreInternalError.prototype.constructor = CoreInternalError;

    return CoreInternalError;
});