/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Dialogs/ConstraintCheckResults/ConstraintCheckResultsDialog'], function (ConstraintCheckResultsDialog) {
    'use strict';

    var PluginToolbar,
        BADGE_BASE = $('<span class="label label-info"></span>');

    PluginToolbar = function (client) {
        this._client = client;

        this._initialize();
    };

    PluginToolbar.prototype._initialize = function () {
        var toolbar = WebGMEGlobal.Toolbar,
            fillMenuItems,
            $btnExecuteAddOn,
            validateProject,
            checkCallback,
            client = this._client,
            unreadResults = 0,
            BADGE_CLASS = 'label',
            showResults,
            setBadgeText,
            results = [],
            badge;

        setBadgeText = function (text) {
            $btnExecuteAddOn.el.find('.' + BADGE_CLASS).text(text);
        };

        fillMenuItems = function () {

            //clear dropdown
            $btnExecuteAddOn.clear();

            if (client.getRunningAddOnNames().indexOf('ConstraintAddOn') !== -1) {
                //add read menu if needed
                if (results.length > 0) {
                    $btnExecuteAddOn.addButton({
                        title: 'Check results...',
                        text: 'Check results...',
                        clickFn: function () {
                            showResults();
                        }
                    });
                    $btnExecuteAddOn.addDivider();
                }

                $btnExecuteAddOn.addButton({
                    title: 'Validate project',
                    text: 'Validate project',
                    clickFn: function () {
                        validateProject();
                    }
                });
            }
        };

        checkCallback = function (err, result) {
            //console.log(err, result);
            result = result || {};
            result.__error = err;
            result.__time = new Date().getTime();
            result.__unread = true;
            results.splice(0, 0, result);
            unreadResults += 1;
            setBadgeText(unreadResults);
        };
        WebGMEGlobal.Client.setValidationCallback(checkCallback);

        validateProject = function () {
            WebGMEGlobal.Client.validateProjectAsync();
        };


        showResults = function () {
            var dialog = new ConstraintCheckResultsDialog();
            dialog.show(client, results);
            unreadResults = 0;
            setBadgeText('');
        };

        /************** EXECUTE PLUG-IN BUTTON ****************/
        $btnExecuteAddOn = toolbar.addDropDownButton(
            {
                title: 'Check constraints',
                icon: 'glyphicon glyphicon-fire',
                menuClass: 'no-min-width',
                clickFn: function () {
                    fillMenuItems();
                }
            });

        $btnExecuteAddOn.el.find('a > i').css({'margin-top': '0px'});

        badge = BADGE_BASE.clone();
        badge.insertAfter($btnExecuteAddOn.el.find('a > i'));
        badge.css('margin-left', '3px');
    };


    return PluginToolbar;
});
