"use strict";

define(['logManager',
        'clientUtil',
    'js/DiagramDesigner/DesignerCanvas'], function (logManager,
                                                    clientUtil,
                                                    DesignerCanvas) {

    var TempDesignerCanvas;

    TempDesignerCanvas = function (containerElement) {
        DesignerCanvas.apply(this, arguments);


        this._logger.debug("TempDesignerCanvas ctor");
    };

    _.extend(TempDesignerCanvas.prototype, DesignerCanvas.prototype);

    TempDesignerCanvas.prototype.initializeUI = function (containerElement) {
        DesignerCanvas.prototype.initializeUI.apply(this, arguments);
        this._logger.debug("TempDesignerCanvas.initializeUI");
    };

    return TempDesignerCanvas;
});
