/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger',
    'text!./templates/ProjectRepositoryDialog.html',
    'js/Widgets/ProjectRepository/ProjectRepositoryWidget',
    'css!./styles/ProjectRepositoryDialog.css'
], function (Logger,
             projectRepositoryDialogTemplate,
             ProjectRepositoryWidget) {

    'use strict';

    var ProjectRepositoryDialog;

    ProjectRepositoryDialog = function (client) {
        this._logger = Logger.create('gme:Dialogs:ProjectRepository:ProjectRepositoryDialog',
            WebGMEGlobal.gmeConfig.client.log);

        this._client = client;

        this._widget = null;
        this._selector = null;
        this._groupBranches = null;
        this._branches = null;
        this._selectedValue = null;

        this._logger.debug('Created');
    };

    ProjectRepositoryDialog.prototype.show = function (options) {
        var self = this;
        this._branches = options.branches;

        this._initDialog(options);

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');

    };

    ProjectRepositoryDialog.prototype._initDialog = function (options) {
        var modalBody,
            self = this,
            WINDOW_PADDING = 20,
            wH = $(window).height();

        this._dialog = $(projectRepositoryDialogTemplate);

        this._selector = this._dialog.find('select.selector');
        this._groupBranches = this._selector.find('optgroup.group-branches');

        if (typeof options.start === 'string') {
            options.historyType = 'branch';
            this._selectedValue = options.start;
        } else if (typeof options.start === 'object' && options.start instanceof Array) {
            options.historyType = 'branches';
            this._selectedValue = '$allBranches';
        } else {
            options.historyType = 'commits';
            this._selectedValue = '$commits';
        }

        this._populateOptions(options);

        this._selector.on('change', function () {
            var options = {
                    start: null,
                    type: null
                },
                value = self._selector.val();

            if (!value) {
                return;
            }

            self._selectedValue = value;
            if (value === '$allBranches') {
                options.start = self._branches;
                options.historyType = 'branches';
            } else if (value === '$commits') {
                options.start = null;
                options.historyType = 'commits';
            } else {
                options.start = value;
                options.historyType = 'branch';
            }

            self._initializeWidget(modalBody, options);
        });

        modalBody = this._dialog.find('.modal-body');

        this._initializeWidget(modalBody, options);

        this._dialog.on('show.bs.modal', function () {
            var dialogHeaderH = self._dialog.find('.modal-header').outerHeight(true),
                dialogFooterH = self._dialog.find('.modal-footer').outerHeight(true),
                modalBodyVPadding = parseInt(modalBody.css('padding-top'), 10) +
                                    parseInt(modalBody.css('padding-bottom'), 10),
            //dW,
                dH;

            //make it almost full screen
            //dW = wW - 2 * WINDOW_PADDING;
            dH = wH - 2 * WINDOW_PADDING;

            self._dialog.removeClass('fade');

            modalBody.css(
                {
                    'max-height': dH - modalBodyVPadding - dialogHeaderH - dialogFooterH,
                    height:     dH - modalBodyVPadding - dialogHeaderH - dialogFooterH
                }
            );

            //initiate the first load of commits
            self._widget.loadMoreCommits(options.start);
        });

        this._dialog.on('hide', function () {
            self._widget.clear();
        });
    };

    ProjectRepositoryDialog.prototype._populateOptions = function () {
        var self = this,
            branchExists = false;

        this._groupBranches.children().remove();
        this._branches.sort();

        this._branches.forEach(function (branchName) {
            self._groupBranches.append($('<option>', {
                    text: branchName,
                    value: branchName
                }
            ));
            if (self._selectedValue === branchName) {
                branchExists = true;
            }
        });

        if (this._selectedValue && this._selectedValue[0].indexOf('$') > -1) {
            this._selector.val(this._selectedValue);
        } else if (branchExists) {
            this._selector.val(this._selectedValue);
        } else {
            this._selector.val('');
        }
    };

    ProjectRepositoryDialog.prototype._initializeWidget = function (modalBody, options) {
        var self = this,
            wasShown = false;

        if (this._widget) {
            wasShown = true;
            this._widget.clear();
        }

        this._widget = new ProjectRepositoryWidget(
            modalBody,
            self._client,
            {
                commit_count: 100,
                historyType: options.historyType,
                start: options.start
            }
        );

        this._widget.branchesUpdated = function () {
            self._logger.debug('branches, old, new', self._branches, self._widget._branchNames);
            self._branches = self._widget._branchNames.slice();
            self._populateOptions();
        };

        if (wasShown) {
            self._widget.loadMoreCommits(options.start);
        }
    };

    return ProjectRepositoryDialog;
});