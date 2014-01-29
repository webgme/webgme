/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants'], function (CONSTANTS) {

    var DecoratorBaseColors,
        DEFAULT_FILL_COLOR = '#ECECEC',
        DEFAULT_TEXT_COLOR = '#000000',
        DEFAULT_LINE_COLOR = '#000000';

    DecoratorBaseColors = function () {
        this.fillColor = DEFAULT_FILL_COLOR;
        this.textColor = DEFAULT_TEXT_COLOR;
        this.lineColor = DEFAULT_LINE_COLOR;
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
            this.fillColor = getColorOrDefault(nodeObj.getRegistry(CONSTANTS.FILL_COLOR), DEFAULT_FILL_COLOR);
            this.textColor = getColorOrDefault(nodeObj.getRegistry(CONSTANTS.TEXT_COLOR), DEFAULT_TEXT_COLOR);
            this.lineColor = getColorOrDefault(nodeObj.getRegistry(CONSTANTS.LINE_COLOR), DEFAULT_LINE_COLOR);
        }
    };


    return DecoratorBaseColors;
});