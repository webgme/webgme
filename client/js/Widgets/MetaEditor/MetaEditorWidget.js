"use strict";

define(['logManager',
    'clientUtil',
    'js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget',
    'js/Controls/iCheckBox',
    './MetaEditorPointerNamesDialog',
    'js/Toolbar/ToolbarButton',
    'js/Toolbar/ToolbarDropDownButton',
    'css!/css/Widgets/MetaEditor/MetaEditorWidget'], function (logManager,
                                                             clientUtil,
                                                             DragHelper,
                                                             DiagramDesignerWidget,
                                                             iCheckBox,
                                                             MetaEditorPointerNamesDialog,
                                                             ToolbarButton,
                                                             ToolbarDropDownButton) {

    var MetaEditorWidget,
        __parent__ = DiagramDesignerWidget,
        __parent_proto__ = DiagramDesignerWidget.prototype,
        SHEETS_CONTAINER = "sheets-container",
        ADD_SHEET_CONTAINER_CLASS = 'add-sheet-container',
        SHEET_LIST_CONTAINER_CLASS = 'sheet-list-container',
        SHEET_SCROLL = 200;

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

        this._initializeSheets();
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

        this.$filterHeader.html('FILTER' + (all === on ? '' : ' *'));
    };

    MetaEditorWidget.prototype.selectNewPointerName = function (existingPointerNames, notAllowedPointerNames, isPointerList, callBack) {
       new MetaEditorPointerNamesDialog().show(existingPointerNames, notAllowedPointerNames, isPointerList, callBack);
    };

    MetaEditorWidget.prototype.setFilterChecked = function (value) {
        if (this._filterCheckboxes[value] && !this._filterCheckboxes[value].isChecked()) {
            this._filterCheckboxes[value].setChecked(true);
        }
    };

    MetaEditorWidget.prototype.getDragEffects = function (selectedElements, event) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    MetaEditorWidget.prototype._initializeSheets = function () {
        var self = this;

        this.$sheetsContainer = $('<div/>', { 'class': SHEETS_CONTAINER });

        this.$el.parent().append(this.$sheetsContainer);

        this._sheets = [];

        this.$divAddSheet = $('<div/>', {'class': ADD_SHEET_CONTAINER_CLASS});

        this.$btnAddSheet = new ToolbarButton({ "title": "Add new sheet...",
            "icon": "icon-plus",
            "clickFn": function (/*data*/) {
                self.addSheet('Sheet' + (self._sheets.length + 1));
            }});
        this.$divAddSheet.append(this.$btnAddSheet.el);

        this.$ddlSheetsList = new ToolbarDropDownButton({ "title": "Sheet list",
            "icon": "icon-list"});
        this.$divAddSheet.append(this.$ddlSheetsList.el);

        this.$btnScrollLeft = new ToolbarButton({ "title": "Scroll left",
            "icon": "icon-chevron-left",
            "clickFn": function (/*data*/) {
                self._sheetsScrollLeft();
            } });
        this.$divAddSheet.append(this.$btnScrollLeft.el);

        this.$btnScrollRight = new ToolbarButton({ "title": "Scroll right",
            "icon": "icon-chevron-right",
            "clickFn": function (/*data*/) {
                self._sheetsScrollRight();
            } });
        this.$divAddSheet.append(this.$btnScrollRight.el);


        this.$divSheetList = $('<div/>', {'class': SHEET_LIST_CONTAINER_CLASS});
        this.$ulSheetTab = $('<ul/>', {'class': 'nav nav-tabs'});
        this.$divSheetList.append(this.$ulSheetTab);
 
        
        this.$sheetsContainer.append(this.$divAddSheet);
        this.$sheetsContainer.append(this.$divSheetList);

        for (var i = 0; i <5 ; i++) {
            this.addSheet('Sheet'+i, i !== 0);
        }

        this._sheetScrollValue = 0;

        //hook up sheet rename
        // set title editable on double-click
        this.$ulSheetTab.on("dblclick.editOnDblClick", '.sheet-title', function (event) {
            if (self.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "onChange": function (oldValue, newValue) {
                        self.onSheetTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });

        this.$ulSheetTab.on("click.deleteSheetClick", 'a > i', function (event) {
            if (self.getIsReadOnlyMode() !== true) {
                    self.onSheetDelete($(this).parent().text());
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };

    MetaEditorWidget.prototype.addSheet = function (name, deletable) {
        var li = $('<li class=""><a href="#" data-toggle="tab"></a></li>');

        if (this._sheets.indexOf(name) === -1) {
            this.$ulSheetTab.append(li);
            this._sheets.push(name);

            li.find('a').append('<div class="sheet-title" title="' + name + '">' + name + '</div>');

            if (deletable === true) {
                li.find('a').append($('<i class="icon-remove-circle"/>'));
            }
        }
    };

    MetaEditorWidget.prototype._sheetsScrollLeft = function () {
        if (this._sheetScrollValue < 0) {
            this._scrollSheetListBy(Math.min(Math.abs(this._sheetScrollValue), SHEET_SCROLL));
        }
    };

    MetaEditorWidget.prototype._sheetsScrollRight = function () {
        var overflowRightBy = this.$ulSheetTab.width() - this.$sheetsContainer.width() + this.$divAddSheet.outerWidth(true) + this._sheetScrollValue;

        if (overflowRightBy > 0) {
            overflowRightBy = Math.min(overflowRightBy, SHEET_SCROLL);
            this._scrollSheetListBy(-overflowRightBy);
        }
    };

    MetaEditorWidget.prototype._scrollSheetListBy = function (value) {
        this._sheetScrollValue += value;
        this.$ulSheetTab.css('left', this._sheetScrollValue);
    };

    MetaEditorWidget.prototype.onSheetDelete = function (sheetName) {
        this.logger.warning('onSheetDelete not implemented: "' + sheetName + '"');
    };

    MetaEditorWidget.prototype.onSheetTitleChanged = function (oldValue, newValue) {
        this.logger.warning('onSheetTitleChanged not implemented: "' + oldValue + '" --> "' + newValue + '"');
    };

    return MetaEditorWidget;
});