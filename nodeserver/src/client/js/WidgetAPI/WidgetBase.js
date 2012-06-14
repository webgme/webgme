"use strict";

define(['commonUtil'], function (commonUtil) {

    var WidgetBase = function (id) {
        var guid = id || commonUtil.guid();
        this.children = {};
        this.skinParts = {};
        this.project = null;
        this.parentWidget = null;
        this.nodeAttrNames = {  "id": "_id",
                                "name" : "name",
                                "children": "children",
                                "parentId": "parent",
                                "posX": "attr.posX",
                                "posY": "attr.posY",
                                "source" : "srcId",
                                "target" : "trgtId",
                                "outgoingConnections": "connSrc",
                                "incomingConnections": "connTrgt" };

        //widget outermost DOM element
        this.el = $('<div/>').attr("id", guid);

        this.getId = function () {
            return guid;
        };

        this.getBoundingBox = function () {
            var bBox = {    "x": parseInt($(this.el).css("left"), 10),
                "y": parseInt($(this.el).css("top"), 10),
                "width": parseInt($(this.el).outerWidth(true), 10),
                "height": parseInt($(this.el).outerHeight(true), 10) };
            bBox.x2 = bBox.x + bBox.width;
            bBox.y2 = bBox.y + bBox.height;

            return bBox;
        };

        //it should be overridden in the inherited members
        this.initializeFromNode = function (node) {
        };

        this.addedToParent = function () {
        };

        this.childAdded = function (child) {
        };

        this.destroy = function () {
            this.el.remove();
        };

        this.addChild = function (child) {
            this.children[child.getId()] = child;
            if (this.skinParts.childrenContainer) {
                child.parentWidget = this;
                this.skinParts.childrenContainer.append(child.el);
                child.addedToParent();
                this.childAdded.call(this, child);
            }
        };

        this.removeChildById = function (childId) {
            if (this.children[childId]) {
                this.children[childId].destroy();
                delete this.children[childId];
            }
        };

        this.isSelectable = function () {
            return false;
        };

        this.isDraggable = function () {
            return false;
        };
    };

    return WidgetBase;
});