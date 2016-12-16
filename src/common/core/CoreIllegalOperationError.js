/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';
    function CoreIllegalOperationError() {
        var error = Error.apply(this, arguments);
        error.name = this.name = 'CoreIllegalOperationError';
        this.message = error.message;
        this.stack = error.stack;

        return error;
    }

    CoreIllegalOperationError.prototype = Object.create(Error.prototype);
    CoreIllegalOperationError.prototype.constructor = CoreIllegalOperationError;

    return CoreIllegalOperationError;
});