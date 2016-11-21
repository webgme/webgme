/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger', 'js/Dialogs/Confirm/ConfirmDialog'], function (Logger, ConfirmDialog) {
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

                self._refreshBranchesAndTags();
                self._refreshActualCommit();
                if (self._view._start === branchName) {
                    self._view.noMoreCommitsToDisplay();
                }
            });
        };

        self._view.onDeleteTagClick = function (tagName) {
            var projectName = self._client.getActiveProjectId();
            self._client.deleteTag(projectName, tagName, function (err) {
                if (err) {
                    self._logger.error(err);
                }

                self._refreshBranchesAndTags();
                self._refreshActualCommit();
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
                    self._refreshBranchesAndTags();
                });
        };

        self._view.onCreateTagFromCommit = function (params) {
            var projectName = self._client.getActiveProjectId();
            self._client.createTag(
                projectName,
                params.name,
                params.commitId,
                function (err) {
                    if (err) {
                        self._logger.error(err);
                    }
                    self._refreshBranchesAndTags();
                });
        };

        self._view.onSquashFromCommit = function (params, cancelCallback) {
            var dialog = new ConfirmDialog(),
                confirmed = false;
            dialog.show({
                title: 'Squash Commits',
                iconClass: 'glyphicon glyphicon-compressed',
                question: 'Would you like to squash all commits above ' + params.commitId.substr(0, 7) +
                ' (not included) into a single commit?',
                input: {
                    label: 'Message',
                    placeHolder: 'Enter optional commit message...',
                    required: false
                },
                severity: 'warning',
                onHideFn: function () {
                    if (!confirmed) {
                        // The dialog was cancelled so we need to clear the selection
                        cancelCallback();
                    }
                }
            }, function (doNotShow, msg) {
                confirmed = true;
                self._client.squashCommits(self._client.getActiveProjectId(),
                    params.commitId, params.branchName, msg || null, function (err, result) {
                        if (err) {
                            self._logger.error(err);
                        } else if (result.status === 'SYNCED') {
                            self._view._dialog.setSelectorValue(params.branchName);
                        } else {
                            self._client.notifyUser({
                                severity: 'info',
                                message: 'Squashing branch \'' + params.branchName + '\' forked [' +
                                result.hash + ']'
                            });
                            self._view._dialog.setSelectorValue();
                        }
                    });
                });
        };

        self._view.onSelectBranch = function (branchName) {
            self._client.selectBranch(branchName, null,
                function (err) {
                    if (err) {
                        self._logger.error(err);
                    } else {
                        self._logger.debug('Branch selected in client', branchName);
                    }
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
            commitsLoaded,
            scrollPos = self._view._el.scrollTop() || 0;

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
                }

                self._refreshBranchesAndTags();
                self._view.hideProgressbar();

                if (cLen < num) {
                    self._view.noMoreCommitsToDisplay();
                }

                self._view._el.scrollTop(scrollPos);
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

    RepositoryLogControl.prototype._refreshBranchesAndTags = function () {
        var self = this,
            projectName = self._client.getActiveProjectId();

        self._view.clearBranches();
        self._view.clearTags();

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
                    commitId: data[branchNames[i]]
                });
            }

            self._client.getTags(projectName, function (err, data) {
                var i,
                    tagNames;

                self._logger.debug('getTags: err, data: ', err, data);

                if (err) {
                    self._logger.error(err);
                    return;
                }
                tagNames = Object.keys(data);
                for (i = 0; i < tagNames.length; i += 1) {
                    self._view.addTag({
                        name: tagNames[i],
                        commitId: data[tagNames[i]]
                    });
                }

                self._view.branchesAndTagsUpdated();
            });
        });
    };

    return RepositoryLogControl;
});