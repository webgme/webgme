/*globals define*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function OutputInfo(jobHash, params) {
        this.hash = jobHash || params.hash;
        this.outputNumber = params.outputNumber;
        this.output = params.output;
        this._id = params._id || this.hash + '+' + this.outputNumber;
    }

    return OutputInfo;
});