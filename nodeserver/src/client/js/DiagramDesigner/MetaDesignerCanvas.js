"use strict";

define(['logManager',
        'clientUtil',
        'js/DiagramDesigner/DesignerCanvas'], function (logManager,
                                                            clientUtil,
                                                            DesignerCanvas) {

    var MetaDesignerCanvas,
        __parent__ = DesignerCanvas,
        __parent_proto__ = DesignerCanvas.prototype,
        CONTAINMENT_TYPE_LINE_END = "diamond-wide-long",
        INHERITANCE_TYPE_LINE_END = "block-wide-long";

    MetaDesignerCanvas = function (opts) {
        var options = {};

        if (typeof opts === "string") {
            options.containerElement = opts;
        }
        options.loggerName = options.loggerName || "MetaDesignerCanvas";

        __parent__.apply(this, [options]);

        this._setMetaConnectionType("containment");

        this.logger.debug("MetaDesignerCanvas ctor");
    };

    _.extend(MetaDesignerCanvas.prototype, DesignerCanvas.prototype);

    MetaDesignerCanvas.prototype.initializeUI = function () {
        var self = this;

        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("MetaDesignerCanvas.initializeUI");

        this.skinParts.SVGPaper.text(this._actualSize.w / 2, this._actualSize.h / 2, "MetaDesignerCanvas");

        //META SPECIFIC parts

        // #1: create connection types are "connection" and "inheritance"
        this.skinParts.$btnGroupConnectionType = this.addButtonGroup(function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._setMetaConnectionType($(this).attr("data-mode"));
        });

        this.addButton({ "title": "Containment",
                         "icon": "icon-meta-containment",
                         "data": { "mode": "containment" }}, this.skinParts.$btnGroupConnectionType );

        this.addButton({ "title": "Inheritance",
            "icon": "icon-meta-inheritance",
            "data": { "mode": "inheritance" }}, this.skinParts.$btnGroupConnectionType );
    };

    MetaDesignerCanvas.prototype._setMetaConnectionType = function (mode) {
        var params = {};

        if (this._connectionType !== mode) {
            this.skinParts.$btnGroupConnectionType.find('.btn.active').removeClass('active');
            this.skinParts.$btnGroupConnectionType.find('.btn[data-mode="' + mode + '"]').addClass('active');

            params = {"connectionType": mode };

            switch (mode) {
                case "containment":
                    params.arrowStart = CONTAINMENT_TYPE_LINE_END;
                    params.width = "5";
                    params.color = "#FF0000";
                    break;
                case "inheritance":
                    params.arrowStart = INHERITANCE_TYPE_LINE_END;
                    params.width = "3";
                    params.color = "#0000FF";
                    break;
                default:
                    params.arrowStart = "none";
                    params.width = "2";
                    params.color = "#000000";
                    break;
            }
            this.connectionDrawingManager.setConnectionInDrawProperties(params);
        }
    };

    return MetaDesignerCanvas;
});
