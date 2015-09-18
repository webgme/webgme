/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/Dialogs/ConstraintCheckResults/ConstraintCheckResultsDialog'], function (ConstraintCheckResultsDialog) {
    'use strict';

    var MetaRulesToolbar,
        BADGE_BASE = $('<span class="label label-info"></span>');

    MetaRulesToolbar = function (client) {
        this._client = client;

        this._initialize();
    };

    MetaRulesToolbar.prototype._initialize = function () {
        var self = this,
            toolbar = WebGMEGlobal.Toolbar,
            fillMenuItems,
            $btnCheckMetaRules,
            unreadResults = 0,
            BADGE_CLASS = 'label',
            showResults,
            setBadgeText,
            results = [],
            badge;

        setBadgeText = function (text) {
            $btnCheckMetaRules.el.find('.' + BADGE_CLASS).text(text);
        };

        fillMenuItems = function () {
            var activeNode;
            $btnCheckMetaRules.clear();

            if (self._client.getActiveProjectId()) {
                if (results.length > 0) {
                    $btnCheckMetaRules.addButton({
                        title: 'Show results...',
                        text: 'Show results...',
                        clickFn: function () {
                            showResults();
                        }
                    });
                    $btnCheckMetaRules.addDivider();
                }

                $btnCheckMetaRules.addButton({
                    title: 'Check meta rules for entire project',
                    text: 'Check meta rules for entire project',
                    clickFn: function () {
                        self._client.checkMetaRules([''], true);
                    }
                });

                activeNode = WebGMEGlobal.State.getActiveObject();
                if (activeNode) {
                    $btnCheckMetaRules.addButton({
                        title: 'Check meta rules model',
                        text: 'Check meta rules for model [' + activeNode + ']',
                        clickFn: function () {
                            self._client.checkMetaRules([activeNode], true);
                        }
                    });
                    $btnCheckMetaRules.addButton({
                        title: 'Check meta rules model',
                        text: 'Check meta rules for node [' + activeNode + '] and its children...',
                        clickFn: function () {
                            self._client.checkMetaRules([activeNode], true);
                        }
                    });
                }
            } else {
                $btnCheckMetaRules.addButton({
                    title: 'No Project is opened',
                    text: 'No Project is opened...',
                    clickFn: function () {
                    }
                });
            }
        };

        function onResults(emitter, results_) {
            var i,
                result;

            for (i = 0; i < results_.length; i += 1) {
                result = results_[i];
                result.__time = new Date().getTime();
                result.__unread = true;
                results.splice(0, 0, result);
                unreadResults += 1;
                setBadgeText(unreadResults);
            }
        }

        self._client.addEventListener(self._client.CONSTANTS.META_RULES_RESULT, onResults);

        showResults = function () {
            var dialog = new ConstraintCheckResultsDialog('Meta Rules Validation Results');
            dialog.show(self._client, results);
            unreadResults = 0;
            setBadgeText('');
        };

        /************** CHECK META RULES BUTTON ****************/
        $btnCheckMetaRules = toolbar.addDropDownButton(
            {
                title: 'Meta Rules',
                icon: 'glyphicon glyphicon-ok-sign',
                menuClass: 'no-min-width',
                clickFn: function () {
                    fillMenuItems();
                }
            });

        $btnCheckMetaRules.el.find('a > i').css({'margin-top': '0px'});

        badge = BADGE_BASE.clone();
        badge.insertAfter($btnCheckMetaRules.el.find('a > i'));
        badge.css('margin-left', '3px');
    };


    return MetaRulesToolbar;
});
