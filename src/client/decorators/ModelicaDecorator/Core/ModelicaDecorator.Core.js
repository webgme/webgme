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
    'text!../default.svg'], function (CONSTANTS,
                                    nodePropertyNames,
                                    DefaultSvgTemplate) {

    var ModelicaDecoratorCore,
        SVG_ICON_PATH = "/decorators/ModelicaDecorator/Icons/";

    ModelicaDecoratorCore = function (logger) {
        this.logger = logger;
        this.logger.debug("ModelicaDecoratorCore ctor");
    };

    ModelicaDecoratorCore.prototype._svgCache = {};

    ModelicaDecoratorCore.prototype._errorSVGBase = $(DefaultSvgTemplate);

    ModelicaDecoratorCore.prototype.getSVGByGMEId = function (control, gmeID) {
        var modelicaClassName = null,
            modelicaModelObject,
            returnSVG;

        modelicaModelObject = this.getFirstChildObjectByKeyValue(control, gmeID, 'kind', 'ModelicaModel');
        if (modelicaModelObject) {
            modelicaClassName = modelicaModelObject.getAttribute('URI') || modelicaModelObject.getAttribute('Class');

            if (modelicaClassName === undefined || modelicaClassName === null || modelicaClassName === "") {
                returnSVG = this._errorSVGBase.clone();
            } else {
                if (ModelicaDecoratorCore.prototype._svgCache[modelicaClassName]) {
                    returnSVG = ModelicaDecoratorCore.prototype._svgCache[modelicaClassName].clone();
                } else {
                    var svg_resource_url = SVG_ICON_PATH + modelicaClassName + ".svg";
                    $.ajax(svg_resource_url, {'async': false})
                        .done(function ( data ) {
                            ModelicaDecoratorCore.prototype._svgCache[modelicaClassName] = $($(data)[2]);
                            returnSVG = ModelicaDecoratorCore.prototype._svgCache[modelicaClassName].clone();
                        })
                        .fail(function () {
                            returnSVG = ModelicaDecoratorCore.prototype._errorSVGBase.clone();
                        });
                }
            }
        }

        return returnSVG;
    };

    ModelicaDecoratorCore.prototype.getErrorSVG = function () {
        return this._errorSVGBase.clone();
    };

    ModelicaDecoratorCore.prototype.getFirstChildObjectByKeyValue = function (control, gmeID, key, value) {
        var client = control._client,
            nodeObj = client.getNode(gmeID),
            childrenIDs = nodeObj ?  nodeObj.getChildrenIds() : [],
            len = childrenIDs.length,
            childObj,
            resultObj;

        while (len--) {
            childObj = client.getNode(childrenIDs[len]);
            if (childObj) {
                switch(key) {
                    case 'kind':
                        if (value === childObj.getRegistry('kind')) {
                            resultObj = childObj;
                        }
                        break;
                    case 'name':
                        if (value === childObj.getAttribute(nodePropertyNames.Attributes.name)) {
                            resultObj = childObj;
                        }
                        break;
                }

                if (resultObj) {
                    break;
                }
            }
        }

        return resultObj;
    };

    ModelicaDecoratorCore.prototype.renderTextsOnSVG = function (svg, control, gmeID) {
        var client = control._client,
            nodeObj = client.getNode(gmeID),
            len,
            text,
            bindString,
            bBoxString,
            DATA_BBOX = 'bbox',
            DATA_BIND = 'data-bind';

        var processSubNode = function (myText, attr) {
            var n = $(myText).find('.' + attr),
                result = "";

            if (n.length > 0) {
                n = n[0];
                result = n.textContent;
                myText.setAttribute(attr, n.textContent);
            }

            return result;
        };

        var __svgTexts = [];

        var svgTexts = svg.find('text');
        if (svgTexts.length > 0) {
            len = svgTexts.length;

            var attrValue;

            while (len--) {
                //process each text
                text = svgTexts[len];

                bindString = text.getAttribute(DATA_BIND);
                if (bindString === null || bindString === undefined) {
                    bindString = processSubNode(text, DATA_BIND);
                }

                bBoxString = text.getAttribute(DATA_BBOX);
                if (bBoxString === null || bBoxString === undefined) {
                    bBoxString = processSubNode(text, DATA_BBOX);
                }

                if (bindString) {

                    // split =
                    // %variableName
                    // variableName == name -> name
                    // else find variableName in child objects
                    //    if exists
                    //       get Value
                    //       if Value empty string -> variableName

                    var resultText = '';
                    var parts = bindString.split('=');

                    for (var i = 0; i < parts.length; i++) {
                        var idx = parts[i].indexOf("%");

                        if (idx !== -1) {
                            var bindParam = parts[i].substring(idx + 1);

                            // %=varname case
                            if (parts[i] === "%") {
                                i++;
                                bindParam = parts[i];
                                resultText += bindParam + '=';
                            }

                            if (bindParam === "name") {
                                attrValue = nodeObj.getAttribute(bindParam);

                                if (attrValue && attrValue !== "") {
                                    resultText += attrValue;
                                }
                            } else {
                                var childObj = this.getFirstChildObjectByKeyValue(control, gmeID, 'name', bindParam);
                                if (childObj) {
                                    attrValue = childObj.getAttribute('Value');

                                    if (attrValue && attrValue !== "") {
                                        resultText += attrValue;
                                    } else {
                                        resultText += bindParam;
                                    }

                                } else {
                                    resultText += '%' + bindParam;
                                }
                            }

                        } else {
                            resultText += parts[i];
                        }

                        if (i < parts.length - 1) {
                            resultText += "=";
                        }
                    }

                    text.textContent = resultText;
                    __svgTexts.push([text, bBoxString]);
                }
            }
        }

        return __svgTexts;
    };


    ModelicaDecoratorCore.prototype.removeParameterTextsFromSVG = function (svg) {
        var len,
            text,
            bindString,
            bBoxString,
            DATA_BBOX = 'bbox',
            DATA_BIND = 'data-bind';

        var processSubNode = function (myText, attr) {
            var n = $(myText).find('.' + attr),
                result = "";

            if (n.length > 0) {
                n = n[0];
                result = n.textContent;
                myText.setAttribute(attr, n.textContent);
            }

            return result;
        };

        var svgTexts = svg.find('text');
        if (svgTexts.length > 0) {
            len = svgTexts.length;

            while (len--) {
                //process each text
                text = svgTexts[len];

                bindString = text.getAttribute(DATA_BIND);
                if (bindString === null || bindString === undefined) {
                    bindString = processSubNode(text, DATA_BIND);
                }

                bBoxString = text.getAttribute(DATA_BBOX);
                if (bBoxString === null || bBoxString === undefined) {
                    bBoxString = processSubNode(text, DATA_BBOX);
                }

                if (bindString) {
                    $(text).remove();
                }
            }
        }
    };

    ModelicaDecoratorCore.prototype.getSVGWidthHeightRatioAndScale = function (svg) {
        var width = parseInt(svg[0].getAttribute('width'));
        var viewBox = svg[0].getAttribute('viewBox');
        var viewBoxWidth = parseInt(viewBox.split(' ')[2]);
        var viewBoxHeight = parseInt(viewBox.split(' ')[3]);

        return {'scale': width / viewBoxWidth,
                'whRatio': viewBoxWidth / viewBoxHeight};
    };

    ModelicaDecoratorCore.prototype.resizeSVGToWidth = function (svg, width) {
        var obj = this.getSVGWidthHeightRatioAndScale(svg),
            STROKE_WIDTH_ATTR = 'stroke-width';

        //set width and height
        svg[0].setAttribute('width', width);
        svg[0].setAttribute('height', width / obj.whRatio);

        //fix stroke-width values
        obj = this.getSVGWidthHeightRatioAndScale(svg);

        //get all tha SVG elements that has stroke-width attribute
        var strokesToFix = svg.find('[' + STROKE_WIDTH_ATTR + ']');
        strokesToFix.each(function () {
            var el = $(this),
                strokeWidthStr = el.attr(STROKE_WIDTH_ATTR),
                strokeWidth = parseFloat(strokeWidthStr, 10);

            el.attr(STROKE_WIDTH_ATTR, strokeWidthStr.replace(strokeWidth, strokeWidth / obj.scale));
        });
    };

    ModelicaDecoratorCore.prototype.doSearch = function (searchDesc) {
        //TODO: correct implementation needed
        return false;
    };

    return ModelicaDecoratorCore;
});