/*globals define, _, WebGMEGlobal*/

define(['js/logger', 'js/Constants', 'js/RegistryKeys'], function (Logger, CONSTANTS, REGISTRY_KEYS) {

    'use strict';

    var PanelManager;

    PanelManager = function (client) {
        this._logger = Logger.create('gme:PanelManager:PanelManager', WebGMEGlobal.gmeConfig.client.log);
        this._client = client;
        this._activePanel = undefined;
        this._loadedPanels = {};
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

    //PanelManager.prototype.registerPanels = function (panelMap) {
    //    var self = this;
    //    this._loadedPanels = panelMap;
    //    WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, function (model, nodePath) {
    //        var node,
    //            panelId,
    //            validPanels;
    //        self._logger.debug('STATE_ACTIVE_OBJECT');
    //        if (nodePath || nodePath === CONSTANTS.PROJECT_ROOT_ID) {
    //            //node = self._client.getNode(nodePath); TODO: Register valid panels on each node
    //            node = self._client.getNode(CONSTANTS.PROJECT_ROOT_ID);
    //            validPanels = node.getRegistry(REGISTRY_KEYS.VALID_PANELS);
    //            if (validPanels) {
    //                self._logger.debug('validPanels set for root', validPanels);
    //                validPanels = validPanels.split(' ');
    //            }
    //        } else {
    //            self._logger.debug('nodePath not given');
    //        }
    //        self._logger.debug('about to hide/show panels');
    //        for (panelId in self._loadedPanels) {
    //            if (self._loadedPanels.hasOwnProperty(panelId)) {
    //                if (validPanels) {
    //                    if (validPanels.indexOf(panelId) > -1) {
    //                        self._loadedPanels[panelId].listEl.show();
    //                    } else {
    //                        self._loadedPanels[panelId].listEl.hide();
    //                    }
    //                } else {
    //                    self._loadedPanels[panelId].listEl.show();
    //                }
    //            }
    //        }
    //        self._logger.debug('hide/show panels done');
    //    });
    //    WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_PROJECT_NAME, function () {
    //        self._logger.debug('STATE_ACTIVE_PROJECT_NAME', arguments);
    //    });
    //};
    //
    //PanelManager.prototype.hidePanel = function (id) {
    //    if (this._loadedPanels.hasOwnProperty(id)) {
    //        this._loadedPanels[id].listEl.hide();
    //        this._logger.debug('Panel :"' + id + '" was hidden.');
    //    } else {
    //        this._logger.warn('trying to hide non-registerd panel "' + id + '".');
    //    }
    //};
    //
    //PanelManager.prototype.showPanel = function (id) {
    //    if (this._loadedPanels.hasOwnProperty(id)) {
    //        this._loadedPanels[id].listEl.show();
    //        this._logger.debug('Panel :"' + id + '" was shown.');
    //    } else {
    //        this._logger.warn('trying to show non-registerd panel "' + id + '".');
    //    }
    //};

    return PanelManager;
});