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
        this.skinParts.svgPaper = Raphael(this.skinParts.$circleCanvas[0], CANVAS_SIZE, CANVAS_SIZE);
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
        var result = [],
            LEN = 20;

        //by default return the bounding box edges midpoints
        //NOTE: it returns the connection point regardless of being asked for
        //its own connection ports or some of the subcomponent's connection ports

        result.push( {"id": "0",
            "x1": CANVAS_SIZE / 2,
            "y1": 0,
            "x2": CANVAS_SIZE / 2,
            "y2": 0,
            "angle1": 190,
            "angle2": 350,
            "len": LEN} );

        result.push( {"id": "1",
            "x1": CANVAS_SIZE / 2,
            "y1": CANVAS_SIZE,
            "x2": CANVAS_SIZE / 2,
            "y2": CANVAS_SIZE,
            "angle1": 10,
            "angle2": 170,
            "len": LEN} );

        result.push( {"id": "2",
            "x1": 0,
            "y1": CANVAS_SIZE / 2,
            "x2": 0,
            "y2": CANVAS_SIZE / 2,
            "angle1": 100,
            "angle2": 260,
            "len": LEN} );

        result.push( {"id": "3",
            "x1": CANVAS_SIZE,
            "y1": CANVAS_SIZE / 2,
            "x2": CANVAS_SIZE,
            "y2": CANVAS_SIZE / 2,
            "angle1": -80,
            "angle2": 80,
            "len": LEN} );

        return result;
    };

    CircleDecoratorDiagramDesignerWidget.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString();
        if (this.name && this.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
            return true;
        }

        return false;
    };

    return CircleDecoratorDiagramDesignerWidget;
});