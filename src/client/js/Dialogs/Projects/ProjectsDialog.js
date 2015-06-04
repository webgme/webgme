/*globals define, angular, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define([
    'angular',
    'js/logger',
    'js/Loader/LoaderCircles',
    'js/Utils/GMEConcepts',
    'js/Dialogs/Import/ImportDialog',
    'js/Dialogs/CreateFromSeed/CreateFromSeedDialog',
    'text!./templates/ProjectsDialog.html',

    'isis-ui-components/simpleDialog/simpleDialog',
    'text!js/Dialogs/Projects/templates/DeleteDialogTemplate.html',

    'css!./styles/ProjectsDialog.css'

], function (ng, Logger, LoaderCircles, GMEConcepts, ImportDialog, CreateFromSeedDialog,
             projectsDialogTemplate, ConfirmDialog, DeleteDialogTemplate) {

    'use strict';

    var ProjectsDialog,
        DATA_PROJECT_NAME = 'PROJECT_NAME',
        CREATE_TYPE_EMPTY = 'create_empty',
        CREATE_TYPE_IMPORT = 'create_import',
        LI_BASE = $('<li class="center pointer"><a class="btn-env"></a>'),
        READ_ONLY_BASE = $('<span class="ro">[READ-ONLY]</span>'),
        ngConfirmDialog,
        rootScope;


    angular.module('gme.ui.projectsDialog', ['isis.ui.simpleDialog']).run(function ($simpleDialog, $templateCache,
                                                                                    $rootScope) {
        ngConfirmDialog = $simpleDialog;

        $templateCache.put('DeleteDialogTemplate.html', DeleteDialogTemplate);

        rootScope = $rootScope;

    });

    ProjectsDialog = function (client) {
        this._logger = Logger.create('gme:Dialogs:Projects:ProjectsDialog', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._projectNames = [];
        this._projectList = {};
        this._filter = undefined;

        this._logger.debug('Created');
    };

    ProjectsDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.modal('show');

        this._dialog.on('hidden.bs.model', function () {
            self._loader.destroy();
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._refreshProjectList();
    };

    ProjectsDialog.prototype._initDialog = function () {
        var self = this,
            selectedId,
            createType;

        function openProject(projectId) {
            if (self._projectList[projectId].read === true) {
                self._client.selectProject(projectId, function () {
                    self._dialog.modal('hide');
                });
            }
        }

        function doCreateProject(/*client*/) {
            var val = self._txtNewProjectName.val(),
                d;

            if (val !== '' && self._projectNames.indexOf(val) === -1) {
                self._btnNewProjectImport.disable(true);
                self._dialog.modal('hide');
                d = new CreateFromSeedDialog(self._client, self._logger.fork('CreateFromSeedDialog'));
                d.show(function (seedType, seedName, seedBranchName, seedCommitHash) {
                    if (seedType && seedName) {
                        self._createProjectFromSeed(val, seedType, seedName, seedBranchName, seedCommitHash);
                    } else {
                        self._dialog.modal('show');
                    }

                });
            }
        }

        function deleteProject(projectId) {

            var refreshList = function () {
                    self._refreshProjectList.call(self);
                },
                refreshPage = function () {
                    document.location.href = window.location.href.split('?')[0];
                },

                deleteProjectModal,
                myScope = rootScope.$new(true);


            if (self._projectList[projectId].delete === true) {
                myScope.thingName = 'project "' + projectId + '"';

                deleteProjectModal = ngConfirmDialog.open({
                    dialogTitle: 'Confirm delete',
                    dialogContentTemplate: 'DeleteDialogTemplate.html',
                    onOk: function () {
                        self._client.deleteProjectAsync(projectId, function (err) {
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
                    scope: myScope
                });

                self._dialog.modal('hide');

                deleteProjectModal.result.then(function () {
                    self._dialog.modal('show');
                }, function () {
                    self._dialog.modal('show');
                });


            }
        }

        function doCreateProjectFromFile() {
            var val = self._txtNewProjectName.val(),
                d;

            if (val !== '' && self._projectNames.indexOf(val) === -1) {
                self._btnNewProjectImport.disable(true);
                self._dialog.modal('hide');
                d = new ImportDialog();
                d.show(function (fileContent) {
                    self._createProjectFromFile(val, fileContent);
                });
            }
        }

        this._dialog = $(projectsDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._ul = this._el.find('ul').first();

        this._panelButtons = this._dialog.find('.panel-buttons');
        this._panelCreateNew = this._dialog.find('.panel-create-new').hide();

        this._btnOpen = this._dialog.find('.btn-open');
        this._btnDelete = this._dialog.find('.btn-delete');
        this._btnCreateNew = this._dialog.find('.btn-create-new');
        this._btnCreateFromFile = this._dialog.find('.btn-import-file');
        this._btnRefresh = this._dialog.find('.btn-refresh');

        this._btnNewProjectCancel = this._dialog.find('.btn-cancel');
        this._btnNewProjectCreate = this._dialog.find('.btn-save');
        this._btnNewProjectImport = this._dialog.find('.btn-import');

        this._txtNewProjectName = this._dialog.find('.txt-project-name');

        this._loader = new LoaderCircles({containerElement: this._btnRefresh});
        this._loader.setSize(14);

        this._dialog.find('.tabContainer').first().groupedAlphabetTabs({
            onClick: function (filter) {
                self._filter = filter;
                self._updateProjectNameList();
            },
            noMatchText: 'Nothing matched your filter, please click another letter.'
        });

        //hook up event handlers - SELECT project in the list
        this._ul.on('click', 'li:not(.disabled)', function (event) {
            selectedId = $(this).data(DATA_PROJECT_NAME);

            event.stopPropagation();
            event.preventDefault();

            if (self._projectList[selectedId].read === true) {
                self._ul.find('.active').removeClass('active');
                $(this).addClass('active');

                if (selectedId === self._activeProject) {
                    self._showButtons(false, selectedId);
                } else {
                    self._showButtons(true, selectedId);
                }
            }
        });

        //open on double click
        this._ul.on('dblclick', 'li:not(.disabled)', function (event) {
            selectedId = $(this).data(DATA_PROJECT_NAME);

            event.stopPropagation();
            event.preventDefault();

            openProject(selectedId);
        });

        this._btnOpen.on('click', function (event) {
            self._btnOpen.disable(true);
            self._btnDelete.disable(true);

            event.stopPropagation();
            event.preventDefault();

            openProject(selectedId);
        });

        this._btnDelete.on('click', function (event) {
            self._btnOpen.disable(true);
            self._btnDelete.disable(true);

            deleteProject(selectedId);

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnCreateNew.on('click', function (event) {
            createType = CREATE_TYPE_EMPTY;
            self._txtNewProjectName.val('');
            self._panelButtons.hide();
            self._panelCreateNew.show();
            self._txtNewProjectName.focus();
            self._btnNewProjectImport.hide();

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnNewProjectCancel.on('click', function (event) {
            createType = undefined;
            self._panelButtons.show();
            self._panelCreateNew.hide();
            self._btnNewProjectCreate.show();
            self._btnNewProjectImport.show();

            self._filter = self._dialog.find('.tabContainer li.active').data('filter');
            self._updateProjectNameList();

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnCreateFromFile.on('click', function (event) {
            createType = CREATE_TYPE_IMPORT;
            self._txtNewProjectName.val('');
            self._panelButtons.hide();
            self._panelCreateNew.show();
            self._txtNewProjectName.focus();
            self._btnNewProjectCreate.hide();

            event.stopPropagation();
            event.preventDefault();
        });


        function isValidProjectName(aProjectName) {
            var re = /^[0-9a-z_]+$/gi;

            return (
            re.test(aProjectName) &&
            self._projectNames.indexOf(aProjectName) === -1
            );
        }

        this._txtNewProjectName.on('keyup', function () {
            var val = self._txtNewProjectName.val();

            if (val.length === 1) {
                self._filter = [val.toUpperCase(), val.toUpperCase()];
                self._updateProjectNameList();
            }

            if (isValidProjectName(val) === false) {
                self._panelCreateNew.addClass('has-error');
                self._btnNewProjectCreate.disable(true);
                self._btnNewProjectImport.disable(true);
            } else {
                self._panelCreateNew.removeClass('has-error');
                self._btnNewProjectCreate.disable(false);
                self._btnNewProjectImport.disable(false);
            }
        });

        this._btnNewProjectCreate.on('click', function (event) {
            doCreateProject();
            event.stopPropagation();
            event.preventDefault();
        });

        this._btnNewProjectImport.on('click', function (event) {
            doCreateProjectFromFile();
            event.stopPropagation();
            event.preventDefault();
        });

        this._txtNewProjectName.on('keydown', function (event) {

            var enterPressed = event.which === 13,
                newProjectName = self._txtNewProjectName.val();

            if (enterPressed && isValidProjectName(newProjectName)) {
                if (createType === CREATE_TYPE_EMPTY) {
                    doCreateProject(self._client);
                } else if (createType === CREATE_TYPE_IMPORT) {
                    doCreateProjectFromFile();
                }
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
        var self = this;

        this._loader.start();
        this._btnRefresh.disable(true);
        this._btnRefresh.find('i').css('opacity', '0');

        this._client.getProjects(function (err, projectList) {
            var i;
            self._activeProject = self._client.getActiveProjectName();
            self._projectList = {};
            self._projectNames = [];

            for (i = 0; i < projectList.length; i += 1) {
                self._projectNames.push(projectList[i].name);
                self._projectList[projectList[i].name] = projectList[i];
                //self._projectList[p].projectId = p;
            }

            function getProjectUserRightSortValue(projectRights) {
                var val = 0;

                if (projectRights.write === true) {
                    val = 2;
                } else if (projectRights.read === true) {
                    val = 1;
                }

                return val;
            }

            //order:
            //1: read & write
            //2: read only
            //3: no read at all
            self._projectNames.sort(function compare(a, b) {
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
        });
    };

    ProjectsDialog.prototype._showButtons = function (enabled, projectId) {

        if (enabled === true) {
            //btnOpen
            if (this._projectList[projectId].read === true) {
                this._btnOpen.show();
                this._btnOpen.disable(false);
            } else {
                this._btnOpen.hide();
                this._btnOpen.disable(true);
            }

            //btnDelete
            if (this._projectList[projectId].delete === true) {
                this._btnDelete.show();
                this._btnDelete.disable(false);
            } else {
                this._btnDelete.hide();
                this._btnDelete.disable(true);
            }
        } else {
            this._btnOpen.hide();
            this._btnOpen.disable(true);
            this._btnDelete.hide();
            this._btnDelete.disable(true);
        }

    };

    ProjectsDialog.prototype._updateProjectNameList = function () {
        var len = this._projectNames.length,
            i,
            li,
            displayProject,
            count = 0,
            emptyLi = $('<li class="center"><i>No projects in this group...</i></li>');

        this._ul.empty();

        if (len > 0) {
            for (i = 0; i < len; i += 1) {
                displayProject = false;
                if (this._filter === undefined) {
                    displayProject = true;
                } else {
                    displayProject = (this._projectNames[i].toUpperCase()[0] >= this._filter[0] &&
                                      this._projectNames[i].toUpperCase()[0] <= this._filter[1]);
                }

                if (displayProject) {
                    li = LI_BASE.clone();
                    li.find('a').text(this._projectNames[i]);
                    li.data(DATA_PROJECT_NAME, this._projectNames[i]);

                    if (this._projectNames[i] === this._activeProject) {
                        li.addClass('active');
                    }

                    //check to see if the user has READ access to this project
                    if (this._projectList[this._projectNames[i]].read !== true) {
                        li.disable(true);
                    } else {
                        //check if user has only READ rights for this project
                        if (this._projectList[this._projectNames[i]].write !== true) {
                            li.find('a.btn-env').append(READ_ONLY_BASE.clone());
                        }
                    }

                    this._ul.append(li);

                    count++;
                }
            }
        }

        if (count === 0) {
            this._ul.append(emptyLi.clone());
        }

        this._showButtons(false, null);
    };

    ProjectsDialog.prototype._createProjectFromFile = function (projectName, jsonContent) {
        var self = this,
            loader = new LoaderCircles({containerElement: $('body')});

        loader.start();

        self._client.createProjectFromFileAsync(projectName, jsonContent, function (err) {
            if (err) {
                self._logger.error('CANNOT CREATE NEW PROJECT FROM FILE: ' + err.message);
            } else {
                self._logger.debug('CREATE NEW PROJECT FROM FILE FINISHED SUCCESSFULLY');
            }
            loader.stop();
        });
    };

    ProjectsDialog.prototype._createProjectFromSeed = function (projectName, type, seedName, branchName, commitHash) {
        var self = this,
            parameters = {
                type: type,
                projectName: projectName,
                seedName: seedName,
                seedBranch: branchName,
                seedCommit: commitHash
            },
            loader = new LoaderCircles({containerElement: $('body')});


        self._logger.debug('Creating new project from seed: ', parameters);

        // TODO: remove these two lines once the create seed API is implemented and functional
        loader.start();

        self._client.seedProject(parameters, function (err) {
            if (err) {
                self._logger.error('Cannot create seed project', err);
                loader.stop();
            } else {
                self._logger.debug('Created new project from seed');
                self._client.selectProject(projectName, function (err) {
                    if (err) {
                        self._logger.error('Cannot select project', err);
                    } else {
                        self._logger.debug('Selected project');
                    }
                    loader.stop();
                });
            }
        });
    };

    return ProjectsDialog;
});