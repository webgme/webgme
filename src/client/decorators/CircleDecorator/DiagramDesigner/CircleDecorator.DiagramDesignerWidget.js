/*globals define, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    '../Core/CircleDecorator.Core',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../Core/CircleDecorator.html',
    'css!./CircleDecorator.DiagramDesignerWidget.css'
], function (DiagramDesignerWidgetDecoratorBase,
             CircleDecoratorCore,
             DiagramDesignerWidgetConstants,
             circleDecoratorTemplate) {

    'use strict';
    var CircleDecoratorDiagramDesignerWidget,
        DECORATOR_ID = 'CircleDecoratorDiagramDesignerWidget';

    CircleDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend({}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);
        CircleDecoratorCore.apply(this, [opts]);

        this._initializeVariables({connectors: true});

        this.logger.debug('CircleDecoratorDiagramDesignerWidget ctor');
    };

    /************************ INHERITANCE *********************/
    _.extend(CircleDecoratorDiagramDesignerWidget.prototype, DiagramDesignerWidgetDecoratorBase.prototype);
    _.extend(CircleDecoratorDiagramDesignerWidget.prototype, CircleDecoratorCore.prototype);

    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    CircleDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    CircleDecoratorDiagramDesignerWidget.prototype.$DOMBase = $(circleDecoratorTemplate);

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    //jshint camelcase:false
    CircleDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        this._renderContent();
    };
    //jshint camelcase:true
    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    CircleDecoratorDiagramDesignerWidget.prototype.update = function () {
        this._update();
    };

    CircleDecoratorDiagramDesignerWidget.prototype.onRenderGetLayoutInfo = function () {
        //let the parent decorator class do its job first
        DiagramDesignerWidgetDecoratorBase.prototype.onRenderGetLayoutInfo.apply(this, arguments);

        if (this.skinParts.$name) {
            this.renderLayoutInfo.nameWidth = this.skinParts.$name.outerWidth();
        }
    };

    CircleDecoratorDiagramDesignerWidget.prototype.onRenderSetLayoutInfo = function () {
        if (this.renderLayoutInfo) {
            if (this.skinParts.$name) {
                var shift = (this.circleSize - this.renderLayoutInfo.nameWidth) / 2;

                this.skinParts.$name.css({left: shift});
            }
        }


        //let the parent decorator class do its job finally
        DiagramDesignerWidgetDecoratorBase.prototype.onRenderSetLayoutInfo.apply(this, arguments);
    };

    CircleDecoratorDiagramDesignerWidget.prototype.calculateDimension = function () {
        var size = this.circleSize;

        if (this.hostDesignerItem) {
            this.hostDesignerItem.setSize(size, size);
        }
    };

    CircleDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (/*id, isEnd, connectionMetaInfo*/) {
        var result = [],
            LEN = 10,
            CIRCLE_SIZE = this.circleSize,
            center = Math.floor(CIRCLE_SIZE / 2);

        result.push({
            id: 'N',
            x1: center,
            y1: 0,
            x2: center,
            y2: 0,
            angle1: 270,
            angle2: 270,
            len: LEN
        });

        result.push({
            id: 'S',
            x1: center,
            y1: CIRCLE_SIZE - 1,
            x2: center,
            y2: CIRCLE_SIZE - 1,
            angle1: 90,
            angle2: 90,
            len: LEN
        });

        result.push({
            id: 'W',
            x1: 0,
            y1: center,
            x2: 0,
            y2: center,
            angle1: 180,
            angle2: 180,
            len: LEN
        });

        result.push({
            id: 'E',
            x1: CIRCLE_SIZE - 1,
            y1: center,
            x2: CIRCLE_SIZE - 1,
            y2: center,
            angle1: 0,
            angle2: 0,
            len: LEN
        });

        return result;
    };

    return CircleDecoratorDiagramDesignerWidget;
});