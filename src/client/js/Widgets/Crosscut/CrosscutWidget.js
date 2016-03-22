/*globals define, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget',
    'js/Controls/iCheckBox',
    'jquery',
    'underscore'
], function (DragHelper, DiagramDesignerWidget, ICheckBox) {

    'use strict';

    var CrosscutWidget,
        BACKGROUND_TEXT_COLOR = '#CCCCFF';

    CrosscutWidget = function (container, params) {
        params = params || {};
        params.loggerName = 'gme:Widgets:CrossCut:CrosscutWidget';

        params.tabsEnabled = true;
        params.addTabs = true;
        params.deleteTabs = true;
        params.reorderTabs = true;
        params.lineStyleControls = false;
        params.defaultConnectionRouteManagerType = 'basic2';

        DiagramDesignerWidget.call(this, container, params);
        this._onConnectionRouteManagerChanged('basic2');
        this.logger.debug('CrosscutWidget ctor');
    };

    _.extend(CrosscutWidget.prototype, DiagramDesignerWidget.prototype);

    CrosscutWidget.prototype._initializeUI = function (/*containerElement*/) {
        DiagramDesignerWidget.prototype._initializeUI.apply(this, arguments);
        this.logger.debug('CrosscutWidget._initializeUI');

        //TODO: disable connecting at all

        //disable connection to a connection
        this._connectToConnection = false;

        this._initializeFilterPanel();
    };

    CrosscutWidget.prototype._afterManagersInitialized = function () {
        //turn off item rotation
        this.enableRotate(false);
    };

    CrosscutWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    CrosscutWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.html('');

        return helperEl;
    };

    /* OVERWRITE DiagramDesignerWidget.prototype.setBackgroundText */
    CrosscutWidget.prototype.setBackgroundText = function (text, params) {
        params = params || {};
        params.color = params.color || BACKGROUND_TEXT_COLOR;
        DiagramDesignerWidget.prototype.setBackgroundText.apply(this, [text, params]);
    };

    //FILTER PANEL
    CrosscutWidget.prototype._initializeFilterPanel = function () {
        /**** create FILTER PANEL ****/
        this.$filterPanel = $('<div/>', {
            class: 'filterPanel'
        });

        this.$filterPanel.html('<div class="header">FILTER</div><ul class="body"></ul>');

        this.$filterHeader = this.$filterPanel.find('.header');
        this.$filterUl = this.$filterPanel.find('ul.body');

        this.$el.parent().append(this.$filterPanel);

        this._filterCheckboxes = {};
    };

    CrosscutWidget.prototype.addFilterItem = function (text, value, iconEl) {
        var item = $('<li/>', {
                class: 'filterItem'
            }),
            checkBox,
            self = this;

        checkBox = new ICheckBox({
            checkChangedFn: function (data, isChecked) {
                self._checkChanged(value, isChecked);
            }
        });

        item.append(iconEl.addClass('inline'));
        item.append(text);
        item.append(checkBox.el);


        this.$filterUl.append(item);

        this._refreshHeaderText();

        this._filterCheckboxes[value] = checkBox;

        return item;
    };

    CrosscutWidget.prototype._refreshHeaderText = function () {
        var all = this.$filterUl.find('.iCheckBox').length,
            on = this.$filterUl.find('.iCheckBox.checked').length;

        this.$filterHeader.html('FILTER' + (all === on ? '' : ' *'));
    };

    CrosscutWidget.prototype._checkChanged = function (value, isChecked) {
        this._refreshHeaderText();
        this.logger.debug('CheckBox checkChanged: ' + value + ', checked: ' + isChecked);
        this.onCheckChanged(value, isChecked);
    };

    CrosscutWidget.prototype.setChecked = function (value, isChecked) {
        if (this._filterCheckboxes[value]) {
            this._filterCheckboxes[value].setChecked(isChecked);
        }
    };

    CrosscutWidget.prototype.onCheckChanged = function (/*value, isChecked*/) {
        this.logger.warn('CrosscutWidget.onCheckChanged(value, isChecked) is not overridden!');
    };

    return CrosscutWidget;
});