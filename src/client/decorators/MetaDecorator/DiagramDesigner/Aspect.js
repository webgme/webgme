/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define(['js/logger'], function (Logger) {

    'use strict';

    var Aspect;

    Aspect = function (aspectDesc) {
        this.name = aspectDesc.name;
        this.itemNum = aspectDesc.items ? aspectDesc.items.length : 0;

        this._render();

        //get logger instance for this component
        //some comment here

        this.logger = Logger.create('gme:decorators:MetaDecorator:DiagramDesigner:Aspect_' + this.name,
            WebGMEGlobal.gmeConfig.client.log);
        this.logger.debug('Created');
    };

    Aspect.prototype._DOMAspectBase = $('<div class="aspect" data-name="__ID__"><span class="n"></span>' +
    '<span class="t"></span></div>');

    Aspect.prototype._render = function () {
        this.$el = this._DOMAspectBase.clone();
        this.$el.attr({'data-name': this.name,
                      title: this.name + ', types: ' + this.itemNum});

        this.$el.find('.n').text(this.name + ':');
        this.$el.find('.t').text(this.itemNum);
    };

    Aspect.prototype.update = function (aspectDesc) {
        this.name = aspectDesc.name;
        this.itemNum = aspectDesc.items ? aspectDesc.items.length : 0;

        this._render();
    };

    Aspect.prototype.destroy = function () {
        //finally remove itself from DOM
        if (this.$el) {
            this.$el.remove();
            this.$el.empty();
        }
    };


    return Aspect;
});