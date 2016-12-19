/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';
    function CoreIllegalArgumentError() {
        var error = Error.apply(this, arguments);
        error.name = this.name = 'CoreIllegalArgumentError';
        this.message = error.message;
        this.stack = error.stack;

        return error;
    }

    CoreIllegalArgumentError.prototype = Object.create(Error.prototype);
    CoreIllegalArgumentError.prototype.constructor = CoreIllegalArgumentError;

    return CoreIllegalArgumentError;
});