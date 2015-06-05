/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/Controls/PopoverBox',
    'js/Constants'
], function (Logger, DropDownMenu, PopoverBox, CONSTANTS) {

    'use strict';

    var BranchStatusWidget,
        ITEM_VALUE_FORK = 'fork',
        ITEM_VALUE_FOLLOW = 'follow';

    BranchStatusWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:BranchStatusWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug('Created');
    };

    BranchStatusWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.empty();

        //BranchStatus DropDownMenu
        this._ddBranchStatus = new DropDownMenu({
            dropUp: true,
            pullRight: true,
            size: 'micro',
            sort: true
        });
        this._ddBranchStatus.setTitle('BRANCHSTATUS');

        this._el.append(this._ddBranchStatus.getEl());

        this._ddBranchStatus.onItemClicked = function (value) {
            var branchName = self._client.getActiveBranchName();
            if (value === ITEM_VALUE_FORK) {
                self._client.forkCurrentBranch(null, null, function (err) {
                    if (err) {
                        self._logger.error('could not fork the branch', branchName);
                        throw new Error(err);
                    }
                });
            } else if (value === ITEM_VALUE_FOLLOW) {
                self._client.selectBranch(branchName, null, function (err) {
                    if (err) {
                        self._logger.error('could not re-select the branch', branchName);
                        throw new Error(err);
                    }
                });
            }
        };

        this._client.addEventListener(CONSTANTS.CLIENT.BRANCH_STATUS_CHANGED, function (__client, eventData) {
            self._refreshBranchStatus(eventData);
        });

        this._refreshBranchStatus();
    };

    BranchStatusWidget.prototype._refreshBranchStatus = function (eventData) {
        var status = this._client.getBranchStatus();

        switch (status) {
            case CONSTANTS.CLIENT.BRANCH_STATUS.SYNCH:
                this._branchInSync();
                break;
            case CONSTANTS.CLIENT.BRANCH_STATUS.FORKED:
                this._branchForked(eventData);
                break;
            case CONSTANTS.CLIENT.BRANCH_STATUS.AHEAD:
                this._branchAhead(eventData);
                break;
            case CONSTANTS.CLIENT.BRANCH_STATUS.PULLING:
                this._branchPulling(eventData);
                break;
            default:
                this._noBranch();
                break;
        }
    };

    BranchStatusWidget.prototype._branchInSync = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('IN SYNC');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.GREEN);

        if (this._outOfSync === true) {
            this._popoverBox.show('Back in sync...', this._popoverBox.alertLevels.SUCCESS, true);
            delete this._outOfSync;
        }
    };

    BranchStatusWidget.prototype._branchForked = function (eventData) {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('OUT OF SYNC');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);
        this._outOfSync = true;
        this._ddBranchStatus.addItem({
            text: 'Create fork',
            value: ITEM_VALUE_FORK
        });
        this._ddBranchStatus.addItem({
            text: 'Drop local changes',
            value: ITEM_VALUE_FOLLOW
        });

        this._outOfSync = true;
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddBranchStatus.getEl());
        this._popoverBox.show('You got out of sync from the origin',
            this._popoverBox.alertLevels.WARNING, true);
    };

    BranchStatusWidget.prototype._branchAhead = function (eventData) {
        this._ddBranchStatus.clear();
        if (this._outOfSync === true) {
            this._ddBranchStatus.addItem({
                text: 'Create fork',
                value: ITEM_VALUE_FORK
            });
            this._ddBranchStatus.addItem({
                text: 'Drop local changes',
                value: ITEM_VALUE_FOLLOW
            });
            this._ddBranchStatus.setTitle('AHEAD[' + eventData.details.length + ']');
            this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);
            this._popoverBox.show('You are out of sync from the origin.',
                this._popoverBox.alertLevels.WARNING, true);
        } else {
            this._ddBranchStatus.setTitle('AHEAD[' + eventData.details.length + ']');
            this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.LIGHT_BLUE);
        }
    };

    BranchStatusWidget.prototype._branchPulling = function (eventData) {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('PULLING[' + eventData.details.toString() + ']');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.GRAY);
    };

    BranchStatusWidget.prototype._noBranch = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('NO BRANCH');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.GRAY);
        this._outOfSync = false;
        //this._popoverBox.show('No branch selected', this._popoverBox.alertLevels.WARNING, false);
    };

    return BranchStatusWidget;
});