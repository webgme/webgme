"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'text!./ProjectPanelTmpl.html',
    'Repository/RepositoryLogControl',
    'Repository/RepositoryLogView',
    './ProjectsView',
    './ProjectsControl'], function (logManager,
                                               util,
                                               commonUtil,
                                               projectPanelTmpl,
                                               RepositoryLogControl,
                                               RepositoryLogView,
                                               ProjectsView,
                                               ProjectsControl) {

    var ProjectPanel;

    ProjectPanel = function (containerElement) {
        this._logger = logManager.create("ProjectPanel_" + containerElement);

        this._el = $("#" + containerElement);

        if (this._el.length === 0) {
            this._logger.warning("ProjectPanel's container control with id:'" + containerElement + "' could not be found");
            return undefined;
        }

        this._initialize();

        this._logger.debug("Created");
    };

    ProjectPanel.prototype._initialize = function () {
        var self = this;

        this._el.append($(projectPanelTmpl));

        this._commitMsgDialog = this._el.find(".commitMsgDialog");

        this._repoHistoryDialog = this._el.find(".repoHistoryDialog");

        this._projectsDialog = this._el.find(".projectsDialog");

        this._el.find('a.btnFullRefresh').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.onFullRefresh();
        });

        this._el.find('a.btnCommit').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._btnCommitClick();
        });

        this._el.find('a.btnRepoHistory').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._btnRepoHistoryClick();
        });

        this._el.find('a.btnProjects').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._btnProjectsClick();
        });
    };

    ProjectPanel.prototype._btnCommitClick = function () {
        var self = this,
            commitSaveButton = this._commitMsgDialog.find("#btnSave"),
            txtMessage = this._commitMsgDialog.find("#txtMessage"),
            txtBranchName = this._commitMsgDialog.find("#txtBranchName"),
            btnGroupBranch = this._commitMsgDialog.find("#btnGroupBranch"),
            client = this.onGetClient(),
            currentBranchName = client.getActualBranch(),
            btnCurrent = btnGroupBranch.find(".btnCurrent"),
            btnNew = btnGroupBranch.find(".btnNew"),
            controlGroupBranch = this._commitMsgDialog.find(".control-group-branch"),
            controlGroupMessage = this._commitMsgDialog.find(".control-group-message"),
            validateControl;

        btnNew.removeClass("active");
        btnCurrent.addClass("active");
        txtBranchName.val(currentBranchName).attr('disabled', 'disabled');

        this._commitMsgDialog.modal();

        btnGroupBranch.on('click', function (event) {
            var selected = $(event.target).attr("data-b");

            if (selected === "current") {
                txtBranchName.val(currentBranchName);
                txtBranchName.attr('disabled', 'disabled');
            } else {
                txtBranchName.val("");
                txtBranchName.removeAttr('disabled');
                txtBranchName.focus();
            }
        });

        txtMessage.on('keyup', function (event) {
            if (txtMessage.val() === "") {
                commitSaveButton.addClass("disabled");
            } else {
                commitSaveButton.removeClass("disabled");
            }
        });

        validateControl = function (ctrl, ctrlGroup) {
            ctrl.on('blur', function (event) {
                if (ctrl.val() === "") {
                    ctrlGroup.addClass("error");
                } else {
                    ctrlGroup.removeClass("error");
                }
            });
        };

        validateControl(txtMessage, controlGroupMessage);
        validateControl(txtBranchName, controlGroupBranch);

        commitSaveButton.bind('click', function (event) {
            var msg = self._commitMsgDialog.find("#txtMessage").val(),
                selectedBranch = btnGroupBranch.find(".active").attr("data-b");

            if (selectedBranch === "current") {
                selectedBranch = currentBranchName;
            } else {
                selectedBranch = txtBranchName.val();
            }

            if (msg !== "" && selectedBranch !== "") {
                txtMessage.val("");
                self._commitMsgDialog.modal('hide');
                commitSaveButton.unbind('click');
                txtMessage.off('keyup');
                event.stopPropagation();
                event.preventDefault();
                self.onCommit({"message": msg,
                    "branch": selectedBranch});
            }
        });

        txtMessage.focus();
    };

    ProjectPanel.prototype._btnRepoHistoryClick = function () {
        var repoHistoryLogView = new RepositoryLogView(this._repoHistoryDialog.find('> .modal-body')),
            client = this.onGetClient(),
            repoHistoryController = new RepositoryLogControl(client, repoHistoryLogView);

        this._repoHistoryDialog.modal();

        repoHistoryController.generateHistory();
    };

    ProjectPanel.prototype._btnProjectsClick = function () {
        var projectsView = new ProjectsView(this._projectsDialog.find('.modal-body')),
            client = this.onGetClient(),
            projectsController = new ProjectsControl(client, projectsView);

        this._projectsDialog.modal();

        projectsController.displayProjects();
    };

    /*********************** PUBLIC API *********************/

    ProjectPanel.prototype.onFullRefresh = function () {
        this._logger.warning("onFullRefresh is not overridden in Controller...");
    };

    ProjectPanel.prototype.onCommit = function (params) {
        this._logger.warning("onCommit is not overridden in Controller...: " + JSON.stringify(params));
    };

    ProjectPanel.prototype.onGetClient = function () {
        this._logger.warning("onGetClient is not overridden in Controller...");
    };

    return ProjectPanel;
});
