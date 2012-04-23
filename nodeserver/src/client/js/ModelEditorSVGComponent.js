"use strict";
/*
 * WIDGET ModelEditor based on SVG
 */
define([ './util.js', './../../common/LogManager.js', './../../common/CommonUtil.js', 'raphael.amd' ], function (util, logManager, commonUtil) {
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorSVGComponent = function (objDescriptor, paper) {
        var logger,
            guid,
            render,
            components,
            componentSet,
            posX,
            posY,
            title,
            moveTo,
            opacity;

        //get logger instance for this component
        logger = logManager.create("ModelEditorSVGComponent");

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
        components.rect = paper.rect(posX, posY, 100, 100, 10);
        components.text = paper.text(posX + 50, posY + 30, title);

        componentSet.push(components.rect, components.text);

        render = function () {
            components.rect.attr("x", posX);
            components.rect.attr("y", posY);
            components.rect.attr("fill", "#d0d0d0");
            components.rect.attr("opacity", opacity);

            components.text.attr("x", posX + 50);
            components.text.attr("y", posY + 30);
            components.text.attr("text", title);
            components.text.attr("opacity", opacity);
        };

        /* PUBIC METHODS */
        this.updateComponent = function (objDescriptor) {
            posX = objDescriptor.posX || posX;
            posY = objDescriptor.posY || posY;
            title = objDescriptor.title || title;
            opacity = objDescriptor.opacity || opacity;

            render();
        };

        this.getPosition = function () {
            return { "posX" : posX, "posY": posY };
        };

        this.getDraggableComponent = function () {
            return components.rect;
        };

        this.deleteComponent = function () {
            components.rect.remove();
            components.text.remove();
        };

        this.getBoundingBox = function () {
            return componentSet.getBBox();
        };


        components.rect.updateComponent = this.updateComponent;
        components.rect.getPosition = this.getPosition;
        components.rect.id = guid;
        components.rect.getBoundingBox = this.getBoundingBox;

        //finally render the component
        render();
    };

    return ModelEditorSVGComponent;
});