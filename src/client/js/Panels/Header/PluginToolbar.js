/*globals define, WebGMEGlobal, $*/
/*jshint browser: true */
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Dialogs/PluginResults/PluginResultsDialog'], function (PluginResultsDialog) {
    'use strict';

    var PluginToolbar,
        BADGE_BASE = $('<span class="label label-info"></span>');

    PluginToolbar = function (client) {
        this._client = client;
        this._results = [];
        this.$btnExecutePlugin = null;
        this._initialize();
    };

    PluginToolbar.prototype._initialize = function () {
        var self = this,
            toolbar = WebGMEGlobal.Toolbar,
            fillMenuItems,
            executePlugin,
            client = this._client,
            unreadResults = 0,
            BADGE_CLASS = 'label',
            showResults,
            setBadgeText,
            badge;

        setBadgeText = function (text) {
            self.$btnExecutePlugin.el.find('.' + BADGE_CLASS).text(text);
        };

        fillMenuItems = function () {
            var pluginNames = WebGMEGlobal.gmeConfig.plugin.displayAll ? WebGMEGlobal.allPlugins :
                    client.filterPlugins(WebGMEGlobal.allPlugins, WebGMEGlobal.State.getActiveObject()),
                i, executeClickFunction = function (data) {
                    executePlugin(data.name);
                };

            //clear dropdown
            self.$btnExecutePlugin.clear();

            //add read menu if needed
            if (self._results.length > 0) {
                self.$btnExecutePlugin.addButton({
                    title: 'Show results...',
                    text: 'Show results...',
                    clickFn: function () {
                        showResults();
                    }
                });
                if (pluginNames.length > 0) {
                    self.$btnExecutePlugin.addDivider();
                }
            }

            //add plugin names
            for (i = 0; i < pluginNames.length; i++) {
                self.$btnExecutePlugin.addButton({
                    title: 'Run ' + pluginNames[i],
                    text: 'Run ' + pluginNames[i],
                    data: {name: pluginNames[i]},
                    clickFn: executeClickFunction
                });
            }
        };

        executePlugin = function (name) {
            WebGMEGlobal.InterpreterManager.run(name, null, function (result) {
                self._results.__unread = true;
                self._results.splice(0, 0, result);
                self.$btnExecutePlugin.el.find('.btn').disable(false);
                unreadResults += 1;
                if (unreadResults > 0) {
                    setBadgeText(unreadResults);
                }
            });
        };

        showResults = function () {
            var dialog = new PluginResultsDialog();
            dialog.show(client, self._results);
            unreadResults = 0;
            setBadgeText('');
        };

        /************** EXECUTE PLUG-IN BUTTON ****************/
        this.$btnExecutePlugin = toolbar.addDropDownButton(
            {
                title: 'Execute plug-in',
                icon: 'glyphicon glyphicon-play',
                menuClass: 'no-min-width',
                clickFn: function () {
                    fillMenuItems();
                }
            });

        this.$btnExecutePlugin.el.find('a > i').css({'margin-top': '0px'});

        badge = BADGE_BASE.clone();
        badge.insertAfter(this.$btnExecutePlugin.el.find('a > i'));
        badge.css('margin-left', '3px');
    };

    PluginToolbar.prototype.disableButtons = function (disable) {
        disable = disable && this._results.length === 0;
        this.$btnExecutePlugin.el.find('.btn').disable(disable);
    };

    return PluginToolbar;
});
