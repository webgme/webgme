/*globals define, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget'
], function (DragHelper,
             DiagramDesignerWidget) {
    'use strict';

    var SetEditorWidget,
        BACKGROUND_TEXT_COLOR = '#FFCCFF';

    SetEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = 'gme:Widgets:SetEditor:SetEditorWidget';

        params.tabsEnabled = true;
        params.addTabs = false;
        params.deleteTabs = false;
        params.reorderTabs = false;
        params.lineStyleControls = false;
        params.enableConnectionDrawing = false;

        DiagramDesignerWidget.call(this, container, params);

        this.logger.debug('SetEditorWidget ctor');
    };

    _.extend(SetEditorWidget.prototype, DiagramDesignerWidget.prototype);

    SetEditorWidget.prototype._initializeUI = function (/*containerElement*/) {
        DiagramDesignerWidget.prototype._initializeUI.apply(this, arguments);
        this.logger.debug('SetEditorWidget._initializeUI');

        //TODO: disable connecting at all

        //disable connection to a connection
        this._connectToConnection = false;
    };

    SetEditorWidget.prototype._afterManagersInitialized = function () {
        //turn off item rotation
        this.enableRotate(false);
    };

    SetEditorWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    SetEditorWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.html('');

        return helperEl;
    };

    /* OVERWRITE DiagramDesignerWidget.prototype.setBackgroundText */
    SetEditorWidget.prototype.setBackgroundText = function (text, params) {
        params = params || {};
        params.color = params.color || BACKGROUND_TEXT_COLOR;
        DiagramDesignerWidget.prototype.setBackgroundText.apply(this, [text, params]);
    };

    return SetEditorWidget;
});