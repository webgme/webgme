/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define(['js/Dialogs/PluginResults/PluginResultsDialog'], function (PluginResultsDialog) {

    "use strict";

    var PluginToolbar,
        BADGE_BASE = $('<span class="label label-info"></span>');

    PluginToolbar = function (client) {
        this._client = client;

        this._initialize();
    };

    PluginToolbar.prototype._initialize = function () {
        var toolbar = WebGMEGlobal.Toolbar,
            fillMenuItems,
            $btnExecutePlugin,
            executePlugin,
            client = this._client,
            unreadResults = 0,
            BADGE_CLASS = 'label',
            showResults,
            setBadgeText,
            results = [];

        setBadgeText = function (text) {
            $btnExecutePlugin.el.find('.' + BADGE_CLASS).text(text);
        };

        fillMenuItems = function () {
            var pluginNames = client.getAvailableInterpreterNames();

            //clear dropdown
            $btnExecutePlugin.clear();

            //add read menu if needed
            if (results.length > 0) {
                $btnExecutePlugin.addButton({
                    "title" : 'Show results...',
                    "text" : 'Show results...',
                    "clickFn": function () {
                        showResults();
                    }
                });
                $btnExecutePlugin.addDivider();
            }

            //add plugin names
            for(var i = 0; i < pluginNames.length ; i++){
                $btnExecutePlugin.addButton({
                    "title" : 'Run ' + pluginNames[i],
                    "text" : 'Run ' + pluginNames[i],
                    "data" : {name:pluginNames[i]},
                    "clickFn": function (data) {
                        executePlugin(data.name);
                    }
                });
            }
        };

        executePlugin = function( name ){
            WebGMEGlobal.InterpreterManager.run(name, null, function(result){
                result.__unread = true;
                results.splice(0, 0, result);
                unreadResults += 1;
                if (unreadResults > 0) {
                    setBadgeText(unreadResults);
                }
            });
        };

        showResults = function () {
            var dialog = new PluginResultsDialog();
            dialog.show(client,results);
            unreadResults = 0;
            setBadgeText('');
        };

        /************** EXECUTE PLUG-IN BUTTON ****************/
        $btnExecutePlugin = toolbar.addDropDownButton(
            { "title": "Execute plug-in",
                "icon": "glyphicon glyphicon-play",
                "menuClass": "no-min-width",
                'clickFn': function () {
                    fillMenuItems();
                }
            });

        $btnExecutePlugin.el.find('a > i').css({'margin-top': '0px'});

        var badge = BADGE_BASE.clone();
        badge.insertAfter($btnExecutePlugin.el.find('a > i'));
        badge.css('margin-left', '3px');
    };



    return PluginToolbar;
});
