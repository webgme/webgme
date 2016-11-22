/*globals define, $*/
/*jshint browser: true*/

/**
 * Dialog for adding commits to a branch.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'common/regexp',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'js/Dialogs/MultiTab/MultiTabDialog'
], function (Logger, REGEXP, AssetWidget, MultiTabDialog) {
    'use strict';

    function AddCommitsDialog(client, gmeConfig, branches) {
        this._client = client;
        this._logger = Logger.create('gme:js:Dialogs:AddCommits:AddCommitsDialog', gmeConfig.client.log);
        this._branches = branches;
    }

    AddCommitsDialog.prototype.show = function (params) {
        var self = this,
            parameters = {
                title: 'Add Commits',
                extraClasses: 'add-commits-dialog',
                iconClass: 'glyphicon glyphicon-fast-forward',
                activeTabIndex: 0,
                tabs: [this._getFromProjectTab(), this._getApplyCommitQueueTab()]
            };

        this._dialog = new MultiTabDialog();
        this._projectId = params.projectId;
        this._branchName = params.branchName;

        this._dialog.show(parameters, function () {
            self._assetWidgetCQ.destroy();
            self._assetWidgetProject.destroy();
            self._nameInputEl.off('keyup');
            self._nameInputEl.off('keydown');
        });
    };

    AddCommitsDialog.prototype._getFromProjectTab = function () {
        var self = this;

        this._assetWidgetProject = new AssetWidget({
            propertyName: 'AddProjectCommit',
            propertyValue: ''
        });

        function onOK(callback) {
            if (!self._assetWidgetProject.propertyValue) {
                callback('No file uploaded.');
                return;
            }

            self._client.updateProjectFromFile(
                self._projectId,
                self._branchName,
                self._assetWidgetProject.propertyValue,
                function (err, result) {
                    if (err) {
                        callback('Failed to add commit from project: ' + err);
                    } else if (!self._checkCommitStatus(result.status)) {
                        callback('Project imported at commit ' + result.hash.substring(0, 7) +
                            ' but could not update branch.');
                    } else {
                        callback();
                    }
                }
            );
        }

        return {
            title: 'Project',
            infoTitle: 'From exported webgmex project',
            infoDetails: 'The exported project does not have to relate to the current project at all. However it is ' +
            'typically recommended that they stem from the same source. Otherwise following the history may not ' +
            'make much sense.',
            formControl: self._assetWidgetProject.el,
            onOK: onOK
        };
    };

    AddCommitsDialog.prototype._getApplyCommitQueueTab = function () {
        var self = this,
            commitQueue,
            canFastForward = false,
            isValidData = false,
            isValidName = false,
            formControls = $('<div class="apply-commit-queue-controls">');

        this._assetWidgetCQ = new AssetWidget({
            propertyName: 'ApplyCommitQueue',
            propertyValue: ''
        });

        this._nameInputEl = $('<input type="text" class="input form-control branch-name" ' +
            'placeholder="Enter a new branch name..."/>');

        formControls.append(this._assetWidgetCQ.el);
        formControls.append(this._nameInputEl);

        this._nameInputEl.hide();

        function onOK(callback) {
            var options = {
                fastForward: canFastForward,
                newBranchName: self._nameInputEl.val()
            };

            if (!isValidData) {
                callback('The uploaded data is invalid');
                return;
            } else if (!isValidName) {
                callback('The provided branch is not valid, enter another one.');
                return;
            }

            self._client.applyCommitQueue(commitQueue, options, function (err) {
                if (err) {
                    self._logger(err);
                    callback('Failed to apply commit queue' + err);
                } else {
                    callback();
                }
            });
        }

        function isRightFileFormat(content) {
            return content.hasOwnProperty('webgmeVersion') && content.hasOwnProperty('projectId') &&
                content.hasOwnProperty('branchName') && content.hasOwnProperty('commitQueue') &&
                content.commitQueue.length > 0 && content.commitQueue[0].hasOwnProperty('commitObject') &&
                typeof content.commitQueue[0].commitObject._id === 'string' &&
                REGEXP.HASH.test(content.commitQueue[0].commitObject._id);
        }

        this._assetWidgetCQ.onFinishChange(function (/*data*/) {
            self._assetWidgetCQ.getTargetAsJson(function (targetJson) {
                canFastForward = false;
                commitQueue = [];
                if (targetJson) {
                    if (isRightFileFormat(targetJson) === false) {
                        self._dialog.showAlert('Uploaded file is not the right format.', 'danger');
                        self._isValidData = false;
                    } else if (targetJson.projectId !== self._projectId) {
                        self._dialog.showAlert('Exported data "' + targetJson.projectId + '" is not from this project.',
                            'danger');
                        self._isValidData = false;
                    } else if (targetJson.commitQueue[0].commitObject.parents
                            .indexOf(self._branches[self._branchName]) === -1) {

                        self._dialog.showAlert('Exported data is from the same project, but the first queued ' +
                            'commit hash does not have the current one as a parent. A new branch with the changes ' +
                            'will be created.', 'warning');
                        isValidData = true;
                        commitQueue = targetJson.commitQueue;
                    } else {
                        self._dialog.showAlert('Exported data fits the current branch and applied changes will be ' +
                            'attempted to be fast forwarded. Please provide a branch name just in case it fails. ',
                            'success');
                        isValidData = true;
                        canFastForward = true;
                        commitQueue = targetJson.commitQueue;
                    }
                } else {
                    isValidData = false;
                    self._dialog.showAlert('Uploaded file must be a json file! Try again...', 'danger');
                }

                if (isValidData === true) {
                    self._nameInputEl.show();
                    self._nameInputEl.focus();
                } else {
                    self._nameInputEl.hide();
                }
            });
        });

        this._nameInputEl.on('keyup', function () {
            var el = $(this),
                branchName = el.val();

            isValidName = branchName !== '' && self._branches.hasOwnProperty(branchName) === false &&
                REGEXP.BRANCH.test(branchName);

            if (isValidName) {
                formControls.removeClass('has-error');
            } else {
                formControls.addClass('has-error');
            }
        });

        this._nameInputEl.on('keydown', function (event) {
            var enterPressed = event.which === 13;

            if (enterPressed) {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        return {
            title: 'Commit Queue',
            infoTitle: 'From downloaded commit queue',
            infoDetails: 'If you got disconnected and or for some other ' +
            'reason was forced to download uncommitted local changes. This is where such changes can be persisted ' +
            'back to the database. N.B. this is not an export format or a way to "save" changes - but rather a ' +
            'fallback when connection or device-power was lost.',
            formControl: formControls,
            onOK: onOK
        };
    };

    AddCommitsDialog.prototype._checkCommitStatus = function (commitStatus) {
        return commitStatus === this._client.CONSTANTS.STORAGE.SYNCED ||
            commitStatus === this._client.CONSTANTS.STORAGE.MERGED;
    };

    return AddCommitsDialog;
});
