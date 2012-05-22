/*
 * WIDGET ModelEditorSVGModel based on SVG
 */
define([    './util.js',
            './../../common/LogManager.js',
            './../../common/CommonUtil.js',
            './../../common/EventDispatcher.js',
            'raphael.amd' ], function (util,
                                       logManager,
                                       commonUtil,
                                       EventDispatcher) {
    "use strict";

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorSVGModel;

    ModelEditorSVGModel = function (objDescriptor, paper) {
        var logger,
            guid,
            renderFirst,
            components,
            componentSet,
            posX,
            posY,
            title,
            opacity;

        $.extend(this, new EventDispatcher());

        this.events = {
            "POSITION_CHANGED" : "POSITION_CHANGED"
        };

        //get logger instance for this component
        logger = logManager.create("ModelEditorSVGModel_" + objDescriptor.id);

        //generate unique id for control
        guid = objDescriptor.id;

        //read properties from objDescriptor
        posX = objDescriptor.posX || 0;
        posY = objDescriptor.posY || 0;
        title = objDescriptor.title || "";
        opacity = objDescriptor.opacity || 1.0;

        components = {};
        componentSet = paper.set();

        /* generate the components for the first time */
        renderFirst = function () {
            components.rect = paper.rect(posX, posY, 100, 100, 10);
            components.rect.attr({"x": posX,
                "y": posY,
                "fill": "#CCCCCC",
                "stroke": "#666666",
                "stroke-width": 2,
                "opacity": opacity });

            components.header = paper.path("m" + posX + "," + (posY + 24) + " l100,0 l0,-14 a10,10 0 0,0 -10,-10 l-80,0 a10,10 0 0,0 -10,10 z");
            components.header.attr("fill", "0-rgb(0,0,0)-rgb(79,79,79):50-rgb(21,21,21)");

            components.text = paper.text(posX + 50, posY + 12, title.toUpperCase());
            components.text.attr({"x": posX + 50,
                "y": posY + 12,
                "text": title.toUpperCase(),
                "opacity": opacity,
                "font-size": "11",
                "font-weight": "bold",
                "fill": "#FFFFFF" });

            componentSet.push(components.rect, components.text, components.header);
        };

        /* PUBIC METHODS */
        this.updateComponent = function (objDescriptor, silent) {
            var oldPosX = posX,
                oldPosY = posY,
                oltTitle = title;

            posX = objDescriptor.posX || posX;
            posY = objDescriptor.posY || posY;
            title = objDescriptor.title || title;
            opacity = objDescriptor.opacity || opacity;

            //node title changed
            if (oltTitle !== title) {
                components.text.attr({ "text": title.toUpperCase() });
            }

            //node position changed
            if ((oldPosX !== posX) || (oldPosY !== posY)) {
                components.rect.attr({  "x": posX,
                    "y": posY});

                components.header.attr({   "path": Raphael.parsePathString("m" + posX + "," + (posY + 24) + " l100,0 l0,-14 a10,10 0 0,0 -10,-10 l-80,0 a10,10 0 0,0 -10,10 z") });

                components.text.attr({  "x": posX + 50,
                    "y": posY + 12 });

                if (silent !== true) {
                    this.dispatchEvent(this.events.POSITION_CHANGED);
                }
            }
        };

        this.getPosition = function () {
            return { "posX" : posX, "posY": posY };
        };

        this.getDraggableComponents = function () {
            return [ components.rect, components.text, components.header ];
        };

        this.deleteComponent = function () {
            components.rect.remove();
            components.text.remove();
            components.header.remove();
            logger.debug("Deleted.");
        };

        this.getBoundingBox = function () {
            return componentSet.getBBox();
        };

        this.getId = function () {
            return guid;
        };

        this.isDraggable = function () {
            return true;
        };

        this.isSelectable = function () {
            return true;
        };

        this.onSelect = function () {
            components.rect.attr({ "fill": "#DBEAFC",
                "stroke": "#52A8EC" });
        };

        this.onDeselect = function () {
            components.rect.attr({ "fill": "#CCCCCC",
                "stroke": "#666666" });
        };

        //finally render the component
        renderFirst();
    };

    return ModelEditorSVGModel;
});