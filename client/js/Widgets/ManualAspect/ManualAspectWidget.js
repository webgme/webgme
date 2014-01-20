"use strict";

define(['js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget'], function (DragHelper,
                                                             DiagramDesignerWidget) {

    var ManualAspectWidget;

    ManualAspectWidget = function (container, params) {
        params = params || {};
        params.loggerName = "ManualAspectWidget";

        params.tabsEnabled = true;
        params.addTabs = true;
        params.deleteTabs = true;
        params.reorderTabs = true;
        params.lineStyleControls = false;
        params.enableConnectionDrawing = false;

        DiagramDesignerWidget.call(this, container, params);

        this.logger.debug("ManualAspectWidget ctor");
    };

    _.extend(ManualAspectWidget.prototype, DiagramDesignerWidget.prototype);

    ManualAspectWidget.prototype._initializeUI = function (containerElement) {
        DiagramDesignerWidget.prototype._initializeUI.apply(this, arguments);
        this.logger.debug("ManualAspectWidget._initializeUI");

        //TODO: disable connecting at all

        //disable connection to a connection
        this._connectToConnection = false;
    };

    ManualAspectWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    ManualAspectWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.html('');

        return helperEl;
    };

    return ManualAspectWidget;
});