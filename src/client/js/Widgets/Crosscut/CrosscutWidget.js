/*globals define, _, requirejs, WebGMEGlobal*/

define(['js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget'], function (DragHelper,
                                                             DiagramDesignerWidget) {

    "use strict";

    var CrosscutWidget,
        BACKGROUND_TEXT_COLOR = '#CCCCFF';

    CrosscutWidget = function (container, params) {
        params = params || {};
        params.loggerName = 'gme:Widgets:CrossCut:CrosscutWidget';

        params.tabsEnabled = true;
        params.addTabs = true;
        params.deleteTabs = true;
        params.reorderTabs = true;
        params.lineStyleControls = false;

        DiagramDesignerWidget.call(this, container, params);

        this.logger.debug("CrosscutWidget ctor");
    };

    _.extend(CrosscutWidget.prototype, DiagramDesignerWidget.prototype);

    CrosscutWidget.prototype._initializeUI = function (containerElement) {
        DiagramDesignerWidget.prototype._initializeUI.apply(this, arguments);
        this.logger.debug("CrosscutWidget._initializeUI");

        //TODO: disable connecting at all

        //disable connection to a connection
        this._connectToConnection = false;
    };

    CrosscutWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    CrosscutWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.html('');

        return helperEl;
    };

    /* OVERWRITE DiagramDesignerWidget.prototype.setBackgroundText */
    CrosscutWidget.prototype.setBackgroundText = function (text, params) {
        params = params || {};
        params.color = BACKGROUND_TEXT_COLOR;
        DiagramDesignerWidget.prototype.setBackgroundText.apply(this, [text, params]);
    };

    return CrosscutWidget;
});