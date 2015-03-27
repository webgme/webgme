/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define(['js/logger'], function (Logger) {

    "use strict";

    var PanelManager;

    PanelManager = function () {
        this._logger = Logger.create('gme:PanelManager:PanelManager', WebGMEGlobal.gmeConfig.client.log);

        this._activePanel = undefined;
    };


    PanelManager.prototype.setActivePanel = function (p) {
        if (this._activePanel === p) {
            return;
        }

        if (this._activePanel) {
            //deactivate currently active panel
            this._activePanel.setActive(false);
        }

        this._activePanel = undefined;

        if (p && _.isFunction(p.setActive)) {
            this._activePanel = p;
            this._activePanel.setActive(true);
        }

        WebGMEGlobal.KeyboardManager.captureFocus();
    };

    PanelManager.prototype.getActivePanel = function () {
        return this._activePanel;
    };


    return PanelManager;
});