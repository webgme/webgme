"use strict";

define(['logManager',
        'clientUtil',
        'bezierHelper',
        'raphaeljs',
        './WidgetBase2.js'
        ], function (logManager,
                                  util,
                                  BezierHelper,
                                  raphaeljs,
                                  WidgetBase) {

    var ModelEditorConnectionWidget2;

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS('css/ModelEditorConnectionWidget.css');

    ModelEditorConnectionWidget2 = function (id, proj, rPaper) {
        var logger,
            self = this,
            borderW = 5,
            paper,
            directed = false,
            initialize,
            srcCoord = null,
            trgtCoord = null,
            sideDescriptor = null,
            svgPaper = rPaper;

        $.extend(this, new WidgetBase(id, proj));

        //get logger instance for this component
        logger = logManager.create("ModelEditorConnectionWidget_" + id);

        initialize = function () {
            var node = self.project.getNode(self.getId());

            $(self.el).addClass("connection");
            $(self.el).css("position", "absolute");
            $(self.el).css("background-color", "rgba(0, 0, 0, 0)");
            $(self.el).css("left", 0).css("top", 0);
            $(self.el).outerWidth(2 * borderW).outerHeight(2 * borderW);

            directed = node.getAttribute("directed") || false;
        };

        this.addedToParent = function () {
            /*paper = Raphael(id);
            paper.canvas.style.pointerEvents = "none";*/
        };

        this.setCoordinates = function (sourceCoord, targetCoord, sDescriptor) {
            srcCoord = sourceCoord;
            trgtCoord = targetCoord;
            sideDescriptor = sDescriptor;

            self.redrawConnection();
        };

        this.redrawConnection = function () {
            var i,
                cX,
                cY,
                cW,
                cH,
                pathDef,
                bezierControlPoints;

            if ((srcCoord === null) || (srcCoord === undefined)) {
                return;
            }

            if ((trgtCoord === null) || (trgtCoord === undefined)) {
                return;
            }

            /*if ((srcCoord.x === trgtCoord.x) && (srcCoord.y === trgtCoord.y)) {
                //circle like something
                pathDef = "M" + (srcCoord.x - 20) + "," + srcCoord.y + " a30,30 0 1,0 40,0";
            } else {
                bezierControlPoints = BezierHelper.getBezierControlPoints2(srcCoord, trgtCoord, sideDescriptor);
                pathDef = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y].join(",");
            }*/

            bezierControlPoints = BezierHelper.getBezierControlPoints2(srcCoord, trgtCoord, sideDescriptor);

            cX = Math.min(bezierControlPoints[0].x, bezierControlPoints[3].x);
            cY = Math.min(bezierControlPoints[0].y, bezierControlPoints[3].y);
            cW = Math.abs(bezierControlPoints[0].x - bezierControlPoints[3].x);
            cH = Math.abs(bezierControlPoints[0].y - bezierControlPoints[3].y);

            $(self.el).css("left", cX - borderW).css("top", cY - borderW);
            $(self.el).outerWidth(cW + 2 * borderW).outerHeight(cH + 2 * borderW);


            pathDef = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y].join(",");

            if (self.skinParts.path) {
                self.skinParts.path.remove();
            }
            self.skinParts.path = svgPaper.path(pathDef).attr({ stroke: "#000", fill: "none", "stroke-width": "2" });

            self.skinParts.path.attr("arrow-start", "oval");
            if (directed === true) {
                self.skinParts.path.attr("arrow-end", "block");
            } else {
                self.skinParts.path.attr("arrow-end", "oval");
            }

        };

        this.onSelect = function () {
            self.skinParts.pathGlow = self.skinParts.path.glow({ "width": 5, "color": "#52A8EC" });
        };

        this.onDeselect = function () {
            self.skinParts.pathGlow.remove();
        };

        this.onDestroy = function () {
            if (self.skinParts.path) {
                self.skinParts.path.remove();
                delete self.skinParts.path;
            }

            delete self.skinParts;
        };

        initialize();
    };

    return ModelEditorConnectionWidget2;
});