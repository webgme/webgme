"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'text!./ProjectPanelTmpl.html'], function (logManager,
                                               util,
                                               commonUtil,
                                               projectPanelTmpl) {

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

    /*********************** PUBLIC API *********************/

    ProjectPanel.prototype.onFullRefresh = function () {
        this._logger.warning("onFullRefresh is not overridden in Controller...");
    };

    ProjectPanel.prototype.onCommit = function (msg) {
        this._logger.warning("onCommit is not overridden in Controller...");
    };

    return ProjectPanel;
});
