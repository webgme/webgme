/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';
    function CoreInputError() {
        var error = Error.apply(this, arguments);
        error.name = this.name = 'CoreInputError';
        this.message = error.message;
        this.stack = error.stack;
    }

    CoreInputError.prototype = Object.create(Error.prototype);
    CoreInputError.prototype.constructor = CoreInputError;

    return CoreInputError;
});