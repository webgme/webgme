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
            var pluginIds = WebGMEGlobal.gmeConfig.plugin.displayAll ? WebGMEGlobal.allPlugins :
                    client.filterPlugins(WebGMEGlobal.allPlugins, WebGMEGlobal.State.getActiveObject()),
                executeClickFunction = function (data) {
                    executePlugin(data);
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
                if (pluginIds.length > 0) {
                    self.$btnExecutePlugin.addDivider();
                }
            }

            //add plugin names
            pluginIds.forEach(function (pluginId) {
                var params = {
                        title: pluginId,
                        text: pluginId,
                        data: {
                            id: pluginId,
                            icon: 'glyphicon glyphicon-cog'
                        },
                        clickFn: executeClickFunction,
                        icon: $('<i class="plugin-icon glyphicon glyphicon-cog"/>')
                    },
                    metadata = WebGMEGlobal.allPluginsMetadata[pluginId],
                    iconPath;

                // TODO: In next version use metadata for all
                if (metadata) {
                    params.data = metadata;
                    if (metadata.icon.src) {
                        params.icon = $('<img/>', {
                            src: ['/plugin', metadata.id, metadata.id, metadata.icon.src].join('/')
                        });
                    } else {
                        params.icon = $('<i/>');
                    }

                    params.icon.addClass('plugin-icon ' + metadata.icon.class);
                    params.text = metadata.name;
                    params.title = metadata.id + ' v' + metadata.version + ' - ' + metadata.description;
                } else {
                    console.warn('Plugin [', pluginId, '] did not have metadata. In v2.0.0 plugins without metadata ' +
                        'will no longer be supported.');
                }

                params.icon.css({
                    width: '14px',
                    'margin-right': '4px'
                });

                self.$btnExecutePlugin.addButton(params);
            });
        };

        executePlugin = function (data) {
            WebGMEGlobal.InterpreterManager.run(data, null, function (result) {
                result.__unread = true;
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
