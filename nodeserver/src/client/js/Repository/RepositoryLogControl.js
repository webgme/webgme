"use strict";

define(['logManager'], function (logManager) {

    var RepositoryLogControl;

    RepositoryLogControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        //override view event handlers
        this._view.onLoadCommit = function (params) {
            self._view.clear();
            self._view.displayProgress();
            self._client.selectCommitAsync(params.id, function (err) {
                if (err) {
                    self._logger.error(err);
                } else {
                    self._updateHistory();
                }
            });
        };

        this._view.onDeleteBranchClick = function (branch) {
            self._view.clear();
            self._view.displayProgress();
            self._client.deleteBranchAsync(branch, function (err) {
                if (err) {
                    self._logger.error(err);
                } else {
                    self._updateHistory();
                }
            });
        };

        this._view.onCreateBranchFromCommit = function (params) {
            self._view.clear();
            self._view.displayProgress();
            self._client.createBranchAsync(
                params.name,
                params.commitId,
                function (err) {
                    if (err) {
                        self._logger.error(err);
                    } else {
                        self._updateHistory();
                    }
                });
        };

        this._logger = logManager.create("RepositoryLogControl");
        this._logger.debug("Created");
    };

    RepositoryLogControl.prototype.generateHistory = function () {
        this._updateHistory(false);
    };

    RepositoryLogControl.prototype._updateHistory = function (useFake) {
        var currentCommitId = this._client.getActualCommit(),
            commits = null,
            commitGetter = useFake ? this._getFakeCommitsAsync : this._client.getCommitsAsync,
            branches = {},
            com,
            commitsLoaded,
            branchesLoaded,
            self = this;

        commitsLoaded = function (err, data) {
            self._logger.debug("commitsLoaded, err: '" + err + "', data: " + data == true ? data.length : "null");

            if (err) {
                self._logger.error(err);
            } else {
                commits = data.concat([]);

                self._client.getBranchesAsync(branchesLoaded);
            }
        };

        branchesLoaded = function (err, data) {
            var i;

            self._logger.debug("branchesLoaded, err: '" + err + "', data: " + data ? data.length : "null");

            if (err) {
                self._logger.error(err);
            } else {
                i = data.length;

                while (i--) {
                    branches[data[i].name] = {"name": data[i].name,
                        "localHead":  data[i].localcommit,
                        "remoteHead":  data[i].remotecommit};
                }

                i = commits.length;
                while (i--) {
                    com = commits[i];
/*
                    self._view.addCommit({"id": com._id,
                        "branch": com.name,
                        "message": com.message,
                        "parents": com.parents,
                        "timestamp": com.time,
                        "actual": com._id === currentCommitId,
                        "isLocalHead": branches[com.name] ? branches[com.name].localHead === com._id : false,
                        "isRemoteHead": branches[com.name] ? branches[com.name].remoteHead === com._id : false});
*/
                    var commitObject = {"id": com._id,
                        "branch": com.name,
                        "message": com.message,
                        "parents": com.parents,
                        "timestamp": com.time,
                        "actual": com._id === currentCommitId,
                        "isLocalHead": false,
                        "isRemoteHead": false};
                    for(var j in branches){
                        if(com._id === branches[j].localHead){
                            commitObject.isLocalHead = true;
                            if(commitObject.branch !== j){
                                commitObject.branch = j;
                            }
                        }
                        if(com._id === branches[j].remoteHead){
                            commitObject.isRemoteHead = true;
                            if(commitObject.branch !== j){
                                commitObject.branch = j;
                            }
                        }
                    }
                    self._view.addCommit(commitObject);
            }

                self._view.render();
            }
        };

        this._view.clear();
        this._view.displayProgress();

        commitGetter(null,10,commitsLoaded);
    };

    RepositoryLogControl.prototype._getFakeCommitsAsync = function (extra,extra2,callback) {
        var result = [],
            num = 16,
            c = num,
            commit,
            branches = ["master", "b1", "b2"];

        while (c--) {
            commit = {};
            commit._id = num - c - 1 + "";
            //branch name
            commit.name = branches[0];
            commit.message = "Message " + commit._id;
            commit.timestamp = new Date();
            commit.parents = [];

            //regular parents in line
            if (commit._id > 0) {
                commit.parents.push(commit._id - 1);
            }

            result.push(commit);
        }

        //create
        result[3].parents = ["1"];
        result[5].parents = ["2", "4"];

        result[8].parents = ["1"];


        result[9].parents = ["6"];


        result[10].parents = ["8"];
        result[11].parents = ["9", "7"];

        result[12].parents = ["10", "11"];

        if (callback) {
            callback(null, result);
        }
    };

    return RepositoryLogControl;
});