/*globals define,_*/
define(['js/Widgets/SnapEditor/SnapEditorWidget.DecoratorBase'], function (SnapEditorWidgetDecoratorBase) {

    "use strict";

    var ErrorDecorator,
        __parent__ = SnapEditorWidgetDecoratorBase,
        __parent_proto__ = SnapEditorWidgetDecoratorBase.prototype,
        DECORATOR_ID = "ErrorDecorator";

    ErrorDecorator = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.name = "";

        this.logger.debug("ErrorDecorator ctor");
    };

    _.extend(ErrorDecorator.prototype, __parent_proto__);
    ErrorDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DIAGRAMDESIGNERWIDGETDECORATORBASE MEMBERS **************************/

    ErrorDecorator.prototype.$DOMBase = $('<div class="error-decorator"><i class="icon-warning-sign"></i></div>');

    ErrorDecorator.prototype.on_addTo = function () {
        this._renderContent();

        //let the parent decorator class do its job first
        __parent_proto__.on_addTo.apply(this, arguments);
    };

    ErrorDecorator.prototype._renderContent = function () {
        this.$el.append(this._metaInfo.__missingdecorator__);
        this.$el.attr('title', "Could not initialize decorator '" + this._metaInfo.__missingdecorator__ + "'");
    };

    /* * * * * * * Connection functionality * * * * * * */
    ErrorDecorator.prototype.cleanConnections = function () {
        //Shouldn't be any connection areas 
    };

    ErrorDecorator.prototype.getConnectionAreas = function () {
        return [];
    };

    return ErrorDecorator;
});
