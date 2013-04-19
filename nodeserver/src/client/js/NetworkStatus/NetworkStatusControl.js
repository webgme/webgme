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

        this._client.addEventListener(this._client.events.NETWORKSTATUS_CHANGED, function (__project, state) {
            switch (state) {
                case self._client.networkStates.CONNECTED:
                    self._view.stateChanged(self._view.STATES.CONNECTED);
                    break;
                case self._client.networkStates.DISCONNECTED:
                    self._view.stateChanged(self._view.STATES.DISCONNECTED);
                    break;
            }
        });

        var status = "CONNECTED";
        self._view.stateChanged(status);

        setInterval(function (){
            if (status === "CONNECTED") {
                status = "DISCONNECTED";
            } else {
                status = "CONNECTED";
            }
            self._view.stateChanged(status);

        }, 3000);

        this._logger = logManager.create("NetworkStatusControl");
        this._logger.debug("Created");


    };

    return NetworkStatusControl;
});