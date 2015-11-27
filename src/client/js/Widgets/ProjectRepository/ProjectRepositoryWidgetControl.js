/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger'], function (Logger) {
    'use strict';

    var RepositoryLogControl;

    RepositoryLogControl = function (myClient, myView) {
        var self = this;

        self._client = myClient;
        self._view = myView;

        self._lastCommitID = null;

        //override view event handlers
        self._view.onLoadCommit = function (params) {
            self._client.selectCommit(params.id, function (err) {
                if (err) {
                    self._logger.error(err);
                }

                self._refreshActualCommit();
            });
        };

        self._view.onDeleteBranchClick = function (branchName, oldHash) {
            var projectName = self._client.getActiveProjectId();
            self._client.deleteBranch(projectName, branchName, oldHash, function (err) {
                if (err) {
                    self._logger.error(err);
                }

                self._refreshBranches();
                self._refreshActualCommit();
                if (branchName === self._view._branchName) {
                    self._view.noMoreCommitsToDisplay();
                }
            });
        };

        self._view.onCreateBranchFromCommit = function (params) {
            var projectName = self._client.getActiveProjectId();
            self._client.createBranch(
                projectName,
                params.name,
                params.commitId,
                function (err) {
                    if (err) {
                        self._logger.error(err);
                    }
                    self._refreshBranches();
                });
        };

        self._view.onLoadMoreCommits = function (num, start) {
            self._loadMoreCommits(num, start);
        };

        self._logger = Logger.create(
            'gme:Widgets:ProjectRepository:ProjectRepositoryWidgetControl_RepositoryLogControl',
            WebGMEGlobal.gmeConfig.client.log);
        self._logger.debug('Created');
    };

    RepositoryLogControl.prototype._loadMoreCommits = function (num, start) {
        var self = this,
            commits = null,
            com,
            commitsLoaded;

        commitsLoaded = function (err, data) {
            var i,
                cLen,
                commitObject;

            self._logger.debug('commitsLoaded, err: \'' + err + '\', data: ' + data === true ? data.length : 'null');

            if (err) {
                if (_.isEmpty(err)) {
                    self._logger.error('the mysterious error returned by "getCommitsAsync"');
                } else {
                    self._logger.error(err);
                }
            } else {
                commits = data.concat([]);

                if (start) {
                    self._view.clear();
                    self._view._initializeUI();
                    self._lastCommitID = null;
                }

                cLen = commits.length;
                if (cLen > 0) {
                    for (i = 0; i < cLen; i += 1) {
                        com = commits[i];

                        if (self._lastCommitID !== com._id) {

                            commitObject = {
                                id: com._id,
                                message: com.message,
                                parents: com.parents,
                                timestamp: com.time,
                                user: com.updater.join(',')
                            };

                            self._view.addCommit(commitObject);
                        }
                    }

                    //store last CommitID we received
                    self._lastCommitID = commits[i - 1]._id;

                    //render added commits
                    self._view.render();

                    self._refreshActualCommit();

                    self._refreshBranches();
                }

                self._view.hideProgressbar();

                if (cLen < num) {
                    self._view.noMoreCommitsToDisplay();
                }
            }
        };

        self._view.showProgressbar();

        self._logger.debug('_loadMoreCommits', num, start);

        if (start) {
            self._client.getHistory(self._client.getActiveProjectId(),
                start,
                num,
                commitsLoaded);
        } else {
            self._client.getCommits(self._client.getActiveProjectId(),
                this._lastCommitID || (new Date()).getTime() + 1,
                num,
                commitsLoaded);
        }
    };

    RepositoryLogControl.prototype._refreshActualCommit = function () {
        this._view.setActualCommitId(this._client.getActiveCommitHash());
    };

    RepositoryLogControl.prototype._refreshBranches = function () {
        var self = this,
            projectName = self._client.getActiveProjectId();

        self._view.clearBranches();

        self._client.getBranches(projectName, function (err, data) {
            var i,
                branchNames;

            self._logger.debug('getBranches: err, data: ', err, data);

            if (err) {
                self._logger.error(err);
                return;
            }
            branchNames = Object.keys(data);
            for (i = 0; i < branchNames.length; i += 1) {
                self._view.addBranch({
                    name: branchNames[i],
                    commitId: data[branchNames[i]],
                    sync: true, //data[i].sync TODO: does this matter?
                });
            }
            self._view.branchesUpdated();
        });
    };

    return RepositoryLogControl;
});