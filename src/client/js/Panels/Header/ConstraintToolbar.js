/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define(['js/Dialogs/ConstraintCheckResults/ConstraintCheckResultsDialog'], function (ConstraintCheckResultsDialog) {

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
            validateProject,
            checkCallback,
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
                    "title" : 'Check results...',
                    "text" : 'Check results...',
                    "clickFn": function () {
                        showResults();
                    }
                });
                $btnExecutePlugin.addDivider();
            }

            $btnExecutePlugin.addButton({
                "title" : 'Validate project',
                "text" : 'Validate project',
                "clickFn": function () {
                    validateProject();
                }
            });


        };

        checkCallback = function(err,result){
            console.log(err,result);
            result = result || {};
            result.__error = err;
            result.__time = new Date().getTime();
            result.__unread = true;
            results.splice(0,0,result);
            unreadResults+=1;
            setBadgeText(unreadResults);
        };
        WebGMEGlobal.Client.setValidationCallback(checkCallback);

        validateProject = function(){
            WebGMEGlobal.Client.validateProjectAsync();
        };


        showResults = function () {
            var dialog = new ConstraintCheckResultsDialog();
            dialog.show(client,results);
            unreadResults = 0;
            setBadgeText('');
        };

        /************** EXECUTE PLUG-IN BUTTON ****************/
        $btnExecutePlugin = toolbar.addDropDownButton(
            { "title": "Execute plug-in",
                "icon": "glyphicon glyphicon-fire",
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
