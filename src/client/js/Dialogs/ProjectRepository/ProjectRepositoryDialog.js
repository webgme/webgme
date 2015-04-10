/*globals define, WebGMEGlobal*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger',
    'text!./templates/ProjectRepositoryDialog.html',
    'js/Widgets/ProjectRepository/ProjectRepositoryWidget'], function (Logger,
                                                 projectRepositoryDialogTemplate,
                                                 ProjectRepositoryWidget) {

    "use strict";

    var ProjectRepositoryDialog;

    ProjectRepositoryDialog = function (client) {
        this._logger = Logger.create('gme:Dialogs:ProjectRepository:ProjectRepositoryDialog',
            WebGMEGlobal.gmeConfig.client.log);

        this._client = client;

        this._logger.debug("Created");
    };

    ProjectRepositoryDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');

    };

    ProjectRepositoryDialog.prototype._initDialog = function () {
        var projectRepositoryWidget,
            modalBody,
            client = this._client,
            self = this,
            WINDOW_PADDING = 20,
            wH = $(window).height(),
            wW = $(window).width();

        this._dialog = $( projectRepositoryDialogTemplate );

        modalBody = this._dialog.find('.modal-body');

        projectRepositoryWidget = new ProjectRepositoryWidget(
            modalBody,
            client,
            {
                'commit_count': 100
            }
        );

        this._dialog.on('show.bs.modal', function () {
            var dialogHeaderH = self._dialog.find('.modal-header').outerHeight(true),
                dialogFooterH = self._dialog.find('.modal-footer').outerHeight(true),
                modalBodyVPadding = parseInt(modalBody.css('padding-top'), 10) + parseInt(modalBody.css('padding-bottom'), 10),
                //dW,
                dH;

            //make it almost full screen
            //dW = wW - 2 * WINDOW_PADDING;
            dH = wH - 2 * WINDOW_PADDING;

            self._dialog.removeClass("fade");

            modalBody.css(
                {
                    "max-height": dH - modalBodyVPadding - dialogHeaderH - dialogFooterH,
                    "height": dH - modalBodyVPadding - dialogHeaderH - dialogFooterH
                }
            );

            //initiate the first load of commits
            projectRepositoryWidget.loadMoreCommits();
        });

        this._dialog.on('hide', function () {
            projectRepositoryWidget.clear();
        });
    };

    return ProjectRepositoryDialog;
});