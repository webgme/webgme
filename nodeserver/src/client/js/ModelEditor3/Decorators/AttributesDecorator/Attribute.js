"use strict";

define(['logManager'], function (logManager) {

    var Attribute,
        CONNECTOR_CLASS = ".connector",
        EVENT_POSTFIX = "Attribute",
        MOUSE_ENTER = "mouseenter",
        MOUSE_LEAVE = "mouseleave",
        Attribute_CONNECTOR_LEN = 20;

    Attribute = function (attrDesc) {
        this.name = attrDesc.name;
        this.type = attrDesc.type;

        this._render();

        //get logger instance for this component
        //some comment here
        this.logger = logManager.create("Attribute_" + this.name);
        this.logger.debug("Created");
    };

    Attribute.prototype._DOMAttributeBase = $('<div class="attr" data-name="__ID__"></div>');
    Attribute.prototype._DOMTitleWrapper = $('<div class="title-wrapper"><span class="title">__NAME__</span></div>');

    Attribute.prototype._render = function () {
        var self = this;

        this.$el = this._DOMAttributeBase.clone();
        this.$el.attr({"data-name": this.name,
                      "title": this.name});

        this.$el.text(this.name + ": " + this.type);
    };

    Attribute.prototype.destroy = function () {
        //finally remove itself from DOM
        if (this.$el) {
            this.$el.off( MOUSE_ENTER + '.' + EVENT_POSTFIX).off( MOUSE_LEAVE + '.' + EVENT_POSTFIX);
            this.$el.remove();
            this.$el.empty();
        }
    };


    return Attribute;
});