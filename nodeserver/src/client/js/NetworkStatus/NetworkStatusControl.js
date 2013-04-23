"use strict";

define(['logManager'], function (logManager) {

    var NetworkStatusControl;

    NetworkStatusControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        //override view event handlers
        this._view.onNetworkStatusButtonClicked = function (val) {
            if (val === 'connect') {
                self._client.connect();
            }
        };

        this._view.onBranchStatusButtonClicked = function (val) {
            if (val === 'go_online') {
                self._client.goOnline();
            } else if (val === 'go_offline') {
                self._client.goOffline();
            }
        };

        this._client.addEventListener(this._client.events.NETWORKSTATUS_CHANGED, function (__project, state) {
            switch (state) {
                case self._client.networkStates.CONNECTED:
                    self._view.networkStateChanged(self._view.NETWORK_STATES.CONNECTED);
                    break;
                case self._client.networkStates.DISCONNECTED:
                    self._view.networkStateChanged(self._view.NETWORK_STATES.DISCONNECTED);
                    break;
            }
        });

        this._client.addEventListener(this._client.events.BRANCHSTATUS_CHANGED, function (__project, state) {
            switch (state) {
                case self._client.branchStates.SYNC:
                    self._view.branchStateChanged(self._view.BRANCH_STATES.INSYNC);
                    break;
                case self._client.branchStates.FORKED:
                    self._view.branchStateChanged(self._view.BRANCH_STATES.FORKED);
                    break;
            }
        });

        this._logger = logManager.create("NetworkStatusControl");
        this._logger.debug("Created");
    };

    return NetworkStatusControl;
});