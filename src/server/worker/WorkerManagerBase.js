/*jshint node: true*/
/**
 * 
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

/**
 * 
 * {object} parameters
 * {GmeConfig} parameters.gmeConfig
 * {GmeLogger} parameters.logger - logger to fork off from.
 * @constructor
 */
function WorkerManagerBase(parameters) {
    this.gmeConfig = parameters.gmeConfig;
    this.logger = parameters.logger.fork('WorkerManager');
}

WorkerManagerBase.prototype.start = function (callback) {
    callback(new Error('WorkerManagerBase.start - Not Implemented!'));
};

WorkerManagerBase.prototype.stop = function (callback) {
    callback(new Error('WorkerManagerBase.stop - Not Implemented!'));
};

WorkerManagerBase.prototype.request = function (parameters, callback) {
    callback(new Error('WorkerManagerBase.request - Not Implemented!'));
};

module.exports = WorkerManagerBase;