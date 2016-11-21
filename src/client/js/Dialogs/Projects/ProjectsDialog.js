/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define([
    'js/logger',
    'js/Constants',
    'js/Loader/LoaderCircles',
    'js/Utils/GMEConcepts',
    'js/Dialogs/CreateProject/CreateProjectDialog',
    'js/Dialogs/Confirm/ConfirmDialog',
    'common/storage/util',
    'js/util',
    'common/regexp',
    'text!./templates/ProjectsDialog.html',
    'css!./styles/ProjectsDialog.css'
], function (Logger, CONSTANTS, LoaderCircles, GMEConcepts, CreateProjectDialog, ConfirmDialog,
             StorageUtil, clientUtil, REGEXP, projectsDialogTemplate) {

    'use strict';

    var ProjectsDialog,
        DATA_PROJECT = 'DATA_PROJECT',
        READ_ONLY_FILTER = 'READ_ONLY_FILTER',
        TABLE_ROW_BASE = $('<tr class="project-row"></tr>');

    ProjectsDialog = function (client, createNew, createType) {
        this._logger = Logger.create('gme:Dialogs:Projects:ProjectsDialog', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._projectIds = [];
        this._projectList = {};
        this._filter = undefined;
        this._userId = null;
        this._ownerId = null;
        this._creatingNew = createNew;
        this._createType = createType || 'seed';
        this._logger.debug('Created');
        this._dontAskOnDelete = false;
        this._openingProject = false;
    };

    ProjectsDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.modal('show');

        this._dialog.on('hidden.bs.modal', function () {
            self._tableBody.off('dblclick');
            self._tableBody.off('click');
            self._tableHead.off('click');
            self._btnCreateNew.off('click');
            self._btnNewProjectCancel.off('click');
            self._ownerIdList.off('click');
            self._txtNewProjectName.off('keyup');
            self._txtNewProjectName.off('keydown');
            self._btnNewProjectCreate.off('click');
            self._btnRefresh.off('click');

            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;

            self._client.unwatchDatabase(self._projectEventHandling, function (err) {
                if (err) {
                    self._logger.error('error during unsubscribe', err);
                }
            });
        });

        this._refreshProjectList();

        this._projectEventHandling = function (emitter, data) {
            if (data.etype === CONSTANTS.CLIENT.STORAGE.PROJECT_CREATED ||
                data.etype === CONSTANTS.CLIENT.STORAGE.PROJECT_DELETED) {
                self._logger.debug('projectList changed event', data);
                self._refreshProjectList.call(self);
            }
        };

        self._client.watchDatabase(self._projectEventHandling, function (err) {
            if (err) {
                self._logger.error('unable to follow project events', err);
            }
        });
    };

    ProjectsDialog.prototype._initDialog = function () {
        var self = this,
            extraTabs,
            selectedId;

        function openProject(projectId) {
            self._logger.debug('openProject requested, already opening?', self._openingProject);
            if (self._projectList[projectId].rights.read === true && self._openingProject === false) {
                self._openingProject = true;
                self._client.selectProject(projectId, null, function (err) {
                    self._openingProject = false;
                    if (err) {
                        self._logger.error(err);
                    } else {
                        //WebGMEGlobal.State.registerActiveObject(CONSTANTS.PROJECT_ROOT_ID);
                    }
                    self._dialog.modal('hide');
                });
            }
        }

        function doCreateProject(/*client*/) {
            var val = self._txtNewProjectName.val(),
                d;

            if (val !== '' && self._projectIds.indexOf(val) === -1) {
                self._dialog.modal('hide');

                d = new CreateProjectDialog(self._client, val, self._createType,
                    self._logger.fork('CreateProjectDialog'));

                d.show(function (seedType, seedName, seedBranchName, seedCommitHash, blobHash) {
                    if (seedType && seedName) {
                        self._createProject(val, seedType, seedName, seedBranchName, seedCommitHash, blobHash);
                    } else {
                        self._logger.debug('Closed create dialog with arguments', seedType, seedName);
                    }
                });
            }
        }

        function deleteProject(projectId) {
            var projectDisplayedName = WebGMEGlobal.gmeConfig.authentication.enable ?
                StorageUtil.getProjectDisplayedNameFromProjectId(projectId) :
                StorageUtil.getProjectNameFromProjectId(projectId);

            var refreshList = function () {
                    //self._refreshProjectList.call(self);
                },
                refreshPage = function () {
                    document.location.href = window.location.href.split('?')[0];
                },
                doDelete = function () {
                    self._client.deleteProject(projectId, function (err) {
                        if (err) {
                            self._logger.error(err);
                            return;
                        }

                        if (self._activeProject === projectId) {
                            refreshPage();
                        } else {
                            refreshList();
                        }
                    });
                },
                deleteProjectModal;

            if (self._projectList[projectId].rights.delete === true) {
                if (self._dontAskOnDelete === true) {
                    doDelete();
                    return;
                }
                deleteProjectModal = new ConfirmDialog();

                deleteProjectModal.show({
                        deleteItem: projectDisplayedName,
                        enableDontAskAgain: true,
                        onHideFn: function () {
                            self._modalContent.removeClass('in-background');
                        }
                    },
                    function (dontAskAgain) {
                        if (dontAskAgain) {
                            self._dontAskOnDelete = true;
                        }
                        doDelete();
                    });
                self._modalContent.addClass('in-background');
            }
        }

        this._dialog = $(projectsDialogTemplate);

        this._userId = WebGMEGlobal.userInfo._id;
        //get controls
        this._modalContent = this._dialog.find('.modal-content').first();
        this._el = this._dialog.find('.modal-body').first();
        this._table = this._el.find('table').first();
        this._tableHead = this._table.find('thead').first();
        this._tableBody = this._table.find('tbody').first();
        this._modalFooter = this._dialog.find('.modal-footer');

        this._panelButtons = this._modalFooter.find('.panel-buttons');
        this._panelCreateNew = this._modalFooter.find('.panel-create-new').hide();

        this._btnCreateNew = this._panelButtons.find('.btn-create-new');
        this._btnRefresh = this._panelButtons.find('.btn-refresh');

        this._btnNewProjectCancel = this._panelCreateNew.find('.btn-cancel');
        this._btnNewProjectCreate = this._panelCreateNew.find('.btn-save');

        this._txtNewProjectName = this._panelCreateNew.find('.txt-project-name');
        this._ownerIdList = this._panelCreateNew.find('ul.ownerId-list');
        this._selectedOwner = this._panelCreateNew.find('.selected-owner-id');
        this._ownerId = this._userId;
        this._selectedOwner.text(this._ownerId);

        this._ownerIdList.append($('<li><a class="ownerId-selection">' + self._userId + '</a></li>'));

        if (WebGMEGlobal.userInfo.adminOrgs.length > 0) {
            this._ownerIdList.append($('<li role="separator" class="divider"></li>'));
            WebGMEGlobal.userInfo.adminOrgs.forEach(function (orgInfo) {
                self._ownerIdList.append($('<li><a class="ownerId-selection">' + orgInfo._id + '</a></li>'));
            });
        }

        if (WebGMEGlobal.gmeConfig.authentication.enable === true &&
            this._ownerId === WebGMEGlobal.gmeConfig.authentication.guestAccount) {
            extraTabs = [{
                title: 'DEMO',
                active: true,
                data: READ_ONLY_FILTER
            }];

            self._filter = READ_ONLY_FILTER;
        }

        this._loader = new LoaderCircles({containerElement: this._btnRefresh});
        this._loader.setSize(14);

        this._dialog.find('.tabContainer').first().groupedAlphabetTabs({
            onClick: function (filter) {
                self._filter = filter;
                self._updateFilter();
            },
            noMatchText: 'Nothing matched your filter, please click another letter.',
            extraTabs: extraTabs
        });

        //hook up event handlers - SELECT project in the list

        this._tableBody.on('dblclick', 'tr', function (event) {
            selectedId = $(this).data(DATA_PROJECT)._id;

            event.stopPropagation();
            event.preventDefault();

            openProject(selectedId);
        });

        this._tableBody.on('click', 'span.open-link', function (event) {
            selectedId = $(this).data('projectId');

            event.stopPropagation();
            event.preventDefault();
            openProject(selectedId);
        });

        this._tableHead.on('click', 'i.btn-info-toggle', function (event) {
            var elm = $(this),
                show = !self._table.hasClass('info-displayed');
            if (show) {
                self._table.find('.extra-info').removeClass('info-hidden');
                self._table.addClass('info-displayed');
                elm.removeClass('glyphicon-plus');
                elm.addClass('glyphicon-minus');
            } else {
                self._table.find('.extra-info').addClass('info-hidden');
                self._table.removeClass('info-displayed');
                elm.removeClass('glyphicon-minus');
                elm.addClass('glyphicon-plus');
            }
            event.stopPropagation();
            event.preventDefault();
        });

        this._tableHead.on('click', 'th', function (event) {
            var elm = $(this),
                sortedRows,
                type,
                reverse = elm.hasClass('reverse-order');

            event.stopPropagation();
            event.preventDefault();

            if (elm.hasClass('title-owner')) {
                type = 'owner';
            } else if (elm.hasClass('title-name')) {
                type = 'name';
            } else if (elm.hasClass('title-modified')) {
                type = 'modified';
            } else if (elm.hasClass('title-viewed')) {
                type = 'viewed';
            } else if (elm.hasClass('title-created')) {
                type = 'created';
            } else {
                return;
            }

            self._tableHead.find('th').removeClass('reverse-order in-order');
            if (reverse) {
                elm.addClass('in-order');
            } else {
                elm.addClass('reverse-order');
            }

            sortedRows = self._tableBody.children('tr');
            sortedRows.sort(function (a, b) {
                var rowAData = $(a).data(DATA_PROJECT),
                    rowBData = $(b).data(DATA_PROJECT),
                    result = 0;

                if (rowAData[type] > rowBData[type]) {
                    result = 1;
                } else if (rowAData[type] < rowBData[type]) {
                    result = -1;
                }

                if (type === 'modified' || type === 'viewed' || type === 'created') {
                    result = result * (-1);
                }

                if (result === 0) {
                    if (rowAData._id.toUpperCase() > rowBData._id.toUpperCase()) {
                        result = 1;
                    } else {
                        result = -1;
                    }
                }

                return reverse ? result * (-1) : result;
            });

            sortedRows.detach().appendTo(self._tableBody);
        });

        this._tableBody.on('click', 'i.delete-project', function (event) {
            selectedId = $(this).data('projectId');

            event.stopPropagation();
            event.preventDefault();
            deleteProject(selectedId);
        });

        if (WebGMEGlobal.userInfo.canCreate !== true) {
            this._btnCreateNew.hide();
        } else {
            this._btnCreateNew.on('click', function (event) {
                self._txtNewProjectName.val('');
                self._panelButtons.hide();
                self._panelCreateNew.show();
                self._txtNewProjectName.focus();
                self._creatingNew = true;

                event.stopPropagation();
                event.preventDefault();
            });
        }

        this._btnNewProjectCancel.on('click', function (event) {
            self._panelButtons.show();
            self._panelCreateNew.hide();
            self._btnNewProjectCreate.show();
            self._creatingNew = false;
            self._updateFilter();

            event.stopPropagation();
            event.preventDefault();
        });

        this._ownerIdList.on('click', 'a.ownerId-selection', function (/*event*/) {
            var newOwnerId = $(this).text(),
                projectName = self._txtNewProjectName.val(),
                projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(
                    newOwnerId, projectName);
            self._ownerId = newOwnerId;
            self._selectedOwner.text(newOwnerId);

            if (isValidProjectName(projectName, projectId) === false) {
                self._panelCreateNew.addClass('has-error');
                self._btnNewProjectCreate.disable(true);
            } else {
                self._panelCreateNew.removeClass('has-error');
                self._btnNewProjectCreate.disable(false);
            }
        });

        function isValidProjectName(aProjectName, projectId) {
            return REGEXP.PROJECT_NAME.test(aProjectName) && self._projectIds.indexOf(projectId) === -1;
        }

        this._txtNewProjectName.on('keyup', function () {
            var val = self._txtNewProjectName.val(),
                projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(self._ownerId, val);

            if (val.length === 1) {
                self._updateFilter([val.toUpperCase()[0], val.toUpperCase()[0]]);
            } else if (val.length === 0) {
                self._updateFilter();
            }

            if (isValidProjectName(val, projectId) === false) {
                self._panelCreateNew.addClass('has-error');
                self._btnNewProjectCreate.disable(true);
            } else {
                self._panelCreateNew.removeClass('has-error');
                self._btnNewProjectCreate.disable(false);
            }
        });

        this._btnNewProjectCreate.on('click', function (event) {
            doCreateProject();
            event.stopPropagation();
            event.preventDefault();
        });

        this._txtNewProjectName.on('keydown', function (event) {

            var enterPressed = event.which === 13,
                newProjectName = self._txtNewProjectName.val(),
                projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(self._ownerId, newProjectName);

            if (enterPressed && isValidProjectName(newProjectName, projectId)) {
                doCreateProject(self._client);
                event.stopPropagation();
                event.preventDefault();
            }
        });

        this._btnRefresh.on('click', function (event) {
            self._refreshProjectList.call(self);
            event.stopPropagation();
            event.preventDefault();
        });
    };

    ProjectsDialog.prototype._refreshProjectList = function () {
        var self = this,
            params = {
                rights: true,
                info: true
            };

        this._loader.start();
        this._btnRefresh.disable(true);
        this._btnRefresh.find('i').css('opacity', '0');

        this._client.getProjects(params, function (err, projectList) {
            var i,
                newProjectVal;
            self._activeProject = self._client.getActiveProjectId();
            self._projectList = {};
            self._projectIds = [];

            for (i = 0; i < projectList.length; i += 1) {
                self._projectIds.push(projectList[i]._id);
                self._projectList[projectList[i]._id] = projectList[i];
                //self._projectList[p].projectId = p;
            }

            function getProjectUserRightSortValue(projectRights) {
                var val = 0;

                if (projectRights.rights.write === true) {
                    val = 2;
                } else if (projectRights.rights.read === true) {
                    val = 1;
                }

                return val;
            }

            //order:
            //1: read & write
            //2: read only
            //3: no read at all
            self._projectIds.sort(function compare(a, b) {
                var userRightA = getProjectUserRightSortValue(self._projectList[a]),
                    userRightB = getProjectUserRightSortValue(self._projectList[b]),
                    result;

                if (userRightA > userRightB) {
                    result = -1;
                } else if (userRightA < userRightB) {
                    result = 1;
                } else if (userRightA === userRightB) {
                    if (a.toLowerCase() < b.toLowerCase()) {
                        result = -1;
                    } else {
                        result = 1;
                    }
                }

                return result;

            });

            self._updateProjectNameList();

            self._loader.stop();
            self._btnRefresh.find('i').css('opacity', '1');
            self._btnRefresh.disable(false);
            if (self._creatingNew) {
                newProjectVal = self._txtNewProjectName.val();
                if (newProjectVal && newProjectVal.length > 0) {
                    self._updateFilter([newProjectVal.toUpperCase()[0], newProjectVal.toUpperCase()[0]]);
                }
                self._panelButtons.hide();
                self._panelCreateNew.show();

                setTimeout(function () {
                    self._txtNewProjectName.focus();
                }, 500);
            }
        });
    };

    ProjectsDialog.prototype._updateProjectNameList = function () {
        var self = this,
            len = this._projectIds.length,
            i,
            span,
            iconsEl,
            displayProject,
            lastModified,
            lastViewed,
            createdAt,
            projectName,
            owner,
            projectData,
            tblRow;

        this._tableBody.empty();
        this._tableHead.find('th').removeClass('reverse-order in-order');

        function getTitle(projectIdx, type, username, date) {
            var name = StorageUtil.getProjectDisplayedNameFromProjectId(self._projectIds[projectIdx]);

            return name + ' was ' + type + ' by ' + (username || 'N/A') + ' at ' + clientUtil.formattedDate(date);
        }

        if (len > 0) {
            for (i = 0; i < len; i += 1) {
                displayProject = false;

                projectData = this._projectList[this._projectIds[i]];
                projectName = StorageUtil.getProjectNameFromProjectId(this._projectIds[i]);
                owner = StorageUtil.getOwnerFromProjectId(this._projectIds[i]);

                tblRow = TABLE_ROW_BASE.clone();
                // Else time is when the #677 introduced.
                lastViewed = projectData.info.viewedAt ?
                    new Date(projectData.info.viewedAt) : new Date(1447879297957);
                lastModified = projectData.info.modifiedAt ?
                    new Date(projectData.info.modifiedAt) : new Date(1447879297957);
                // createdAt was introduced at #419
                createdAt = projectData.info.createdAt ?
                    new Date(projectData.info.createdAt) : new Date(1431343297957);

                tblRow.data(DATA_PROJECT, {
                    _id: this._projectIds[i],
                    modified: lastModified.getTime(),
                    viewed: lastViewed.getTime(),
                    created: createdAt.getTime(),
                    name: projectName.toUpperCase(),
                    owner: owner.toUpperCase()
                });

                // owner
                $('<td/>').addClass('owner').text(owner).appendTo(tblRow);

                // name
                span = $('<span/>').addClass('open-link').attr('title', 'Open').text(projectName)
                    .data('projectId', this._projectIds[i]);

                $('<td/>').addClass('name').append(span)
                    .append('<span class="name-read-only">[Read-Only]</span>')
                    .appendTo(tblRow);

                // modified
                span = $('<span/>').attr('title', getTitle(i, 'modified', projectData.info.modifier, lastModified))
                    .text(clientUtil.formattedDate(lastModified, 'elapsed'));
                $('<td/>').addClass('modified').append(span).appendTo(tblRow);

                // viewed
                span = $('<span/>').attr('title', getTitle(i, 'viewed', projectData.info.viewer, lastViewed))
                    .text(clientUtil.formattedDate(lastViewed, 'elapsed'));
                $('<td/>').addClass('viewed extra-info info-hidden').append(span).appendTo(tblRow);

                // created
                span = $('<span/>').attr('title', getTitle(i, 'created', projectData.info.creator, createdAt))
                    .text(clientUtil.formattedDate(createdAt, 'elapsed'));
                $('<td/>').addClass('created extra-info info-hidden').append(span).appendTo(tblRow);

                // icons
                iconsEl = $('<td/>').addClass('icons').appendTo(tblRow);

                if (this._projectIds[i] === this._activeProject) {
                    tblRow.addClass('active');
                }

                //check if user has only READ rights for this project
                if (projectData.rights.write !== true) {
                    tblRow.addClass('read-only');
                }

                if (projectData.rights.delete === true) {
                    iconsEl.append(
                        $('<i class="glyphicon glyphicon-trash delete-project extra-info info-hidden"/>')
                            .data('projectId', this._projectIds[i]));
                } else {
                    iconsEl.append('<i class="glyphicon glyphicon-lock locked extra-info info-hidden"/>');
                }

                this._tableBody.append(tblRow);
            }
        } else {
            this._table.addClass('no-children');
        }

        if (this._table.hasClass('info-displayed')) {
            this._table.find('.extra-info').removeClass('info-hidden');
        }

        self._updateFilter();
    };

    ProjectsDialog.prototype._updateFilter = function (filter) {
        var self = this,
            cnt = 0;

        filter = filter || self._filter;

        self._tableBody.children('tr').each(function () {
            var tableRow = $(this),
                firstChar;

            if (filter && filter === READ_ONLY_FILTER) {
                if (tableRow.hasClass('read-only')) {
                    tableRow.removeClass('filtered-out');
                    cnt += 1;
                } else {
                    tableRow.addClass('filtered-out');
                }
            } else if (filter) {
                firstChar = tableRow.data(DATA_PROJECT).name.toUpperCase()[0];
                if (firstChar >= filter[0] && firstChar <= filter[1]) {
                    tableRow.removeClass('filtered-out');
                    cnt += 1;
                } else {
                    tableRow.addClass('filtered-out');
                }
            } else {
                tableRow.removeClass('filtered-out');
                cnt += 1;
            }
        });

        if (cnt === 0) {
            self._table.addClass('no-children');
        } else {
            self._table.removeClass('no-children');
        }
    };

    ProjectsDialog.prototype._createProject = function (projectName,
                                                        type,
                                                        seedName,
                                                        branchName,
                                                        commitHash) {
        var self = this,
            parameters = {
                type: type,
                projectName: projectName,
                seedName: seedName,
                seedBranch: branchName,
                seedCommit: commitHash,
                ownerId: self._ownerId
            },
            loader = new LoaderCircles({containerElement: $('body')});

        function selectNewProject(projectId) {
            self._client.selectProject(projectId, null, function (err) {
                if (err) {
                    self._logger.error('Cannot select project', err);
                } else {
                    self._logger.debug('Selected project');
                    //WebGMEGlobal.State.registerActiveObject(CONSTANTS.PROJECT_ROOT_ID);
                }
                loader.stop();
            });
        }

        // TODO: remove these two lines once the create seed API is implemented and functional
        loader.start();

        if (type === 'duplicate') {
            self._logger.debug('Duplicating project: ', seedName, projectName, self._ownerId);
            self._client.duplicateProject(seedName, projectName, self._ownerId, function (err, projectId) {
                if (err) {
                    self._logger.error('Failed to duplicate project', err);
                    loader.stop();
                } else {
                    self._logger.debug('Duplicated project');
                    selectNewProject(projectId);
                }
            });
        } else if (type === 'package') {
            //TODO check the possibility of using url
            self._logger.debug('Importing package: ');
            self._client.importProjectFromFile(projectName, 'master', seedName,
                self._ownerId, '', function (err, projectId) {
                    if (err) {
                        self._logger.error('Failed to import project package', err);
                        loader.stop();
                    } else {
                        self._logger.debug('Project package imported');
                        selectNewProject(projectId);
                    }
                });
        } else {
            self._logger.debug('Creating new project from seed: ', parameters);
            self._client.seedProject(parameters, function (err, result) {
                if (err) {
                    self._logger.error('Cannot create seed project', err);
                    loader.stop();
                } else {
                    self._logger.debug('Created new project from seed');
                    selectNewProject(result.projectId);
                }
            });
        }
    };

    return ProjectsDialog;
});