"use strict";

define([], function () {

    var ComponentBase;

    ComponentBase = function (id, proj) {
        var guid = id;
        this.project = proj;

        this.parentComponent = null;
        this.childComponents = {};
        this.skinParts = {};

        //component's outermost DOM element
        this.el = $('<div/>').attr("id", guid);

        this.getId = function () {
            return guid;
        };
    };

    ComponentBase.prototype.addChild = function (child, childContainer) {
        if (this.childComponents[child.getId()]) {
            this.childComponents[child.getId()].destroy();
        }

        this.childComponents[child.getId()] = child;

        child.parentComponent = this;

        if (childContainer) {
            childContainer.append(child.el);
        } else {
            if (this.skinParts.childrenContainer) {
                this.skinParts.childrenContainer.append(child.el);
            }
        }

        child.addedToParent.call(child);
    };

    ComponentBase.prototype.addedToParent = function () {};

    ComponentBase.prototype.removeChildById = function (childId) {
        if (this.childComponents[childId]) {
            this.childComponents[childId].destroy();
            delete this.childComponents[childId];
        }
    };

    ComponentBase.prototype.destroy = function () {
        var i;

        //component specific cleanup
        //i.e.: delete its own territory
        this.onDestroy();

        //destroy all children
        for (i in this.childComponents) {
            if (this.childComponents.hasOwnProperty(i)) {
                this.childComponents[i].destroy();
            }
        }

        //finally remove itself from DOM
        this.el.remove();
    };

    ComponentBase.prototype.onDestroy = function () {};

    ComponentBase.prototype.getBoundingBox = function (absolute) {
        var bBox = {    "x": absolute === true ? $(this.el).offset().left : parseInt($(this.el).css("left"), 10),
            "y": absolute === true ? $(this.el).offset().top : parseInt($(this.el).css("top"), 10),
            "width": parseInt($(this.el).outerWidth(true), 10),
            "height": parseInt($(this.el).outerHeight(true), 10) };
        bBox.x2 = bBox.x + bBox.width;
        bBox.y2 = bBox.y + bBox.height;

        return bBox;
    };

    ComponentBase.prototype.isSelectable = function () {
        return false;
    };

    ComponentBase.prototype.isMultiSelectable = function () {
        return false;
    };

    return ComponentBase;
});