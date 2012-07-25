"use strict";

define([], function () {

    var GraphVizColorManager;

    GraphVizColorManager = function () {
        this._dedicatedColors = { "ref": "#EFA749",
            "source": "#FF0000",
            "target": "#0000FF",
            "containment": "#333333"};

        this._availableColors =  ["#FF4310",
                          "#808000",
                         "#00FF00",
                         "#00FFFF",
                         "#8080FF",
                         "#C0C0C0",
                         "#C000C0",
                         "#00C000",
                         "#0000C0",
                         "#FF8080"];

        this._usedColors = {};
    };

    GraphVizColorManager.prototype.getColorForPointer = function (pName) {
        if (this._dedicatedColors.hasOwnProperty(pName)) {
            return this._dedicatedColors[pName];
        } else {
            if (this._usedColors.hasOwnProperty(pName)) {
                return this._usedColors[pName];
            } else {
                if (this._availableColors.length > 0) {
                    this._usedColors[pName] = this._availableColors[0];
                    this._availableColors = this._availableColors.slice(1);
                } else {
                    this._usedColors[pName] = "#FF00FF";
                }

                return this._usedColors[pName];
            }
        }
    };


    return GraphVizColorManager;
});
