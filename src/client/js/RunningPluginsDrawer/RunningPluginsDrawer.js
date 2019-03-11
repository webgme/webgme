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
    'js/Utils/ComponentSettings',
    'moment',
    'ejs',
    'text!./templates/Entry.html',
    'css!./styles/RunningPluginsDrawer.css'
], function (
    Logger,
    CONSTANTS,
    PluginResultsDialog,
    PluginResult,
    PluginConfigDialog,
    ComponentSettings,
    moment,
    ejs,
    PluginEntryTemplate) {

    'use strict';

    var RunningPluginsDrawer,
        DRAWER_CLASS = 'webgme-running-plugin-drawer',
        STAY_ALIVE_TIME = 5000,
        CLOCK_TICK_TIME = 5000,
        drawer = null;

    function _createDrawer(client, buttonEl) {
        if (!drawer) {
            drawer = new RunningPluginsDrawer(client, buttonEl);
        }

        return drawer;
    }

    function _getDefaultConfig() {
        return {
            useRunningPluginsDrawer: true
        };
    }

    function _getComponentId() {
        return 'GenericUIPluginNotification';
    }

    function _getConfig() {
        return ComponentSettings.resolveWithWebGMEGlobal(_getDefaultConfig(), _getComponentId());
    }

    RunningPluginsDrawer = function (client, buttonEl) {
        var self = this;

        this._el = $('<div id="webgme-drawer" class=' + DRAWER_CLASS + '/>');

        var table = $('<table class="table table-hover table-dark table-bordered table-sm"></table>'),
            thead = $('<thead><tr><th scope="col">Name</th><th scope="col">Environment</th>' +
                '<th scope="col">Configuration</th><th scope="col">Running</th>' +
                '<th scope="col">Actions</th></tr></thead>');

        this._table = $('<tbody></tbody>');

        table.append(thead);
        table.append(this._table);

        this._logger = Logger.create('gme:RunningPluginsDrawer:RunningPluginsDrawer', WebGMEGlobal.gmeConfig.client.log);

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
        }, CLOCK_TICK_TIME);

        client.addEventListener(CONSTANTS.CLIENT.PLUGIN_INITIATED, self.onPluginInitiated);
        client.addEventListener(CONSTANTS.CLIENT.PLUGIN_FINISHED, self.onPluginFinished);
    };

    RunningPluginsDrawer.prototype.getComponentId = function () {
        return _getComponentId();
    };

    RunningPluginsDrawer.prototype.getDefaultConfig = function () {
        return _getDefaultConfig();
    };

    RunningPluginsDrawer.prototype.getConfig = function () {
        return _getConfig();
    };

    RunningPluginsDrawer.prototype.onPluginInitiated = function (sender, event) {
        drawer._logger.debug('plugin initiated:', {metadata: event});
        drawer._addPluginEntry(event);
    };

    RunningPluginsDrawer.prototype.onPluginFinished = function (sender, event) {
        drawer._logger.debug('plugin finished:', {metadata: event});
        drawer._addResultButton(event);
        drawer._removePluginEntry(event.executionId);
    };

    RunningPluginsDrawer.prototype._clear = function () {
        this._table.empty();
    };

    RunningPluginsDrawer.prototype.open = function () {
        this._el.css('height', '250px');
        this._isOpened = true;
    };

    RunningPluginsDrawer.prototype.close = function () {
        this._el.css('height', '0px');
        this._isOpened = false;
    };

    RunningPluginsDrawer.prototype.toggle = function () {
        if (this._isOpened) {
            this.close();
        } else {
            this.open();
        }
    };

    RunningPluginsDrawer.prototype._removePluginEntry = function (executionId) {
        var i;

        for (i = this._plugins.length - 1; i >= 0; i -= 1) {
            if (this._plugins[i].executionId === executionId) {
                this._plugins.splice(i, 1);
            }
        }
        this._button.setElementNumber(this._plugins.length);

        setTimeout(function () {
            $('#' + executionId).remove();
        }, STAY_ALIVE_TIME);
    };

    RunningPluginsDrawer.prototype._viewConfig = function (pluginEntry) {
        var dialog = new PluginConfigDialog({client: this._client});

        dialog.displayConfig(pluginEntry.metadata, pluginEntry.context.pluginConfig, function () {
            //TODO should we even handle it? - or should we just remove from the function
        });
    };

    RunningPluginsDrawer.prototype._addPluginEntry = function (pluginEntry) {
        var self = this,
            entry = $(ejs.render(PluginEntryTemplate, {entry: pluginEntry})),
            client = this._client;

        console.log('PE:', pluginEntry);
        this._plugins.push(pluginEntry);

        if (pluginEntry.canBeAborted !== true) {
            entry.find('.action_btn').find('button').prop('disabled', true);
        } else {
            entry.find('.action_btn').find('button').on('click', function (event) {
                event.stopPropagation();
                event.preventDefault();
                client.abortPlugin(pluginEntry.executionId);
            });
        }

        if (Object.keys(pluginEntry.context.pluginConfig).length === 0) {
            entry.find('.config_btn').prop('disabled', true);
        } else {
            entry.find('.config_btn').on('click', function (event) {
                event.stopPropagation();
                event.preventDefault();
                self._viewConfig(pluginEntry);
            });
        }

        this._table.append(entry);
        this._button.setElementNumber(this._plugins.length);
        this._refreshTimes();
    };

    RunningPluginsDrawer.prototype._redraw = function () {
        var self = this;
        this._clear();
        this._plugins.forEach(function (pluginEntry) {
            self._addPluginEntry(pluginEntry);
        });
    };

    RunningPluginsDrawer.prototype._refreshTimes = function () {
        this._plugins.forEach(function (pluginEntry) {
            $('#' + pluginEntry.executionId).find('.time_field')
                .text(moment().diff(pluginEntry.start, 'seconds') + 's');
        });
    };

    RunningPluginsDrawer.prototype._addResultButton = function (pluginEntry) {
        var action = $('.action_field'),
            client = this._client;

        action.empty();
        action.append('<button type="button" class="btn btn-primary">Show result</button>');
        action.find('button').on('click', function (/*event*/) {
            var dialog = new PluginResultsDialog();
            dialog.show(client, [new PluginResult(pluginEntry.result)], null);
        });

    };

    return {createDrawer: _createDrawer, getConfig: _getConfig};
});