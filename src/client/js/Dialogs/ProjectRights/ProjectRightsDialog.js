/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Dialog for editing projects right
 * FIXME: Currently this only supports transfer of projects.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/util',
    'text!./templates/ProjectRightsDialog.html',
    'css!./styles/ProjectRightsDialog.css'
], function (StorageUtil, dialogTemplate) {
    'use strict';

    /**
     *
     * @param client
     * @param mainLogger
     * @constructor
     */
    function ProjectRightsDialog(client, mainLogger) {
        this._client = client;
        this._userId = client.getUserId();
        //this._users = [];
        //this._orgs = [];
        this._adminOrgs = WebGMEGlobal.userInfo.adminOrgs;
        this._projectId = '';
        this._ownerId = '';
        this._initialOwner = '';
        this._logger = mainLogger.fork('ProjectRightsDialog');
        this._logger.debug('ctor');
        this._possibleOwners = null;
    }

    ProjectRightsDialog.prototype.show = function (params) {
        var self = this;

        this._logger.debug('show', params);
        this._projectId = params.projectId;
        this._initialOwner = StorageUtil.getOwnerFromProjectId(this._projectId);
        this._setPossibleOwners();

        this._dialog = $(dialogTemplate);

        this._populateDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            self.onHide();
        });

        this._dialog.modal('show');
    };

    ProjectRightsDialog.prototype._populateDialog = function () {
        var self = this;

        this._dialog.find('.project-display-name').text(
            StorageUtil.getProjectDisplayedNameFromProjectId(this._projectId));

        this._noNewOwnersDiv = this._dialog.find('.no-new-owners');
        this._selectNewOwnerDiv = this._dialog.find('.select-new-owner');
        this._ownerIdList = this._selectNewOwnerDiv.find('ul.ownerId-list');
        this._selectedOwner = this._selectNewOwnerDiv.find('.selected-owner-id');

        if (this._possibleOwners.length > 0) {
            this._selectedOwner.text('Select new owner');
            this._noNewOwnersDiv.addClass('do-not-display');
        } else {
            this._selectNewOwnerDiv.addClass('do-not-display');
        }

        this._possibleOwners.forEach(function (id) {
            self._ownerIdList.append($('<li><a class="ownerId-selection">' + id + '</a></li>'));
        });

        this._ownerIdList.on('click', 'a.ownerId-selection', function (/*event*/) {
            var newOwnerId = $(this).text();
            self._ownerId = newOwnerId;
            self._selectedOwner.text(newOwnerId);
            self._okBtn.disable(false);
        });

        this._cancelBtn = this._dialog.find('.btn-cancel');
        this._okBtn = this._dialog.find('.btn-ok');
        self._okBtn.disable(true);

        this._okBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._client.transferProject(self._projectId, self._ownerId, function (err) {
                if (err) {
                    self._logger.error('Failed to transfer', err);
                }
                self._dialog.modal('hide');
            });
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });
    };

    ProjectRightsDialog.prototype._isUserAllowedToTransferProject = function () {
        //TODO: Implement this!
    };

    ProjectRightsDialog.prototype._isUserAllowedAuthorizeProject = function () {
        //TODO: Implement this!
    };

    ProjectRightsDialog.prototype._setPossibleOwners = function () {
        var self = this;
        this._possibleOwners = [];
        if (this._userId !== self._initialOwner) {
            self._possibleOwners.push(self._userId);
        }
        this._adminOrgs.forEach(function (org) {
            if (org._id !== self._initialOwner) {
                self._possibleOwners.push(org._id);
            }
        });
    };

    ProjectRightsDialog.prototype.onHide = function () {
        // Not overridden..
    };

    return ProjectRightsDialog;
});
