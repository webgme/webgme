"use strict";

define(['logManager'], function (logManager) {

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

    Port.prototype._DOMPortBase = $('<div  id="__ID__" class="port" data-id="__ID__"></div>');
    Port.prototype._DOMTitleWrapper = $('<div class="title-wrapper"><span class="title">__NAME__</span></div>');
    Port.prototype._DOMDot = $('<span class="dot"></span>');
    Port.prototype._DOMConnector = $('<div class="connector"></div>');

    Port.prototype._DOMBaseLeftTemplate = Port.prototype._DOMPortBase.clone().append(Port.prototype._DOMDot.clone()).append(Port.prototype._DOMConnector.clone()).append(Port.prototype._DOMTitleWrapper.clone());

    Port.prototype._DOMBaseRightTemplate = Port.prototype._DOMPortBase.clone().append(Port.prototype._DOMTitleWrapper.clone()).append(Port.prototype._DOMDot.clone()).append(Port.prototype._DOMConnector.clone());

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

        if (this.decorator.renderedInPartBrowser !== true) {
            this.$el.on( MOUSE_ENTER + '.' + EVENT_POSTFIX, null, null, function (event) {
                self._mouseEnter();
                event.preventDefault();
                event.stopPropagation();
            }).on( MOUSE_LEAVE + '.' + EVENT_POSTFIX, null, null, function (event) {
                    self._mouseLeave();
                    event.preventDefault();
                    event.stopPropagation();
                });
        }
    };

    Port.prototype.update = function (options) {
        if (options.title) {
            if (this.title !== options.title) {
                this.title = options.title;
                this.$portTitle.text(this.title);
                this.$el.attr({"title": this.title});
            }
        }
    };

    Port.prototype.updateOrPos = function (or, pos) {
        this.position.x = pos.x;
        this.position.y = pos.y;

        if (this.orientation !== or) {
            this.orientation = or;
            if (!this.$el) {
                this._initialize();
            } else {
                //port's DOM has to be reformatted

                //detach elements and re-append them in a different place
                this.$connectors.detach();
                this.$portDot.detach();

                if (this.orientation === "E") {
                    //now it has EAST orientation
                    this.$el.append(this.$portDot).append(this.$connectors);
                } else {
                    //now it has WEST orientation
                    this.$el.prepend(this.$connectors).prepend(this.$portDot);
                }
            }
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
        var location = this.$portDot.offset();

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