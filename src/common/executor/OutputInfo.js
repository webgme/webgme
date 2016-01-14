/*globals define*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    /**
     * Class describing an output from an execution. The data is used for communication between the
     * initiator/a monitor of the job and the worker executing the job.
     * @param {string} jobHash - Identifier for the job.
     * @param {object} params
     * @param {string} params.output - The output string.
     * @param {number} params.outputNumber - Ordered id of output (0, 1, 2..)
     * @alias OutputInfo
     * @constructor
     */
    function OutputInfo(jobHash, params) {
        /**
         * Job identifier
         * @type {string}
         */
        this.hash = jobHash;

        /**
         * Ordered id of output (0, 1, 2..)
         * @type {number}
         */
        this.outputNumber = params.outputNumber;

        /**
         * String output.
         * @type {string}
         */
        this.output = params.output;

        this._id = this.hash + '+' + this.outputNumber;
    }

    return OutputInfo;
});