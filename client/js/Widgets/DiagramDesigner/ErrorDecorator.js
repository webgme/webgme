"use strict";

define(['js/Widgets/DiagramDesigner/DecoratorBase'], function (DecoratorBase) {

    var ErrorDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "ErrorDecorator";

    ErrorDecorator = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.name = "";

        this.logger.debug("ErrorDecorator ctor");
    };

    _.extend(ErrorDecorator.prototype, __parent_proto__);
    ErrorDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    ErrorDecorator.prototype.$DOMBase = $('<div class="error-decorator"><i class="icon-warning-sign"></i></div>');

    ErrorDecorator.prototype.on_addTo = function () {
        this._renderContent();

        //let the parent decorator class do its job first
        __parent_proto__.on_addTo.apply(this, arguments);
    };

    ErrorDecorator.prototype.on_addToPartBrowser = function () {
        this._renderContent();

        //let the parent decorator class do its job first
        __parent_proto__.on_addToPartBrowser.apply(this, arguments);
    };

    ErrorDecorator.prototype._renderContent = function () {
        this.$el.append(this._metaInfo.__missingdecorator__);
        this.$el.attr('title', "Could not initialize decorator '" + this._metaInfo.__missingdecorator__ + "'");
    };

    return ErrorDecorator;
});