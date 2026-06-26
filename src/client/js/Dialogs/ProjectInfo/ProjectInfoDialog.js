/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

define([
    'js/logger',
    'js/Loader/LoaderCircles',
    'common/storage/util',
    'common/regexp',
    'js/util',
    'superagent',
    'text!./templates/ProjectInfoDialog.html',
    'css!./styles/ProjectInfoDialog.css'
], function (Logger, LoaderCircles, StorageUtil, REGEXP, clientUtil, superagent, dialogTemplate) {

    'use strict';

    function ProjectInfoDialog(client) {
        this._logger = Logger.create('gme:Dialogs:ProjectInfo:ProjectInfoDialog', WebGMEGlobal.gmeConfig.client.log);
        this._client = client;
    }

    ProjectInfoDialog.prototype.show = function (projectId, params) {
        params = params || {};
        this._projectId = projectId;
        this._onSaved = params.onSaved;
        this._initDialog();
        this._loadProjectInfo();
        this._dialog.modal('show');
    };

    ProjectInfoDialog.prototype._initDialog = function () {
        var self = this;

        this._dialog = $(dialogTemplate);
        this._ownerIdList = this._dialog.find('ul.ownerId-list');
        this._selectedOwner = this._dialog.find('.selected-owner-id');
        this._nameInput = this._dialog.find('.project-name');
        this._kindInput = this._dialog.find('.project-kind');
        this._descriptionInput = this._dialog.find('.project-description');
        this._auditCreated = this._dialog.find('.audit-created');
        this._auditModified = this._dialog.find('.audit-modified');
        this._auditViewed = this._dialog.find('.audit-viewed');
        this._saveError = this._dialog.find('.save-error');
        this._btnSave = this._dialog.find('.btn-save');
        this._userId = WebGMEGlobal.userInfo._id;

        this._populateOwnerList();

        this._btnSave.on('click', function () {
            self._save();
        });

        this._ownerIdList.on('click', 'a.ownerId-selection', function () {
            self._selectedOwnerId = $(this).data('id');
            self._selectedOwner.text($(this).text());
        });

        this._dialog.on('hidden.bs.modal', function () {
            self._ownerIdList.off('click');
            self._btnSave.off('click');
            self._dialog.remove();
            self._dialog = undefined;
        });
    };

    ProjectInfoDialog.prototype._populateOwnerList = function () {
        var self = this;

        this._ownerIdList.empty();
        this._ownerIdList.append($('<li><a class="ownerId-selection" data-id="' + self._userId + '">' +
            WebGMEGlobal.getUserDisplayName(self._userId) + '</a></li>'));

        if (WebGMEGlobal.userInfo.adminOrgs.length > 0) {
            this._ownerIdList.append($('<li role="separator" class="divider"></li>'));
            WebGMEGlobal.userInfo.adminOrgs.forEach(function (orgInfo) {
                self._ownerIdList.append($('<li><a class="ownerId-selection" ' +
                    'data-id="' + WebGMEGlobal.getUserDisplayName(orgInfo._id) + '">' + orgInfo._id + '</a></li>'));
            });
        }
    };

    ProjectInfoDialog.prototype._loadProjectInfo = function () {
        var self = this,
            loader = new LoaderCircles({containerElement: this._dialog.find('.modal-content')});

        loader.start();

        this._client.getProjects({rights: true, info: true}, function (err, projects) {
            var project,
                i;

            loader.stop();
            if (err) {
                self._showError('Could not load project info.');
                self._btnSave.disable(true);
                return;
            }

            for (i = 0; i < projects.length; i += 1) {
                if (projects[i]._id === self._projectId) {
                    project = projects[i];
                    break;
                }
            }

            if (!project) {
                self._showError('Could not load project info.');
                self._btnSave.disable(true);
                return;
            }

            self._applyProjectInfo(project);
        });
    };

    ProjectInfoDialog.prototype._applyProjectInfo = function (project) {
        var info = project.info || {},
            ownerDisplayName = WebGMEGlobal.getUserDisplayName(project.owner),
            createdAt = info.createdAt ? new Date(info.createdAt) : null,
            modifiedAt = info.modifiedAt ? new Date(info.modifiedAt) : null,
            viewedAt = info.viewedAt ? new Date(info.viewedAt) : null;

        this._project = project;
        this._originalOwnerId = project.owner;
        this._selectedOwnerId = project.owner;
        this._originalName = project.name;
        this._originalKind = info.kind || '';
        this._originalDescription = info.description || '';

        this._selectedOwner.text(ownerDisplayName);
        this._nameInput.val(project.name);
        this._kindInput.val(info.kind || '');
        this._descriptionInput.val(info.description || '');

        this._auditCreated.text(this._formatAudit(info.creator, createdAt));
        this._auditModified.text(this._formatAudit(info.modifier, modifiedAt));
        this._auditViewed.text(this._formatAudit(info.viewer, viewedAt));

        this._updateEditableState();
    };

    ProjectInfoDialog.prototype._formatAudit = function (username, date) {
        if (!date) {
            return 'N/A';
        }

        return (username || 'N/A') + ' at ' + clientUtil.formattedDate(date);
    };

    ProjectInfoDialog.prototype._updateEditableState = function () {
        var canWrite = this._project.rights && this._project.rights.write === true,
            canDelete = this._project.rights && this._project.rights.delete === true;

        this._kindInput.prop('disabled', !canWrite);
        this._descriptionInput.prop('disabled', !canWrite);
        this._nameInput.prop('disabled', !canDelete);
        this._dialog.find('.owner-dropdown button').prop('disabled', !canDelete);
        this._btnSave.prop('disabled', !(canWrite || canDelete));
    };

    ProjectInfoDialog.prototype._showError = function (message) {
        this._saveError.text(message).removeClass('hidden');
    };

    ProjectInfoDialog.prototype._hideError = function () {
        this._saveError.addClass('hidden').text('');
    };

    ProjectInfoDialog.prototype._validate = function () {
        var newName = this._nameInput.val();

        if (!REGEXP.PROJECT_NAME.test(newName)) {
            return 'Project name contains invalid characters.';
        }

        return null;
    };

    ProjectInfoDialog.prototype._save = function () {
        var self = this,
            validationError = this._validate(),
            ownerChanged,
            nameChanged,
            infoChanged,
            newOwnerId,
            newName,
            newKind,
            newDescription,
            loader;

        this._hideError();

        if (validationError) {
            this._showError(validationError);
            return;
        }

        newOwnerId = this._selectedOwnerId;
        newName = this._nameInput.val();
        newKind = this._kindInput.val();
        newDescription = this._descriptionInput.val();
        ownerChanged = newOwnerId !== this._originalOwnerId;
        nameChanged = newName !== this._originalName;
        infoChanged = newKind !== this._originalKind || newDescription !== this._originalDescription;

        if (!ownerChanged && !nameChanged && !infoChanged) {
            this._dialog.modal('hide');
            return;
        }

        loader = new LoaderCircles({containerElement: this._dialog.find('.modal-content')});
        loader.start();
        this._btnSave.disable(true);

        this._applyChanges(this._projectId, ownerChanged, nameChanged, infoChanged,
            newOwnerId, newName, newKind, newDescription, loader);
    };

    ProjectInfoDialog.prototype._applyChanges = function (projectId, ownerChanged, nameChanged, infoChanged,
        newOwnerId, newName, newKind, newDescription, loader) {
        var self = this,
            owner,
            projectName;

        function done(err, newProjectId) {
            if (err) {
                loader.stop();
                self._btnSave.disable(false);
                self._showError(err.message || String(err));
                return;
            }

            if (newProjectId) {
                projectId = newProjectId;
            }

            if (ownerChanged) {
                self._applyChanges(projectId, false, nameChanged, infoChanged,
                    newOwnerId, newName, newKind, newDescription, loader);
                return;
            }

            if (nameChanged) {
                self._applyChanges(projectId, false, false, infoChanged,
                    newOwnerId, newName, newKind, newDescription, loader);
                return;
            }

            if (infoChanged) {
                owner = StorageUtil.getOwnerFromProjectId(projectId);
                projectName = StorageUtil.getProjectNameFromProjectId(projectId);
                self._patchProjectInfo(owner, projectName, newKind, newDescription, function (patchErr) {
                    loader.stop();
                    if (patchErr) {
                        self._btnSave.disable(false);
                        self._showError(patchErr.message || String(patchErr));
                        return;
                    }

                    self._afterSave(projectId);
                });
                return;
            }

            loader.stop();
            self._afterSave(projectId);
        }

        if (ownerChanged) {
            self._transferProject(projectId, newOwnerId, done);
        } else if (nameChanged) {
            self._renameProject(projectId, newName, done);
        } else if (infoChanged) {
            owner = StorageUtil.getOwnerFromProjectId(projectId);
            projectName = StorageUtil.getProjectNameFromProjectId(projectId);
            self._patchProjectInfo(owner, projectName, newKind, newDescription, function (err) {
                done(err);
            });
        } else {
            done(null);
        }
    };

    ProjectInfoDialog.prototype._transferProject = function (projectId, newOwnerId, callback) {
        var owner = StorageUtil.getOwnerFromProjectId(projectId),
            projectName = StorageUtil.getProjectNameFromProjectId(projectId);

        if (typeof this._client.transferProject === 'function') {
            this._client.transferProject(projectId, newOwnerId, function (err, newProjectId) {
                callback(err, newProjectId);
            });
            return;
        }

        superagent('POST', 'api/projects/' + owner + '/' + projectName + '/transfer/' + newOwnerId)
            .end(function (err, res) {
                if (err || res.status !== 200) {
                    callback(new Error('Could not transfer project ownership.'));
                } else {
                    callback(null, res.body._id);
                }
            });
    };

    ProjectInfoDialog.prototype._renameProject = function (projectId, newProjectName, callback) {
        var owner = StorageUtil.getOwnerFromProjectId(projectId),
            projectName = StorageUtil.getProjectNameFromProjectId(projectId);

        if (typeof this._client.renameProject === 'function') {
            this._client.renameProject(projectId, newProjectName, function (err, newProjectId) {
                callback(err, newProjectId);
            });
            return;
        }

        superagent('POST', 'api/projects/' + owner + '/' + projectName + '/rename')
            .send({name: newProjectName})
            .end(function (err, res) {
                if (err || res.status !== 200) {
                    callback(new Error('Could not rename project.'));
                } else {
                    callback(null, res.body._id);
                }
            });
    };

    ProjectInfoDialog.prototype._patchProjectInfo = function (owner, projectName, kind, description, callback) {
        superagent('PATCH', 'api/projects/' + owner + '/' + projectName)
            .send({kind: kind, description: description})
            .end(function (err, res) {
                if (err || res.status !== 200) {
                    callback(new Error('Could not update project info.'));
                } else {
                    callback(null);
                }
            });
    };

    ProjectInfoDialog.prototype._afterSave = function (projectId) {
        var self = this,
            activeProjectId = this._client.getActiveProjectId(),
            originalProjectId = this._projectId;

        this._dialog.modal('hide');

        if (typeof this._onSaved === 'function') {
            this._onSaved(projectId);
        }

        if (activeProjectId === originalProjectId && projectId !== activeProjectId) {
            this._client.selectProject(projectId, null, function (err) {
                if (err) {
                    self._logger.error('Could not select renamed/transferred project', err);
                    document.location.href = window.location.href.split('?')[0];
                }
            });
        }
    };

    return ProjectInfoDialog;
});
