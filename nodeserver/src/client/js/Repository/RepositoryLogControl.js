"use strict";

define(['logManager'], function (logManager) {

    var RepositoryLogControl;

    RepositoryLogControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        this._lastCommitID = null;

        //override view event handlers
        this._view.onLoadCommit = function (params) {
            self._view.clear();
            self._view.showPogressbar();
            self._client.selectCommitAsync(params.id, function (err) {
                if (err) {
                    self._logger.error(err);
                } else {
                    //self._updateHistory();
                }
            });
        };

        this._view.onDeleteBranchClick = function (branch, branchType) {
            self._view.clear();
            self._view.showPogressbar();
            self._client.deleteBranchAsync(branch, function (err) {
                if (err) {
                    self._logger.error(err);
                } else {
                    //self._updateHistory();
                }
            });
        };

        this._view.onCreateBranchFromCommit = function (params) {
            self._view.clear();
            self._view.showPogressbar();
            self._client.createBranchAsync(
                params.name,
                params.commitId,
                function (err) {
                    if (err) {
                        self._logger.error(err);
                    } else {
                        //self._updateHistory();
                    }
                });
        };

        this._view.onLoadMoreCommits = function (num) {
            self._loadMoreCommits(num);
        };

        this._logger = logManager.create("RepositoryLogControl");
        this._logger.debug("Created");
    };

    RepositoryLogControl.prototype._loadMoreCommits = function (num) {
        var currentCommitId = this._client.getActualCommit(),
            commits = null,
            com,
            commitsLoaded,
            branchesLoaded,
            self = this;

        commitsLoaded = function (err, data) {
            var i,
                cLen;

            self._logger.debug("commitsLoaded, err: '" + err + "', data: " + data == true ? data.length : "null");

            if (err) {
                if (_.isEmpty(err)) {
                    self._logger.error('the mysterious error returned by "getCommitsAsync"');
                } else {
                    self._logger.error(err);
                }
            } else {
                commits = data.concat([]);

                cLen = commits.length;
                if (cLen > 0) {
                    for (i = 0; i < cLen; i += 1) {
                        com = commits[i];

                        if (self._lastCommitID !== com._id) {

                            var commitObject = {"id": com._id,
                                "branch": com.name,
                                "message": com.message,
                                "parents": com.parents,
                                "timestamp": com.time,
                                "actual": com._id === currentCommitId};

                            self._view.addCommit(commitObject);
                        }
                    }

                    //store last CommitID we received
                    self._lastCommitID = commits[i - 1]._id;

                    //render added commits
                    self._view.render();
                }

                self._view.hidePogressbar();

                if (cLen < num) {
                    self._view.noMoreCommitsToDisplay();
                }
            }
        };

        branchesLoaded = function (err, data) {
            var i;

            self._logger.debug("branchesLoaded, err: '" + err + "', data: " + data ? data.length : "null");

            if (err) {
                self._logger.error(err);
            } else {
                //set view's branch info
                i = data.length;

                while (i--) {
                    self._view.addBranch({"name": data[i].name,
                        "localHead":  data[i].localcommit,
                        "remoteHead":  data[i].remotecommit});
                }

                //get first set of commits
                self._client.getCommitsAsync(self._lastCommitID,num,commitsLoaded);
            }
        };

        this._view.showPogressbar();

        if (this._lastCommitID) {
            this._client.getCommitsAsync(this._lastCommitID,num,commitsLoaded);
        } else {
            this._client.getBranchesAsync(branchesLoaded);
        }
    };

    return RepositoryLogControl;
});