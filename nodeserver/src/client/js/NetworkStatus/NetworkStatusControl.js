"use strict";

define(['logManager'], function (logManager) {

    var NetworkStatusControl;

    NetworkStatusControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        //override view event handlers
        this._view.onNetworkStatusButtonClicked = function (newState) {
            switch (newState) {
            case "go_online":
                self._client.goOnline();
                break;
            case "go_offline":
                self._client.goOffline();
                break;
            }
        };

        this._client.addEventListener(this._client.events.NETWORKSTATUS_CHANGED, function (__project, state) {
            switch (state) {
            case "offline":
                self._view.stateChanged("offline");
                break;
            case "online":
                self._view.stateChanged("online");
                break;
            case "nonetwork":
                self._view.stateChanged("nonetwork");
                break;
            }
        });

        this._logger = logManager.create("NetworkStatusControl");
        this._logger.debug("Created");


    };

    return NetworkStatusControl;
});