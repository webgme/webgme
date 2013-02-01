"use strict";

define(['logManager',
    'text!js/ModelEditor3/Decorators/DecoratorWithPorts/PortLeftTmpl.html',
    'text!js/ModelEditor3/Decorators/DecoratorWithPorts/PortRightTmpl.html',
    'css!ModelEditor3CSS/Decorators/DecoratorWithPorts/Port'], function (logManager,
                                              modelPortLeftTmpl,
                                              modelPortRightTmpl) {

    var Port,
        CONNECTOR_CLASS = ".connector",
        EVENT_POSTFIX = "Port",
        MOUSE_ENTER = "mouseenter",
        MOUSE_LEAVE = "mouseleave",
        PORT_CONNECTOR_LEN = 20;

    Port = function (id, options) {
        this.id = id;

        this.title = options.title || "";
        this.orientation = undefined;
        this.position = {};
        this.skinParts = [];
        this.connectionArea = { "x": 0,
            "y": 0,
            "w": 0,
            "h": 0,
            "orientation": "E",
            "len": PORT_CONNECTOR_LEN};

        this.decorator = options.decorator;

        //get logger instance for this component
        //some comment here
        this.logger = logManager.create("Port_" + this.id);
        this.logger.debug("Created");
    };

    Port.prototype._DOMBaseLeftTemplate = $(modelPortLeftTmpl);

    Port.prototype._DOMBaseRightTemplate = $(modelPortRightTmpl);

    Port.prototype._initialize = function () {
        var self = this,
            concretePortTemplate = this.orientation === "W" ? this._DOMBaseLeftTemplate : this._DOMBaseRightTemplate;

        this.$el = concretePortTemplate.clone();
        this.$el.attr({"id": this.id,
                      "data-id": this.id,
                      "title": this.title});

        this.$portTitle = this.$el.find(".title");
        this.$portTitle.text(this.title);

        this.$connectors = this.$el.find(CONNECTOR_CLASS);
        this.hideConnectors();

        this.$portDot = this.$el.find(".dot");

        this.$el.on( MOUSE_ENTER + '.' + EVENT_POSTFIX, null, null, function (event) {
            self._mouseEnter();
            event.preventDefault();
            event.stopPropagation();
        }).on( MOUSE_LEAVE + '.' + EVENT_POSTFIX, null, null, function (event) {
            self._mouseLeave();
            event.preventDefault();
            event.stopPropagation();
        });
    };

    Port.prototype.update = function (options) {
        if (options.title) {
            if (this.title !== options.title) {
                this.title = options.title;
                this.$portTitle.text(options.title);
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
        this.hideConnectors();
        //finally remove itself from DOM
        if (this.$el) {
            this.$el.off( MOUSE_ENTER + '.' + EVENT_POSTFIX).off( MOUSE_LEAVE + '.' + EVENT_POSTFIX);
            this.$el.remove();
            this.$el.empty();
        }
    };

    //Shows the 'connectors' - appends them to the DOM
    Port.prototype.showConnectors = function () {
        this.$connectors.show();

        //hook up connection drawing capability
        this.decorator.attachConnectableSubcomponent(this.$connectors, this.id);
    };

    //Hides the 'connectors' - detaches them from the DOM
    Port.prototype.hideConnectors = function () {
        //remove up connection drawing capability
        if (this.decorator) {
            this.decorator.detachConnectableSubcomponent(this.$connectors);
        }

        this.$connectors.hide();
    };

    Port.prototype._mouseEnter = function () {
        this.showConnectors();
    };

    Port.prototype._mouseLeave = function () {
        this.hideConnectors();
    };

    Port.prototype.calculatePortConnectionArea = function () {
        var location = this.$portDot.offset(),
            w = this.$portDot.outerWidth(),
            h = this.$portDot.outerHeight();

        this.connectionArea.x = location.left;
        this.connectionArea.y = location.top;
        this.connectionArea.w = 0;
        this.connectionArea.h = 7;
        this.connectionArea.orientation = this.orientation;

        if (this.orientation === "E") {
            this.connectionArea.x += 2;
        } else {
            this.connectionArea.x += 3;
        }

        this.connectionArea.y += 1;
    };

    Port.prototype.getConnectorArea = function () {
        return this.connectionArea;
    };

    return Port;
});