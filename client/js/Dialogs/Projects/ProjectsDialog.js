"use strict";

define(['logManager',
        'js/Utils/GMEConcepts',
        'text!html/Dialogs/Projects/ProjectsDialog.html',
        'css!/css/Dialogs/Projects/ProjectsDialog'], function (logManager,
                                                                     GMEConcepts,
                                                               projectsDialogTemplate) {

    var ProjectsDialog;

    ProjectsDialog = function (client) {
        this._logger = logManager.create("ProjectsDialog");

        this._client = client;
        this._projectNames = [];
        this._filter = undefined;

        this._logger.debug("Created");
    };

    ProjectsDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.modal('show');

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._refreshProjectList();
    };

    ProjectsDialog.prototype._initDialog = function () {
        var self = this,
            selectedId;

        this._dialog = $(projectsDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._ul = this._el.find('ul').first();

        this._panelPuttons = this._dialog.find(".panel-buttons");
        this._panelCreateNew = this._dialog.find(".panel-create-new");

        this._btnOpen = this._dialog.find(".btn-open");
        this._btnDelete = this._dialog.find(".btn-delete");
        this._btnCreateNew = this._dialog.find(".btn-create-new");

        this._btnNewProjectCancel = this._dialog.find(".btn-cancel");
        this._btnNewProjectCreate = this._dialog.find(".btn-save");

        this._txtNewProjectName = this._dialog.find(".txt-project-name");

        this._el.find('.tabContainer').first().groupedAlphabetTabs({'onClick': function (filter) {
            self._filter = filter;
            self._updateProjectNameList();
        }});

        //hook up event handlers
        this._ul.on("click", "a", function (event) {
            selectedId = $(this).attr("data-id");

            event.stopPropagation();
            event.preventDefault();

            self._ul.find('a[class="btn-env"]').parent().removeClass('active');
            self._ul.find('a[class="btn-env"][data-id="' + selectedId + '"]').parent().addClass('active');

            if (selectedId === self._activeProject) {
                self._showButtons(false);
            } else {
                self._showButtons(true);
            }
        });

        var openProject = function (projId) {
            self._client.selectProjectAsync(projId,function(){
                self._dialog.modal('hide');
            });
        };

        this._ul.on("dblclick", "a", function (event) {
            selectedId = $(this).attr("data-id");

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

            self._client.deleteProjectAsync(selectedId,function(){
                self._refreshProjectList();
            });

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnCreateNew.on('click', function (event) {
            self._txtNewProjectName.val('');
            self._panelPuttons.hide();
            self._panelCreateNew.show();
            self._txtNewProjectName.focus();

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnNewProjectCancel.on('click', function (event) {
            self._panelPuttons.show();
            self._panelCreateNew.hide();

            self._filter = self._el.find('.tabContainer li.active').data('filter');
            self._updateProjectNameList();

            event.stopPropagation();
            event.preventDefault();
        });

        this._txtNewProjectName.on('keyup', function () {
            var val = self._txtNewProjectName.val();

            if (val === "" || self._projectNames.indexOf(val) !== -1) {
                self._panelCreateNew.addClass("error");
                self._btnNewProjectCreate.addClass("disabled");
            } else {
                self._panelCreateNew.removeClass("error");
                self._btnNewProjectCreate.removeClass("disabled");

                if (val.length === 1) {
                    self._filter = [val.toUpperCase(), val.toUpperCase()];
                    self._updateProjectNameList();
                }
            }
        });

        var doCreateProject = function () {
            var val = self._txtNewProjectName.val();

            if (val !== "" && self._projectNames.indexOf(val) === -1) {
                self._btnNewProjectCreate.addClass("disabled");
                self._createNewProject(val);
            }
        };

        this._btnNewProjectCreate.on('click', function (event) {
            doCreateProject();
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
    };

    ProjectsDialog.prototype._refreshProjectList = function () {
        var self = this;

        this._client.getAvailableProjectsAsync(function(err,projectNames){
            self._activeProject = self._client.getActiveProject();
            self._projectNames = projectNames || [];
            self._projectNames.sort(function compare(a, b) {
                if (a.toLowerCase() < b.toLowerCase())
                    return -1;
                if (a.toLowerCase() > b.toLowerCase())
                    return 1;

                // a must be equal to b
                return 0;
            });

            self._updateProjectNameList();
        });
    };

    ProjectsDialog.prototype._showButtons = function (enabled) {
        var showMethod = enabled === true ? "show" : "hide",
            enableClass = enabled === true ? "removeClass" : "addClass",
            btnList = [this._btnOpen, this._btnDelete],
            len = btnList.length;

        while (len--) {
            btnList[len][showMethod]();
            btnList[len][enableClass]('disabled');
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
                        _logger.error('CAN NOT OPEN NEW PROJECT: ' + JSON.stringify(err));
                    }
                });
            } else {
                _logger.error('CAN NOT CREATE NEW PROJECT: ' + JSON.stringify(err));
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
                li = $('<li class="center pointer"><a class="btn-env" data-id="' + this._projectNames[i] + '">' + this._projectNames[i] + '</a>');

                if (this._projectNames[i] === this._activeProject) {
                    li.addClass('active');
                }

                this._ul.append(li);
            }
        }

        this._showButtons(false);
    };

    return ProjectsDialog;
});