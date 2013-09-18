"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../DiagramDesigner/CircleDecorator.DiagramDesignerWidget.html',
    'css!../DiagramDesigner/CircleDecorator.DiagramDesignerWidget'], function (CONSTANTS,
                                                          nodePropertyNames,
                                                          PartBrowserWidgetDecoratorBase,
                                                          DiagramDesignerWidgetConstants,
                                                          circleDecoratorDiagramDesignerWidgetTemplate) {

    var CircleDecoratorPartBrowserWidget,
        __parent__ = PartBrowserWidgetDecoratorBase,
        DECORATOR_ID = "CircleDecoratorPartBrowserWidget",
        CANVAS_SIZE = 40,
        FILL_COLOR = '#000000';

    CircleDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.logger.debug("CircleDecoratorPartBrowserWidget ctor");
    };

    _.extend(CircleDecoratorPartBrowserWidget.prototype, __parent__.prototype);
    CircleDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    CircleDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(circleDecoratorDiagramDesignerWidgetTemplate);
        //use the same HTML template as the DefaultDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();

    CircleDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");

        this._renderCircle();
    };

    CircleDecoratorPartBrowserWidget.prototype.afterAppend = function () {
        this._renderName();
    };


    CircleDecoratorPartBrowserWidget.prototype.update = function () {
        this._renderName();
    };


    CircleDecoratorPartBrowserWidget.prototype._renderCircle = function () {
        //find additional CircleDecoratorPartBrowserWidget specific UI components
        this.skinParts.$circleCanvas = this.$el.find('[id="circleCanvas"]');
        this.skinParts.$circleCanvas.height(CANVAS_SIZE);
        this.skinParts.$circleCanvas.width(CANVAS_SIZE);
        this.skinParts.svgPaper = Raphael(this.skinParts.$circleCanvas[0], CANVAS_SIZE, CANVAS_SIZE);
        this.skinParts.svgPaper.circle(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1).attr('fill',FILL_COLOR);
    };

    CircleDecoratorPartBrowserWidget.prototype._renderName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            nameWidth,
            shift;

        //render GME-ID in the DOM, for debugging
        if (DEBUG) {
            this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});
        }

        if (nodeObj) {
            this.skinParts.$name.text(nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "");

            nameWidth = this.skinParts.$name.outerWidth();
            shift = (CANVAS_SIZE - nameWidth) / 2;

            this.skinParts.$name.css({ "left": shift });
        }
    };

    return CircleDecoratorPartBrowserWidget;
});