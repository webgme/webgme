/*globals define,_*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * @author brollb / https://github/brollb
 */

define(['common/LogManager',
    'js/Widgets/BlockEditor/BlockEditorWidget.Constants'], function (logManager,
                                                                   BlockEditorWidgetConstants) {

    "use strict";

    var HighlightManager;

    HighlightManager = function (options) {
        this.logger = logManager.create(((options && options.loggerName) || "HighlightManager"));

        this._widget = options ? options.widget : null;

        if (this._widget === undefined || this._widget === null) {
            this.logger.error("Trying to initialize a HighlightManager without a widget...");
            throw ("HighlightManager can not be created");
        }

        this._highlightedElements = [];

        this.logger.debug("HighlightManager ctor finished");
    };

    HighlightManager.prototype.initialize = function (el) {
        var self = this;

        this.$el = el;

        this._widget.addEventListener(this._widget.events.ON_COMPONENT_DELETE, function (__widget, componentId) {
            self._onComponentDelete(componentId);
        });
    };

    HighlightManager.prototype.activate = function () {
        this.$el.addClass(BlockEditorWidgetConstants.HIGHLIGHT_MODE_CLASS);
        this._activateMouseListeners();
    };

    HighlightManager.prototype.deactivate = function () {
        this._deactivateMouseListeners();
        this.$el.removeClass(BlockEditorWidgetConstants.HIGHLIGHT_MODE_CLASS);
        this._clear();
    };

    HighlightManager.prototype._activateMouseListeners = function () {
        var self = this;

        //handle click on designer-items
        this._widget.onItemMouseDown = function (itemId, eventDetails) {
            if (self._widget.mode === self._widget.OPERATING_MODES.HIGHLIGHT) {
                self._highLight(itemId, eventDetails.rightClick);
            }
        };

        //handle click on designer-connections
        this._widget.onConnectionMouseDown = function (connId/*, eventDetails*/) {
            if (self._widget.mode === self._widget.OPERATING_MODES.HIGHLIGHT) {
                self._highLight(connId, true);
            }
        };

        //background double-click
        this._widget.onBackgroundDblClick = function (/*eventDetails*/) {
            if (self._widget.mode === self._widget.OPERATING_MODES.HIGHLIGHT) {
                self._clear();
            }
        };
    };

    HighlightManager.prototype._deactivateMouseListeners = function () {
        this._widget.onItemMouseDown = undefined;
        this._widget.onConnectionMouseDown = undefined;
        this._widget.onBackgroundDblClick = undefined;
    };


    HighlightManager.prototype._highLight = function (id, highlightAssociated) {
        var idx = this._highlightedElements.indexOf(id),
            elementsToHighlight = [],
            associatedIDs,
            i;

        this.logger.debug('_highLight, ID: "' + id + '", highlightAssociated: ' + highlightAssociated);

        if (idx === -1) {
            //highlight clicked and all associated
            elementsToHighlight.push(id);
            if (highlightAssociated) {
                //get all the connection that go in/out from this element and highlight them too
                if (this._widget.itemIds.indexOf(id) !== -1) {
                    associatedIDs = this._widget._getConnectionsForItem(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                    i = associatedIDs.length;
                    while (i--) {
                        elementsToHighlight = _.union(elementsToHighlight, this._widget._getItemsForConnection(associatedIDs[i]));
                    }
                } else if (this._widget.connectionIds.indexOf(id) !== -1) {
                    associatedIDs = this._widget._getItemsForConnection(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                }
            }

            i = elementsToHighlight.length;
            while (i--) {
                this._highlightedElements.push(elementsToHighlight[i]);
                this._widget.items[elementsToHighlight[i]].highlight();
            }
            this.onHighlight(elementsToHighlight);
        } else {
            //unhighlight clicked and all associated
            elementsToHighlight.push(id);
            if (highlightAssociated) {
                //get all the connection that go in/out from this element and highlight them too
                if (this._widget.itemIds.indexOf(id) !== -1) {
                    associatedIDs = this._widget._getConnectionsForItem(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                    i = associatedIDs.length;
                    while (i--) {
                        elementsToHighlight = _.union(elementsToHighlight, this._widget._getItemsForConnection(associatedIDs[i]));
                    }
                } else if (this._widget.connectionIds.indexOf(id) !== -1) {
                    associatedIDs = this._widget._getItemsForConnection(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                }
            }

            i = elementsToHighlight.length;
            while (i--) {
                idx = this._highlightedElements.indexOf(elementsToHighlight[i]);
                this._highlightedElements.splice(idx, 1);
                this._widget.items[elementsToHighlight[i]].unHighlight();
            }
            this.onUnhighlight(elementsToHighlight);
        }
    };


    HighlightManager.prototype._onComponentDelete = function (componentId) {
        var idx = this._highlightedElements.indexOf(componentId);

        if (idx !== -1) {
            this._highLight(componentId, false);
        }
    };

    HighlightManager.prototype._clear = function () {
        //unhighlight all the highlighted
        var i = this._highlightedElements.length,
            unhighlighted = this._highlightedElements.slice(0);

        while (i--) {
            this._widget.items[this._highlightedElements[i]].unHighlight();
        }
        this._highlightedElements = [];
        this.onUnhighlight(unhighlighted);
    };

    HighlightManager.prototype.onHighlight = function (idList) {
        this.logger.debug('onHighlight idList: ' + idList);
    };

    HighlightManager.prototype.onUnhighlight = function (idList) {
        this.logger.debug('onUnhighlight idList: ' + idList);
    };


    return HighlightManager;
});
