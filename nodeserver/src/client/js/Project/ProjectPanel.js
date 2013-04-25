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
            lblBranchName = this._commitMsgDialog.find(".branch"),
            client = this.onGetClient(),
            currentBranchName = client.getActualBranch(),
            controlGroupMessage = this._commitMsgDialog.find(".control-group-message"),
            validateControl,
            enableDisableSaveButton;


        //not on a branch..., cannot make commit
        if (currentBranchName === null || currentBranchName === undefined) {
            //display error info to user
            //and remove all other UI elements
            $(this._commitMsgDialog.find("fieldset")[1]).hide();
            commitSaveButton.hide();
            lblBranchName.hide();

            $(this._commitMsgDialog.find(".alert")).show();
        } else {
            $(this._commitMsgDialog.find("fieldset")[1]).show();
            commitSaveButton.show();
            lblBranchName.show();
            $(this._commitMsgDialog.find(".alert")).hide();

            lblBranchName.text(currentBranchName);

            commitSaveButton.on('click', function (event) {
                var msg = txtMessage.val();

                if (msg !== "" && currentBranchName && currentBranchName !== "") {
                    txtMessage.val("");
                    self._commitMsgDialog.modal('hide');
                    commitSaveButton.off('click');
                    txtMessage.off('keyup');
                    event.stopPropagation();
                    event.preventDefault();
                    self.onCommit({"message": msg,
                        "branch": currentBranchName});
                }
            });

            txtMessage.focus();
        }

        this._commitMsgDialog.modal();

        enableDisableSaveButton = function () {
            var enabled = currentBranchName !== null && currentBranchName !== undefined && txtMessage.val() !== "";

            if (!enabled) {
                commitSaveButton.addClass("disabled");
            } else {
                commitSaveButton.removeClass("disabled");
            }
        };

        txtMessage.on('keyup', function (event) {
            enableDisableSaveButton();
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


    };

    ProjectPanel.prototype._btnRepoHistoryClick = function () {
        var repoHistoryLogView,
            client = this.onGetClient(),
            repoHistoryController,
            modalBody = this._repoHistoryDialog.find('> .modal-body'),
            self = this;

        this._repoHistoryDialog.on('shown', function (event) {
            repoHistoryLogView = new RepositoryLogView(modalBody);
            repoHistoryController = new RepositoryLogControl(client, repoHistoryLogView);
            repoHistoryLogView.loadMoreCommits();
        });

        this._repoHistoryDialog.on('hidden', function (event) {
            self._repoHistoryDialog.off('shown');
            self._repoHistoryDialog.off('hidden');
            self._repoHistoryDialog.off('hide');

            self._repoHistoryDialog.css({"display": "",
                "width": "",
                "margin-left": "",
                "margin-top": "",
                "top": ""});
        });

        this._repoHistoryDialog.on('hide', function (event) {
            repoHistoryLogView.destroy();
        });

        this._repoHistoryDialog.modal();
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
