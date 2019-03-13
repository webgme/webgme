/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'js/logger',
    'js/RunningPluginsDrawer/RunningPluginsDrawer'
], function (Logger, Drawer) {

    'use strict';

    var RunningPluginsDrawerButtonWidget;

    RunningPluginsDrawerButtonWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:RunningPluginsDrawerButtonWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        var drawer,
            config = Drawer.getConfig();

        if (config.useRunningPluginsDrawer === true) {
            drawer = Drawer.createDrawer(this._client, this);
        } else {
            this._button.hide();
        }

        this._logger.debug('Created');
    };

    RunningPluginsDrawerButtonWidget.prototype._initializeUI = function () {
        this._el.empty();

        this._btnContainerEl = $('<div class="btn-group dropup pull-right"></div>');
        this._button = $('<button class="btn btn-micro btn-success">PLUGINS ' +
            '<span class="badge badge-pill badge-light"></span></button>');

        this._button.find('.badge').css({
            'font-size': '8px',
            'vertical-align': 'top',
            position: 'relative'
        });
        this._btnContainerEl.append(this._button);
        this._el.append(this._btnContainerEl);
    };

    RunningPluginsDrawerButtonWidget.prototype.setElementNumber = function (numberOfItems) {
        //TODO we should set a badge that show the number of ongoing plugins
        if (numberOfItems > 0) {
            this._button.find('.badge').html(numberOfItems);
        } else {
            this._button.find('.badge').empty();
        }
    };

    RunningPluginsDrawerButtonWidget.prototype.on = function (event, eventFn) {
        this._button.on(event, eventFn);
    };

    RunningPluginsDrawerButtonWidget.prototype.off = function (event, eventFn) {
        this._button.off(event, eventFn);
    };

    return RunningPluginsDrawerButtonWidget;
});
