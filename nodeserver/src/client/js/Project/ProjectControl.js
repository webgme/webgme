"use strict";

define(['logManager'], function (logManager) {

    var ProjectControl;

    ProjectControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._projectPanelView = myView;

        this._logger = logManager.create("ProjectControl");
        this._logger.debug("Created");

        this._projectPanelView.onFullRefresh = function () {
            self._client.fullRefresh();
        };

        this._projectPanelView.onCommit = function (msg) {
            self._client.commit({"message": msg});
        };

        this._projectPanelView.onGetClient = function () {
            return self._client;
        };
    };

    return ProjectControl;
});