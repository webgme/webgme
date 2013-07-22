"use strict";

define(['../../DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget',
    'text!./CircleDecorator.DiagramDesignerWidget.html',
    'css!./CircleDecorator.DiagramDesignerWidget'], function (
                                                          DefaultDecoratorDiagramDesignerWidget,
                                                        circleDecoratorDiagramDesignerWidgetTemplate) {

    var CircleDecoratorDiagramDesignerWidget,
        __parent__ = DefaultDecoratorDiagramDesignerWidget,
        DECORATOR_ID = "CircleDecoratorDiagramDesignerWidget",
        CANVAS_SIZE = 40,
        FILL_COLOR = '#000000';

    CircleDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.logger.debug("CircleDecoratorDiagramDesignerWidget ctor");
    };

    _.extend(CircleDecoratorDiagramDesignerWidget.prototype, __parent__.prototype);
    CircleDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    CircleDecoratorDiagramDesignerWidget.prototype.$DOMBase = $(circleDecoratorDiagramDesignerWidgetTemplate);

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    CircleDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        this._renderCircle();

        //let the parent decorator class do its job first
        __parent__.prototype.on_addTo.apply(this, arguments);
    };


    CircleDecoratorDiagramDesignerWidget.prototype._renderCircle = function () {
        //find additional CircleDecoratorDiagramDesignerWidget specific UI components
        this.skinParts.$circleCanvas = this.$el.find('[id="circleCanvas"]');
        this.skinParts.$circleCanvas.height(CANVAS_SIZE);
        this.skinParts.$circleCanvas.width(CANVAS_SIZE);
        this.skinParts.svgPaper = Raphael(this.skinParts.$circleCanvas[0]);
        this.skinParts.svgPaper.circle(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1).attr('fill',FILL_COLOR);
    };

    CircleDecoratorDiagramDesignerWidget.prototype.onRenderGetLayoutInfo = function () {
        //let the parent decorator class do its job first
        __parent__.prototype.onRenderGetLayoutInfo.apply(this, arguments);

        this.renderLayoutInfo.nameWidth = this.skinParts.$name.outerWidth();
    };

    CircleDecoratorDiagramDesignerWidget.prototype.onRenderSetLayoutInfo = function () {
        if (this.renderLayoutInfo) {
            var shift = (CANVAS_SIZE - this.renderLayoutInfo.nameWidth) / 2;

            this.skinParts.$name.css({ "left": shift });
        }


        //let the parent decorator class do its job finally
        __parent__.prototype.onRenderSetLayoutInfo.apply(this, arguments);
    };

    CircleDecoratorDiagramDesignerWidget.prototype.calculateDimension = function () {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.width = CANVAS_SIZE;
            this.hostDesignerItem.height = CANVAS_SIZE + this.skinParts.$name.outerHeight(true);
        }
    };

    CircleDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (/*id*/) {
        var result = [];

        //by default return the bounding box edges midpoints
        //NOTE: it returns the connection point regardless of being asked for
        //its own connection ports or some of the subcomponent's connection ports

        //top left
        result.push( {"id": "0",
            "x": CANVAS_SIZE / 2,
            "y": 0,
            "w": 0,
            "h": 0,
            "orientation": "N",
            "len": 10} );

        result.push( {"id": "1",
            "x": CANVAS_SIZE / 2,
            "y": CANVAS_SIZE,
            "w": 0,
            "h": 0,
            "orientation": "S",
            "len": 10} );

        result.push( {"id": "2",
            "x": 0,
            "y": CANVAS_SIZE / 2,
            "w": 0,
            "h": 0,
            "orientation": "W",
            "len": 10} );

        result.push( {"id": "3",
            "x": CANVAS_SIZE,
            "y": CANVAS_SIZE / 2,
            "w": 0,
            "h": 0,
            "orientation": "E",
            "len": 10} );

        return result;
    };

    return CircleDecoratorDiagramDesignerWidget;
});