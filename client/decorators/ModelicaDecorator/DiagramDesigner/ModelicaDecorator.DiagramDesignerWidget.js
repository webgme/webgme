/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Authors:
 * Zsolt Lattmann
 * Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    '../Core/ModelicaDecorator.Core',
    'text!./ModelicaDecorator.DiagramDesignerWidget.html',
    'css!./ModelicaDecorator.DiagramDesignerWidget'], function (CONSTANTS,
                                                       nodePropertyNames,
                                                       DiagramDesignerWidgetDecoratorBase,
                                                       ModelicaDecoratorCore,
                                                       modelicaDecoratorDiagramDesignerWidgetTemplate) {

    var ModelicaDecoratorDiagramDesignerWidget,
        __parent__ = DiagramDesignerWidgetDecoratorBase,
        DECORATOR_ID = "ModelicaDecoratorDiagramDesignerWidget",
        CONNECTOR_RATIO = 2,
        DIAGRAM_DESIGNER_ICON_WIDTH = 150;

    ModelicaDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this._modelicaDecoratorCore = new ModelicaDecoratorCore(this.logger);

        this.logger.debug("ModelicaDecoratorDiagramDesignerWidget ctor");
    };

    _.extend(ModelicaDecoratorDiagramDesignerWidget.prototype, __parent__.prototype);
    ModelicaDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    ModelicaDecoratorDiagramDesignerWidget.prototype.$DOMBase = (function () {
        var el = $(modelicaDecoratorDiagramDesignerWidgetTemplate);
        //use the same HTML template as the DefaultDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('div.name').remove();
        return el;
    })();
    
    ModelicaDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        this._renderContent();

        //let the parent decorator class do its job first
        __parent__.prototype.on_addTo.apply(this, arguments);
    };

    ModelicaDecoratorDiagramDesignerWidget.prototype._renderContent = function () {
        var control = this._control,
            gmeID = this._metaInfo[CONSTANTS.GME_ID];

        //render GME-ID in the DOM, for debugging
        if (DEBUG) {
            this.$el.attr({"data-id": gmeID});
        }

        //empty out SVG container
        this.$el.find('.svg-container').empty();

        //figure out the necessary SVG based on children type
        this.skinParts.$svg = this._modelicaDecoratorCore.getSVGByGMEId(control, gmeID);
        if (this.skinParts.$svg) {
            this._modelicaDecoratorCore.resizeSVGToWidth(this.skinParts.$svg, DIAGRAM_DESIGNER_ICON_WIDTH);

            this.$el.find('.svg-container').append(this.skinParts.$svg);

            //get the scale of the SVG based on its width/height and viewBox
            var obj = this._modelicaDecoratorCore.getSVGWidthHeightRatioAndScale(this.skinParts.$svg);
            this._svg_scale = obj.scale;

            //render the connectors
            this.skinParts.$connectorContainer = this.$el.find('.connector-container');
            this.skinParts.$connectorContainer.empty();
            this._renderPorts();

            //render text based on model values
            this._renderTexts();
        } else {
            this.$el.find('.svg-container').append(this._modelicaDecoratorCore.getErrorSVG());
        }
    };

