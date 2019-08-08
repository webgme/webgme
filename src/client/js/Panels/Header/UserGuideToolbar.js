/*globals define, WebGMEGlobal, $*/
/*jshint browser: true */
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Dialogs/PluginResults/PluginResultsDialog',
    'common/util/guid',
    'js/RunningPluginsDrawer/RunningPluginsDrawer',
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/CodeEditor/CodeEditorDialog',
    'js/Utils/ComponentSettings'
], function (PluginResultsDialog, GUID, RunningPluginsDrawer, ProjectsDialog, CodeEditorDialog, ComponentSettings) {
    'use strict';

    var UserGuideToolbar,
        DEFAULT_ICON_CLASS = 'glyphicon glyphicon-question-sign',
        BADGE_BASE = $('<span class="label label-info"></span>'),
        BASIC_PREFIX = 'BASIC_',
        PROJECT_PREFIX = 'PROJECT_';

    UserGuideToolbar = function (client) {
        this._client = client;
        this._results = [];
        this._manager = WebGMEGlobal.UserGuidesManager;
        this._button = null;
        this._initialize();
    };

    UserGuideToolbar.prototype.getDefaultConfig = function () {
        return {};
    };

    UserGuideToolbar.prototype.getComponentId = function () {
        return 'GenericUIUserGuideToolbar';
    };

    UserGuideToolbar.prototype.getConfig = function () {
        return ComponentSettings.resolveWithWebGMEGlobal(this.getDefaultConfig(), this.getComponentId());
    };

    UserGuideToolbar.prototype._initialize = function () {
        const self = this;
        const toolbar = WebGMEGlobal.Toolbar;

        /************** Drop-down BUTTON ****************/
        this._button = toolbar.addDropDownButton(
            {
                title: 'User-guides',
                icon: 'glyphicon glyphicon-question-sign',
                menuClass: 'no-min-width',
                clickFn: function () {
                    self._fillMenuItems();
                }
            });

        this._button.el.find('a > i').css({'margin-top': '0px'});

        let badge = BADGE_BASE.clone();
        badge.insertAfter(this._button.el.find('a > i'));
        badge.css('margin-left', '3px');
    };

    UserGuideToolbar.prototype.__initialize = function () {
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

        self._usePopUpNotification = self.getConfig().disablePopUpNotification !== true;


        setBadgeText = function (text) {
            self.$btnExecutePlugin.el.find('.' + BADGE_CLASS).text(text);
        };

        fillMenuItems = function () {
            var pluginIds = WebGMEGlobal.gmeConfig.plugin.displayAll ? WebGMEGlobal.allPlugins :
                client.filterPlugins(WebGMEGlobal.allPlugins, WebGMEGlobal.State.getActiveObject()),
                executeClickFunction = function (data) {
                    executePlugin(data);
                },
                projectAccess = client.getProjectAccess();

            //clear dropdown
            self.$btnExecutePlugin.clear();

            //add read menu if needed
            if (self._results.length > 0) {
                self.$btnExecutePlugin.addButton({
                    title: 'Show results...',
                    text: 'Show results...',
                    clickFn: function () {
                        var resultId;
                        if (unreadResults === 1 && self._results.length > 0) {
                            resultId = self._results[0].__id;
                        }

                        showResults(resultId);
                    }
                });
                if (pluginIds.length > 0) {
                    self.$btnExecutePlugin.addDivider();
                }
            }

            //add plugin names
            pluginIds.forEach(function (pluginId) {
                var metadata = WebGMEGlobal.allPluginsMetadata[pluginId],
                    params = {
                        title: metadata.id + ' v' + metadata.version + ' - ' + metadata.description,
                        text: metadata.name,
                        data: metadata,
                        clickFn: executeClickFunction,
                        disabled: metadata.writeAccessRequired === true && projectAccess.write === false,
                        icon: $('<i class="plugin-icon"/>')
                    };

                if (metadata.icon.src) {
                    params.icon = $('<img/>', {
                        src: ['/plugin', metadata.id, metadata.id, metadata.icon.src].join('/')
                    });
                    params.icon.addClass(metadata.icon.class);
                } else if (metadata.icon.class) {
                    params.icon.addClass(metadata.icon.class);
                } else {
                    params.icon.addClass(DEFAULT_ICON_CLASS);
                }

                params.icon.addClass('plugin-icon');

                params.icon.css({
                    width: '14px',
                    'margin-right': '4px'
                });

                self.$btnExecutePlugin.addButton(params);
            });
        };

        executePlugin = function (data) {
            WebGMEGlobal.InterpreterManager.configureAndRun(data, function (result) {
                if (result === false) {
                    // Aborted in dialog.
                    return;
                }

                var metadata = WebGMEGlobal.allPluginsMetadata[result.pluginId],
                    msg = ' ' + metadata.id + ' ',
                    note;

                result.__unread = true;
                result.__id = GUID();

                self._results.splice(0, 0, result);
                self.$btnExecutePlugin.el.find('.btn').disable(false);
                unreadResults += 1;

                if (result.success) {
                    msg += 'finished with success! (click for details)';
                } else {
                    msg += 'failed (click for details), error: ' + result.error;
                }

                if (self._usePopUpNotification) {
                    note = $.notify({
                        icon: metadata.icon.class ? metadata.icon.class : DEFAULT_ICON_CLASS,
                        message: msg
                    }, {
                        delay: 10000,
                        type: result.success ? 'success' : 'danger',
                        offset: {
                            x: 20,
                            y: 37
                        },
                        mouse_over: 'pause',
                        onClose: function () {
                            note.$ele.off();
                        }
                    });

                    note.$ele.css('cursor', 'pointer');

                    note.$ele.on('click', function () {
                        if (self._results.length > 0) {
                            showResults(result.__id);
                        }

                        note.close();
                    });
                }


                if (unreadResults > 0) {
                    setBadgeText(unreadResults);
                }
            });
        };

        showResults = function (resultId) {
            var dialog = new PluginResultsDialog();
            dialog.show(client, self._results, resultId);
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

    UserGuideToolbar.prototype._fillBasicGuides = function () {
        const self = this;
        let params;

        //open-create-guide
        params = {
            text: 'Open/Create project',
            title: 'See how to open a project or create a new one.',
            clickFn: function () {
                self._openCreateGuide();
            }
        };

        self._button.addButton(params);
    };

    UserGuideToolbar.prototype._fillProjectGuides = function () {

    };

    UserGuideToolbar.prototype._fillMenuItems = function () {
        const self = this;

        self._button.clear();
        self._fillBasicGuides();
        self._button.addDivider();
        self._fillProjectGuides();
        self._button.addDivider();
        self._button.addButton({
            text: 'Edit...',
            title: 'Edit the project guides',
            clickFn: function () {
                self._editProjectGuides();
            }
        });
    };

    UserGuideToolbar.prototype._openCreateGuide = function () {
        const pd = new ProjectsDialog(this._client);
        pd.show(true);
    };

    UserGuideToolbar.prototype._runGuide = function (id) {

    };

    UserGuideToolbar.prototype._editProjectGuides = function () {
        const dialog = new CodeEditorDialog();
        let params = {};
        params.value = 'something';
        params.name = '_guides';
        params.activeObject = '';

        dialog.show(params);
    };

    UserGuideToolbar.prototype.disableButtons = function (disable) {
        // disable = disable && this._results.length === 0;
        // this.$btnExecutePlugin.el.find('.btn').disable(disable);
    };

    return UserGuideToolbar;
});
