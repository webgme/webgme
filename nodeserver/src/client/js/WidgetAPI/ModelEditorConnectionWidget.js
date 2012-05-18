"use strict";

define(['./../../../common/LogManager.js',
    './../../../common/EventDispatcher.js',
    './../util.js',
    './WidgetBase.js',
    'raphael.amd'], function (logManager,
                                  EventDispatcher,
                                  util,
                                  WidgetBase) {

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
        };

        this.redrawConnection = function (srcWidget, trgtWidget) {
            var srcBBox = srcWidget.getBoundingBox(),
                tgtBBox = trgtWidget.getBoundingBox(),
                bb1 = { x: srcBBox.x,
                        y: srcBBox.y,
                        width: srcBBox.w,
                        height: srcBBox.h },
                bb2 = { x: tgtBBox.x,
                        y: tgtBBox.y,
                        width: tgtBBox.w,
                        height: tgtBBox.h },
                p = [{x: bb1.x + bb1.width / 2, y: bb1.y},
                    {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height},
                    {x: bb1.x, y: bb1.y + bb1.height / 2},
                    {x: bb1.x + bb1.width, y: bb1.y + bb1.height / 2},
                    {x: bb2.x + bb2.width / 2, y: bb2.y},
                    {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height},
                    {x: bb2.x, y: bb2.y + bb2.height / 2},
                    {x: bb2.x + bb2.width, y: bb2.y + bb2.height / 2}],
                d = {},
                dis = [],
                i,
                j,
                res,
                dx,
                dy,
                x = [],
                y = [],
                cX,
                cY,
                cW,
                cH,
                pathDef;

            for (i = 0; i < 4; i += 1) {
                for (j = 4; j < 8; j += 1) {
                    dx = Math.abs(p[i].x - p[j].x);
                    dy = Math.abs(p[i].y - p[j].y);
                    if ((i === j - 4) || (((i !== 3 && j !== 6) || p[i].x < p[j].x) && ((i !== 2 && j !== 7) || p[i].x > p[j].x) && ((i !== 0 && j !== 5) || p[i].y > p[j].y) && ((i !== 1 && j !== 4) || p[i].y < p[j].y))) {
                        dis.push(dx + dy);
                        d[dis[dis.length - 1]] = [i, j];
                    }
                }
            }
            if (dis.length === 0) {
                res = [0, 4];
            } else {
                res = d[Math.min.apply(Math, dis)];
            }

            x[1] = p[res[0]].x;
            y[1] = p[res[0]].y;
            x[4] = p[res[1]].x;
            y[4] = p[res[1]].y;

            dx = Math.max(Math.abs(x[1] - x[4]) / 2, 10);
            dy = Math.max(Math.abs(y[1] - y[4]) / 2, 10);

            x[2] = [x[1], x[1], x[1] - dx, x[1] + dx][res[0]].toFixed(3);
            y[2] = [y[1] - dy, y[1] + dy, y[1], y[1]][res[0]].toFixed(3);
            x[3] = [0, 0, 0, 0, x[4], x[4], x[4] - dx, x[4] + dx][res[1]].toFixed(3);
            y[3] = [0, 0, 0, 0, y[1] + dy, y[1] - dy, y[4], y[4]][res[1]].toFixed(3);

            cX = Math.min(x[1], x[4]);
            cY = Math.min(y[1], y[4]);
            cW = Math.abs(x[1] - x[4]);
            cH = Math.abs(y[1] - y[4]);

            $(self.el).css("left", cX - borderW).css("top", cY - borderW);
            $(self.el).outerWidth(cW + 2 * borderW).outerHeight(cH + 2 * borderW);
            paper.clear();
            paper.setSize(cW + 2 * borderW, cH + 2 * borderW);

            if (cX === x[1]) {
                for (i = 4; i >= 1; i -= 1) {
                    x[i] -= x[1];
                }
            } else {
                for (i = 0; i <= 4; i += 1) {
                    x[i] -= x[4];
                }
            }

            if (cY === y[1]) {
                for (i = 4; i >= 1; i -= 1) {
                    y[i] -= y[1];
                }
            } else {
                for (i = 0; i <= 4; i += 1) {
                    y[i] -= y[4];
                }
            }

            for (i = 0; i <= 4; i += 1) {
                x[i] += borderW;
                y[i] += borderW;
            }

            logger.debug("Shortest line is from [" + x[1] + "," + y[1] + "] to [" + x[4] + "," + y[4] + "]");

            pathDef = ["M", x[1].toFixed(3), y[1].toFixed(3), "C", x[2], y[2], x[3], y[3], x[4].toFixed(3), y[4].toFixed(3)].join(",");

            self.skinParts.path = paper.path(pathDef).attr({ stroke: "#000", fill: "none", "stroke-width": "2" });

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
    };

    return ModelEditorConnectionWidget;
});