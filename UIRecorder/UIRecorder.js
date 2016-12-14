/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q'], function (Q) {
    'use strict';

    var UIRecorder = function (client) {
        var self = this,
            storeCommitState = function (_client, data) {
                self.recording.push(data);
            };

        function copy(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        this.recording = [];

        this.stateIndex = -1;
        this.commitIndex = -1;

        this.start = function () {
            client.addEventListener(client.CONSTANTS.NEW_COMMIT_STATE, storeCommitState);
        };

        this.stop = function () {
            client.removeEventListener(client.CONSTANTS.NEW_COMMIT_STATE, storeCommitState);

            return self.recording;
        };

        this.clear = function () {
            self.recording = [];
        };

        this.load = function (recording) {
            self.recording = recording;
        };

        function loadState(options, uiState) {
            var deferred = Q.defer();

            delete uiState.activeProjectName;
            delete uiState.layout;

            delete uiState.activeBranchName;
            delete uiState.activeCommit;

            console.log('Switch ui-state', JSON.stringify(uiState, null, 2));
            WebGMEGlobal.State.set(uiState, {suppressVisualizerFromNode: true});

            setTimeout(function () {
                deferred.resolve();
            }, options.delay || 200);


            return deferred.promise;
        }

        function loadCommit(options, commitObj) {
            var commitHash = commitObj._id;

            console.log('loading commit', commitHash);
            return Q.ninvoke(client, 'selectCommit', commitHash)
                .then(function () {
                    return commitObj;
                });
        }

        this.stepForwardState = function (options, callback) {
            var deferred;

            options = options || {};

            self.stateIndex = self.stateIndex += 1;

            if (self.stateIndex >= self.recording.length) {
                deferred = Q.defer();
                deferred.reject(new Error('End of recording reached'));
                return deferred.promise.nodeify(callback);
            } else {
                return loadState(options, copy(self.recording[self.stateIndex].uiState));
            }
        };

        this.stepForwardCommit = function (options, callback) {
            var deferred;

            options = options || {};

            self.commitIndex = self.commitIndex += 1;

            if (self.commitIndex >= self.recording.length) {
                deferred = Q.defer();
                deferred.reject(new Error('End of recording reached'));
                return deferred.promise.nodeify(callback);
            } else {
                return loadCommit(options, self.recording[self.commitIndex].commitObject);
            }
        };

        this.stepBackState = function (options, callback) {
            var deferred;

            options = options || {};

            self.stateIndex = self.stateIndex -= 1;

            if (self.stateIndex < 0) {
                deferred = Q.defer();
                deferred.reject(new Error('Beginning of recording reached'));
                return deferred.promise.nodeify(callback);
            } else {
                return loadState(options, self.recording[self.stateIndex].uiState);
            }
        };

        this.stepBackCommit = function (options, callback) {
            var deferred;

            options = options || {};

            self.commitIndex = self.commitIndex -= 1;

            if (self.commitIndex < 0) {
                deferred = Q.defer();
                deferred.reject(new Error('Beginning of recording reached'));
                return deferred.promise.nodeify(callback);
            } else {
                return loadCommit(options, self.recording[self.commitIndex].commitObject._id);
            }
        };

        this.autoPlay = function (options, callback) {
            var recDeferred = Q.defer();

            options = options || {};

            function playBack() {
                self.stepForwardState(options)
                    .then(function () {
                        return self.stepForwardCommit(options);
                    })
                    .then(function () {
                        playBack();
                    })
                    .catch(function (err) {
                        if (err.message.indexOf('of recording reached') > -1) {
                            recDeferred.resolve();
                        } else {
                            recDeferred.reject(err);
                        }
                    });
            }

            playBack();

            return recDeferred.promise.nodeify(callback);
        };

        this.save = function () {

        };
    };

    return UIRecorder;
});