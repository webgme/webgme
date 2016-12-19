/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */


define(['common/core/CoreInternalError'], function (CoreInternalError) {
    'use strict';

    var assert = function (cond, msg) {
        if (!cond) {
            var error = new CoreInternalError(msg || 'ASSERT failed');

            if (typeof TESTING === 'undefined') {
                console.log('Throwing', error.stack);
                console.log();
            }

            throw error;
        }
    };

    return assert;
});
