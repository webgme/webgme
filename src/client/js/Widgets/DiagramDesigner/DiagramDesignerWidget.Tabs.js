/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Toolbar/ToolbarButton',
    'js/Toolbar/ToolbarDropDownButton'
], function (ToolbarButton, ToolbarDropDownButton) {
    'use strict';

    var DiagramDesignerWidgetTabs,
        TABS_CONTAINER = 'diagram-designer-tabs-container',
        ADD_TAB_CONTAINER_CLASS = 'add-tab-container',
        TAB_LIST_CONTAINER_CLASS = 'tab-list-container',
        TAB_SCROLL = 200,
        TAB_ID = 'TAB_ID',
        TAB_RENAME = 'TAB_RENAME',
        WITH_TABS_CLASS = 'w-tabs',
        SELECTED_ICON = 'icon-ok',
        DDL_SELECTED_TAB_ICON_BASE = $('<i class="' + SELECTED_ICON + ' glyphicon glyphicon-ok" />'),
        TAB_LI_BASE = $('<li class=""><a href="#" data-toggle="tab"><div class="tab-title"></div></a></li>'),
        TAB_DELETE_ICON_BASE = $('<i class="glyphicon glyphicon-remove-circle delete-tab-btn hidden"/>');

    DiagramDesignerWidgetTabs = function () {
    };

    DiagramDesignerWidgetTabs.prototype._initializeTabs = function () {
        var self = this;

        this.$tabsContainer = $('<div/>', {class: TABS_CONTAINER});

        this.$el.parent().append(this.$tabsContainer);
        this.$el.parent().addClass(WITH_TABS_CLASS);

        this._tabCounter = 0;

        this._selectedTab = undefined;

        this.$divAddTab = $('<div/>', {class: ADD_TAB_CONTAINER_CLASS});

        if (this._addTabs === true) {
            this.$btnAddTab = new ToolbarButton({
                title: 'Add new tab...',
                icon: 'glyphicon glyphicon-plus',
                clickFn: function (/*data*/) {
                    if (self.getIsReadOnlyMode() !== true) {
                        self.onTabAddClicked();
                    }
                }
            });
            this.$divAddTab.append(this.$btnAddTab.el);
        }

        this.$ddlTabsList = new ToolbarDropDownButton({
            title: 'Tab list',
            icon: 'glyphicon glyphicon-list'
        });
        this.$divAddTab.append(this.$ddlTabsList.el);

        this.$btnScrollLeft = new ToolbarButton({
            title: 'Scroll left',
            icon: 'glyphicon glyphicon-chevron-left',
            clickFn: function (/*data*/) {
                self._tabsScrollLeft();
            }
        });
        this.$divAddTab.append(this.$btnScrollLeft.el);

        this.$btnScrollRight = new ToolbarButton({
            title: 'Scroll right',
            icon: 'glyphicon glyphicon-chevron-right',
            clickFn: function (/*data*/) {
                self._tabsScrollRight();
            }
        });
        this.$divAddTab.append(this.$btnScrollRight.el);


        this.$divTabList = $('<div/>', {class: TAB_LIST_CONTAINER_CLASS});
        this.$ulTabTab = $('<ul/>', {class: 'nav nav-tabs'});
        this.$divTabList.append(this.$ulTabTab);

        this._makeTabsSortable();

        this.$tabsContainer.append(this.$divAddTab);
        this.$tabsContainer.append(this.$divTabList);

        this._tabScrollValue = 0;

        //hook up tab rename
        // set title editable on double-click
        this.$ulTabTab.on('dblclick.editOnDblClick', '.tab-title', function (event) {
            if (self.getIsReadOnlyMode() !== true) {
                var li = $(this).parentsUntil('li').parent();
                if (li.data(TAB_RENAME) === true) {
                    $(this).editInPlace({
                        class: '',
                        onChange: function (oldValue, newValue) {
                            var li = $(this).parent().parent();
                            self.onTabTitleChanged(li.data(TAB_ID), oldValue, newValue);
                        }
                    });
                }
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //tab delete handler
        this.$ulTabTab.on('click.deleteTabClick', 'a > i', function (event) {
            var tabEl = $(this).parent().parent();
            if (self.getIsReadOnlyMode() !== true && tabEl.hasClass('active')) {
                self.onTabDeleteClicked(tabEl.data(TAB_ID));
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //tab selection handler
        this.$ulTabTab.on('click.selectTabClick', 'li', function (event) {
            self.selectTab($(this).data(TAB_ID));
            event.stopPropagation();
            event.preventDefault();
        });
    };

    DiagramDesignerWidgetTabs.prototype._addTabsButtonEnabled = function (enabled) {
        if (this.$btnAddTab) {
            this.$btnAddTab.enabled(enabled);
        }
    };

    DiagramDesignerWidgetTabs.prototype.clearTabs = function () {
        this._destroyTabsSortable();
        this.$ulTabTab.empty();
        this._makeTabsSortable();
        this.$ddlTabsList.clear();
        this._tabCounter = 0;
        this._selectedTab = undefined;
        this._scrollTabListBy(0 - this._tabScrollValue);
    };

    DiagramDesignerWidgetTabs.prototype._makeTabsSortable = function () {
        var self = this;

        if (this.getIsReadOnlyMode() !== true) {
            if (this._reorderTabs === true) {
                if (!this.$ulTabTab.hasClass('ui-sortable')) {
                    this.$ulTabTab.sortable({
                        dropBehaviour: true,
                        stop: function () {
                            self._onTabsSortStop();
                        }
                    });
                }
            }
        }
    };

    DiagramDesignerWidgetTabs.prototype._destroyTabsSortable = function () {
        if (this.$ulTabTab && this.$ulTabTab.hasClass('ui-sortable')) {
            this.$ulTabTab.sortable('destroy');
        }
    };

    DiagramDesignerWidgetTabs.prototype._addTabDeleteBtn = function (li) {
        var deleteBtn = TAB_DELETE_ICON_BASE.clone();
        deleteBtn.attr('title', 'Delete tab');
        li.find('a').append(deleteBtn);
    };

    DiagramDesignerWidgetTabs.prototype.addTab = function (title, deletable, renamable) {
        var self = this,
            li = TAB_LI_BASE.clone();

        li.find('.tab-title').attr('title', title).text(title);
        li.data(TAB_ID, this._tabCounter + '');
        this._tabCounter += 1;

        if (this._deleteTabs === true && deletable === true) {
            this._addTabDeleteBtn(li);
        }

        //store renamable info in LI
        li.data(TAB_RENAME, renamable);

        this.$ulTabTab.append(li);

        this.$ddlTabsList.addButton({
            title: title,
            text: title,
            data: {TAB_ID: li.data(TAB_ID)},
            clickFn: function (data) {
                self.selectTab(data.TAB_ID);
            }
        });

        if (this._addingMultipleTabs !== true) {
            this._refreshTabScrollButtons();
        }

        return li.data(TAB_ID);
    };

    DiagramDesignerWidgetTabs.prototype.addMultipleTabsBegin = function () {
        this._addingMultipleTabs = true;

        this.$ulTabTab.hide();
    };

    DiagramDesignerWidgetTabs.prototype.addMultipleTabsEnd = function () {
        this.$ulTabTab.show();

        this._refreshTabScrollButtons();

        this._addingMultipleTabs = false;
    };

    DiagramDesignerWidgetTabs.prototype._tabsScrollLeft = function () {
        if (this._tabScrollValue < 0) {
            this._scrollTabListBy(Math.min(Math.abs(this._tabScrollValue), TAB_SCROLL));
        }
    };

    DiagramDesignerWidgetTabs.prototype._tabsScrollRight = function () {
        var overflowRightBy = this.$ulTabTab.width() - this.$tabsContainer.width() + this.$divAddTab.outerWidth(true) +
            this._tabScrollValue;

        if (overflowRightBy > 0) {
            overflowRightBy = Math.min(overflowRightBy, TAB_SCROLL);
            this._scrollTabListBy(-overflowRightBy);
        }
    };

    DiagramDesignerWidgetTabs.prototype._scrollTabListBy = function (value) {
        this._tabScrollValue += value;
        this.$ulTabTab.css('left', this._tabScrollValue);

        this._refreshTabScrollButtons();
    };

    DiagramDesignerWidgetTabs.prototype.selectTab = function (tabID) {
        var liToSelect,
            allLi = this.$ulTabTab.find('li'),
            allDropDownLi = this.$ddlTabsList.el.find('li'),
            prevActiveTab,
            i,
            li;

        if (this._selectedTab !== tabID) {
            //select tab
            for (i = 0; i < allLi.length; i += 1) {
                li = $(allLi[i]);
                if (li && li.data(TAB_ID) === tabID) {
                    liToSelect = li;
                    break;
                }
            }

            if (liToSelect) {
                prevActiveTab = this.$ulTabTab.find('li.active');
                prevActiveTab.removeClass('active');
                prevActiveTab.find('.delete-tab-btn').addClass('hidden');

                liToSelect.addClass('active');
                liToSelect.find('.delete-tab-btn').removeClass('hidden');
                this._selectedTab = liToSelect.data(TAB_ID);

                this.setBackgroundText(this.$ulTabTab.find('li.active').first().find('.tab-title').text()
                    .toUpperCase());
            }

            //select in DropDown
            liToSelect = undefined;
            for (i = 0; i < allDropDownLi.length; i += 1) {
                li = $(allDropDownLi[i]).find('a').first();
                if (li && li.data(TAB_ID) === tabID) {
                    liToSelect = $(allDropDownLi[i]);
                    break;
                }
            }

            if (liToSelect) {
                this.$ddlTabsList.el.find('i.' + SELECTED_ICON).remove();
                liToSelect.find('a').prepend(DDL_SELECTED_TAB_ICON_BASE.clone());
            }

            this._scrollSelectedTabIntoView();

            //fire event...
            this.onSelectedTabChanged(this._selectedTab);
        }
    };

    DiagramDesignerWidgetTabs.prototype._scrollSelectedTabIntoView = function () {
        //scroll selected tab's tab into view
        var li = this.$ulTabTab.find('li.active').first();
        var liPos = li.position();
        var visibleWidth = this.$tabsContainer.width() - this.$divAddTab.outerWidth(true);
        var visibleMin = -this._tabScrollValue;
        var visibleMax = -this._tabScrollValue + visibleWidth;
        if (liPos) {
            if (liPos.left < visibleMin) {
                this._scrollTabListBy(visibleMin - liPos.left);
            } else if (liPos.left + li.width() > visibleMax) {
                this._scrollTabListBy(visibleMax - (liPos.left + li.width()));
            }
        }
    };

    DiagramDesignerWidgetTabs.prototype._refreshTabScrollButtons = function () {
        var overflowRightBy = this.$ulTabTab.width() - this.$tabsContainer.width() + this.$divAddTab.outerWidth(true) +
            this._tabScrollValue;

        this.$btnScrollLeft.enabled(this._tabScrollValue < 0);
        this.$btnScrollRight.enabled(overflowRightBy > 0);
    };

    DiagramDesignerWidgetTabs.prototype._onTabsSortStop = function () {
        var ul = this.$ulTabTab,
            allLi = ul.find('li'),
            i,
            li,
            order = [];

        for (i = 0; i < allLi.length; i += 1) {
            li = $(allLi[i]);
            order.push(li.data(TAB_ID));
        }

        if (order.length > 0) {
            this.onTabsSorted(order);
        }
    };

    DiagramDesignerWidgetTabs.prototype._refreshTabTabsScrollOnResize = function () {
        if (this._tabsEnabled === true) {
            var overflowRightBy = this.$ulTabTab.width() - this.$tabsContainer.width() +
                this.$divAddTab.outerWidth(true) + this._tabScrollValue;

            if (overflowRightBy < 0) {
                this._scrollTabListBy(-overflowRightBy);
            }

            this._scrollSelectedTabIntoView();
            this._refreshTabScrollButtons();
        }
    };

    DiagramDesignerWidgetTabs.prototype.onTabDeleteClicked = function (tabID) {
        this.logger.warn('onTabDeleteClicked not implemented: "' + tabID + '"');
    };

    DiagramDesignerWidgetTabs.prototype.onTabAddClicked = function () {
        var tabID = this.addTab('New tab', true);
        this.logger.warn('onTabAddClicked not implemented: "' + tabID + '"');
    };

    DiagramDesignerWidgetTabs.prototype.onTabTitleChanged = function (tabID, oldValue, newValue) {
        this.logger.warn('onTabTitleChanged not implemented: ID: ' + tabID + ' "' + oldValue + '" --> "' +
        newValue + '"');
    };

    DiagramDesignerWidgetTabs.prototype.onSelectedTabChanged = function (tabID) {
        this.logger.warn('onSelectedTabChanged not implemented: "' + tabID + '"');
    };

    DiagramDesignerWidgetTabs.prototype.onTabsSorted = function (newTabIDOrder) {
        this.logger.warn('onTabsSorted not implemented: "' + newTabIDOrder + '"');
    };

    return DiagramDesignerWidgetTabs;
});