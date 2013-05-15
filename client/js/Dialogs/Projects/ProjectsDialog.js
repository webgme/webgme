"use strict";

define(['logManager',
        'text!html/Dialogs/Projects/ProjectsDialog.html'], function (logManager,
                                                               projectsDialogTemplate) {

    var ProjectsDialog;

    ProjectsDialog = function (client) {
        this._logger = logManager.create("ProjectsDialog");

        this._client = client;
        this._projectNames = [];

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

        this._btnOpen.on('click', function (event) {
            self._btnOpen.addClass("disabled");
            self._btnDelete.addClass("disabled");

            self._client.selectProjectAsync(selectedId,function(){
                self._refreshProjectList();
            });

            event.stopPropagation();
            event.preventDefault();
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
            }
        });

        this._btnNewProjectCreate.on('click', function (event) {
            var val = self._txtNewProjectName.val();

            if (val !== "" && self._projectNames.indexOf(val) === -1) {
                self._btnNewProjectCreate.addClass("disabled");

                self._client.createProjectAsync(val,function(){
                    self._refreshProjectList();
                    self._panelPuttons.show();
                    self._panelCreateNew.hide();
                });
            }

            event.stopPropagation();
            event.preventDefault();
        });
    };

    ProjectsDialog.prototype._refreshProjectList = function () {
        var self = this;

        this._client.getAvailableProjectsAsync(function(err,projectNames){
            var len,
                i,
                li;

            self._activeProject = self._client.getActiveProject();
            self._projectNames = projectNames || [];
            self._projectNames.sort();

            len = self._projectNames.length;

            self._ul.empty();

            for (i = 0; i < len ; i += 1) {
                li = $('<li class="center pointer"><a class="btn-env" data-id="' + self._projectNames[i] + '">' + self._projectNames[i] + '</a>');

                if (self._projectNames[i] === self._activeProject) {
                    li.addClass('active');
                }

                self._ul.append(li);
            }

            self._showButtons(false);
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

    return ProjectsDialog;
});