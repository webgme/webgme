/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/client/constants'
], function (Logger, DropDownMenu, CLIENT_CONSTANTS) {

    'use strict';

    var BranchSelectorWidget,
        NO_BRANCH_TEXT = 'NO BRANCH SELECTED';

    BranchSelectorWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:BranchSelectorWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug('Created');
    };

    BranchSelectorWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.empty();

        this._ddBranches = new DropDownMenu({
            dropUp: true,
            pullRight: true,
            size: 'micro',
            sort: true,
            icon: 'glyphicon glyphicon-random'
        });
        this._ddBranches.setTitle(NO_BRANCH_TEXT);

        this._el.append(this._ddBranches.getEl());

        this._ddBranches.onItemClicked = function (value) {
            if (value !== undefined) {
                self._client.selectBranchAsync(value, function (err) {
                    if (err) {
                        self._logger.error(err);
                    } else {
                        self._refreshActualBranchInfo();
                        self._refreshBranchList();
                    }
                });
            }
        };

        this._ddBranches.onDropDownMenuOpen = function () {
            self._ddBranches.clear(true);
            self._timeoutID = window.setTimeout(function () {
                self._ddBranches.addItem({
                    text: '<div class="loader-progressbar" style="' +
                    'left: 50%;position: relative;margin-left: -8px;"></div>'}
                );
            }, 50);
            self._refreshBranchList();
        };

        this._client.addEventListener(CLIENT_CONSTANTS.PROJECT_OPENED, function () {
            self._refreshActualBranchInfo();
            self._refreshBranchList();
        });
        this._client.addEventListener(CLIENT_CONSTANTS.PROJECT_CLOSED, function () {
            self._refreshActualBranchInfo();
            self._refreshBranchList();
        });

        this._client.addEventListener(CLIENT_CONSTANTS.BRANCH_CHANGED, function () {
            self._refreshActualBranchInfo();
            self._refreshBranchList();
        });

        this._refreshActualBranchInfo();
        this._refreshBranchList();
    };

    BranchSelectorWidget.prototype._refreshBranchList = function () {
        var branchesLoaded,
            self = this;

        branchesLoaded = function (err, data) {
            var actualbranch = self._client.getActiveBranchName(),
                i;

            if (self._timeoutID) {
                window.clearTimeout(self._timeoutID);
            }

            self._ddBranches.clear(true);

            if (err) {
                self._logger.error(err);
            } else {
                //set view's branch info
                i = data.length;

                while (i--) {
                    if (actualbranch !== data[i].name) {
                        self._ddBranches.addItem({
                            text: data[i].name,
                            value: data[i].name
                        });
                    }
                }
            }
        };

        try {
            this._client.getBranches(this._client.getActiveProjectId(), branchesLoaded);
        } catch (exp) {
            this._logger.error('_client.getBranchesAsync failed.... SHOULD NEVER HAPPEN');
        }

    };

    BranchSelectorWidget.prototype._refreshActualBranchInfo = function () {
        var branch = this._client.getActiveBranchName();

        if (branch === undefined || branch === null) {
            this._ddBranches.setTitle(NO_BRANCH_TEXT);
            this._ddBranches.setColor(DropDownMenu.prototype.COLORS.ORANGE);
        } else {
            this._ddBranches.setTitle(branch);
            this._ddBranches.removeColor();
        }
    };

    return BranchSelectorWidget;
});