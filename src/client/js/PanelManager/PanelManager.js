/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define(['js/logger'], function (Logger) {

    "use strict";

    var PanelManager;

    PanelManager = function (client) {
        this._logger = Logger.create('gme:PanelManager:PanelManager', WebGMEGlobal.gmeConfig.client.log);
        this._client = client;
        this._activePanel = undefined;

        this._registeredPanels = {};
    };


    PanelManager.prototype.setActivePanel = function (p) {
        if (this._activePanel === p) {
            // [lattmann] we need to call setActive in order to get the split panel working correctly
            this._activePanel.setActive(true);

        } else {
            if (this._activePanel) {
                //deactivate currently active panel
                this._activePanel.setActive(false);
            }

            this._activePanel = undefined;

            if (p && _.isFunction(p.setActive)) {
                this._activePanel = p;
                this._activePanel.setActive(true);
            }
        }

        WebGMEGlobal.KeyboardManager.captureFocus();
    };

    PanelManager.prototype.getActivePanel = function () {
        return this._activePanel;
    };

    PanelManager.prototype.registerPanel = function (id, panelListEl) {
        this._registeredPanels[id] = panelListEl;
    };

    PanelManager.prototype.hidePanel = function (id) {
        if (this._registeredPanels.hasOwnProperty(id)) {
            this._registeredPanels[id].hide();
            this._logger.debug('Panel :"' + id + '" was hidden.');
        } else {
            this._logger.warn('trying to hide non-registerd panel "' + id + '".');
        }
    };

    PanelManager.prototype.showPanel = function (id) {
        if (this._registeredPanels.hasOwnProperty(id)) {
            this._registeredPanels[id].show();
            this._logger.debug('Panel :"' + id + '" was shown.');
        } else {
            this._logger.warn('trying to show non-registerd panel "' + id + '".');
        }
    };

    return PanelManager;
});