/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'js/Drawer/Drawer'
], function (Logger, Drawer) {

    'use strict';

    var DrawerOpenWidget;

    DrawerOpenWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:DrawerOpenWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        Drawer.createDrawer(this._client, this);

        this._logger.debug('Created');
    };

    DrawerOpenWidget.prototype._initializeUI = function () {
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

    DrawerOpenWidget.prototype.setElementNumber = function (numberOfItems) {
        //TODO we should set a badge that show the number of ongoing plugins
        if (numberOfItems > 0) {
            this._button.prop('disabled', false);
            this._button.find('.badge').html(numberOfItems);
        } else {
            this._button.prop('disabled', true);
            this._button.find('.badge').empty();
        }
    };

    DrawerOpenWidget.prototype.on = function (event, eventFn) {
        this._button.on(event, eventFn);
    };

    DrawerOpenWidget.prototype.off = function (event, eventFn) {
        this._button.off(event, eventFn);
    };

    return DrawerOpenWidget;
});