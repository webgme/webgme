"use strict";

define(['./../../../common/LogManager.js',
        './../../../common/EventDispatcher.js',
        './../util.js',
        './WidgetBase.js',
        './../BezierHelper.js',
        'raphael.amd'], function (logManager,
                                      EventDispatcher,
                                      util,
                                      WidgetBase,
                                      BezierHelper) {

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS('css/ModelEditorConnectionWidget.css');

    var ModelEditorConnectionWidget = function (id) {
        var logger,
            self = this,
            borderW = 5,
            paper,
            directed = false;

        $.extend(this, new WidgetBase(id));

        //get logger instance for this component
        logger = logManager.create("ModelEditorConnectionWidget_" + id);

        this.initializeFromNode = function (node) {
            $(self.el).addClass("connection");
            $(self.el).css("position", "absolute");
            $(self.el).css("background-color", "rgba(0, 0, 0, 0)");
            $(self.el).css("left", 0).css("top", 0);
            $(self.el).outerWidth(2 * borderW).outerHeight(2 * borderW);

            directed = node.getAttribute("directed") || false;
        };

        this.addedToParent = function () {
            paper = Raphael(id);
            paper.canvas.style.pointerEvents = "none";
        };

        this.redrawConnection = function (srcWidget, trgtWidget) {
            var i,
                cX,
                cY,
                cW,
                cH,
                pathDef,
                bezierControlPoints;

            if ((srcWidget === null) || (srcWidget === undefined)) {
                return;
            }

            if ((trgtWidget === null) || (trgtWidget === undefined)) {
                return;
            }

            bezierControlPoints = BezierHelper.getBezierControlPoints(srcWidget.getBoundingBox(), trgtWidget.getBoundingBox());

            cX = Math.min(bezierControlPoints[0].x, bezierControlPoints[3].x);
            cY = Math.min(bezierControlPoints[0].y, bezierControlPoints[3].y);
            cW = Math.abs(bezierControlPoints[0].x - bezierControlPoints[3].x);
            cH = Math.abs(bezierControlPoints[0].y - bezierControlPoints[3].y);

            //when the source and target of the connection is the same
            if (srcWidget.getId() === trgtWidget.getId()) {
                cW = srcWidget.getBoundingBox().width;
                cH = srcWidget.getBoundingBox().height;
            }

            if (cX === bezierControlPoints[0].x) {
                for (i = 3; i >= 0; i -= 1) {
                    bezierControlPoints[i].x -= bezierControlPoints[0].x;
                }
            } else {
                for (i = 0; i < 4; i += 1) {
                    bezierControlPoints[i].x -= bezierControlPoints[3].x;
                }
            }

            if (cY === bezierControlPoints[0].y) {
                for (i = 3; i >= 0; i -= 1) {
                    bezierControlPoints[i].y -= bezierControlPoints[0].y;
                }
            } else {
                for (i = 0; i < 4; i += 1) {
                    bezierControlPoints[i].y -= bezierControlPoints[3].y;
                }
            }

            for (i = 0; i < 4; i += 1) {
                bezierControlPoints[i].x += borderW;
                bezierControlPoints[i].y += borderW;
            }

            /*if (cW === 10) {
                cW = 60;
                cX -= (25 - borderW);

                for (i = 0; i < 4; i += 1) {
                    bezierControlPoints[i].x += (25 - borderW);
                }
            }

            if (cH === 10) {
                cH = 60;
                cY -= (25 - borderW);

                for (i = 0; i < 4; i += 1) {
                    bezierControlPoints[i].y += (25 - borderW);
                }
            }*/

            $(self.el).css("left", cX - borderW).css("top", cY - borderW);
            $(self.el).outerWidth(cW + 2 * borderW).outerHeight(cH + 2 * borderW);
            paper.clear();
            paper.setSize(cW + 2 * borderW, cH + 2 * borderW);

            logger.debug("Shortest line is from [" + bezierControlPoints[0].x + "," + bezierControlPoints[0].y + "] to [" + bezierControlPoints[3].x + "," + bezierControlPoints[3].y + "]");

            pathDef = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y].join(",");

            self.skinParts.path = paper.path(pathDef).attr({ stroke: "#000", fill: "none", "stroke-width": "2" });

            self.skinParts.path.attr("arrow-start", "oval");
            if (directed === true) {
                self.skinParts.path.attr("arrow-end", "block");
            } else {
                self.skinParts.path.attr("arrow-end", "oval");
            }

            //paper.setSize(self.skinParts.path.getBBox().width + 2 * borderW, self.skinParts.path.getBBox().height + 2 * borderW);
        };

        this.onSelect = function () {
            self.skinParts.pathGlow = self.skinParts.path.glow({ "width": 5, "color": "#52A8EC" });
        };

        this.onDeselect = function () {
            self.skinParts.pathGlow.remove();
        };
    };

    return ModelEditorConnectionWidget;
});