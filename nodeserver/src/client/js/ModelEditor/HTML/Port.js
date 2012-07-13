"use strict";

define(['logManager',
    'text!ModelEditorHTML/ModelPortLeftTmpl.html',
    'text!ModelEditorHTML/ModelPortRightTmpl.html',
    'css!ModelEditorHTMLCSS/Port'], function (logManager,
                                              modelPortLeftTmpl,
                                              modelPortRightTmpl) {

    var Port;

    Port = function (id, options) {
        //component's outermost DOM element
        this.el = $('<div/>').attr("id", id);
        this.id = id;

        this.title = options.title || "";
        this.orientation = options.orientation || "W";
        this.skinParts = [];
        this.modelEditorCanvas = options.modelEditorCanvas || null;

        //get logger instance for this component
        this.logger = logManager.create("Port_" + this.id);
        this.logger.debug("Created");

        this._initialize();
    };

    Port.prototype._initialize = function () {
        var self = this,
            concretePortTemplate = this.orientation === "W" ? modelPortLeftTmpl : modelPortRightTmpl,
            portDomString,
            data = {};

        data.name = this.title;
        data.pid = this.id;
        portDomString = _.template(concretePortTemplate, data);

        this.el = $(portDomString);
        this.skinParts.connectionPoint = this.el.find(".dot");
        this.skinParts.portTitle = this.el.find(".title");

        //hook up mouse events
        this.el.bind("mouseover", function () {
            self.el.addClass("activePort");
        });

        this.el.bind("mouseout", function () {
            self.el.removeClass("activePort");
        });

        this.el.draggable({
            helper: function () {
                return $("<div class='draw-connection-drag-helper'></div>").data("sourceId", self.id);
            },
            scroll: true,
            cursor: 'pointer',
            cursorAt: {
                left: 0,
                top: 0
            },
            start: function (event) {
                self.el.addClass("connection-source");
                self.modelEditorCanvas.startDrawConnection(self.id);
                event.stopPropagation();
            },
            stop: function (event) {
                self.modelEditorCanvas.endDrawConnection(self.id);
                self.el.removeClass("connection-source");
                event.stopPropagation();
            },
            drag: function (event) {
                self.modelEditorCanvas.onDrawConnection(event);
            }
        });

        this.el.droppable({
            accept: ".connection-source",
            //activeClass: "ui-state-active",
            hoverClass: "connection-end-state-hover",
            greedy: true,
            drop: function (event, ui) {
                var data = $.extend(true, {}, ui.helper.data());
                data.targetId = self.id;

                ui.helper.data("dropHandled", true);

                self.modelEditorCanvas.createConnection(data);
                event.stopPropagation();
            }
        });
    };

    Port.prototype.getConnectionPoints = function () {
        var pos = this.skinParts.connectionPoint.position(),
            w = this.skinParts.connectionPoint.width(),
            h = this.skinParts.connectionPoint.height(),
            mLeft = parseInt(this.skinParts.connectionPoint.css("margin-left"), 10),
            returnPos = {},
            result = [];

        returnPos.x = pos.left + mLeft + Math.floor(w / 2);
        returnPos.y = pos.top + Math.floor(h / 2);
        returnPos.dir = this.orientation;

        result.push(returnPos);

        return result;
    };

    Port.prototype.getOrientation = function () {
        return this.orientation;
    };

    Port.prototype.update = function (options) {
        if (options.title) {
            this.skinParts.portTitle.text(options.title);
        }
    };

    return Port;
});