//    ModelicaDecoratorDiagramDesignerWidget.prototype.calculateDimension = function () {
//        if (this.hostDesignerItem) {
//            this.hostDesignerItem.width = this.$el.outerWidth(true);
//            this.hostDesignerItem.height = this.$el.outerHeight(true);
//        }
//    };

    ModelicaDecoratorDiagramDesignerWidget.prototype.update = function () {
        //TODO: there might be some optimization here not just blindly rerender everything...
        this._renderContent();
    };

    ModelicaDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id) {
        var result = [],
            edge = 10;

        //by default return the bounding box edge's midpoints

        if (id === undefined || id == this.hostDesignerItem.id) {
            //top left
            result.push( {"id": "0",
                "x": edge,
                "y": 0,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "N",
                "len": 10} );

            result.push( {"id": "1",
                "x": edge,
                "y": this.hostDesignerItem.height,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "S",
                "len": 10} );

            result.push( {"id": "2",
                "x": 0,
                "y": edge,
                "w": 0,
                "h": this.hostDesignerItem.height - 2 * edge,
                "orientation": "W",
                "len": 10} );

            result.push( {"id": "3",
                "x": this.hostDesignerItem.width,
                "y": edge,
                "w": 0,
                "h": this.hostDesignerItem.height - 2 * edge,
                "orientation": "E",
                "len": 10} );
        } else {
            result.push( {"id": id,
                "x": this._portCoordinates[id].x + this._portCoordinates[id].w / 2,
                "y": this._portCoordinates[id].y + this._portCoordinates[id].h / 2,
                "w": 0,
                "h": 0,
                "orientation": "O",
                "len": 10} );
        }

        return result;
    };


    //Shows the 'connectors' - appends them to the DOM
    ModelicaDecoratorDiagramDesignerWidget.prototype.showConnectors = function () {
        this.$connectors.show();
    };


    //Hides the 'connectors' - detaches them from the DOM
    ModelicaDecoratorDiagramDesignerWidget.prototype.hideConnectors = function () {
        this.$connectors.hide();
    };


    ModelicaDecoratorDiagramDesignerWidget.prototype._toolTipBase = $('<div class="port_info"> \
            <span class="class_name">CLASS NAME</span> \
            <span class="name">NAME</span> \
            <span class="desc">DESCRIPTION</span> \
            <span class="class_desc">CLASS DESCRIPTION</span> \
        </div>');

    ModelicaDecoratorDiagramDesignerWidget.prototype._buildToolTip = function (portConnector, svgPort) {

        var tooltip = this._toolTipBase.clone(),
            svgInfo = $(svgPort).find('#info');

        if (svgInfo.length === 0) {
            return;
        }

        svgInfo = $(svgInfo[0]);

        tooltip.find('.name').text(svgInfo.find('#name').text());
        tooltip.find('.class_name').text(svgInfo.find('#type').text());
        tooltip.find('.desc').text(svgInfo.find('#desc').text());
        tooltip.find('.class_desc').text(svgInfo.find('#classDesc').text());

        svgInfo.remove();

        portConnector.append(tooltip);
    };

    ModelicaDecoratorDiagramDesignerWidget.prototype._renderPorts = function () {
        var client = this._control._client,
                nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
                childrenIDs = nodeObj ?  nodeObj.getChildrenIds() : [],
                len,
                port,
                portId,
                portName,
                svgPort,
                portConnector;


        this._svgPortConnectors = [];

        len = childrenIDs.length;
        while (len--) {
            port = client.getNode(childrenIDs[len]);
            if (port) {
                portName = port.getAttribute(nodePropertyNames.Attributes.name);
                portId =  port.getId();

                svgPort = this.skinParts.$svg.find('#' + portName);

                if (svgPort.length > 0) {
                    svgPort = svgPort[0];

                    portConnector = $('<div/>', {'class':'connector'});

                    this._buildToolTip(portConnector, svgPort);

                    var bbox = svgPort.getBBox();


//                    var portConnectorSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//                    portConnectorSvg.setAttribute("version", "1.1");
//                    portConnectorSvg.setAttribute("baseProfile", "full");

//                    var defs = $('<defs> \
//<clippath id="rectClipPath"> \
//    <rect id="rectClip" x="0" y="0" width="0" height="0" style="stroke: gray; fill: none;"> \
//</rect></clippath><defs>')[0];

                    //portConnectorSvg.appendChild(defs);

                    //var use = $('<use x="0" y="0" style="clip-path: url(#rectClipPath);" ></use>')[0];
                    //portConnectorSvg.appendChild(use);

                    //defs.appendChild($(svgPort).clone()[0]);

                    //portConnector[0].appendChild(portConnectorSvg);

                    portConnector.css({'left':bbox.x, 'top':bbox.y, 'width':bbox.width, 'height':bbox.height});


                    var rect = $(svgPort).find('rect');

                    if (rect.length > 0) {
                        rect = rect[0];

                        var fillColor = rect.getAttribute('fill');
                        var borderColor = rect.getAttribute('stroke');

                        if (fillColor) {
                            portConnector.css({'background-color': fillColor});
                        }

                        if (borderColor) {
                            portConnector.css({'border-color': borderColor});
                        }
                    }

                    this._portCoordinates = this._portCoordinates || {};

                    this._svgPortConnectors.push([svgPort, portConnector, {}, portId]);

                    // scale it
                    this._portCoordinates[portId] = {
                        'x':bbox.x * this._svg_scale,
                        'y':bbox.y * this._svg_scale,
                        'w':bbox.width * this._svg_scale,
                        'h':bbox.height* this._svg_scale
                    };

                    if (this.hostDesignerItem) {
                        // PART BROWSER DOES NOT HAVE hostDesignerItem
                        this.hostDesignerItem.registerConnectors(portConnector, portId);
                        this.hostDesignerItem.registerSubcomponent(portId, {"GME_ID": portId});
                    }

                    this.skinParts.$connectorContainer.append(portConnector);
                }
                else
                {
                   this.logger.debug('Cannot find svg child object for port: ' + portName);
                }

            } else {
                this.logger.error('Cannot load child object: ' + childrenIDs[len]);
            }
        }

        this.showConnectors();
        this.initializeConnectors();
    };


    ModelicaDecoratorDiagramDesignerWidget.prototype._renderTexts = function () {
        this.__svgTexts = this._modelicaDecoratorCore.renderTextsOnSVG(this.skinParts.$svg, this._control, this._metaInfo[CONSTANTS.GME_ID]);
    };


    ModelicaDecoratorDiagramDesignerWidget.prototype.onRenderGetLayoutInfo = function () {
        var len;

        //let the parent decorator class do its job first
        __parent__.prototype.onRenderGetLayoutInfo.apply(this, arguments);

        if (this._svgPortConnectors) {
            len = this._svgPortConnectors.length;
            while(len--) {
                this._svgPortConnectors[len][2] = this._svgPortConnectors[len][0].getBBox();
            }
        }

        if (this.__svgTexts) {
            len = this.__svgTexts.length;
            while (len--) {
                var clientRect = this.__svgTexts[len][0].getBoundingClientRect();
                var renderedHeight = parseInt(clientRect.height) / this._svg_scale;
                var renderedWidth = parseInt(clientRect.width) / this._svg_scale;
                var bBox = this.__svgTexts[len][1].split(' ');
                var mexHeight = parseInt(bBox[3]) - parseInt(bBox[1]);
                var mexWidth = parseInt(bBox[2]) - parseInt(bBox[0]);
                var scale = Math.min(mexHeight/renderedHeight, mexWidth/renderedWidth);
                var fontSize = parseInt(this.__svgTexts[len][0].getAttribute('font-size'));
                var newFontSize = Math.floor(fontSize * scale);
                this.__svgTexts[len].push(newFontSize);
            }
        }

    };


    ModelicaDecoratorDiagramDesignerWidget.prototype.onRenderSetLayoutInfo = function () {
        var len;

        if (this._svgPortConnectors) {
            len = this._svgPortConnectors.length;
            while(len--) {
                var bbox =this._svgPortConnectors[len][2];
                var portConnector = this._svgPortConnectors[len][1];

                var w = bbox.width * this._svg_scale * CONNECTOR_RATIO;
                var h = bbox.height * this._svg_scale * CONNECTOR_RATIO;
                var x = bbox.x * this._svg_scale - (w - bbox.width * this._svg_scale) / 2 - 1; // border width
                var y = bbox.y * this._svg_scale - (h - bbox.height * this._svg_scale) / 2 - 1; // border width

                portConnector.css({'left':x, 'top':y, 'width':w, 'height':h});
                //var portConnectorSvg = portConnector.find('svg')[0]
                //portConnectorSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
                //portConnectorSvg.setAttribute('width', w);
                //portConnectorSvg.setAttribute('height', h);

                //var rectClip = $(portConnectorSvg).find('#rectClip')[0];
                //rectClip.setAttribute('x', bbox.x);
                //rectClip.setAttribute('y', bbox.y);
                //rectClip.setAttribute('width', bbox.width);
                //rectClip.setAttribute('height', bbox.height);

                //var use = $(portConnectorSvg).find('use')[0];
                //use.setAttribute('x', -bbox.x);
                //use.setAttribute('y', -bbox.y);
                //use.setAttribute('xlink:href', '#' + $(portConnectorSvg).find('g').attr('id'));

                // scale it
                this._portCoordinates[ this._svgPortConnectors[len][3]] = {
                    'x':bbox.x * this._svg_scale,
                    'y':bbox.y * this._svg_scale,
                    'w':bbox.width * this._svg_scale,
                    'h':bbox.height* this._svg_scale
                };
            }
        }

        if (this.__svgTexts) {
            len = this.__svgTexts.length;
            while (len--) {
                if (this.__svgTexts[len].length > 2) {
                    var fontsize = this.__svgTexts[len][2];
                    this.__svgTexts[len][0].setAttribute('font-size', fontsize);
                }
            }
        }

        //let the parent decorator class do its job finally
        __parent__.prototype.onRenderSetLayoutInfo.apply(this, arguments);
    };

    return ModelicaDecoratorDiagramDesignerWidget;
});