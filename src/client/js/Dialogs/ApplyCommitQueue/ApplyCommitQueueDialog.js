/*globals define, $*/
/*jshint browser: true*/

/**
 * Dialog for applying commit-queue to branch.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'common/regexp',
    'text!./templates/ApplyCommitQueueDialog.html',
    'css!./styles/ApplyCommitQueueDialog.css'
], function (Logger, AssetWidget, REGEXP, dialogTemplate) {
    'use strict';

    function ApplyCommitQueueDialog(client, gmeConfig, branches) {
        this._client = client;
        this._logger = Logger.create('gme:js:Dialogs:ApplyCommitQueue:ApplyCommitQueueDialog', gmeConfig.client.log);
        this._isValidData = false;
        this._isValidName = false;
        this._canFastForward = false;
        this._branches = branches;
        this._commitQueue = [];
    }

    ApplyCommitQueueDialog.prototype.show = function (params, onOk) {
        var self = this;

        this._dialog = $(dialogTemplate);

        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');
        this._infoBtn = this._dialog.find('.toggle-info-btn');
        this._descriptionEl = this._dialog.find('.type-description');

        this._nameInputEl = this._dialog.find('.branch-name');

        this._assetWidget = new AssetWidget({
            propertyName: 'ImportFile',
            propertyValue: ''
        });

        this._assetWidget.el.addClass('form-control selector pull-left');
        this._dialog.find('.selection-from-file').append(this._assetWidget.el);
        this._fileStatusAlert = this._dialog.find('.file-status');

        this._assetWidget.onFinishChange(function (/*data*/) {
            self._assetWidget.getTargetAsJson(function (targetJson) {
                self._canFastForward = false;
                self._commitQueue = [];
                if (targetJson) {
                    if (self._isRightFileFormat(targetJson) === false) {
                        self._showAlert('Uploaded file is not the right format.', 'alert-danger');
                        self._isValidData = false;
                    } else if (targetJson.projectId !== params.projectId) {
                        self._showAlert('Exported data "' + targetJson.projectId + '" is not from this project.',
                            'alert-danger');
                        self._isValidData = false;
                    } else if (targetJson.commitQueue[0].commitObject.parents
                            .indexOf(self._branches[params.branchName]) === -1) {

                        self._showAlert('Exported data is from the same project, but the first queued commit hash ' +
                            'does not have the current one as a parent. A new branch with the changes will be created.',
                            'alert-warning');
                        self._isValidData = true;
                        self._commitQueue = targetJson.commitQueue;
                    } else {
                        self._showAlert('Exported data fits the current branch and applied changes will be ' +
                            'attempted to be fast forwarded. Please provide a branch name just in case it fails. ',
                            'alert-success');
                        self._isValidData = true;
                        self._canFastForward = true;
                        self._commitQueue = targetJson.commitQueue;
                    }
                } else {
                    self._isValidData = false;
                    self._showAlert('Uploaded file must be a json file! Try again...', 'alert-danger');
                }

                if (self._isValidData === true) {
                    self._nameInputEl.removeClass('hidden');
                    self._nameInputEl.focus();
                } else {
                    self._nameInputEl.addClass('hidden');
                }

                self._updateOKBtn();
            });
        });

        this._infoBtn.on('click', function () {
            if (self._descriptionEl.hasClass('hidden')) {
                self._descriptionEl.removeClass('hidden');
            } else {
                self._descriptionEl.addClass('hidden');
            }
        });

        this._nameInputEl.on('keyup', function (event) {
            var el = $(this),
                branchName = el.val();

            self._isValidName = branchName !== '' && self._branches.hasOwnProperty(branchName) === false &&
                REGEXP.BRANCH.test(branchName);

            if (self._isValidName) {
                el.parent().removeClass('has-error');
            } else {
                el.parent().addClass('has-error');
            }

            self._updateOKBtn();

            switch (event.which) {
                case 13: // [enter]
                    // save changes on [ENTER]
                    self._okBtn.trigger('click');
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });

        this._okBtn.on('click', function (event) {
            var result = {
                fastForward: self._canFastForward,
                newBranchName: self._nameInputEl.val()
            };

            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');

            onOk(self._commitQueue, result);
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    ApplyCommitQueueDialog.prototype._showAlert = function (msg, severity) {
        this._fileStatusAlert.removeClass('alert-success alert-info alert-warning alert-danger hidden');
        this._fileStatusAlert.addClass(severity);
        this._fileStatusAlert.text(msg);
    };

    ApplyCommitQueueDialog.prototype._hideAlert = function () {
        this._fileStatusAlert.addClass('hidden');
    };

    ApplyCommitQueueDialog.prototype._isRightFileFormat = function (content) {
        return content.hasOwnProperty('webgmeVersion') && content.hasOwnProperty('projectId') &&
            content.hasOwnProperty('branchName') && content.hasOwnProperty('commitQueue') &&
            content.commitQueue.length > 0 && content.commitQueue[0].hasOwnProperty('commitObject') &&
            typeof content.commitQueue[0].commitObject._id === 'string' &&
            REGEXP.HASH.test(content.commitQueue[0].commitObject._id);
    };

    ApplyCommitQueueDialog.prototype._updateOKBtn = function () {
        if (this._isValidData && this._isValidName) {
            this._okBtn.disable(false);
        } else {
            this._okBtn.disable(true);
        }
    };

    return ApplyCommitQueueDialog;
});
