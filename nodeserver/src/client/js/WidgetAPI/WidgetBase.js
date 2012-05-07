"use strict";

define([], function () {

    var WidgetBase = function () {
        this.children = [];
        this.skinParts = {};
        this.skinPartContents = {};
        this.chilrenContainer = null;
        this.project = null;
        this.el = $('<div/>');

        this.initializeFromNode = function (node) {
            this.skinPartContents.id = node.getAttribute("_id");
            this.skinPartContents.title = node.getAttribute("name");
        };

        this.renderUI = function () {
            this.skinParts.title = $('<div/>');
            this.skinParts.childrenContainer = $('<div/>', {
                "class" : "children"
            });
            this.chilrenContainer = this.skinParts.childrenContainer;
        };

        this.bindUI = function () {
            var i;

            for (i in this.skinPartContents) {
                if (this.skinPartContents.hasOwnProperty(i)) {
                    if (this.skinParts[i]) {
                        $(this.skinParts[i]).html(this.skinPartContents[i]);
                    }
                }
            }
        };

        this.render = function () {
            var i,
                child;

            if (this.skinPartContents.id) {
                $(this.el).attr("id", this.skinPartContents.id);
            }

            this.renderUI();

            for (i in this.skinParts) {
                if (this.skinParts.hasOwnProperty(i)) {
                    this.el.append(this.skinParts[i]);
                }
            }

            this.bindUI();

            if (this.chilrenContainer) {
                for (i = 0; i < this.children.length; i += 1) {
                    child = this.children[i];
                    child.render();
                    this.chilrenContainer.append(child.el);
                    if ($.isFunction(this.childAdded)) {
                        this.childAdded.call(this, child);
                    }
                }
            }
        };

        this.addChild = function (child) {
            this.children.push(child);
            if (this.chilrenContainer) {
                child.render();
                child.parentWidget = this;
                this.chilrenContainer.append(child.el);
                if ($.isFunction(this.childAdded)) {
                    this.childAdded.call(this, child);
                }
            }
        };

        this.getBoundingBox = function () {
            var bBox = {    "x": parseInt($(this.el).css("left"), 10),
                            "y": parseInt($(this.el).css("top"), 10),
                            "w": parseInt($(this.el).outerWidth(true), 10),
                            "h": parseInt($(this.el).outerHeight(true), 10) };
            bBox.x2 = bBox.x + bBox.w;
            bBox.y2 = bBox.y + bBox.h;

            return bBox;
        };
    };

    return WidgetBase;
});