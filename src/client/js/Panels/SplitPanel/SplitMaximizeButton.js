/*globals define, $*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';

    function SplitMaximizeButton(id, splitPanelManager, container) {
        this._id = id;
        this._manager = splitPanelManager;
        this.$el = $('<div class="toolbar"></div>');
        this._button = $('<span class="maximize-btn no-print glyphicon glyphicon-resize-full"></span>');

        this.$el.append(this._button);

        this._button.hide();

        this._initialize();

        container.append(this.$el);
    }

    SplitMaximizeButton.prototype._initialize = function () {
        var self = this;

        this._button.on('click', function () {
            if (self._manager._maximized) {
                if (self._id === self._manager._activePanelId) {
                    self._button.removeClass('glyphicon-resize-small');
                    self._button.addClass('glyphicon-resize-full');
                    self._button.attr('title', 'Maximize panel');
                    self._manager.maximize(false, self._id);
                }
            } else {
                if (self._id === self._manager._activePanelId && Object.keys(self._manager._panels).length > 1) {
                    self._button.removeClass('glyphicon-resize-full');
                    self._button.addClass('glyphicon-resize-small');
                    self._button.attr('title', 'Exit maximize');
                    self._manager.maximize(true, self._id);
                }
            }
        });

        this.$el.on('mouseenter', function () {
            if (self._manager._maximized === false && Object.keys(self._manager._panels).length > 1 ||
                self._manager._maximized) {
                if (self._manager._maximized) {
                    self._button.removeClass('glyphicon-resize-full');
                    self._button.addClass('glyphicon-resize-small');
                    self._button.attr('title', 'Exit maximize');
                } else {
                    self._button.removeClass('glyphicon-resize-small');
                    self._button.addClass('glyphicon-resize-full');
                    self._button.attr('title', 'Maximize panel');
                }
                self._button.show();
            }
        });

        this.$el.on('mouseleave', function () {
            self._button.hide();
        });
    };

    return SplitMaximizeButton;
});