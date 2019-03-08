/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['js/logger',
    'js/Constants',
    'js/Dialogs/PluginResults/PluginResultsDialog',
    'plugin/PluginResult',
    'js/Dialogs/PluginConfig/PluginConfigDialog',
    'css!./styles/Drawer.css'
], function (Logger, CONSTANTS, PluginResultsDialog, PluginResult, PluginConfigDialog) {

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
            thead = $('<thead><tr><th scope="col">Name</th><th scope="col">Environment</th>' +
                '<th scope="col">Configuration</th><th scope="col">Running</th>' +
                '<th scope="col">Actions</th></tr></thead>');

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


        setInterval(function () {
            self._refreshTimes();
        }, 1000);

        client.addEventListener(CONSTANTS.CLIENT.PLUGIN_INITIATED, self.onPluginInitiated);
        client.addEventListener(CONSTANTS.CLIENT.PLUGIN_FINISHED, self.onPluginFinished);
    };

    Drawer.prototype.onPluginInitiated = function (sender, event) {
        WebGMEGlobal.drawer._logger.debug('plugin initiated:', {metadata: event});
        WebGMEGlobal.drawer._addPluginEntry(event);
    };

    Drawer.prototype.onPluginFinished = function (sender, event) {
        WebGMEGlobal.drawer._logger.debug('plugin finished:', {metadata: event});
        WebGMEGlobal.drawer._addResultButton(event);
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
            sizeWithoutMe,
            i;

        for (i = this._plugins.length - 1; i >= 0; i -= 1) {
            if (this._plugins[i].executionId === executionId) {
                this._plugins.splice(i, 1);
            }
        }
        sizeWithoutMe = this._plugins.length;

        setTimeout(function () {
            $('#' + executionId).remove();
            self._button.setElementNumber(sizeWithoutMe);
            if (sizeWithoutMe === 0) {
                self.close();
            }
        }, 5000);
    };

    Drawer.prototype._viewConfig = function (pluginEntry) {
        var dialog = new PluginConfigDialog({client: this._client});

        dialog.displayConfig(pluginEntry.metadata, pluginEntry.context.pluginConfig, function () {
            //TODO should we even handle it? - or should we just remove from the function
        });
    };

    Drawer.prototype._addPluginEntry = function (pluginEntry) {
        var self = this,
            entry = '<tr id="' + pluginEntry.executionId + '"><td>',
            client = this._client;

        this._plugins.push(pluginEntry);

        entry += pluginEntry.name || 'N/A';
        entry += '</td><td>';
        entry += pluginEntry.clientSide === true ? 'client' : 'server';
        entry += '</td><td style="text-align:center;"><button id="' + pluginEntry.executionId +
            '_config" type="button" class="btn btn-primary">Check</button></td>';
        entry += '</td><td id="' + pluginEntry.executionId + '_time">';
        //running time
        entry += (Math.round((new Date()).getTime() / 1000) -
            Math.round(pluginEntry.start / 1000)) + 's';
        entry += '</td><td id="' + pluginEntry.executionId + '_action" style="text-align:center;">';

        if (pluginEntry.canBeAborted === true) {
            entry += '<button type="button" class="btn btn-primary">Abort</button>';
            entry += '</td></tr>';
            entry = $(entry);

            entry.find('#' + pluginEntry.executionId + '_action').find('button').on('click', function (event) {
                event.stopPropagation();
                event.preventDefault();
                client.abortPlugin(pluginEntry.executionId);
            });
        } else {
            entry += '</td></tr>';
            entry = $(entry);
        }

        if (Object.keys(pluginEntry.context.pluginConfig).length === 0) {
            entry.find('#' + pluginEntry.executionId + '_config').prop('disabled', true);
        } else {
            entry.find('#' + pluginEntry.executionId + '_config').on('click', function (event) {
                event.stopPropagation();
                event.preventDefault();
                self._viewConfig(pluginEntry);
            });
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

    Drawer.prototype._refreshTimes = function () {
        var self = this,
            now = Math.round((new Date()).getTime() / 1000);

        this._plugins.forEach(function (pluginEntry) {
            $('#' + pluginEntry.executionId + '_time')
                .text((now - Math.round(pluginEntry.start / 1000)) + 's');
        });
    };

    Drawer.prototype._addResultButton = function (pluginEntry) {
        var action = $('#' + pluginEntry.executionId + '_action'),
            client = this._client;

        action.empty();
        action.append('<button type="button" class="btn btn-primary">Show result</button>');
        action.find('button').on('click', function (/*event*/) {
            var dialog = new PluginResultsDialog();
            dialog.show(client, [new PluginResult(pluginEntry.result)], null);
        });

    };

    return {createDrawer: _createDrawer};
});