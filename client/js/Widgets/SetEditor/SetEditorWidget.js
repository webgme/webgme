"use strict";

define(['js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget'], function (DragHelper,
                                                             DiagramDesignerWidget) {

    var PointerListEditorWidget;

    PointerListEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = "PointerListEditorWidget";

        params.tabsEnabled = true;
        params.addTabs = false;
        params.deleteTabs = false;
        params.reorderTabs = false;
        params.lineStyleControls = false;
        params.enableConnectionDrawing = false;

        DiagramDesignerWidget.call(this, container, params);

        this.logger.debug("PointerListEditorWidget ctor");
    };

    _.extend(PointerListEditorWidget.prototype, DiagramDesignerWidget.prototype);

    PointerListEditorWidget.prototype._initializeUI = function (containerElement) {
        DiagramDesignerWidget.prototype._initializeUI.apply(this, arguments);
        this.logger.debug("PointerListEditorWidget._initializeUI");

        //TODO: disable connecting at all

        //disable connection to a connection
        this._connectToConnection = false;
    };

    PointerListEditorWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    PointerListEditorWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.html('');

        return helperEl;
    };

    return PointerListEditorWidget;
});