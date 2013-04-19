"use strict";

define(['logManager',
        'js/Controls/DropDownMenu'], function (logManager,
                                                    DropDownMenu) {

    var NetworkStatusView,
        ITEM_VALUE_CONNECT = 'connect';

    NetworkStatusView = function (containerId) {
        this._logger = logManager.create("NetworkStatusView");

        //initialize UI
        this._initializeUI(containerId);

        this._logger.debug("Created");
    };

    NetworkStatusView.prototype._initializeUI = function (containerId) {
        var self = this,
            msg;

        //get container first
        this._el = $("#" + containerId);
        if (this._el.length === 0) {
            msg = "NetworkStatusView's container with id:'" + containerId + "' could not be found";
            this._logger.error(msg);
            throw msg;
        }

        this._el.empty();

        //#1 - NetworkStatus
        this._ddNetworkStatus = new DropDownMenu({"dropUp": true,
            "pullRight": true,
            "size": "micro",
            "sort": true});

        this._el.append(this._ddNetworkStatus.getEl());

        this._ddNetworkStatus.onItemClicked = function (value) {
            self._onNetworkStatusItemClicked(value);
        };
        this._ddNetworkStatus.setTitle('NETWORKSTATUS');

        this._el.append($('<div class="spacer pull-right"></div>'));

        //#2 - BranchStatus
        this._ddBranchStatus = new DropDownMenu({"dropUp": true,
            "pullRight": true,
            "size": "micro",
            "sort": true});

        this._el.append(this._ddBranchStatus.getEl());

        this._ddBranchStatus.onItemClicked = function (value) {
            self._onBranchStatusItemClicked(value);
        };
        this._ddBranchStatus.setTitle('BRANCHSTATUS');
    };

    /*********** PUBLIC API *******************/

    NetworkStatusView.prototype.onNetworkStatusButtonClicked = function (val) {
        this._logger.warning("onNetworkStatusButtonClicked is not overridden in Controller...params: '" + val + "'");
    };

    NetworkStatusView.prototype.NETWORK_STATES = {'CONNECTED': 'CONNECTED',
                                                  'DISCONNECTED': 'DISCONNECTED'};

    NetworkStatusView.prototype.networkStateChanged = function (newState) {
        if (newState === this.NETWORK_STATES.CONNECTED) {
            this._modeConnected();
        } else if (newState === this.NETWORK_STATES.DISCONNECTED) {
            this._modeDisconnected();
        }
    };

    NetworkStatusView.prototype.BRANCH_STATES = {'INSYNC': 'INSYNC',
        'FORKED': 'FORKED',
        'OFFLINE': 'OFFLINE'};

    NetworkStatusView.prototype.branchStateChanged = function (newState) {
        if (newState === this.BRANCH_STATES.INSYNC) {
            this._branchInSync();
        } else if (newState === this.BRANCH_STATES.FORKED) {
            this._branchForked();
        } else if (newState === this.BRANCH_STATES.OFFLINE) {
            this._branchOffline();
        }
    };

    NetworkStatusView.prototype.onBranchStatusButtonClicked = function (val) {
        this._logger.warning("onBranchStatusButtonClicked is not overridden in Controller...params: '" + val + "'");
    };

    /*********** PRIVATE API *******************/

    NetworkStatusView.prototype._modeConnected = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('CONNECTED');
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.GREEN);
    };

    NetworkStatusView.prototype._modeDisconnected = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('DISCONNECTED');
        this._ddNetworkStatus.addItem({"text": 'Connect...',
            "value": ITEM_VALUE_CONNECT});
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);
    };

    NetworkStatusView.prototype._onNetworkStatusItemClicked = function (value) {
        if (value === ITEM_VALUE_CONNECT) {
            this.onNetworkStatusButtonClicked(ITEM_VALUE_CONNECT);
        }
    };


    NetworkStatusView.prototype._branchInSync = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('IN SYNC');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.GREEN);
        this._ddBranchStatus.addItem({"text": 'Go Offline...',
            "value": 'go_offline'});
    };

    NetworkStatusView.prototype._branchForked = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('FORKED');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);
    };

    NetworkStatusView.prototype._branchOffline = function () {
        this._ddBranchStatus.clear();
        this._ddBranchStatus.setTitle('OFFLINE');
        this._ddBranchStatus.setColor(DropDownMenu.prototype.COLORS.GRAY);
        this._ddBranchStatus.addItem({"text": 'Go Online...',
            "value": 'go_online'});
    };

    NetworkStatusView.prototype._onBranchStatusItemClicked = function (value) {
        this.onBranchStatusButtonClicked(value);
    };

    return NetworkStatusView;
});