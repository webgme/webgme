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
        SHEET_SCROLL = 200,
        SHEET_ID = 'SHEET_ID',
        BACKGROUND_TEXT_COLOR = '#DEDEDE',
        BACKGROUND_TEXT_SIZE = 30;

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

    MetaEditorWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    MetaEditorWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.html('');

        return helperEl;
    };

    MetaEditorWidget.prototype._initializeSheets = function () {
        var self = this;

        this.$sheetsContainer = $('<div/>', { 'class': SHEETS_CONTAINER });

        this.$el.parent().append(this.$sheetsContainer);

        this._sheetCounter = 0;

        this._selectedSheet = undefined;

        this.$divAddSheet = $('<div/>', {'class': ADD_SHEET_CONTAINER_CLASS});

        this.$btnAddSheet = new ToolbarButton({ "title": "Add new sheet...",
            "icon": "icon-plus",
            "clickFn": function (/*data*/) {
                if (self.getIsReadOnlyMode() !== true) {
                    self.onSheetAddClicked();
                }
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

        this._makeTabsSortable();

        this.$sheetsContainer.append(this.$divAddSheet);
        this.$sheetsContainer.append(this.$divSheetList);

        this._sheetScrollValue = 0;

        //hook up sheet rename
        // set title editable on double-click
        this.$ulSheetTab.on("dblclick.editOnDblClick", '.sheet-title', function (event) {
            if (self.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "onChange": function (oldValue, newValue) {
                        var li = $(this).parent().parent();
                        self.onSheetTitleChanged(li.data(SHEET_ID), oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //sheet delete handler
        this.$ulSheetTab.on("click.deleteSheetClick", 'a > i', function (event) {
            if (self.getIsReadOnlyMode() !== true) {
                    self.onSheetDeleteClicked($(this).parent().parent().data(SHEET_ID));
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //sheet selection handler
        this.$ulSheetTab.on("click.selectSheetClick", 'li', function (event) {
            self.selectSheet($(this).data(SHEET_ID));
            event.stopPropagation();
            event.preventDefault();
        });
    };

    MetaEditorWidget.prototype.clearSheets = function () {
        this._destroyTabsSortable();
        this.$ulSheetTab.empty();
        this._makeTabsSortable();
        this.$ddlSheetsList.clear();
        this._sheetCounter = 0;
        this._selectedSheet = undefined;
        this._scrollSheetListBy(0 - this._sheetScrollValue);
    };

    MetaEditorWidget.prototype._makeTabsSortable = function () {
        var self = this;

        if (this.getIsReadOnlyMode() !== true) {
            if (!this.$ulSheetTab.hasClass('ui-sortable')) {
                this.$ulSheetTab.sortable({'dropBehaviour': true, 'stop': function () {
                    self._onTabsSortStop();
                }});
            }
        }
    };

    MetaEditorWidget.prototype._destroyTabsSortable = function () {
        if (this.$ulSheetTab.hasClass('ui-sortable')) {
            this.$ulSheetTab.sortable('destroy');
        }
    };

    MetaEditorWidget.prototype.addSheet = function (title, deletable) {
        var self = this;
        var li = $('<li class=""><a href="#" data-toggle="tab"></a></li>');

        li.find('a').append('<div class="sheet-title" title="' + title + '">' + title + '</div>');
        li.data(SHEET_ID, this._sheetCounter + "");
        this._sheetCounter += 1;

        if (deletable === true) {
            li.find('a').append($('<i class="icon-remove-circle"/>'));
            li.find('a').attr('title', 'Delete sheet');
        }

        this.$ulSheetTab.append(li);

        this.$ddlSheetsList.addButton({ "title": title,
            "text": title,
            "data": { 'SHEET_ID': li.data(SHEET_ID)},
            "clickFn": function (data) {
                self.selectSheet(data.SHEET_ID);
            }});

        this._refreshTabScrollButtons();

        return li.data(SHEET_ID);
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

        this._refreshTabScrollButtons();
    };

    MetaEditorWidget.prototype.selectSheet = function (sheetID) {
        var liToSelect,
            allLi = this.$ulSheetTab.find('li'),
            allDropDownLi = this.$ddlSheetsList.el.find('li'),
            i,
            li,
            ddlSelectedIcon = 'icon-ok';

        if (this._selectedSheet !== sheetID) {
            //select tab
            for(i = 0; i < allLi.length; i += 1) {
                li = $(allLi[i]);
                if (li && li.data(SHEET_ID) === sheetID) {
                    liToSelect = li;
                    break;
                }
            }

            if (liToSelect) {
                this.$ulSheetTab.find('li.active').removeClass('active');
                liToSelect.addClass('active');
                this._selectedSheet = liToSelect.data(SHEET_ID);

                this.setBackgroundText('META ASPECT: ' + this.$ulSheetTab.find('li.active').first().find('.sheet-title').text().toUpperCase(), {'font-size': BACKGROUND_TEXT_SIZE,
                    'color': BACKGROUND_TEXT_COLOR});
            }

            //select in DropDown
            liToSelect = undefined;
            for(i = 0; i < allDropDownLi.length; i += 1) {
                li = $(allDropDownLi[i]).find('a').first();
                if (li && li.data(SHEET_ID) === sheetID) {
                    liToSelect = $(allDropDownLi[i]);
                    break;
                }
            }

            if (liToSelect) {
                this.$ddlSheetsList.el.find('i.' + ddlSelectedIcon).remove();
                liToSelect.find('a').prepend('<i class="' + ddlSelectedIcon + '" />');
            }

            this._scrollSelectedTabIntoView();

            //fire event...
            this.onSelectedSheetChanged(this._selectedSheet);
        }
    };

    MetaEditorWidget.prototype._scrollSelectedTabIntoView = function () {
        //scroll selected sheet's tab into view
        var li = this.$ulSheetTab.find('li.active').first();
        var liPos = li.position();
        var visibleWidth = this.$sheetsContainer.width() - this.$divAddSheet.outerWidth(true);
        var visibleMin = -this._sheetScrollValue;
        var visibleMax = -this._sheetScrollValue + visibleWidth;
        if (liPos) {
            if (liPos.left < visibleMin) {
                this._scrollSheetListBy(visibleMin - liPos.left);
            } else if (liPos.left + li.width() > visibleMax) {
                this._scrollSheetListBy(visibleMax - (liPos.left + li.width()));
            }
        }
    };

    MetaEditorWidget.prototype._refreshTabScrollButtons = function () {
        var overflowRightBy = this.$ulSheetTab.width() - this.$sheetsContainer.width() + this.$divAddSheet.outerWidth(true) + this._sheetScrollValue;

        this.$btnScrollLeft.enabled(this._sheetScrollValue < 0);
        this.$btnScrollRight.enabled(overflowRightBy > 0);
    };

    MetaEditorWidget.prototype._onTabsSortStop = function () {
        var ul = this.$ulSheetTab,
            allLi = ul.find('li'),
            i,
            li,
            order = [];

        for (i = 0; i < allLi.length; i += 1) {
            li = $(allLi[i]);
            order.push(li.data(SHEET_ID));
        }

        if (order.length > 0) {
            this.onTabsSorted(order);
        }
    };

    MetaEditorWidget.prototype._refreshSheetTabsScrollOnResize = function () {
        var overflowRightBy = this.$ulSheetTab.width() - this.$sheetsContainer.width() + this.$divAddSheet.outerWidth(true) + this._sheetScrollValue;

        if (overflowRightBy < 0) {
            this._scrollSheetListBy(-overflowRightBy);
        }

        this._scrollSelectedTabIntoView();
        this._refreshTabScrollButtons();
    };

    //Called when the widget's container size changed
    MetaEditorWidget.prototype.onWidgetContainerResize = function (width, height) {
        DiagramDesignerWidget.prototype.onWidgetContainerResize.call(this, width, height);

        this._refreshSheetTabsScrollOnResize();
    };

    MetaEditorWidget.prototype.onSheetDeleteClicked = function (sheetID) {
        this.logger.warning('onSheetDeleteClicked not implemented: "' + sheetID + '"');
    };

    MetaEditorWidget.prototype.onSheetAddClicked = function () {
        var sheetID = this.addSheet('New sheet', true);
        this.logger.warning('onSheetAddClicked not implemented: "' + sheetID + '"');
    };

    MetaEditorWidget.prototype.onSheetTitleChanged = function (sheetID, oldValue, newValue) {
        this.logger.warning('onSheetTitleChanged not implemented: ID: ' + sheetID + ' "' + oldValue + '" --> "' + newValue + '"');
    };

    MetaEditorWidget.prototype.onSelectedSheetChanged = function (sheetID) {
        this.logger.warning('onSelectedSheetChanged not implemented: "' + sheetID + '"');
    };

    MetaEditorWidget.prototype.onTabsSorted = function (newSheetIDOrder) {
        this.logger.warning('onTabsSorted not implemented: "' + newSheetIDOrder + '"');
    };


    MetaEditorWidget.prototype.setOperatingMode = function (mode) {
        DiagramDesignerWidget.prototype.setOperatingMode.call(this, mode);

        if (mode === DiagramDesignerWidget.prototype.OPERATING_MODES.DESIGN) {
            this.$btnAddSheet.enabled(true);
            this._makeTabsSortable();
        } else {
            this.$btnAddSheet.enabled(false);
            this._destroyTabsSortable();
        }
    };



    return MetaEditorWidget;
});