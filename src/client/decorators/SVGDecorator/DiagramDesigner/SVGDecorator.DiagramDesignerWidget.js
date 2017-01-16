/*globals define, $, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBaseWithDragPointerHelpers',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../Core/SVGDecorator.html',
    './SVGDecorator.Core',
    'css!./SVGDecorator.DiagramDesignerWidget'
], function (CONSTANTS,
             nodePropertyNames,
             DiagramDesignerWidgetDecoratorBase,
             DiagramDesignerWidgetConstants,
             SVGDecoratorTemplate,
             SVGDecoratorCore) {

    'use strict';

    var SVGDecoratorDiagramDesignerWidget,
        DECORATOR_ID = 'SVGDecoratorDiagramDesignerWidget';

    SVGDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend({}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);
        SVGDecoratorCore.apply(this, [opts]);

        this._initializeVariables({connectors: true});

        this._selfPatterns = {};

        this.logger.debug('SVGDecoratorDiagramDesignerWidget ctor');
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
    //jshint camelcase: false
    SVGDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this.$name.on('dblclick.editOnDblClick', null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({
                    class: '',
                    value: self.name,
                    onChange: function (oldValue, newValue) {
                        self.__onNodeTitleChanged(oldValue, newValue);
                    },
                    onFinish: function () {
                        self.$name.text(self.formattedName);
                        self.$name.attr('title', self.formattedName);
                    }
                });
            }
            event.stopPropagation();
            event.preventDefault();
        });

        this._updateDropArea();
    };
    //jshint camelcase: true

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.update = function () {
        this._update();
        this._updateDropArea();
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.onRenderGetLayoutInfo = function () {
        this.svgContainerWidth = this.$svgContent.outerWidth(true);
        this.svgWidth = this.$svgContent.find('svg').outerWidth(true);
        this.svgHeight = this.$svgContent.find('svg').outerHeight(true);
        this.svgBorderWidth = parseInt(this.$svgContent.find('svg').css('border-width'), 10);

        DiagramDesignerWidgetDecoratorBase.prototype.onRenderGetLayoutInfo.call(this);
    };

    SVGDecoratorDiagramDesignerWidget.prototype.onRenderSetLayoutInfo = function () {
        var xShift = Math.ceil((this.svgContainerWidth - this.svgWidth) / 2 + this.svgBorderWidth),
            connectors = this.$el.find('> .' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS);

        connectors.css('transform', 'translateX(' + xShift + 'px)');

        this._fixPortContainerPosition(xShift);

        DiagramDesignerWidgetDecoratorBase.prototype.onRenderSetLayoutInfo.call(this);
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id/*, isEnd, connectionMetaInfo*/) {
        var result = [],
            edge = 10,
            LEN = 20,
            xShift = (this.svgContainerWidth - this.svgWidth) / 2;

        if (id === undefined || id === this.hostDesignerItem.id) {
            if (this._customConnectionAreas && this._customConnectionAreas.length > 0) {
                //custom connections are defined in the SVG itself
                result = $.extend(true, [], this._customConnectionAreas);
                var i = result.length;
                while (i--) {
                    result[i].x1 += xShift;
                    result[i].x2 += xShift;
                }
            } else {
                // No custom connection area defined in the SVG.
                // By default return the bounding box N, S, E, W edges with a little bit of
                // padding (variable 'edge') from the sides.

                //North side
                result.push({
                    id: 'N',
                    x1: edge + xShift,
                    y1: 0,
                    x2: this.svgWidth - edge + xShift,
                    y2: 0,
                    angle1: 270,
                    angle2: 270,
                    len: LEN
                });

                //South side
                result.push({
                    id: 'S',
                    x1: edge + xShift,
                    y1: this.svgHeight,
                    x2: this.svgWidth - edge + xShift,
                    y2: this.svgHeight,
                    angle1: 90,
                    angle2: 90,
                    len: LEN
                });

                //East side
                if (this._rightPorts !== true) {
                    result.push({
                        id: 'E',
                        x1: this.svgWidth + xShift,
                        y1: edge,
                        x2: this.svgWidth + xShift,
                        y2: this.svgHeight - edge,
                        angle1: 0,
                        angle2: 0,
                        len: LEN
                    });
                }

                //West side
                if (this._leftPorts !== true) {
                    result.push({
                        id: 'W',
                        x1: 0 + xShift,
                        y1: edge,
                        x2: 0 + xShift,
                        y2: this.svgHeight - edge,
                        angle1: 180,
                        angle2: 180,
                        len: LEN
                    });
                }
            }
        } else if (this.ports[id]) {
            //subcomponent
            var portTop = this.ports[id].top,
                isLeft = this.ports[id].isLeft,
                x = this._portContainerXShift + (isLeft ? 1 : this.svgWidth - 1),
                angle = isLeft ? 180 : 0;

            result.push({
                id: id,
                x1: x,
                y1: portTop + this._PORT_HEIGHT / 2,
                x2: x,
                y2: portTop + this._PORT_HEIGHT / 2,
                angle1: angle,
                angle2: angle,
                len: LEN
            });
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
            if (this.portIDs) {
                i = this.portIDs.length;
                while (i--) {
                    this.ports[this.portIDs[i]].showConnectors();
                }
            }
        } else {
            connectors = params.connectors;
            i = connectors.length;
            while (i--) {
                if (connectors[i] === undefined) {
                    //show connector for the represented item itself
                    this.$sourceConnectors.show();
                } else {
                    //one of the ports' connector should be displayed
                    if (this.ports[connectors[i]]) {
                        this.ports[connectors[i]].showConnectors();
                    }
                }
            }
        }
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    SVGDecoratorDiagramDesignerWidget.prototype.hideSourceConnectors = function () {
        var i;

        this.$sourceConnectors.hide();

        if (this.portIDs) {
            i = this.portIDs.length;
            while (i--) {
                this.ports[this.portIDs[i]].hideConnectors();
            }
        }
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

        client.setAttribute(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //called when the designer item's subcomponent should be updated
    SVGDecoratorDiagramDesignerWidget.prototype.updateSubcomponent = function (portId) {
        this._updatePort(portId);
    };

    /**** Override from ModelDecoratorCore ****/
    SVGDecoratorDiagramDesignerWidget.prototype.renderPort = function (portId) {
        this.__registerAsSubcomponent(portId);

        return SVGDecoratorCore.prototype.renderPort.call(this, portId);
    };

    /**** Override from ModelDecoratorCore ****/
    SVGDecoratorDiagramDesignerWidget.prototype.removePort = function (portId) {
        var idx = this.portIDs.indexOf(portId);

        if (idx !== -1) {
            this.__unregisterAsSubcomponent(portId);
        }

        SVGDecoratorCore.prototype.removePort.call(this, portId);
    };

    SVGDecoratorDiagramDesignerWidget.prototype.__registerAsSubcomponent = function (portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.registerSubcomponent(portId, {GME_ID: portId});
        }
    };

    SVGDecoratorDiagramDesignerWidget.prototype.__unregisterAsSubcomponent = function (portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.unregisterSubcomponent(portId);
        }
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    SVGDecoratorDiagramDesignerWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this._updatePort(componentList[len].id);
        }
    };

    SVGDecoratorDiagramDesignerWidget.prototype._updateDropArea = function () {
        // enable/disable drag events based on pointers and if it's replaceable.
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            setNames = nodeObj.getValidSetNames();

        if (this._getPointerNames().length > 0 || this._isReplaceable() || setNames.length > 0) {
            this._enableDragEvents();
        } else {
            this._disableDragEvents();
        }
    };

    return SVGDecoratorDiagramDesignerWidget;
});
