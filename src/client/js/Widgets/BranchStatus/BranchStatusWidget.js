/*globals define, _, requirejs, WebGMEGlobal*/

define(['js/logger',
    'js/Controls/DropDownMenu',
    'js/Controls/PopoverBox'], function (Logger,
                                           DropDownMenu,
                                           PopoverBox) {

    "use strict";

    var BranchStatusWidget;

    BranchStatusWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:BranchStatusWidget', WebGMEGlobal.gmeConfig.client.log);

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

        if (this._outOfSync === true) {
            this._popoverBox.show('Branch in sync again...', this._popoverBox.alertLevels.SUCCESS, true);
            delete this._outOfSync;
        }
    };

    BranchStatusWidget.prototype._branchForked = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('OUT OF SYNC');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);

        this._outOfSync = true;
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddBranchStatus.getEl());
        this._popoverBox.show('Branch out of sync...', this._popoverBox.alertLevels.WARNING, false);
    };

    return BranchStatusWidget;
});