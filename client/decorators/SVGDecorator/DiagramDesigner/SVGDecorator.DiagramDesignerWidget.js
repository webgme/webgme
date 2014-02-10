"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../Core/SVGDecorator.html',
    '../Core/SVGDecorator.Core',
    'css!./SVGDecorator.DiagramDesignerWidget'], function (CONSTANTS,
                                                          nodePropertyNames,
                                                          DiagramDesignerWidgetDecoratorBase,
                                                          DiagramDesignerWidgetConstants,
                                                          SVGDecoratorTemplate,
                                                          SVGDecoratorCore) {

    var SVGDecoratorDiagramDesignerWidget,
        DECORATOR_ID = "SVGDecoratorDiagramDesignerWidget";

    SVGDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend( {}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);

        this._initializeVariables({"connectors": true});

        this._selfPatterns = {};

        this.logger.debug("SVGDecoratorDiagramDesignerWidget ctor");
    };

    /************************ INHERITANCE *********************/
    _.extend(SVGDecoratorDiagramDesignerWidget.prototype, DiagramDesignerWidgetDecoratorBase.prototype);
    _.extend(SVGDecoratorDiagramDesignerWidget.prototype, SVGDecoratorCore.prototype);

    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.$DOMBase = $(SVGDecoratorTemplate);

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this.$name.on("dblclick.editOnDblClick", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "value": self.name,
                    "onChange": function (oldValue, newValue) {
                        self.__onNodeTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.update = function () {
        this._update();
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.calculateDimension = function () {
        this._paddingTop = parseInt(this.$el.css('padding-top'), 10);
        this._borderTop = parseInt(this.$el.css('border-top-width'), 10);

        if (this.hostDesignerItem) {
            this.hostDesignerItem.setSize(this.$el.outerWidth(true), this.$el.outerHeight(true));
        }
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id/*, isEnd, connectionMetaInfo*/) {
        var result = [],
            edge = 10,
            LEN = 20;

        //by default return the bounding box edges midpoints

        if (id === undefined || id === this.hostDesignerItem.id) {
            //North side
            result.push( {"id": "N",
                "x1": edge,
                "y1": 0,
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": 0,
                "angle1": 270,
                "angle2": 270,
                "len": LEN} );

            //South side
            result.push( {"id": "S",
                "x1": edge,
                "y1": this.hostDesignerItem.getHeight(),
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": this.hostDesignerItem.getHeight(),
                "angle1": 90,
                "angle2": 90,
                "len": LEN} );


            result.push({"id": "E",
                "x1": this.hostDesignerItem.getWidth(),
                "y1": edge,
                "x2": this.hostDesignerItem.getWidth(),
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 0,
                "angle2": 0,
                "len": LEN});


            result.push({"id": "W",
                "x1": 0,
                "y1": edge,
                "x2": 0,
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 180,
                "angle2": 180,
                "len": LEN});
        }

        return result;
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //Shows the 'connectors' - appends them to the DOM
    SVGDecoratorDiagramDesignerWidget.prototype.showSourceConnectors = function (params) {
        var connectors,
            i;

        if (!params) {
            this.$sourceConnectors.show();
        } else {
            connectors = params.connectors;
            i = connectors.length;
            while (i--) {
                if (connectors[i] === undefined) {
                    //show connector for the represented item itself
                    this.$sourceConnectors.show();
                } else {
                }
            }
        }
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    SVGDecoratorDiagramDesignerWidget.prototype.hideSourceConnectors = function () {
        this.$sourceConnectors.hide();
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //should highlight the connectors for the given elements
    SVGDecoratorDiagramDesignerWidget.prototype.showEndConnectors = function (params) {
       this.showSourceConnectors(params);
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    SVGDecoratorDiagramDesignerWidget.prototype.hideEndConnectors = function () {
        this.hideSourceConnectors();
    };


    SVGDecoratorDiagramDesignerWidget.prototype.__onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    return SVGDecoratorDiagramDesignerWidget;
});