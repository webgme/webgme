/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['js/logger',
    'js/Constants',
    'css!./styles/Drawer.css'
], function (Logger, CONSTANTS) {

    'use strict';

    var Drawer,
        DRAWER_CLASS = 'webgme-drawer';

    function _createDrawer(client, buttonEl) {
        if (!WebGMEGlobal.drawer) {
            WebGMEGlobal.drawer = new Drawer(client, buttonEl);
        }

        return WebGMEGlobal.drawer;
    }

    Drawer = function (client, buttonEl) {
        var self = this;

        this._el = $('<div id="webgme-drawer" class=' + DRAWER_CLASS + '/>');

        var table = $('<table class="table table-hover table-dark table-bordered table-sm"></table>'),
            thead = $('<thead><tr>' +
                '<th scope="col">Name</th><th scope="col">Environment</th><th scope="col">Actions</th></tr></thead>');

        this._table = $('<tbody></tbody>');

        table.append(thead);
        table.append(this._table);

        this._logger = Logger.create('gme:Drawer:Drawer', WebGMEGlobal.gmeConfig.client.log);

        this._plugins = [];

        this._button = buttonEl;

        this._client = client;

        this._isOpened = false;

        this._closeBtn = $('<a class="closebtn"><i class="glyphicon glyphicon-eject"></i></a>');
        this._el.append(table);
        this._el.append(this._closeBtn);

        $('body').append(this._el);


        this._button.on('click', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.toggle();
        });

        this._closeBtn.on('click', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.close();
        });

        client.addEventListener(CONSTANTS.CLIENT.PLUGIN_INITIATED, self.onPluginInitiated);
        client.addEventListener(CONSTANTS.CLIENT.PLUGIN_FINISHED, self.onPluginFinished);
    };

    Drawer.prototype.onPluginInitiated = function (sender, event) {
        WebGMEGlobal.drawer._logger.debug('plugin initiated:', {metadata: event});
        WebGMEGlobal.drawer._addPluginEntry(event);
    };

    Drawer.prototype.onPluginFinished = function (sender, event) {
        WebGMEGlobal.drawer._logger.debug('plugin finished:', {metadata: event});
        console.log(event);
        WebGMEGlobal.drawer._removePluginEntry(event.executionId);
    };

    Drawer.prototype._clear = function () {
        this._table.empty();
    };

    Drawer.prototype.open = function () {
        this._el.css('height', '250px');
        this._isOpened = true;
    };

    Drawer.prototype.close = function () {
        this._el.css('height', '0px');
        this._isOpened = false;
    };

    Drawer.prototype.toggle = function () {
        if (this._isOpened) {
            this.close();
        } else {
            this.open();
        }
    };

    Drawer.prototype._removePluginEntry = function (executionId) {
        var self = this,
            abortBtn,
            i;

        for (i = this._plugins.length - 1; i >= 0; i -= 1) {
            if (this._plugins[i].executionId === executionId) {
                this._plugins.splice(i, 1);
            }
        }

        abortBtn = $('#' + executionId).find('button');
        if (abortBtn) {
            abortBtn.prop('disabled', true);
        }
        setTimeout(function () {
            $('#' + executionId).remove();
            self._button.setElementNumber(self._plugins.length);
            if (self._plugins.length === 0) {
                self.close();
            }
        }, 5000);
    };

    Drawer.prototype._addPluginEntry = function (pluginEntry) {
        var entry = '<tr id="' + pluginEntry.executionId + '"><td>',
            client = this._client;

        this._plugins.push(pluginEntry);

        entry += pluginEntry.name || 'N/A';
        entry += '</td><td>';
        entry += pluginEntry.clientSide === true ? 'client' : 'server';
        entry += '</td><td>';
        if (pluginEntry.canBeAborted === true) {
            entry += '<button type="button" class="btn btn-primary">Abort</button>';
            entry += '</td></tr>';
            entry = $(entry);

            entry.find('button').on('click', function (event) {
                event.stopPropagation();
                event.preventDefault();
                client.abortPlugin(pluginEntry.executionId);
            });
        } else {
            entry += '</td></tr>';
            entry = $(entry);
        }


        this._table.append(entry);
        this._button.setElementNumber(this._plugins.length);
    };

    Drawer.prototype._redraw = function () {
        var self = this;
        this._clear();
        this._plugins.forEach(function (pluginEntry) {
            self._addPluginEntry(pluginEntry);
        });
    };

    return {createDrawer: _createDrawer};
});