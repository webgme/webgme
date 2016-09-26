/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger', 'js/Constants'], function (Logger, CONSTANTS) {

    'use strict';

    var PanelManager;

    PanelManager = function () {
        this._logger = Logger.create('gme:PanelManager:PanelManager', WebGMEGlobal.gmeConfig.client.log);
        this._activePanel = undefined;
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

            WebGMEGlobal.State.registerActiveVisualizer(this._activePanel[CONSTANTS.VISUALIZER_PANEL_IDENTIFIER]);
        }

        WebGMEGlobal.KeyboardManager.captureFocus();
    };

    PanelManager.prototype.getActivePanel = function () {
        return this._activePanel;
    };

    return PanelManager;
});