/*globals define*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    /**
     *
     * @param {string} jobHash
     * @param {object} params
     * @param {string} params.output - The output string.
     * @param {number} params.outputNumber - Ordered id of output (0, 1, 2..)
     * @constructor
     */
    function OutputInfo(jobHash, params) {
        this.hash = jobHash;
        this.outputNumber = params.outputNumber;
        this.output = params.output;

        this._id = this.hash + '+' + this.outputNumber;
    }

    return OutputInfo;
});