"use strict";

define(['commonUtil'], function (commonUtil) {

    var WidgetBase2;

    WidgetBase2 = function (id, proj) {
        var guid = id || commonUtil.guid();
        this.children = {};
        this.skinParts = {};
        this.project = proj;
        this.parentWidget = null;
        this.nodeAttrNames = { "name" : "name",
            "source" : "srcId",
            "target" : "trgtId",
            "outgoingConnections": "connSrc",
            "incomingConnections": "connTrgt",
            "isPort": "isPort" };
        this.nodeRegistryNames = {   "position" : "position" };

        //widget outermost DOM element
        this.el = $('<div/>').attr("id", guid);

        this.getId = function () {
            return guid;
        };

        this.addedToParent = function () {
        };

        this.childAdded = function (child) {
        };

        this.destroy = function () {
            var i;

            //delete its own territory
            this.onDestroy();

            //destroy all children
            for (i in this.children) {
                if (this.children.hasOwnProperty(i)) {
                    this.children[i].destroy();
                }
            }

            //finally remove itself from DOM
            this.el.remove();
        };

        this.onDestroy = function () {};

        this.addChild = function (child, childContainer) {
            this.children[child.getId()] = child;
            if (this.skinParts.childrenContainer) {
                child.parentWidget = this;
                if (childContainer) {
                    childContainer.append(child.el);
                } else {
                    this.skinParts.childrenContainer.append(child.el);
                }
                child.addedToParent();
                this.childAdded.call(this, child);
            }
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

        /*



         this.childAdded = function (child) {
        };





        t

        */
    };

    return WidgetBase2;
});