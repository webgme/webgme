/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'js/RunningPluginDrawer/RunningPluginDrawer'
], function (Logger, Drawer) {

    'use strict';

    var RunningPluginDrawerButtonWidget;

    RunningPluginDrawerButtonWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:RunningPluginDrawerButtonWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        var drawer = Drawer.createDrawer(this._client, this),
            config = drawer.getConfig();

        if (config.useRunningPluginDrawer !== true) {
            this._button.hide();
        }

        this._logger.debug('Created');
    };

    RunningPluginDrawerButtonWidget.prototype._initializeUI = function () {
        this._el.empty();

        this._btnContainerEl = $('<div class="btn-group dropup pull-right"></div>');
        this._button = $('<button class="btn btn-micro btn-success">Plugins ' +
            '<span class="badge badge-pill badge-light"></span></button>');

        this._button.find('.badge').css({
            'font-size': '8px',
            'vertical-align': 'top',
            height: '10px',
            top: '2px',
            position: 'relative'
        });
        this._btnContainerEl.append(this._button);
        this._el.append(this._btnContainerEl);

        this._button.prop('disabled', true);
    };

    RunningPluginDrawerButtonWidget.prototype.setElementNumber = function (numberOfItems) {
        //TODO we should set a badge that show the number of ongoing plugins
        if (numberOfItems > 0) {
            this._button.prop('disabled', false);
            this._button.find('.badge').html(numberOfItems);
        } else {
            this._button.prop('disabled', true);
            this._button.find('.badge').empty();
        }
    };

    RunningPluginDrawerButtonWidget.prototype.on = function (event, eventFn) {
        this._button.on(event, eventFn);
    };

    RunningPluginDrawerButtonWidget.prototype.off = function (event, eventFn) {
        this._button.off(event, eventFn);
    };

    return RunningPluginDrawerButtonWidget;
});