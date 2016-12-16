/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q', 'superagent'], function (Q, superagent) {
    'use strict';

    function addRecording(cData, callback) {
        var data;

        // We're not recording local changes or setBranchHash.
        if (!cData.data.local || !cData.data.commitData.changedNodes) {
            callback(new Error('Rejected change'));
            return;
        }

        data = {
            _id: cData.data.commitData.commitObject._id,
            projectId: cData.data.commitData.projectId,
            uiState: cData.uiState,
            commitObject: cData.data.commitData.commitObject
        };

        superagent.put('/routers/UIRecorder/recording')
            .send(data)
            .end(function (err) {
                callback(err);
            });
    }

    function getStatus(projectId, commitHash, callback) {
        var project = projectId.split('+');

        superagent.get('/routers/UIRecorder/' + project[0] + '/' + project[1] + '/status/' + commitHash.slice(1))
            .end(function (err, result) {
                callback(err, result ? result.body : null);
            });
    }

    function getRecordings(projectId, commits, callback) {
        var project = projectId.split('+');

        superagent.get('/routers/UIRecorder/recordings')
            .send({
                projectId: projectId,
                commitHashes: commits
            })
            .end(function (err, status) {
                callback(err, status);
            });
    }

    function Player(client) {
        var self = this;

        function copy(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        this.recording = [];

        this.stateIndex = -1;
        this.commitIndex = -1;

        this.clear = function () {
            self.recording = [];
        };

        this.load = function (projectId, commits, callback) {
            var deferred = Q.defer();
            getRecordings(projectId, commits, function (err, recordings) {
                if (err) {
                    deferred.reject(err);
                } else {
                    self.recording = recordings;
                    deferred.resolve(recordings);
                }
            });

            return deferred.promise;
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
    }

    return {
        addRecording: addRecording,
        Player: Player,
        getStatus: getStatus,
        getRecordings: getRecordings
    };
});