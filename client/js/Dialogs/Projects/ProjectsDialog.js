"use strict";

define(['logManager',
        'loaderCircles',
        'js/Utils/GMEConcepts',
        'js/Dialogs/Import/ImportDialog',
        'text!html/Dialogs/Projects/ProjectsDialog.html',
        'css!/css/Dialogs/Projects/ProjectsDialog'], function (logManager,
                                                               LoaderCircles,
                                                               GMEConcepts,
                                                               ImportDialog,
                                                               projectsDialogTemplate) {

    var ProjectsDialog,
        DATA_PROJECT_NAME = "PROJECT_NAME";

    ProjectsDialog = function (client) {
        this._logger = logManager.create("ProjectsDialog");

        this._client = client;
        this._projectNames = [];
        this._projectList = {};
        this._filter = undefined;

        this._logger.debug("Created");
    };

    ProjectsDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.modal('show');

        this._dialog.on('hidden', function () {
            self._loader.destroy();
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._refreshProjectList();
    };

    ProjectsDialog.prototype._initDialog = function () {
        var self = this,
            selectedId;

        var openProject = function (projId) {
            if (self._projectList[projId].read === true) {
                self._client.selectProjectAsync(projId,function(){
                    self._dialog.modal('hide');
                });
            }
        };

        var doCreateProject = function () {
            var val = self._txtNewProjectName.val();

            if (val !== "" && self._projectNames.indexOf(val) === -1) {
                self._btnNewProjectCreate.addClass("disabled");
                self._createNewProject(val);
            }
        };

        var deleteProject = function (projId) {
            if (self._projectList[projId].delete === true) {
                self._client.deleteProjectAsync(selectedId,function(){
                    self._refreshProjectList();
                });
            }
        };

        var doCreateProjectFromFile = function () {
            var val = self._txtNewProjectName.val();

            if (val !== "" && self._projectNames.indexOf(val) === -1) {
                self._btnNewProjectImport.addClass("disabled");
                self._dialog.modal('hide');
                var d = new ImportDialog();
                d.show(function (fileContent) {
                    self._createProjectFromFile(val, fileContent);
                });
            }
        };

        this._dialog = $(projectsDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._ul = this._el.find('ul').first();

        this._panelPuttons = this._dialog.find(".panel-buttons");
        this._panelCreateNew = this._dialog.find(".panel-create-new");

        this._btnOpen = this._dialog.find(".btn-open");
        this._btnDelete = this._dialog.find(".btn-delete");
        this._btnCreateNew = this._dialog.find(".btn-create-new");
        this._btnCreateFromFile = this._dialog.find(".btn-import-file");
        this._btnRefresh = this._dialog.find(".btn-refresh");
        
        this._btnNewProjectCancel = this._dialog.find(".btn-cancel");
        this._btnNewProjectCreate = this._dialog.find(".btn-save");
        this._btnNewProjectImport = this._dialog.find(".btn-import");

        this._txtNewProjectName = this._dialog.find(".txt-project-name");

        this._loader = new LoaderCircles({"containerElement": this._btnRefresh });
        this._loader.setSize(14);

        this._dialog.find('.tabContainer').first().groupedAlphabetTabs({'onClick': function (filter) {
            self._filter = filter;
            self._updateProjectNameList();
        }});

        //hook up event handlers - SELECT project in the list
        this._ul.on("click", "li:not(.disabled)", function (event) {
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
        this._ul.on("dblclick", "li:not(.disabled)", function (event) {
            selectedId = $(this).data(DATA_PROJECT_NAME);

            event.stopPropagation();
            event.preventDefault();

            openProject(selectedId);
        });

        this._btnOpen.on('click', function (event) {
            self._btnOpen.addClass("disabled");
            self._btnDelete.addClass("disabled");

            event.stopPropagation();
            event.preventDefault();

            openProject(selectedId);
        });

        this._btnDelete.on('click', function (event) {
            self._btnOpen.addClass("disabled");
            self._btnDelete.addClass("disabled");

            deleteProject(selectedId);

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnCreateNew.on('click', function (event) {
            self._txtNewProjectName.val('');
            self._panelPuttons.hide();
            self._panelCreateNew.show();
            self._txtNewProjectName.focus();
            self._btnNewProjectImport.hide();

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnNewProjectCancel.on('click', function (event) {
            self._panelPuttons.show();
            self._panelCreateNew.hide();
            self._btnNewProjectCreate.show();
            self._btnNewProjectImport.show();

            self._filter = self._dialog.find('.tabContainer li.active').data('filter');
            self._updateProjectNameList();

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnCreateFromFile.on('click', function (event) {
            self._txtNewProjectName.val('');
            self._panelPuttons.hide();
            self._panelCreateNew.show();
            self._txtNewProjectName.focus();
            self._btnNewProjectCreate.hide();

            event.stopPropagation();
            event.preventDefault();
        });

        this._txtNewProjectName.on('keyup', function () {
            var val = self._txtNewProjectName.val(),
                re = /^[0-9a-z_]+$/gi;

            if (val.length === 1) {
                self._filter = [val.toUpperCase(), val.toUpperCase()];
                self._updateProjectNameList();
            }

            if (!re.test(val) || self._projectNames.indexOf(val) !== -1) {
                self._panelCreateNew.addClass("error");
                self._btnNewProjectCreate.addClass("disabled");
                self._btnNewProjectImport.addClass("disabled");
            } else {
                self._panelCreateNew.removeClass("error");
                self._btnNewProjectCreate.removeClass("disabled");
                self._btnNewProjectImport.removeClass("disabled");
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
            // [enter]
            if (event.which === 13) {
                //create project
                doCreateProject();
                event.preventDefault();
                event.stopPropagation();
            }
        });


        this._btnRefresh.on('click', function (event) {
            self._refreshProjectList();

            event.stopPropagation();
            event.preventDefault();
        });
    };

    ProjectsDialog.prototype._refreshProjectList = function () {
        var self = this;

        this._loader.start();
        this._btnRefresh.addClass('disabled');
        this._btnRefresh.find('i').css('opacity', '0');

        this._client.getFullProjectListAsync(function(err,projectList){
            var p;
            self._activeProject = self._client.getActiveProject();
            self._projectList = {};
            self._projectNames = [];

            for (p in projectList) {
                if (projectList.hasOwnProperty(p)) {
                    self._projectNames.push(p);
                    self._projectList[p] = projectList[p];
                }
            }

            self._projectNames.sort(function compare(a, b) {
                //same read access right, sort by name
                if (self._projectList[a].read === self._projectList[b].read) {
                    if (a.toLowerCase() < b.toLowerCase())
                        return -1;
                    if (a.toLowerCase() > b.toLowerCase())
                        return 1;

                    // a must be equal to b
                    return 0;
                } else {
                    //different read access right
                    //read-ony goes later in the order
                    if (self._projectList[a].read === true) {
                        return -1;
                    } else {
                        return 1;
                    }
                }
            });

            self._updateProjectNameList();

            self._loader.stop();
            self._btnRefresh.find('i').css('opacity', '1');
            self._btnRefresh.removeClass('disabled');
        });
    };

    ProjectsDialog.prototype._showButtons = function (enabled, projectId) {
        if (enabled === true) {
            //btnOpen
            if (this._projectList[projectId].read === true) {
                this._btnOpen.show();
                this._btnOpen.removeClass('disabled');
            } else {
                this._btnOpen.hide();
                this._btnOpen.addClass('disabled');
            }

            //btnDelete
            if (this._projectList[projectId].delete === true) {
                this._btnDelete.show();
                this._btnDelete.removeClass('disabled');
            } else {
                this._btnDelete.hide();
                this._btnDelete.addClass('disabled');
            }
        } else {
            this._btnOpen.hide();
            this._btnOpen.addClass('disabled');
            this._btnDelete.hide();
            this._btnDelete.addClass('disabled');
        }

    };

    ProjectsDialog.prototype._createNewProject = function (projectName) {
        var _client = this._client,
            _dialog = this._dialog,
            _logger = this._logger;

        _client.createProjectAsync(projectName,function (err) {
            if (!err) {
                _client.selectProjectAsync(projectName, function (err) {
                    if (!err) {
                        GMEConcepts.createBasicProjectSeed();
                        _dialog.modal('hide');
                    } else {
                        _logger.error('CAN NOT OPEN NEW PROJECT: ' + err.stack);
                    }
                });
            } else {
                _logger.error('CAN NOT CREATE NEW PROJECT: ' + err.stack);
            }
        });
    };

    ProjectsDialog.prototype._updateProjectNameList = function () {
        var len = this._projectNames.length,
            i,
            li,
            displayProject;

        this._ul.empty();

        for (i = 0; i < len ; i += 1) {
            displayProject = false;
            if (this._filter !== undefined) {
                displayProject = (this._projectNames[i].toUpperCase()[0] >= this._filter[0] &&
                    this._projectNames[i].toUpperCase()[0] <= this._filter[1]);
            } else {
                displayProject = true;
            }

            if (displayProject) {
                li = $('<li class="center pointer"><a class="btn-env">' + this._projectNames[i] + '</a>');
                li.data(DATA_PROJECT_NAME, this._projectNames[i]);

                if (this._projectNames[i] === this._activeProject) {
                    li.addClass('active');
                }

                //check to see if the user has READ access to this project
                if (this._projectList[this._projectNames[i]].read !== true) {
                    li.addClass('disabled');
                }

                this._ul.append(li);
            }
        }

        this._showButtons(false);
    };

    ProjectsDialog.prototype._createProjectFromFile = function (projectName, jsonContent) {
        var _client = this._client,
            _logger = this._logger;

        _client.createProjectFromFileAsync(projectName, jsonContent, function (err) {
            if (!err) {
                _logger.debug('CREATE NEW PROJECT FROM FILE FINISHED SUCCESSFULLY');
            } else {
                _logger.error('CAN NOT CREATE NEW PROJECT FROM FILE: ' + err.message);
            }
        });
    };

    return ProjectsDialog;
});