"use strict";

define(['logManager',
    'text!ModelEditor2/ModelPortLeftTmpl.html',
    'text!ModelEditor2/ModelPortRightTmpl.html',
    'css!ModelEditor2CSS/Port'], function (logManager,
                                              modelPortLeftTmpl,
                                              modelPortRightTmpl) {

    var Port;

    Port = function (id, options) {
        this.id = id;

        this.title = options.title || "";
        this.orientation = null; //options.orientation || "W";
        this.position = {};
        this.skinParts = [];

        //get logger instance for this component
        this.logger = logManager.create("Port_" + this.id);
        this.logger.debug("Created");
    };

    Port.prototype._DOMBaseLeftTemplate = $(modelPortLeftTmpl);

    Port.prototype._DOMBaseRightTemplate = $(modelPortRightTmpl);

    Port.prototype._initialize = function () {
        var concretePortTemplate = this.orientation === "W" ? this._DOMBaseLeftTemplate : this._DOMBaseRightTemplate;

        this.el = concretePortTemplate.clone();
        this.el.attr({"id": this.id,
                      "data-id": this.id});

        this.skinParts.connectionPoint = this.el.find(".dot");
        this.skinParts.connectionPoint.attr({"data-id": this.id});

        this.skinParts.portTitle = this.el.find(".title");
        this.skinParts.portTitle.text(this.title);
    };

    Port.prototype.update = function (options) {
        if (options.title) {
            if (this.title !== options.title) {
                this.title = options.title;
                this.skinParts.portTitle.text(options.title);
            }
        }
    };

    Port.prototype.updateOrPos = function (or, pos) {
        this.position.x = pos.x;
        this.position.y = pos.y;

        if (this.orientation !== or) {
            this.orientation = or;
            this._initialize();
        }
    };

    Port.prototype.destroy = function () {
        //finally remove itself from DOM
        if (this.el) {
            this.el.remove();
            this.el.empty();
        }
    };

    return Port;
});