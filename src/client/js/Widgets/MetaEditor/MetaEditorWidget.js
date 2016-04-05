/*globals define, $, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/logger',
    'js/util',
    'js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget',
    'js/Controls/iCheckBox',
    './MetaEditorPointerNamesDialog',
    'css!./styles/MetaEditorWidget.css'
], function (Logger,
             clientUtil,
             DragHelper,
             DiagramDesignerWidget,
             ICheckBox,
             MetaEditorPointerNamesDialog) {

    'use strict';

    var MetaEditorWidget,
        __parent__ = DiagramDesignerWidget,
        __parent_proto__ = DiagramDesignerWidget.prototype;

    MetaEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = 'gme:Widgets:MetaEditor:MetaEditorWidget';

        //disable line style parameter controls in toolbar
        params.lineStyleControls = false;

        params.tabsEnabled = true;
        params.addTabs = true;
        params.deleteTabs = true;
        params.reorderTabs = true;

        __parent__.call(this, container, params);

        this.logger.debug('MetaEditorWidget ctor');
    };

    _.extend(MetaEditorWidget.prototype, DiagramDesignerWidget.prototype);

    MetaEditorWidget.prototype._initializeUI = function (/*containerElement*/) {
        __parent_proto__._initializeUI.apply(this, arguments);
        this.logger.debug('MetaEditorWidget._initializeUI');

        //disable connection to a connection
        this._connectToConnection = false;

        this._initializeFilterPanel();
    };

    MetaEditorWidget.prototype._afterManagersInitialized = function () {
        //turn off item rotation
        this.enableRotate(false);

    };

    MetaEditorWidget.prototype._initializeFilterPanel = function () {
        /**** create FILTER PANEL ****/
        this.$filterPanel = $('<div/>', {
            'class': 'filterPanel'
        });

        this.$filterPanel.html('<div class="header">FILTER</div><ul class="body"></ul>');

        this.$filterHeader = this.$filterPanel.find('.header');
        this.$filterUl = this.$filterPanel.find('ul.body');

        this.$el.parent().append(this.$filterPanel);
        this.$el.parent().addClass('meta-editor-widget');

        this._filterCheckboxes = {};
    };

    MetaEditorWidget.prototype._checkChanged = function (value, isChecked) {
        this._refreshHeaderText();
        this.logger.debug('CheckBox checkChanged: ' + value + ', checked: ' + isChecked);
        this.onCheckChanged(value, isChecked);
    };

    MetaEditorWidget.prototype.onCheckChanged = function (/*value, isChecked*/) {
        this.logger.warn('MetaEditorWidget.onCheckChanged(value, isChecked) is not overridden!');
    };

    MetaEditorWidget.prototype.addFilterItem = function (text, value, iconEl) {
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

    MetaEditorWidget.prototype._refreshHeaderText = function () {
        var all = this.$filterUl.find('.iCheckBox').length,
            on = this.$filterUl.find('.iCheckBox.checked').length;

        this.$filterHeader.html('FILTER' + (all === on ? '' : ' *'));
    };

    MetaEditorWidget.prototype.selectNewPointerName = function (existingPointerNames, notAllowedPointerNames,
                                                                isSet, callback) {
        new MetaEditorPointerNamesDialog().show(existingPointerNames, notAllowedPointerNames, isSet, callback);
    };

    MetaEditorWidget.prototype.setFilterChecked = function (value) {
        if (this._filterCheckboxes[value] && !this._filterCheckboxes[value].isChecked()) {
            this._filterCheckboxes[value].setChecked(true);
        }
    };

    MetaEditorWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    MetaEditorWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.empty();

        return helperEl;
    };

    return MetaEditorWidget;
});