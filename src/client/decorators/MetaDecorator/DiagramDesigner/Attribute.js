/*globals define, WebGMEGlobal, $*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger'], function (Logger) {

    'use strict';

    var Attribute;

    Attribute = function (attrDesc) {
        this.name = attrDesc.name;
        this.type = attrDesc.type;

        this._render();

        //get logger instance for this component
        //some comment here
        this.logger = Logger.create('gme:decorators:MetaDecorator:DiagramDesigner:Attribute_' + this.name,
            WebGMEGlobal.gmeConfig.client.log);
        this.logger.debug('Created');
    };

    Attribute.prototype._DOMAttributeBase =
        $('<div class="attr" data-name="__ID__"><span class="n"></span><span class="t"></span></div>');

    Attribute.prototype._render = function () {

        this.$el = this._DOMAttributeBase.clone();
        this.$el.attr({
            'data-name': this.name,
            title: this.name
        });

        this.$el.find('.n').text(this.name + ':');
        this.$el.find('.t').text(this.type);
    };

    Attribute.prototype.destroy = function () {
        //finally remove itself from DOM
        if (this.$el) {
            this.$el.remove();
            this.$el.empty();
        }
    };


    return Attribute;
});