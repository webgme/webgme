/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */


define(function () {
    'use strict';

    var assert = function (cond, msg) {
        if (!cond) {
            var error = new Error(msg || 'ASSERT failed');

            if (typeof TESTING === 'undefined') {
                console.log('Throwing', error.stack);
                console.log();
            }

            throw error;
        }
    };

    return assert;
});
