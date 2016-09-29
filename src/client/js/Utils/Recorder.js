/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q'], function (Q) {
    'use strict';

    var Recorder = function (client) {
        var self = this,
            storeCommitState = function (_client, data) {
                self.recording.push(data);
            };

        this.recording = [];

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

        this.play = function (delay) {
            var i = 0,
                num = self.recording.length,
                recDeferred = Q.defer(),
                commitHash,
                uiState;

            self.recording = [
                {
                    "commitObject": {
                        "root": "#6e726d590ff3103eaf5f573c22b2a41e91c9469c",
                        "parents": [
                            "#fdbf4fe0ebfdeda2f5ed5011eccf7091747199fa"
                        ],
                        "updater": [
                            "guest"
                        ],
                        "time": 1475190673618,
                        "message": "[\nsetMemberRegistry(,/175547009,MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866,position,{\"x\":246,\"y\":669})\n]",
                        "type": "commit",
                        "_id": "#eed90df09528f05d64375972c053beaf4eccde37"
                    },
                    "uiState": {
                        "activeAspect": "All",
                        "suppressVisualizerFromNode": false,
                        "layout": "DefaultLayout",
                        "activeVisualizer": "METAAspect",
                        "activeProjectName": "guest+ActivePanels",
                        "activeObject": "",
                        "activeBranchName": "master",
                        "activeCommit": null,
                        "activeSelection": [
                            "/175547009"
                        ],
                        "activeTab": 0
                    }
                },
                {
                    "commitObject": {
                        "root": "#b2308bd33d3878848d8e0427d3ed6c5d0e02ac8b",
                        "parents": [
                            "#eed90df09528f05d64375972c053beaf4eccde37"
                        ],
                        "updater": [
                            "guest"
                        ],
                        "time": 1475190678689,
                        "message": "[\nremoveMember(,/U,MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866)\nremoveMember(,/U,MetaAspectSet)\nsetMeta(/U)\n]",
                        "type": "commit",
                        "_id": "#3b2c1c1e168545b76f2ed3efd1921153f128b3cf"
                    },
                    "uiState": {
                        "activeAspect": "All",
                        "suppressVisualizerFromNode": false,
                        "layout": "DefaultLayout",
                        "activeVisualizer": "METAAspect",
                        "activeProjectName": "guest+ActivePanels",
                        "activeObject": "",
                        "activeBranchName": "master",
                        "activeCommit": null,
                        "activeSelection": [
                            "/U"
                        ],
                        "activeTab": 0
                    }
                },
                {
                    "commitObject": {
                        "root": "#003d0ba2f8cdfe63438f542df7ad90c38bc35fd2",
                        "parents": [
                            "#3b2c1c1e168545b76f2ed3efd1921153f128b3cf"
                        ],
                        "updater": [
                            "guest"
                        ],
                        "time": 1475190682672,
                        "message": "[\nsetRegistry(/i,position,{\"x\":200,\"y\":473})\n]",
                        "type": "commit",
                        "_id": "#7f81e770e1ac63e217356f314d0f1fde1c9b6671"
                    },
                    "uiState": {
                        "activeAspect": "All",
                        "suppressVisualizerFromNode": false,
                        "layout": "DefaultLayout",
                        "activeVisualizer": "ModelEditor",
                        "activeProjectName": "guest+ActivePanels",
                        "activeObject": "",
                        "activeBranchName": "master",
                        "activeCommit": null,
                        "activeSelection": [
                            "/i"
                        ],
                        "activeTab": 0
                    }
                },
                {
                    "commitObject": {
                        "root": "#ae22f13feb58f5ee76c1ab39b7fc41941b89c068",
                        "parents": [
                            "#7f81e770e1ac63e217356f314d0f1fde1c9b6671"
                        ],
                        "updater": [
                            "guest"
                        ],
                        "time": 1475190687336,
                        "message": "createChildren({\"/175547009/1817665259\":\"/i/Z\"})",
                        "type": "commit",
                        "_id": "#2532b8f6cd069799825d4e557776092a0a5f76e1"
                    },
                    "uiState": {
                        "activeAspect": "All",
                        "suppressVisualizerFromNode": false,
                        "layout": "DefaultLayout",
                        "activeVisualizer": "ModelEditor",
                        "activeProjectName": "guest+ActivePanels",
                        "activeObject": "/i",
                        "activeBranchName": "master",
                        "activeCommit": null,
                        "activeSelection": [],
                        "activeTab": 0
                    }
                },
                {
                    "commitObject": {
                        "root": "#124fc963817f3dc78e62be32fa03982315053bc1",
                        "parents": [
                            "#2532b8f6cd069799825d4e557776092a0a5f76e1"
                        ],
                        "updater": [
                            "guest"
                        ],
                        "time": 1475190689173,
                        "message": "createChildren({\"/175547009/1104061497\":\"/i/R\"})",
                        "type": "commit",
                        "_id": "#a7a2cae7b8d11fb4adc8e1bec57bdb28268c54f0"
                    },
                    "uiState": {
                        "activeAspect": "All",
                        "suppressVisualizerFromNode": false,
                        "layout": "DefaultLayout",
                        "activeVisualizer": "ModelEditor",
                        "activeProjectName": "guest+ActivePanels",
                        "activeObject": "/i",
                        "activeBranchName": "master",
                        "activeCommit": null,
                        "activeSelection": [],
                        "activeTab": 0
                    }
                }
            ];
            num = self.recording.length;
            delay = delay || 1000;

            function switchUiState(uiState) {
                var deferred = Q.defer();
                console.log('Switch ui-state', JSON.stringify(uiState, null, 2));
                WebGMEGlobal.State.set(uiState);
                deferred.resolve();
                return deferred.promise;
            }

            function checkoutCommit(commitHash) {
                var deferred = Q.defer();
                setTimeout(function () {
                    console.log('loading commit', commitHash);
                    Q.ninvoke(client, 'selectCommit', commitHash)
                        .then(deferred.resolve)
                        .catch(deferred.reject);

                }, delay);

                return deferred.promise;
            }

            function playBack() {
                commitHash = self.recording[i].commitObject._id;
                uiState = self.recording[i].uiState;
                // TODO: Ensure we're in the correct project and layout
                delete uiState.activeProjectName;
                delete uiState.layout;

                delete uiState.activeBranchName;
                delete uiState.activeCommit;

                uiState.suppressVisualizerFromNode = true;
                uiState = self.recording[i].uiState;

                i += 1;

                switchUiState(uiState)
                    .then(function () {
                        return checkoutCommit(commitHash);
                    })
                    .then(function () {
                        console.log('Loaded commit', commitHash);
                        if (i < num) {
                            playBack();
                        } else {
                            console.log('done!');
                            self.recording = [];
                            recDeferred.resolve();
                        }
                    })
                    .catch(recDeferred.reject);
            }

            if (num < 0) {
                recDeferred.resolve();
            } else {
                playBack();
            }

            return recDeferred.promise;
        };

        this.save = function () {

        };
    };

    return Recorder;
});