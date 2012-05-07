"use strict";

define(['./../../../common/LogManager.js',
        './../../../common/EventDispatcher.js',
        './../util.js',
        './WidgetBase.js',
        './ModelEditorModelWidget.js',
        './ModelEditorConnectionWidget.js'], function (logManager,
                                                      EventDispatcher,
                                                      util,
                                                      WidgetBase,
                                                      ModelEditorModelWidget,
                                                      ModelEditorConnectionWidget) {

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorCanvasWidget.css');

    var ModelEditorCanvasWidget = function () {
        var logger,
            originalRenderUI,
            originalInitializeFromNode,
            self = this,
            defaultSize = { "w": 2000, "h": 1500 },
            territoryId = 0,
            currentNodeInfo,
            childrenComponents = {},
            refresh,
            createChildComponent,
            positionChildOnCanvas,
            myGridSpace = 10,
            childDragValidPos = true;

        $.extend(this, new WidgetBase());

        this.el.disableSelection();

        //get logger instance for this component
        logger = logManager.create("ModelEditorCanvasWidget");
        logManager.setLogLevel(5);

        currentNodeInfo = { "id": null, "children" : [] };

        originalRenderUI = this.renderUI;
        this.renderUI = function () {
            //for now the original renderUI works just fine, but need to modify the style
            originalRenderUI.call(self);

            $(self.skinParts.title).addClass("modelEditorCanvasTitle");

            //set size for children container
            $(self.skinParts.childrenContainer).outerWidth(defaultSize.w).outerHeight(defaultSize.h);

            this.skinParts.dragPosPanel = $('<div/>', {
                "class" : "dragPosPanel"
            });
        };

        originalInitializeFromNode = this.initializeFromNode;
        this.initializeFromNode = function (node) {
            var newPattern,
                i,
                childNode;

            originalInitializeFromNode.call(self, node);
            territoryId = self.project.reserveTerritory(self);

            currentNodeInfo.id = node.getAttribute("_id");
            currentNodeInfo.children = node.getAttribute("children");

            //create all the children and add to parent
            for (i = 0; i < currentNodeInfo.children.length; i += 1) {
                childNode = self.project.getNode(currentNodeInfo.children[i]);
                if (childNode) {
                    createChildComponent(childNode);
                }
            }

            newPattern = {};
            newPattern[currentNodeInfo.id] = { "children": 1 };
            self.project.addPatterns(territoryId, newPattern);
        };

        // PUBLIC METHODS
        this.onEvent = function (etype, eid) {
            switch (etype) {
            case "load":
                refresh("insert", eid);
                break;
            case "modify":
                refresh("update", eid);
                break;
            case "create":
                refresh("insert", eid);
                break;
            case "delete":
                refresh("update", eid);
                break;
            }
        };

        refresh = function (eventType, nodeId) {
            var childNode;

            if (eventType === "insert") {
                childNode = self.project.getNode(nodeId);
                if (childNode) {
                    if (childNode.getAttribute("parent") === currentNodeInfo.id) {
                        createChildComponent(childNode);
                    }
                }
            }

            if (eventType === "update") {

            }
        };

        createChildComponent = function (node) {
            var childComponent;

            childComponent = new ModelEditorModelWidget();
            childrenComponents[node.getAttribute("_id")] = childComponent;
            childComponent.project = self.project;
            childComponent.initializeFromNode(node);
            childComponent.position = { "x": node.getAttribute("attr.posX"), "y": node.getAttribute("attr.posY") };

            self.addChild(childComponent);
        };

        positionChildOnCanvas = function (childComponent) {
            var posXDelta,
                posYDelta,
                childComponentEl = $(childComponent.el),
                childPosition = childComponent.position;

            //correct the children position based on this skin's granularity
            posXDelta = childPosition.x % myGridSpace;
            posYDelta = childPosition.y % myGridSpace;

            childPosition.x += (posXDelta < Math.floor(myGridSpace / 2) + 1 ? -1 * posXDelta : myGridSpace - posXDelta);
            childPosition.y += (posYDelta < Math.floor(myGridSpace / 2) + 1 ? -1 * posYDelta : myGridSpace - posYDelta);

            childComponentEl.css("position", "absolute");
            childComponentEl.css("left", childComponent.position.x);
            childComponentEl.css("top", childComponent.position.y);
        };

        this.childAdded = function (childComponent) {
            var childComponentEl = $(childComponent.el);
            //set child position
            positionChildOnCanvas(childComponent);


            //hook up moving
            //enable dragging
            childComponentEl.css("cursor", "move");
            childComponentEl.disableSelection();

            childComponentEl.draggable({
                zIndex: 100000,
                grid: [10, 10],
                start: function (event, ui) {
                    childComponent.dragStartPos = {"x": childComponent.position.x, "y": childComponent.position.y };
                    childDragValidPos = true;
                    self.skinParts.dragPosPanel.removeClass("invalidPosition");
                    self.skinParts.dragPosPanel.show();
                    logger.debug("Start dragging from original position X: " + childComponent.dragStartPos.x + ", Y: " + childComponent.dragStartPos.y);
                },
                stop: function (event, ui) {
                    var childNode;
                    logger.debug("Stop dragging at position X: " + childComponent.position.x + ", Y: " + childComponent.position.y);
                    self.skinParts.dragPosPanel.hide();
                    self.el.removeClass("invalidChildDrag");
                    if (childDragValidPos === true) {
                        //save back new position
                        childNode = self.project.getNode(childComponentEl.attr("id"));
                        logger.debug("Object position changed for id:'" + childComponentEl.attr("id") + "', new pos:[" + childComponent.position.x + ", " + childComponent.position.y + "]");
                        childNode.setAttribute("attr", { "posX":  childComponent.position.x, "posY":  childComponent.position.y });
                    } else {
                        //roll back to original position
                        logger.debug("Component has been dropped at an invalid position, rolling back to original. X: " +  childComponent.dragStartPos.x + ", Y: " + childComponent.dragStartPos.y);
                        childComponentEl.animate({
                            left: childComponent.dragStartPos.x,
                            top: childComponent.dragStartPos.y
                        }, 500, function () {
                            childComponent.position = { "x": childComponent.dragStartPos.x, "y": childComponent.dragStartPos.y };
                            delete childComponent.dragStartPos;
                        });
                    }
                },
                drag: function (event, ui) {
                    var dragPos = { "x": parseInt(childComponentEl.css("left"), 10), "y": parseInt(childComponentEl.css("top"), 10) },
                        validPos = true,
                        childBBox;
                    childComponent.position = { "x": dragPos.x, "y": dragPos.y };

                    //position panel
                    self.skinParts.dragPosPanel.html("X: " + dragPos.x + " Y: " + dragPos.y);
                    childBBox = childComponent.getBoundingBox();
                    self.skinParts.dragPosPanel.css("left", childBBox.x + (childBBox.w - self.skinParts.dragPosPanel.outerWidth()) / 2);
                    self.skinParts.dragPosPanel.css("top", childBBox.y + childBBox.h + 10);

                    if ($.isFunction(self.onChildDrag)) {
                        validPos = self.onChildDrag.call(self, childComponent);
                    }

                    if (childDragValidPos !== validPos) {
                        childDragValidPos = validPos;
                        if (childDragValidPos === false) {
                            self.skinParts.dragPosPanel.addClass("invalidPosition");
                        } else {
                            self.skinParts.dragPosPanel.removeClass("invalidPosition");
                        }
                    }

                    if ($.isFunction(childComponent.onDrag)) {
                        childComponent.onDrag.call(childComponent, validPos);
                    }
                }
            });
        };

        this.onChildDrag = function (childComponent) {
            var validPos = true,
                i;

            for (i = 0; i < this.children.length; i += 1) {
                if (childComponent.el !== this.children[i].el) {
                    validPos = !(util.overlap(childComponent.getBoundingBox(), this.children[i].getBoundingBox()));
                    if (validPos === false) {

                        logger.debug("Inavlid pos");
                        break;
                    }
                }
            }
            return validPos;
        };
    };

    return ModelEditorCanvasWidget;
});