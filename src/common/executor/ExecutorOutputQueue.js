/*globals define*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function ExecutorOutputQueue(worker, jobInfo, interval, segmentSize) {
        var self = this;
        this.logger = worker.logger; //TODO: Consider using gmeLogger for ExecutorWorker
        this.jobInfo = jobInfo;

        this.currOutput = {
            nbrOfLines: 0,
            output: '',
            callback: null,
            finishFn: null
        };
        this.outputQueue = [];

        this.timeoutId = null;

        /**
         * Adds a string to the current output (which will be queued based on interval and/or segmentSize).
         * @param {string} outputStr
         */
        this.addOutput = function (outputStr) {
            var lines = outputStr.split(/\r\n|\r|\n/);
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            self.currOutput.nbrOfLines += lines.length;
            self.currOutput.output += outputStr;

            self.logger.debug('length', self.currOutput.nbrOfLines);
            if (segmentSize > -1 && self.currOutput.nbrOfLines >= segmentSize) {
                self._setNewTimeout();
                self._queueCurrOutput();
            }
        };

        /**
         * Stops any timeouts, queues the current output (if any) and empties the outputQueue.
         * This can be invoked to ensure that all output has been sent before sending the final jobInfo update.
         * @param {function} callback
         */
        this.sendAllOutputs = function (callback) {
            var nbrOfQueued;
            clearTimeout(self.timeoutId);

            // Add the remaining stored output.
            self._queueCurrOutput();
            nbrOfQueued = self.outputQueue.length;

            self.logger.debug('sending out all outputs');
            if (nbrOfQueued > 0) {
                // Attach a finishFn to the last output in the queue.
                self.outputQueue[self.outputQueue.length - 1].finishFn = function (err) {
                    callback(err);
                };
            } else {
                callback(null);
            }
        };

        this._queueCurrOutput = function () {
            if (self.currOutput.nbrOfLines === 0) {
                return;
            }

            // Add a callback to the output batch that will be invoked when it has been sent to the server.
            self.currOutput.callback = function (err) {
                var sentOutput;
                if (err) {
                    self.logger.error('output failed to be sent', err.toString());
                } else {
                    self.logger.debug('output sent');
                }

                // When it has been sent, it is removed from the queue and if an additional finishFn has been attached
                // it is invoked.
                sentOutput = self.outputQueue.shift();
                if (typeof sentOutput.finishFn === 'function') {
                    sentOutput.finishFn(err || null);
                }

                // If there are more queued outputs after the one just sent, send the first one in the queue.
                if (self.outputQueue.length > 0) {
                    worker.sendOutput(self.jobInfo, self.outputQueue[0].output, self.outputQueue[0].callback);
                }
            };

            // Queue the new output and reset the current output.
            self.outputQueue.push(self.currOutput);

            self.currOutput = {
                nbrOfLines: 0,
                output: '',
                callback: null,
                finishFn: null
            };

            if (self.outputQueue.length === 1) {
                worker.sendOutput(self.jobInfo, self.outputQueue[0].output, self.outputQueue[0].callback);
            }
        };

        this._setNewTimeout = function () {
            if (interval < 0) {
                return;
            }
            clearTimeout(self.timeoutId);
            self.timeoutId = setTimeout(function () {
                self._queueCurrOutput();
                self._setNewTimeout();
            }, interval);
        };

        // Start a new timeout at construction.
        self._setNewTimeout();
    }

    return ExecutorOutputQueue;
});