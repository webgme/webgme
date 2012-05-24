/*
 * WIDGET ModelEditorSVGConnection based on SVG
 */
define([    './util.js',
            './../../common/LogManager.js',
            './../../common/CommonUtil.js',
            './ModelEditorSVGModel.js',
            './BezierHelper.js',
            'raphael.amd' ], function (util,
                                       logManager,
                                       commonUtil,
                                       ModelEditorSVGModel,
                                       BezierHelper) {
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
                var pathDef,
                    borderW = 0,
                    pathAttributes,
                    bezierControlPoints,
                    i;

                bezierControlPoints = BezierHelper.getBezierControlPoints(sourceComponent.getBoundingBox(), targetComponent.getBoundingBox());

                for (i = 0; i < 4; i += 1) {
                    bezierControlPoints[i].x += borderW;
                    bezierControlPoints[i].y += borderW;
                }

                logger.debug("Shortest line is from [" + bezierControlPoints[0].x + "," + bezierControlPoints[0].y + "] to [" + bezierControlPoints[3].x + "," + bezierControlPoints[3].y + "]");

                pathDef = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y].join(",");

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
                        components.startMarker.attr({   "cx": bezierControlPoints[0].x,
                                                        "cy": bezierControlPoints[0].y });
                    } else {
                        components.startMarker = paper.circle(bezierControlPoints[0].x, bezierControlPoints[0].y, 15).attr(markerAttrs).toBack();
                    }

                    if (components.endMarker) {
                        components.endMarker.attr({   "cx": bezierControlPoints[3].x,
                                                      "cy": bezierControlPoints[3].y });
                    } else {
                        components.endMarker = paper.circle(bezierControlPoints[3].x, bezierControlPoints[3].y, 15).attr(markerAttrs).toBack();
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