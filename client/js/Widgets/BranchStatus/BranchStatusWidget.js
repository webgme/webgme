"use strict";

define(['logManager',
    'js/Controls/DropDownMenu'], function (logManager,
                                           DropDownMenu) {

    var BranchStatusWidget;

    BranchStatusWidget = function (containerEl, client) {
        this._logger = logManager.create("BranchStatusWidget");

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug("Created");
    };

    BranchStatusWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.empty();

        //BranchStatus DropDownMenu
        this._ddBranchStatus = new DropDownMenu({"dropUp": true,
            "pullRight": true,
            "size": "micro",
            "sort": true});
        this._ddBranchStatus.setTitle('BRANCHSTATUS');

        this._el.append(this._ddBranchStatus.getEl());

        this._ddBranchStatus.onItemClicked = function (value) {
            if (value === 'go_online') {
                self._client.goOnline();
            } else if (value === 'go_offline') {
                self._client.goOffline();
            }
        };

        this._client.addEventListener(this._client.events.BRANCHSTATUS_CHANGED, function (/*__project, state*/) {
            self._refreshBranchStatus();
        });

        this._refreshBranchStatus();
    };

    BranchStatusWidget.prototype._refreshBranchStatus = function () {
        var status = this._client.getActualBranchStatus();

        switch (status) {
            case this._client.branchStates.SYNC:
                this._branchInSync();
                break;
            case this._client.branchStates.FORKED:
                this._branchForked();
                break;
        }
    };

    BranchStatusWidget.prototype._branchInSync = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('IN SYNC');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.GREEN);
    };

    BranchStatusWidget.prototype._branchForked = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('OUT OF SYNC');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);
    };

    return BranchStatusWidget;
});