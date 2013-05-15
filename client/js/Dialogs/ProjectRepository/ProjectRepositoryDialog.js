"use strict";

define(['logManager',
    'text!html/Dialogs/ProjectRepository/ProjectRepositoryDialog.html',
    'js/Widgets/ProjectRepository/ProjectRepositoryWidget'], function (logManager,
                                                 projectRepositoryDialogTemplate,
                                                 ProjectRepositoryWidget) {

    var ProjectRepositoryDialog;

    ProjectRepositoryDialog = function (client) {
        this._logger = logManager.create("ProjectRepositoryDialog");

        this._client = client;

        this._logger.debug("Created");
    };

    ProjectRepositoryDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.modal('show');

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    ProjectRepositoryDialog.prototype._initDialog = function () {
        var projectRepositoryWidget,
            modalBody,
            client = this._client,
            self = this,
            WINDOW_PADDING = 20,
            wH = $(window).height(),
            wW = $(window).width();

        this._dialog = $(projectRepositoryDialogTemplate);

        modalBody = this._dialog.find('.modal-body');
        projectRepositoryWidget = new ProjectRepositoryWidget(modalBody, client,
                                {'commit_count': 100});

        this._dialog.on('shown', function () {
            var dialogHeaderH = self._dialog.find('.modal-header').outerHeight(true),
                dialogFooterH = self._dialog.find('.modal-footer').outerHeight(true),
                modalBodyVPadding = parseInt(modalBody.css('padding-top'), 10) + parseInt(modalBody.css('padding-bottom'), 10),
                dW,
                dH;

            //make it almost full screen
            dW = wW - 2 * WINDOW_PADDING;
            dH = wH - 2 * WINDOW_PADDING;

            self._dialog.removeClass("fade");

            modalBody.css({"max-height": dH - modalBodyVPadding - dialogHeaderH - dialogFooterH,
                        "height": dH - modalBodyVPadding - dialogHeaderH - dialogFooterH});

            self._dialog.css({"width": dW,
                "margin-left": dW / 2 * (-1),
                "margin-top": dH / 2 * (-1),
                "top": "50%"});

            //initiate the first load of commits
            projectRepositoryWidget.loadMoreCommits();
        });

        this._dialog.on('hide', function () {
            projectRepositoryWidget.clear();
        });
    };

    return ProjectRepositoryDialog;
});