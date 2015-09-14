/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Dialogs/ConstraintCheckResults/ConstraintCheckResultsDialog'], function (ConstraintCheckResultsDialog) {
    'use strict';

    var ConstraintToolbar,
        BADGE_BASE = $('<span class="label label-info"></span>');

    ConstraintToolbar = function (client) {
        this._client = client;

        this._initialize();
    };

    ConstraintToolbar.prototype._initialize = function () {
        var self = this,
            toolbar = WebGMEGlobal.Toolbar,
            fillMenuItems,
            $btnCheckConstraint,
            unreadResults = 0,
            BADGE_CLASS = 'label',
            showResults,
            setBadgeText,
            results = [],
            badge;

        setBadgeText = function (text) {
            $btnCheckConstraint.el.find('.' + BADGE_CLASS).text(text);
        };

        fillMenuItems = function () {
            var activeNode;
            //clear dropdown
            $btnCheckConstraint.clear();

            if (self._client.getActiveProjectId()) {
                if (results.length > 0) {
                    $btnCheckConstraint.addButton({
                        title: 'Show results...',
                        text: 'Show results...',
                        clickFn: function () {
                            showResults();
                        }
                    });
                    $btnCheckConstraint.addDivider();
                }

                $btnCheckConstraint.addButton({
                    title: 'Check entire project',
                    text: 'Check constraints for entire project',
                    clickFn: function () {
                        self._client.checkCustomConstraints([''], true);
                    }
                });

                activeNode = WebGMEGlobal.State.getActiveObject();
                if (activeNode) {
                    $btnCheckConstraint.addButton({
                        title: 'Check custom constraints node',
                        text: 'Check constraints for node [' + activeNode + ']',
                        clickFn: function () {
                            self._client.checkCustomConstraints([activeNode], true);
                        }
                    });
                    $btnCheckConstraint.addButton({
                        title: 'Check constraints model',
                        text: 'Check constraints for node [' + activeNode + '] and its children...',
                        clickFn: function () {
                            self._client.checkCustomConstraints([activeNode], true);
                        }
                    });
                }
            } else {
                $btnCheckConstraint.addButton({
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

        self._client.addEventListener(self._client.CONSTANTS.CONSTRAINT_RESULT, onResults);

        showResults = function () {
            var dialog = new ConstraintCheckResultsDialog();
            dialog.show(self._client, results);
            unreadResults = 0;
            setBadgeText('');
        };

        /************** EXECUTE PLUG-IN BUTTON ****************/
        $btnCheckConstraint = toolbar.addDropDownButton(
            {
                title: 'Custom Constraints',
                icon: 'glyphicon glyphicon-fire',
                menuClass: 'no-min-width',
                clickFn: function () {
                    fillMenuItems();
                }
            });

        $btnCheckConstraint.el.find('a > i').css({'margin-top': '0px'});

        badge = BADGE_BASE.clone();
        badge.insertAfter($btnCheckConstraint.el.find('a > i'));
        badge.css('margin-left', '3px');
    };


    return ConstraintToolbar;
});
