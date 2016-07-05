/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
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
        ITEM_VALUE_MERGE = 'merge',
        ITEM_VALUE_SELECT_BRANCH = 'select',
        ITEM_VALUE_DOWNLOAD_ERROR = 'downloadError',
        ITEM_VALUE_DOWNLOAD_COMMIT_QUEUE = 'downloadCommitQueue';

    BranchStatusWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:BranchStatusWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;
        this._eventData = null;

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
                                throw err;
                            }
                        });
                    } else {
                        self._client.selectBranch(forkName, null, function (err) {
                            if (err) {
                                self._logger.error('Could not select new branch', forkName);
                                throw err;
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
            } else if (value === ITEM_VALUE_SELECT_BRANCH) {
                self._client.selectBranch(branchName, null, function (err) {
                    if (err) {
                        self._logger.error(err);
                    } else {
                        self._logger.debug('branch selected: ', branchName);
                    }
                });
            } else if (value === ITEM_VALUE_DOWNLOAD_ERROR) {
                self._client.downloadError();
            } else if (value === ITEM_VALUE_DOWNLOAD_COMMIT_QUEUE) {
                self._client.downloadCommitQueue();
            }
        };

        this._client.addEventListener(CONSTANTS.CLIENT.BRANCH_STATUS_CHANGED, function (__client, eventData) {
                self._refreshBranchStatus(eventData);
            }
        );

        this._refreshBranchStatus({status: this._client.getBranchStatus()});

        window.addEventListener('beforeunload', function (event) {
            var commitQueue = self._client.getCommitQueue(),
                message;

            if (commitQueue.length > 0) {
                message = 'There are ' + commitQueue.length + ' commit(s) in your commitQueue. You will loose this ' +
                    'data unless you take an action in the branch status (footer) widget.';
                event.returnValue = message;        // Gecko, Trident, Chrome 34+
                return message;                     // Gecko, WebKit, Chrome <34
            }
        });
    };

    BranchStatusWidget.prototype._refreshBranchStatus = function (eventData) {
        var status = eventData.status;
        this._eventData = eventData;

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
            case CONSTANTS.CLIENT.BRANCH_STATUS.MERGING:
                this._branchMerging(eventData);
                break;
            case CONSTANTS.CLIENT.BRANCH_STATUS.PULLING:
                this._branchPulling(eventData);
                break;
            case CONSTANTS.CLIENT.BRANCH_STATUS.ERROR:
                this._branchError(eventData);
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
        if (this._client.isConnected()) {
            this._ddBranchStatus.addItem({
                text: 'Create a branch with local changes.',
                value: ITEM_VALUE_FORK
            });
            this._ddBranchStatus.addItem({
                text: 'Drop local changes and follow branch.',
                value: ITEM_VALUE_FOLLOW
            });
            this._ddBranchStatus.addItem({
                text: 'Attempt to merge in local changes.',
                value: ITEM_VALUE_MERGE
            });
        }

        this._ddBranchStatus.addItem({
            text: 'Download local changes.',
            value: ITEM_VALUE_DOWNLOAD_COMMIT_QUEUE
        });

        this._ddBranchStatus.setTitle('AHEAD[' + eventData.commitQueue.length + ']');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddBranchStatus.getEl());
        this._popoverBox.show('You are out of sync from the origin.',
            this._popoverBox.alertLevels.WARNING, true);
    };

    BranchStatusWidget.prototype._branchAhead = function (eventData) {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.addItem({
            text: 'Download local changes.',
            value: ITEM_VALUE_DOWNLOAD_COMMIT_QUEUE
        });
        this._ddBranchStatus.setTitle('AHEAD[' + eventData.commitQueue.length + ']');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.LIGHT_BLUE);
    };

    BranchStatusWidget.prototype._branchMerging = function (eventData) {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('MERGING[' + eventData.commitQueue.length + ']');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.BLUE);
    };

    BranchStatusWidget.prototype._branchPulling = function (eventData) {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('PULLING[' + eventData.updateQueue.length + ']');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.GRAY);
    };

    BranchStatusWidget.prototype._branchError = function (eventData) {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('ERROR');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.RED);
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddBranchStatus.getEl());
        this._popoverBox.show('Critical error - detached from branch.',
            this._popoverBox.alertLevels.ERROR, true);
        this._ddBranchStatus.addItem({
            text: 'Reselect branch',
            value: ITEM_VALUE_SELECT_BRANCH
        });
        this._ddBranchStatus.addItem({
            text: 'Download error data',
            value: ITEM_VALUE_DOWNLOAD_ERROR
        });
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