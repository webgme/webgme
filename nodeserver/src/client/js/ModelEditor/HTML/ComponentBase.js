"use strict";

define(['jquery'], function (jquery) {

    var ComponentBase;

    ComponentBase = function (id, cType) {
        var guid = id,
            type = cType;

        //component's outermost DOM element
        this.el = $('<div/>').attr("id", guid);

        this._skinParts = {};

        this.getId = function () {
            return guid;
        };

        this.getType = function () {
            return type;
        };
    };

    ComponentBase.prototype.render = function () {};

    ComponentBase.prototype.destroy = function () {
        var self = this;

        //component specific cleanup
        //i.e.: delete its own territory
        this.onDestroy();

        //finally remove itself from DOM
        if (this.el) {
            this.el.fadeOut('slow', function () {
                self.el.empty();
                self.el.remove();
            });
        }
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

    ComponentBase.prototype.isVisible = function () {
        return true;
    };

    return ComponentBase;
});