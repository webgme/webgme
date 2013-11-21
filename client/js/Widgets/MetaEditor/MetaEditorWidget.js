"use strict";

define(['logManager',
    'clientUtil',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget',
    'js/Controls/iCheckBox',
    './MetaEditorPointerNamesDialog',
    'css!/css/Widgets/MetaEditor/MetaEditorWidget'], function (logManager,
                                                             clientUtil,
                                                             DiagramDesignerWidget,
                                                             iCheckBox,
                                                             MetaEditorPointerNamesDialog) {

    var MetaEditorWidget,
        __parent__ = DiagramDesignerWidget,
        __parent_proto__ = DiagramDesignerWidget.prototype;

    MetaEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = "MetaEditorWidget";

        __parent__.call(this, container, params);

        this.logger.debug("MetaEditorWidget ctor");
    };

    _.extend(MetaEditorWidget.prototype, DiagramDesignerWidget.prototype);

    MetaEditorWidget.prototype._initializeUI = function (containerElement) {
        __parent_proto__._initializeUI.apply(this, arguments);
        this.logger.debug("MetaEditorWidget._initializeUI");

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

        this._filterCheckboxes = {};
    };

    MetaEditorWidget.prototype._checkChanged = function (value, isChecked) {
        this._refreshHeaderText();
        this.logger.debug("CheckBox checkChanged: " + value + ", checked: " + isChecked);
        this.onCheckChanged(value, isChecked);
    };

    MetaEditorWidget.prototype.onCheckChanged = function (value, isChecked) {
        this.logger.warning('MetaEditorWidget.onCheckChanged(value, isChecked) is not overridden!');
    };

    MetaEditorWidget.prototype.addFilterItem = function (text, value, iconEl) {
        var item = $('<li/>', {
                'class': 'filterItem'
            }),
            checkBox,
            self = this;

        checkBox = new iCheckBox({
            "checkChangedFn": function (data, isChecked) {
                self._checkChanged(value, isChecked);
            }});

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

        this.$filterHeader.html('FILTER (' + on + '/' + all + ')');
    };

    MetaEditorWidget.prototype.selectNewPointerName = function (pointerNames, callBack) {
       new MetaEditorPointerNamesDialog().show(pointerNames, callBack);
    };

    MetaEditorWidget.prototype.setFilterChecked = function (value) {
        if (this._filterCheckboxes[value] && !this._filterCheckboxes[value].isChecked()) {
            this._filterCheckboxes[value].setChecked(true);
        }
    };

    MetaEditorWidget.prototype._initializeToolbar = function () {
        DiagramDesignerWidget.prototype._initializeToolbar.call(this);

        //remove connection start/end arrow and line pattern selector
        this.toolbarItems.ddbtnConnectionArrowStart.destroy();
        delete this.toolbarItems.ddbtnConnectionArrowStart;

        this.toolbarItems.ddbtnConnectionPattern.destroy();
        delete this.toolbarItems.ddbtnConnectionPattern;

        this.toolbarItems.ddbtnConnectionArrowEnd.destroy();
        delete this.toolbarItems.ddbtnConnectionArrowEnd;

    };

    return MetaEditorWidget;
});