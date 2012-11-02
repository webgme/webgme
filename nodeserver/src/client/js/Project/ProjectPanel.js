"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'text!./ProjectPanelTmpl.html',
    'Repository/RepositoryLogControl',
    'Repository/RepositoryLogView'], function (logManager,
                                               util,
                                               commonUtil,
                                               projectPanelTmpl,
                                               RepositoryLogControl,
                                               RepositoryLogView) {

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
    };

    ProjectPanel.prototype._btnCommitClick = function () {
        var self = this,
            commitSaveButton = this._commitMsgDialog.find("#btnSave"),
            txtMessage = this._commitMsgDialog.find("#txtMessage");

        this._commitMsgDialog.modal();

        txtMessage.on('keyup', function (event) {
            if (txtMessage.val() === "") {
                commitSaveButton.addClass("disabled");
            } else {
                commitSaveButton.removeClass("disabled");
            }
        });

        commitSaveButton.bind('click', function (event) {
            var msg = self._commitMsgDialog.find("#txtMessage").val();

            if (msg !== "") {
                txtMessage.val("");
                self._commitMsgDialog.modal('hide');
                commitSaveButton.unbind('click');
                txtMessage.off('keyup');
                event.stopPropagation();
                event.preventDefault();
                self.onCommit(msg);
            }
        });

        txtMessage.focus();
    };

    ProjectPanel.prototype._btnRepoHistoryClick = function () {
        var repoHistoryLogView = new RepositoryLogView(this._repoHistoryDialog.find('.modal-body')),
            client = this.onGetClient(),
            repoHistoryController = new RepositoryLogControl(client, repoHistoryLogView);

        this._repoHistoryDialog.modal();

        repoHistoryController.generateHistory();
    };

    /*********************** PUBLIC API *********************/

    ProjectPanel.prototype.onFullRefresh = function () {
        this._logger.warning("onFullRefresh is not overridden in Controller...");
    };

    ProjectPanel.prototype.onCommit = function (msg) {
        this._logger.warning("onCommit is not overridden in Controller...");
    };

    ProjectPanel.prototype.onGetClient = function () {
        this._logger.warning("onGetClient is not overridden in Controller...");
    };

    return ProjectPanel;
});
