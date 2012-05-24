/*
 * WIDGET ModelEditorSVGConnection based on SVG
 */
define([    './util.js',
            './../../common/LogManager.js',
            './../../common/CommonUtil.js',
            './../js/ModelEditorSVGModel.js',
            'raphael.amd' ], function (util,
                                       logManager,
                                       commonUtil,
                                       ModelEditorSVGModel) {
    "use strict";

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorSVGConnection;

    ModelEditorSVGConnection = function (objDescriptor, paper) {
        var logger,
            guid,
            render,
            components,
            componentSet,
            sourceComponent,
            targetComponent,
            directed = false,
            self = this,
            color = "#000000",
            selfRender,
            markerAtEnds = false,
            markerAttrs = {"stroke-width": 1,
                "fill": "rgba(0,0,255,0.3)"};

        //get logger instance for this component
        logger = logManager.create("ModelEditorSVGConnection_" + objDescriptor.id);

        //generate unique id for control
        guid = objDescriptor.id;

        //read properties from objDescriptor
        sourceComponent = objDescriptor.sourceComponent || null;
        targetComponent = objDescriptor.targetComponent || null;
        directed = objDescriptor.directed || false;
        color = objDescriptor.color || color;
        markerAtEnds = objDescriptor.markerAtEnds || markerAtEnds;

        components = {};
        componentSet = paper.set();

        /* generate the components for the first time */
        components.path = paper.path("m0,0").toBack();

        componentSet.push(components.path);

        selfRender = function () {
            render.call(self);
        };

        if (sourceComponent instanceof ModelEditorSVGModel) {
            sourceComponent.addEventListener(sourceComponent.events.POSITION_CHANGED, selfRender);
        }

        if (targetComponent instanceof ModelEditorSVGModel) {
            targetComponent.addEventListener(targetComponent.events.POSITION_CHANGED, selfRender);
        }

        render = function () {
            if (sourceComponent && targetComponent) {
                var srcBBox = sourceComponent.getBoundingBox(),
                    tgtBBox = targetComponent.getBoundingBox(),
                    bb1 = { x: srcBBox.x,
                        y: srcBBox.y,
                        width: srcBBox.width,
                        height: srcBBox.height },
                    bb2 = { x: tgtBBox.x,
                        y: tgtBBox.y,
                        width: tgtBBox.width,
                        height: tgtBBox.height },
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
                    pathDef,
                    borderW = 0,
                    pathAttributes;

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

                for (i = 0; i <= 4; i += 1) {
                    x[i] += borderW;
                    y[i] += borderW;
                }

                logger.debug("Shortest line is from [" + x[1] + "," + y[1] + "] to [" + x[4] + "," + y[4] + "]");

                pathDef = ["M", x[1].toFixed(3), y[1].toFixed(3), "C", x[2], y[2], x[3], y[3], x[4].toFixed(3), y[4].toFixed(3)].join(",");

                components.path.remove();
                components.path = paper.path(pathDef).toBack();
                pathAttributes = {  "stroke": color,
                                    "fill": "none",
                                    "stroke-width": "2",
                                    "arrow-start": "oval",
                                    "arrow-end": "oval" };

                if (directed === true) {
                    pathAttributes["arrow-end"] = "block";
                }

                components.path.attr(pathAttributes);

                if (markerAtEnds === true) {
                    if (components.startMarker) {
                        components.startMarker.attr({   "cx": x[1],
                                                        "cy": y[1] });
                    } else {
                        components.startMarker = paper.circle(x[1], y[1], 15).attr(markerAttrs).toBack();
                    }

                    if (components.endMarker) {
                        components.endMarker.attr({   "cx": x[4],
                            "cy": y[4] });
                    } else {
                        components.endMarker = paper.circle(x[4], y[4], 15).attr(markerAttrs).toBack();
                    }
                } else {
                    if (components.startMarker) {
                        components.startMarker.remove();
                        delete components.startMarker;
                    }

                    if (components.endMarker) {
                        components.endMarker.remove();
                        delete components.endMarker;
                    }
                }
            }
        };

        /* PUBIC METHODS */
        this.updateComponent = function (objDescriptor) {
            sourceComponent = objDescriptor.sourceComponent || sourceComponent;
            targetComponent = objDescriptor.targetComponent || targetComponent;
            directed = objDescriptor.directed || directed;
            color = objDescriptor.color || color;
            if (objDescriptor.hasOwnProperty("markerAtEnds")) {
                markerAtEnds = objDescriptor.markerAtEnds;
            }

            render();
        };

        this.getPosition = function () {
            return { "posX" : "n/a", "posY": "n/a" };
        };

        this.getDraggableComponents = function () {
            return [];
        };

        this.deleteComponent = function () {
            var i;

            if (sourceComponent instanceof ModelEditorSVGModel) {
                sourceComponent.removeEventListener(sourceComponent.events.POSITION_CHANGED, selfRender);
            }

            if (targetComponent instanceof ModelEditorSVGModel) {
                targetComponent.removeEventListener(targetComponent.events.POSITION_CHANGED, selfRender);
            }

            for (i in components) {
                if (components.hasOwnProperty(i)) {
                    components[i].remove();
                    delete components[i];
                }
            }

            logger.debug("Deleted.");
        };

        this.getBoundingBox = function () {
            return componentSet.getBBox();
        };

        this.getId = function () {
            return guid;
        };

        this.isDraggable = function () {
            return false;
        };

        this.isSelectable = function () {
            return false;
        };

        //finally render the component
        render();
    };

    return ModelEditorSVGConnection;
});