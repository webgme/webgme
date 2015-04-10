/*globals define, _, WebGMEGlobal*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * @author brollb / https://github/brollb
 */

define(['js/logger',
    'js/Widgets/BlockEditor/BlockEditorWidget.Constants'], function (Logger,
                                                                             BlockEditorWidgetConstants) {

    "use strict";

    var SearchManager;

    SearchManager = function (options) {
        var loggerName = ((options && options.loggerName) || 'gme:Widgets:BlockEditor:SearchManager');
        this.logger = Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this._widget = options ? options.widget : null;

        if (this._widget === undefined || this._widget === null) {
            this.logger.error("Trying to initialize a SearchManager without a widget...");
            throw ("SearchManager can not be created");
        }

        this._highlightedElements = [];

        this.logger.debug("SearchManager ctor finished");
    };

    SearchManager.prototype.initialize = function (el) {
        var self = this;

        this.$el = el;

        this._widget.addEventListener(this._widget.events.ON_COMPONENT_DELETE, function (__widget, componentId) {
            self._onComponentDelete(componentId);
        });
    };

    SearchManager.prototype.activate = function () {
        if (this._widget.toolbarItems && this._widget.toolbarItems.filterBox) {
            this._widget.toolbarItems.filterBox.enabled(true);
            this._widget.toolbarItems.filterBox.setText('');
        }
        this.filterItems('');
    };

    SearchManager.prototype.deactivate = function () {
        if (this._widget.toolbarItems && this._widget.toolbarItems.filterBox) {
            this._widget.toolbarItems.filterBox.setText('');
            this._widget.toolbarItems.filterBox.enabled(false);
        }
        this.filterItems('');
    };

    SearchManager.prototype.filterItems = function (searchDesc) {
        if (searchDesc && searchDesc !== '') {
            this.$el.addClass(BlockEditorWidgetConstants.HIGHLIGHT_MODE_CLASS);
            this._doSearch(searchDesc);
        } else {
            this.$el.removeClass(BlockEditorWidgetConstants.HIGHLIGHT_MODE_CLASS);
            this._clear();
        }
    };

    SearchManager.prototype._doSearch = function (searchDesc) {
        var results = [],
            itemIDs = this._widget.itemIds,
            items = this._widget.items,
            len,
            id,
            diff,
            idx;

        //go through the items first
        len = itemIDs.length;
        while (len--) {
            id = itemIDs[len];
            if (items[id].doSearch(searchDesc)) {
                results.push(id);
            }
        }

        //check deleted nodes
        diff = _.difference(this._highlightedElements, results);
        len = diff.length;
        while (len--) {
            id = diff[len];
            if (items[id]) {
                items[id].unHighlight();
            }
            idx = this._highlightedElements.indexOf(id);
            this._highlightedElements.splice(idx, 1);
        }

        //check added nodes
        diff = _.difference(results, this._highlightedElements);
        len = diff.length;
        while (len--) {
            id = diff[len];
            if (items[id]) {
                items[id].highlight();
            }
            this._highlightedElements.push(id);
        }
    };


    SearchManager.prototype._onComponentDelete = function (componentId) {
        var idx = this._highlightedElements.indexOf(componentId);

        if (idx !== -1) {
            this._highlightedElements.splice(idx, 1);
        }
    };

    SearchManager.prototype._clear = function () {
        //unhighlight all the highlighted
        var i = this._highlightedElements.length;

        while (i--) {
            this._widget.items[this._highlightedElements[i]].unHighlight();
        }
        this._highlightedElements = [];
    };

    return SearchManager;
});
