"use strict";
/*
 * WIDGET ModelEditorComponent
 */
define([ './util.js', './../../common/LogManager.js', './../../common/CommonUtil.js' ], function (util, logManager, commonUtil) {
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorComponent = function (objDescriptor, widget) {
        var logger,
            guid,
            render,
            posX,
            posY,
            title,
            opacity,
            componentDiv,
            posPanel,
            self = this;

        //get logger instance for this component
        logger = logManager.create("ModelEditorComponent");

        //generate unique id for control
        guid = objDescriptor.id;

        //read properties from objDescriptor
        posX = objDescriptor.posX || 0;
        posY = objDescriptor.posY || 0;
        title = objDescriptor.title || "";
        opacity = objDescriptor.opacity || 1.0;

        componentDiv = $("<div/>", {
            "id": "component_" + guid,
            "class" : "column"
        });

        posPanel = $("<div/>", {
            "id": "component_" + guid + "_posPanel",
            "class": "dragPosPanel"
        });
        posPanel.css("position", "absolute");


        render = function () {
            var posXDelta = posX % 10,
                posYDelta = posY % 10;

            componentDiv.html("<header>" + title + "</header>");

            //snap it to the nearest 10grid
            posX += (posXDelta < 6 ? -1 * posXDelta : 10 - posXDelta);
            posY += (posYDelta < 6 ? -1 * posYDelta : 10 - posYDelta);

            componentDiv.css("position", "absolute");
            componentDiv.css("left", posX);
            componentDiv.css("top", posY);
            componentDiv.append(posPanel);

            //resizeSVG( pos.left, pos.top, partDiv ) ;

            componentDiv.draggable({
                zIndex: 100000,
                grid: [10, 10],
                stop: function (event, ui) {
                    posPanel.hide();
                    componentDiv.css("opacity", "1.0");

                    if ($.isFunction(widget.onObjectPositionChanged)) {
                        widget.onObjectPositionChanged.call(widget, guid, self.getPosition());
                    }

                    //widget.updateComponentPosition(parseInt(componentDiv.css("left"), 10), parseInt(componentDiv.css("top"), 10));
                },
                drag: function (event, ui) {
                    componentDiv.css("opacity", "0.5");
                    posPanel.show();
                    posPanel.html("X: " + parseInt(componentDiv.css("left"), 10) + ", Y: " + parseInt(componentDiv.css("top"), 10));
                    posPanel.css("left", (componentDiv.outerWidth() - posPanel.outerWidth()) / 2);
                    posPanel.css("top", componentDiv.outerHeight() + 2);
                }
            });
        };

        this.addTo = function (container) {
            componentDiv.appendTo(container);
            render();
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
            return { "posX" : parseInt(componentDiv.css("left"), 10), "posY": parseInt(componentDiv.css("top"), 10) };
        };

        this.getDraggableComponents = function () {
            //return [ components.rect, components.text ];
        };

        this.deleteComponent = function () {
            /*components.rect.remove();
            components.text.remove();*/
        };

        this.getBoundingBox = function () {
            //return componentSet.getBBox();
        };

        this.getId = function () {
            return guid;
        };
    };

    return ModelEditorComponent;
});