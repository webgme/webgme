/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */
/*
 * CoreIllegalOperationError should be thrown if the set of input parameters are correct but the request
 * or the operation do not apply to the current context. Here we followed the basic javascript principles
 * in terms that whenever the user try to access a 'field' of a 'field' that does not exist, we throw.
 * For example if someone tries to get the member attributes of an non-existing member.
 * Trying to modify read-only nodes are captured within this category.
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