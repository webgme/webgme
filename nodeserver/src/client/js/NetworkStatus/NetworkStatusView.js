"use strict";

define(['logManager',
        'text!./NetworkStatusTmpl.html'], function (logManager,
                                                    networkStatusTmpl) {

    var NetworkStatusView;

    NetworkStatusView = function (containerId) {
        this._logger = logManager.create("NetworkStatusView");

        this._status = { "online": "btn-success",
                              "offline": "btn-gray",
                              "noconnection": "btn-warning" };

        //initialize UI
        this._initializeUI(containerId);
        if (this._el.length === 0) {
            this._logger.error("ModelEditorView can not be created");
            return undefined;
        }

        this._logger.debug("Created");
    };

    NetworkStatusView.prototype._initializeUI = function (containerId) {
        var self = this;

        //get container first
        this._el = $("#" + containerId);
        if (this._el.length === 0) {
            this._logger.warning("NetworkStatusView's container with id:'" + containerId + "' could not be found");
            return undefined;
        }

        this._el.empty().append($(networkStatusTmpl));

        this._skinParts = {};
        this._skinParts.btnStatus = this._el.find(".btnStatus");
        this._skinParts.btnStatusDropDown = this._el.find(".btnStatusDropDown");
        this._skinParts.dropdownMenu = this._el.find(".dropdown-menu");

        this._skinParts.dropdownMenu.on("click", function (event) {
            var action = $(event.target).data("val");
            self.onNetworkStatusButtonClicked(action);
        });
    };

    NetworkStatusView.prototype._modeOffline = function () {
        this._setControl({"title": "Offline",
            "tooltip": "Working offline",
            "stateClass": this._status.offline,
            "actions": [{"text": "Go Online", "value": "go_online"}]});
    };

    NetworkStatusView.prototype._modeOnline = function () {
        this._setControl({"title": "Online",
            "tooltip": "Working online",
            "stateClass": this._status.online,
            "actions": [{"text": "Go Offline", "value": "go_offline"}]});
    };

    NetworkStatusView.prototype._modeNoNetwork = function () {
        this._setControl({"title": "Network error",
            "tooltip": "Network error, trying to reconnect...",
            "stateClass": this._status.noconnection,
            "actions": [{"text": "Go Offline", "value": "go_offline"}]});
    };

    NetworkStatusView.prototype._setControl = function (params) {
        var i = params.actions.length,
            li,
            actionItem;

        this._skinParts.btnStatus.text(params.title).prop("title", params.tooltip);

        this._skinParts.btnStatus.addClass(params.stateClass);
        this._skinParts.btnStatusDropDown.addClass(params.stateClass);

        while (i--) {
            actionItem = params.actions[i];
            li = ('<li><a tabindex="-1" href="#" data-val="' + actionItem.value + '">' + actionItem.text + '</a></li>');
            this._skinParts.dropdownMenu.append($(li));
        }
    };

    /*********** PUBLIC API *******************/

    NetworkStatusView.prototype.stateChanged = function (newState) {

        this._skinParts.dropdownMenu.empty();
        this._skinParts.btnStatus.text(" ").prop("title", "");

        this._skinParts.btnStatus.removeClass([this._status.online, this._status.offline, this._status.noconnection].join(" "));
        this._skinParts.btnStatusDropDown.removeClass([this._status.online, this._status.offline, this._status.noconnection].join(" "));

        switch (newState) {
        case "offline":
            this._modeOffline();
            break;
        case "online":
            this._modeOnline();
            break;
        case "nonetwork":
            this._modeNoNetwork();
            break;
        }
    };

    NetworkStatusView.prototype.onNetworkStatusButtonClicked = function (val) {
        this._logger.warning("onNetworkStatusButtonClicked is not overridden in Controller...params: '" + val + "'");
    };



    return NetworkStatusView;
});