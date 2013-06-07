/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var DiagramDesignerWidget;

    DiagramDesignerWidget = function (container, params) {
    };

    /**************************** READ-ONLY MODE HANDLERS ************************/

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    DiagramDesignerWidget.prototype.setReadOnly = function (isReadOnly) {
    };

    DiagramDesignerWidget.prototype.getIsReadOnlyMode = function () {
    };

    /**************************** END OF --- READ-ONLY MODE HANDLERS ************************/


    //Called when the widget's container size changed
    DiagramDesignerWidget.prototype.onWidgetContainerResize = function (width, height) {
    };

    DiagramDesignerWidget.prototype.destroy = function () {
    };

    DiagramDesignerWidget.prototype.getAdjustedMousePos = function (e) {
    };

    DiagramDesignerWidget.prototype.getAdjustedOffset = function (offset) {
    };

    DiagramDesignerWidget.prototype.clear = function () {
    };

    DiagramDesignerWidget.prototype.deleteComponent = function (componentId) {
    };

    /*********************************/

    DiagramDesignerWidget.prototype.beginUpdate = function () {
    };

    DiagramDesignerWidget.prototype.endUpdate = function () {
    };

    /*************** MODEL CREATE / UPDATE / DELETE ***********************/

    DiagramDesignerWidget.prototype.onItemMouseDown = function (event, itemId) {
    };

    DiagramDesignerWidget.prototype.onConnectionMouseDown = function (event, connId) {
    };

    /************************** DRAG ITEM ***************************/
    DiagramDesignerWidget.prototype.onDesignerItemDragStart = function (draggedItemId, allDraggedItemIDs) {
    };

    DiagramDesignerWidget.prototype.onDesignerItemDrag = function (draggedItemId, allDraggedItemIDs) {
    };

    DiagramDesignerWidget.prototype.onDesignerItemDragStop = function (draggedItemId, allDraggedItemIDs) {
    };

    /************************** END - DRAG ITEM ***************************/

    /************************** SELECTION DELETE CLICK HANDLER ****************************/

    DiagramDesignerWidget.prototype.onSelectionDelete = function (selectedIds) {
    };

    /************************** SELECTION DELETE CLICK HANDLER ****************************/

    /************************** SELECTION CHANGED HANDLER ****************************/
    DiagramDesignerWidget.prototype.onSelectionChanged = function (selectedIds) {
    };
    /************************** END OF - SELECTION CHANGED HANDLER ****************************/

    /********************** ITEM AUTO LAYOUT ****************************/

    DiagramDesignerWidget.prototype.itemAutoLayout = function (mode /* diagonal / grid*/) {
    };

    /********************************************************************/



    /************** ITEM CONTAINER DROPPABLE HANDLERS *************/

    DiagramDesignerWidget.prototype.onBackgroundDroppableAccept = function (helper) {
        return false;
    };

    DiagramDesignerWidget.prototype.onBackgroundDrop = function (helper, position) {
    };

    /*********** END OF - ITEM CONTAINER DROPPABLE HANDLERS **********/


    /************** WAITPROGRESS *********************/
    //TODO: typo fix
    DiagramDesignerWidget.prototype.showPogressbar = function () {
    };

    //TODO: typo fix
    DiagramDesignerWidget.prototype.hidePogressbar = function () {
    };

    /************** END OF - WAITPROGRESS *********************/


    /*************       BACKGROUND TEXT      *****************/
    DiagramDesignerWidget.prototype.setBackgroundText = function (text, params) {
    };
    /*************   END OF - BACKGROUND TEXT      *****************/

    DiagramDesignerWidget.prototype.setTitle = function () {
    };

    /************** API REGARDING TO MANAGERS ***********************/

    DiagramDesignerWidget.prototype.enableDragCopy = function (enabled) {
    };

    /*************** SELECTION API ******************************************/

    DiagramDesignerWidget.prototype.selectAll = function () {
    };

    DiagramDesignerWidget.prototype.selectNone = function () {
    };

    DiagramDesignerWidget.prototype.selectInvert = function () {
    };

    DiagramDesignerWidget.prototype.selectItems = function () {
    };

    DiagramDesignerWidget.prototype.selectConnections = function () {
    };

    /*************** END OF --- SELECTION API ******************************************/

    return DiagramDesignerWidget;
});
