"use strict";
/*
 * WIDGET ModelEditorComponent
 */
define([ './util.js', './../../common/LogManager.js', './../../common/CommonUtil.js' ], function (util, logManager, commonUtil) {
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorComponent = function (nodeId, node, widget, isRoot, subLevels) {
        var logger,
            guid,
            render,
            posX,
            posY,
            title,
            opacity,
            componentDiv,
            posPanel,
            self = this,
            childComponents = {};

        //get logger instance for this component
        logger = logManager.create("ModelEditorComponent");

        //generate unique id for control
        guid = nodeId;

        //read properties from objDescriptor
        posX = isRoot === true ? 10 : node.getAttribute("attr").posX || 0;
        posY = isRoot === true ? 10 : node.getAttribute("attr").posY || 0;
        title = node.getAttribute("name") || "";

        componentDiv = $("<div/>", {
            "id": "component_" + guid,
            "class" : "column modelcomponent"
        });

        render = function () {
            var posXDelta = posX % 10,
                posYDelta = posY % 10,
                i = 0,
                childrenIDs = [],
                childNode,
                childComponent,
                childrenContainer,
                childrenBoundingBox = { "w": 0, "h": 0};

            componentDiv.html("<header>" + title + "</header><div class='attributes'><ul><li>Attribute #1</li><li>Attribute #2</li></ul></div><div class='children'></div>");

            childrenContainer = componentDiv.find('.children');

            //snap it to the nearest 10grid
            posX += (posXDelta < 6 ? -1 * posXDelta : 10 - posXDelta);
            posY += (posYDelta < 6 ? -1 * posYDelta : 10 - posYDelta);

            componentDiv.css("position", "absolute");
            componentDiv.css("left", posX);
            componentDiv.css("top", posY);


            //create its children (if needed)
            if ( subLevels > 0 ) {
            childrenIDs = node.getAttribute("children");
            }
            if ( childrenIDs.length > 0 ) {
                childrenContainer.show();

                for (i = 0; i < childrenIDs.length; i += 1) {
                    childNode = widget.project.getNode(childrenIDs[i]);
                    if (childNode) {
                        childComponent = new ModelEditorComponent(childrenIDs[i], childNode, widget, false, subLevels - 1);
                        childComponent.addTo(childrenContainer[0]);
                        childComponents[childrenIDs[i]] = childComponent;
                    }
                }

                for (i in childComponents) {
                    var concreteComponent = childComponents[i];
                    var componentBoundingBox = concreteComponent.getBoundingBox();
                    if ( componentBoundingBox.x + componentBoundingBox.w > childrenBoundingBox.w ) {
                        childrenBoundingBox.w = componentBoundingBox.x + componentBoundingBox.w;
                    }

                    if ( componentBoundingBox.y + componentBoundingBox.h > childrenBoundingBox.h ) {
                        childrenBoundingBox.h = componentBoundingBox.y + componentBoundingBox.h;
                    }
                }

                componentDiv.outerWidth(childrenBoundingBox.w + 10);
                componentDiv.outerHeight(childrenBoundingBox.h + 10 + componentDiv.find(".attributes").outerHeight(true) + componentDiv.find("> header").outerHeight(true));
            } else {
                childrenContainer.hide();
            }

            if (isRoot === false) {
                componentDiv.css("cursor", "move");
                posPanel = $("<div/>", {
                    "id": "component_" + guid + "_posPanel",
                    "class": "dragPosPanel"
                });
                posPanel.css("position", "absolute");
                componentDiv.append(posPanel);

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
            }
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
            return {"x" : posX, "y": posY, "w": componentDiv.outerHeight(), "h": componentDiv.outerHeight() };
        };

        this.getId = function () {
            return guid;
        };
    };

    return ModelEditorComponent;
});