/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/logger',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'
], function (Logger, DiagramDesignerWidgetConstants) {

    'use strict';

    var HighlightManager;

    HighlightManager = function (options) {
        var loggerName = (options && options.loggerName) || 'gme:Widgets:DiagramDesigner:HighlightManager';
        this.logger = (options && options.logger) || Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this._diagramDesigner = options ? options.diagramDesigner : null;

        if (this._diagramDesigner === undefined || this._diagramDesigner === null) {
            this.logger.error('Trying to initialize a HighlightManager without a diagramDesigner...');
            throw ('HighlightManager can not be created');
        }

        this._highlightedElements = [];

        this.logger.debug('HighlightManager ctor finished');
    };

    HighlightManager.prototype.initialize = function (el) {
        var self = this;

        this.$el = el;

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ON_COMPONENT_DELETE,
            function (__diagramDesigner, componentId) {
                self._onComponentDelete(componentId);
            }
        );
    };

    HighlightManager.prototype.activate = function () {
        this.$el.addClass(DiagramDesignerWidgetConstants.HIGHLIGHT_MODE_CLASS);
        this._activateMouseListeners();
    };

    HighlightManager.prototype.deactivate = function () {
        this._deactivateMouseListeners();
        this.$el.removeClass(DiagramDesignerWidgetConstants.HIGHLIGHT_MODE_CLASS);
        this._clear();
    };

    HighlightManager.prototype._activateMouseListeners = function () {
        var self = this;

        //handle click on designer-items
        this._diagramDesigner.onItemMouseDown = function (itemId, eventDetails) {
            if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.HIGHLIGHT) {
                self._highLight(itemId, eventDetails.rightClick);
            }
        };

        //handle click on designer-connections
        this._diagramDesigner.onConnectionMouseDown = function (connId/*, eventDetails*/) {
            if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.HIGHLIGHT) {
                self._highLight(connId, true);
            }
        };

        //background double-click
        this._diagramDesigner.onBackgroundDblClick = function (/*eventDetails*/) {
            if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.HIGHLIGHT) {
                self._clear();
            }
        };
    };

    HighlightManager.prototype._deactivateMouseListeners = function () {
        this._diagramDesigner.onItemMouseDown = undefined;
        this._diagramDesigner.onConnectionMouseDown = undefined;
        this._diagramDesigner.onBackgroundDblClick = undefined;
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
                if (this._diagramDesigner.itemIds.indexOf(id) !== -1) {
                    associatedIDs = this._diagramDesigner._getConnectionsForItem(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                    i = associatedIDs.length;
                    while (i--) {
                        elementsToHighlight = _.union(elementsToHighlight,
                            this._diagramDesigner._getItemsForConnection(associatedIDs[i]));
                    }
                } else if (this._diagramDesigner.connectionIds.indexOf(id) !== -1) {
                    associatedIDs = this._diagramDesigner._getItemsForConnection(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                }
            }

            i = elementsToHighlight.length;
            while (i--) {
                this._highlightedElements.push(elementsToHighlight[i]);
                this._diagramDesigner.items[elementsToHighlight[i]].highlight();
            }
            this.onHighlight(elementsToHighlight);
        } else {
            //unhighlight clicked and all associated
            elementsToHighlight.push(id);
            if (highlightAssociated) {
                //get all the connection that go in/out from this element and highlight them too
                if (this._diagramDesigner.itemIds.indexOf(id) !== -1) {
                    associatedIDs = this._diagramDesigner._getConnectionsForItem(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                    i = associatedIDs.length;
                    while (i--) {
                        elementsToHighlight = _.union(elementsToHighlight,
                            this._diagramDesigner._getItemsForConnection(associatedIDs[i]));
                    }
                } else if (this._diagramDesigner.connectionIds.indexOf(id) !== -1) {
                    associatedIDs = this._diagramDesigner._getItemsForConnection(id);
                    elementsToHighlight = _.union(elementsToHighlight, associatedIDs);
                }
            }

            i = elementsToHighlight.length;
            while (i--) {
                idx = this._highlightedElements.indexOf(elementsToHighlight[i]);
                this._highlightedElements.splice(idx, 1);
                this._diagramDesigner.items[elementsToHighlight[i]].unHighlight();
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
            this._diagramDesigner.items[this._highlightedElements[i]].unHighlight();
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
