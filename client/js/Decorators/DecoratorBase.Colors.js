/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants'], function (CONSTANTS) {

    var DecoratorBaseColors,
        DEFAULT_FILL_COLOR = '#FFFFFF',
        DEFAULT_TEXT_COLOR = '#000000',
        DEFAULT_LINE_COLOR = '#000000';

    DecoratorBaseColors = function (params) {
        this.defaultFillColor = this.fillColor = (params && params.defaultFillColor) ? params.defaultfillColor : DEFAULT_FILL_COLOR;
        this.defaultTextColor = this.textColor = (params && params.defaultTextColor) ? params.defaultfillColor : DEFAULT_TEXT_COLOR;
        this.defaultLineColor = this.lineColor = (params && params.defaultLineColor) ? params.defaultfillColor : DEFAULT_LINE_COLOR;
    };

    DecoratorBaseColors.prototype.getNodeColorsFromRegistry = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            getColorOrDefault;

        getColorOrDefault = function (color, defaultColor) {
            var result = color;

            if (!result ||
                result === '') {
                result = defaultColor;
            }

            return result;
        };


        if (nodeObj) {
            this.fillColor = getColorOrDefault(nodeObj.getRegistry(CONSTANTS.FILL_COLOR), this.defaultFillColor);
            this.textColor = getColorOrDefault(nodeObj.getRegistry(CONSTANTS.TEXT_COLOR), this.defaultTextColor);
            this.lineColor = getColorOrDefault(nodeObj.getRegistry(CONSTANTS.LINE_COLOR), this.defaultLineColor);
        }
    };


    return DecoratorBaseColors;
});