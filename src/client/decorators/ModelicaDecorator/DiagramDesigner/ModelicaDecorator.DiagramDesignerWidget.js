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
    'css!./ModelicaDecorator.DiagramDesignerWidget.css'], function (CONSTANTS,
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

    ModelicaDecoratorDiagramDesignerWidget.prototype.update = function () {
        //TODO: there might be some optimization here not just blindly rerender everything...
        this._renderContent();
    };

    ModelicaDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id, isEnd, connectionMetaInfo) {
        var result = [],
            edge = 10,
            LEN = 20;

        //by default return the bounding box edge's midpoints

        if (id === undefined || id == this.hostDesignerItem.id) {
            //top left
            result.push( {"id": "0",
                "x1": edge,
                "y1": 0,
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": 0,
                "angle1": 270,
                "angle2": 270,
                "len": LEN} );

            result.push( {"id": "1",
                "x1": edge,
                "y1": this.hostDesignerItem.getHeight(),
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": this.hostDesignerItem.getHeight(),
                "angle1": 90,
                "angle2": 90,
                "len": LEN} );

            result.push( {"id": "2",
                "x1": 0,
                "y1": edge,
                "x2": 0,
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 180,
                "angle2": 180,
                "len": LEN} );

            result.push( {"id": "3",
                "x1": this.hostDesignerItem.getWidth(),
                "y1": edge,
                "x2": this.hostDesignerItem.getWidth(),
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 0,
                "angle2": 0,
                "len": LEN} );
        } else {
            result.push( {"id": id,
                "x1": this._portCoordinates[id].x + this._portCoordinates[id].w / 2,
                "y1": this._portCoordinates[id].y + this._portCoordinates[id].h / 2,
                "x2": this._portCoordinates[id].x + this._portCoordinates[id].w / 2,
                "y2": this._portCoordinates[id].y + this._portCoordinates[id].h / 2,
                "angle1": 0,
                "angle2": 360,
                "len": LEN} );
        }

        return result;
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

                    var bbox = {'x': 0,
                                'y': 0,
                                'width': 0,
                                'height': 0};


                    var portConnectorSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    portConnectorSvg.setAttribute("version", "1.1");
                    portConnectorSvg.setAttribute("baseProfile", "full");
                    portConnectorSvg.appendChild($(svgPort).clone()[0]);
                    portConnector[0].appendChild(portConnectorSvg);

                    portConnector.css({'left':bbox.x, 'top':bbox.y, 'width':bbox.width, 'height':bbox.height});

//
//                    var rect = $(svgPort).find('rect');
//
//                    if (rect.length > 0) {
//                        rect = rect[0];
//
//                        var fillColor = rect.getAttribute('fill');
//                        var borderColor = rect.getAttribute('stroke');
//
//                        if (fillColor) {
//                            portConnector.css({'background-color': fillColor});
//                        }
//
//                        if (borderColor) {
//                            portConnector.css({'border-color': borderColor});
//                        }
//                    }

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

        this.showSourceConnectors();
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
                var portConnectorSvg = portConnector.find('svg')[0]
                portConnectorSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
                portConnectorSvg.setAttribute('width', w);
                portConnectorSvg.setAttribute('height', h);

                var g = $(portConnectorSvg).find('g')[0];
                g.setAttribute('transform', 'translate(' + -bbox.x * this._svg_scale * CONNECTOR_RATIO + ' ' + -bbox.y * this._svg_scale * CONNECTOR_RATIO + ') scale(' + this._svg_scale * CONNECTOR_RATIO + ' ' + this._svg_scale * CONNECTOR_RATIO + ')');

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


    ModelicaDecoratorDiagramDesignerWidget.prototype.showSourceConnectors = function (params) {
        this.logger.debug('showSourceConnectors: ' + JSON.stringify(params));
        this.$sourceConnectors.show();
    };

    //Hides the 'connectors' - detaches them from the DOM
    ModelicaDecoratorDiagramDesignerWidget.prototype.hideSourceConnectors = function () {
        this.$sourceConnectors.hide();
    };

    ModelicaDecoratorDiagramDesignerWidget.prototype.showEndConnectors = function (params) {
        var client = this._control._client,
            nodeObj,
            srcSubCompMetaInfo;

        this.logger.debug('showEndConnectors: ' + JSON.stringify(params));

        //no source info --> don't display any connector
        if (!params.srcSubCompMetaInfo) {
            return ;
        }

        //elements from same Modelica domain could be connected
        srcSubCompMetaInfo = params.srcSubCompMetaInfo;
        srcSubCompMetaInfo = srcSubCompMetaInfo.split('.');
        srcSubCompMetaInfo = srcSubCompMetaInfo.slice(0, srcSubCompMetaInfo.length - 2);
        srcSubCompMetaInfo = srcSubCompMetaInfo.join('.');

        //this._svgPortConnectors.push([svgPort, portConnector, {}, portId]);
        var i = this._svgPortConnectors.length;
        while (i--) {
            var portId = this._svgPortConnectors[i][3];
            var portConnector = this._svgPortConnectors[i][1];
            nodeObj = client.getNode(portId);
            if (nodeObj) {
                var attrClass = nodeObj.getAttribute('Class');
                attrClass = attrClass.split('.');
                attrClass = attrClass.slice(0, attrClass.length - 2);
                attrClass = attrClass.join('.');
                if (attrClass === srcSubCompMetaInfo) {
                    portConnector.show();
                }
            }
        }
    };

    //Hides the 'connectors' - detaches them from the DOM
    ModelicaDecoratorDiagramDesignerWidget.prototype.hideEndConnectors = function () {
        this.$endConnectors.hide();
    };

    /************ CUSTOM CONNACTIBILITY LOGIC **********************/
    ModelicaDecoratorDiagramDesignerWidget.prototype.getConnectorMetaInfo = function (id) {
        var metaInfo,
            client = this._control._client,
            nodeObj;

        if (id) {
            nodeObj = client.getNode(id);
            metaInfo = nodeObj.getAttribute('Class');
        }

        return metaInfo;
    };

    ModelicaDecoratorDiagramDesignerWidget.prototype.doSearch = function (searchDesc) {
        return this._modelicaDecoratorCore.doSearch(searchDesc);
    };

    return ModelicaDecoratorDiagramDesignerWidget;
});