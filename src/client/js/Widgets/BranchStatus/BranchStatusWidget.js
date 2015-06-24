/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/Controls/PopoverBox',
    'js/Dialogs/Merge/MergeDialog',
    'js/Constants'
], function (Logger, DropDownMenu, PopoverBox, MergeDialog, CONSTANTS) {

    'use strict';

    var BranchStatusWidget,
        ITEM_VALUE_FORK = 'fork',
        ITEM_VALUE_FOLLOW = 'follow',
        ITEM_VALUE_MERGE = 'merge';

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
            var branchName = self._client.getActiveBranchName(),
                projectName = self._client.getActiveProjectId();
            if (value === ITEM_VALUE_FORK) {
                self._client.forkCurrentBranch(null, null, function (err, forkName) {
                    if (err) {
                        self._logger.error('could not fork the branch', branchName);
                        self._client.selectBranch(branchName, null, function (err) {
                            if (err) {
                                self._logger.error('could not re-select the branch', branchName);
                                throw new Error(err);
                            }
                        });
                    } else {
                        self._client.selectBranch(forkName, null, function (err) {
                            if (err) {
                                self._logger.error('Could not select new branch', forkName);
                                throw new Error(err);
                            }
                        });
                    }
                });
            } else if (value === ITEM_VALUE_FOLLOW) {
                self._client.selectBranch(branchName, null, function (err) {
                    if (err) {
                        self._logger.error('could not re-select the branch', branchName);
                        throw new Error(err);
                    }
                });
            } else if (value === ITEM_VALUE_MERGE) {
                self._client.forkCurrentBranch(null, null, function (err, forkName, forkHash) {
                    if (err) {
                        self._logger.error('could not fork the branch', branchName);
                        self._client.selectBranch(branchName, null, function (err) {
                            if (err) {
                                self._logger.error('could not re-select the branch', branchName);
                                throw new Error(err);
                            }
                        });
                    } else {
                        self._client.autoMerge(projectName, forkName, branchName, function (err, result) {
                            var mergeDialog = new MergeDialog(self.gmeClient);
                            if (err) {
                                self._logger.error('Merging resulted in error', err);
                                self._logger.info('Trying to select fork', forkName);
                                self._client.selectBranch(forkName, null, function (err) {
                                    if (err) {
                                        self._logger.error('Could not select new branch', forkName);
                                        throw new Error(err);
                                    }
                                });
                                return;
                            }
                            if (result && result.conflict && result.conflict.items.length > 0) {
                                //TODO create some user-friendly way to show this type of result
                                // TODO: we may need to open the mergeDialog here: mergeDialog.show('merge ended in conflicts', result);
                                self._logger.error('merge had conflicts', result.conflict);
                                self._client.selectBranch(forkName, null, function (err) {
                                    if (err) {
                                        self._logger.error('Could not select the new branch', forkName);
                                        throw new Error(err);
                                    }
                                });
                            } else {
                                self._logger.debug('Merge was successful');
                                self._client.selectBranch(branchName, null, function (err) {
                                    if (err) {
                                        self._logger.error('could not select the branch after merge', branchName);
                                        throw new Error(err);
                                    }
                                    mergeDialog.show(null, result);
                                });
                                self._client.deleteBranch(projectName, forkName, forkHash, function (err) {
                                    if (err) {
                                        self._logger.error('Could delete temporary branch after merge', forkName);
                                    }
                                });
                            }
                        });
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
            case CONSTANTS.CLIENT.BRANCH_STATUS.SYNC:
                this._branchInSync();
                break;
            case CONSTANTS.CLIENT.BRANCH_STATUS.AHEAD_NOT_SYNC:
                this._branchAheadNotSync(eventData);
                break;
            case CONSTANTS.CLIENT.BRANCH_STATUS.AHEAD_SYNC:
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

    BranchStatusWidget.prototype._branchAheadNotSync = function (eventData) {
        this._ddBranchStatus.clear();
        this._outOfSync = true;
        this._ddBranchStatus.addItem({
            text: 'Create fork',
            value: ITEM_VALUE_FORK
        });
        this._ddBranchStatus.addItem({
            text: 'Drop local changes',
            value: ITEM_VALUE_FOLLOW
        });
        this._ddBranchStatus.addItem({
            text: 'Try to merge',
            value: ITEM_VALUE_MERGE
        });
        this._ddBranchStatus.setTitle('AHEAD[' + eventData.details.length + ']');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddBranchStatus.getEl());
        this._popoverBox.show('You are out of sync from the origin.',
            this._popoverBox.alertLevels.WARNING, true);
    };

    BranchStatusWidget.prototype._branchAhead = function (eventData) {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('AHEAD[' + eventData.details.length + ']');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.LIGHT_BLUE);
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