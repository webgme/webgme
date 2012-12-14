"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DefaultDecorator'], function (logManager,
                                                         util,
                                                         DefaultDecorator) {

    var SlowRenderDecorator,
        __parent__ = DefaultDecorator,
        __parent_proto__ = DefaultDecorator.prototype;

    SlowRenderDecorator = function (options) {
        var opts = _.extend( {}, options);

        opts.loggerName = opts.loggerName || "SlowRenderDecorator";

        __parent__.apply(this, [opts]);

        this.counter = 5;
        this.timerFreq = 1000;

        this.logger.debug("SlowRenderDecorator ctor");
    };

    _.extend(SlowRenderDecorator.prototype, __parent_proto__);

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    SlowRenderDecorator.prototype.on_addTo = function () {
        var self = this;
        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$name.text(this.counter);

        setTimeout(function () {
            self._updateProgress();
        }, this.timerFreq);

        return false;
    };

    SlowRenderDecorator.prototype._updateProgress = function () {
        var self = this;

        this.counter -= 1;

        if (this.counter > 0) {
            this.skinParts.$name.text(this.counter);

            setTimeout(function () {
                self._updateProgress();
            }, this.timerFreq);
        } else {
            this.skinParts.$name.html(this.name + '<br/>Completed...');

            this.$el.css("height", "70px");

            this.hostDesignerItem.decoratorUpdated();
        }
    };

    SlowRenderDecorator.prototype.on_renderPhase1 = function () {
        //check if this guy is ready
        if (this.counter === 0) {
            //let the parent decorator class do its job first
            __parent_proto__.on_renderPhase1.apply(this, arguments);

            this.renderPhase1Cache.nameHeight = this.skinParts.$name.outerHeight();
            this.renderPhase1Cache.boxHeight = this.$el.height();
        }
    };

    SlowRenderDecorator.prototype.on_renderPhase2 = function () {
        var shift;

        //check if this guy is ready
        if (this.counter === 0) {
            shift = (this.renderPhase1Cache.boxHeight - this.renderPhase1Cache.nameHeight) / 2;

            this.skinParts.$name.css({"margin-top": shift});


            //let the parent decorator class do its job finally
            __parent_proto__.on_renderPhase2.apply(this, arguments);
        }
    };

    SlowRenderDecorator.prototype.update = function (objDescriptor, silent) {
        if (this.counter === 0) {
            this.hostDesignerItem.decoratorUpdated();
        }
    };

    return SlowRenderDecorator;
});