"use strict";

define(['./../../common/LogManager.js', './../../common/EventDispatcher.js', './util.js'], function (logManager, EventDispatcher, util) {

    var ModelEditorComponentSkin = function () {
        var logger,
            skinPropertyDescriptor,
            skinParts = {},
            myComponent = null,
            isExpanded,
            toggleExpanded;

        //specify skinPropertyDescriptor
        skinPropertyDescriptor = {  "id": "_id",
                                    "title": "name",
                                    "positionX": "attr.posX",
                                    "positionY": "attr.posY" };

        this.getSkinPropertyDescriptor = function () {
            return skinPropertyDescriptor;
        };

        this.childrenDraggable = function () {
            return true;
        };

        this.attachToComponent = function (hostComponent) {
            myComponent = hostComponent;
            //get logger instance for this component
            logger = logManager.create("ModelEditorComponentSkin_" + myComponent.getId());
        };

        toggleExpanded = function () {
            /*if (isExpanded === true) {
                //have to close it
                isExpanded = false;
                skinParts.childrenContainer.hide();
                if ($.isFunction(myComponent.widget.onComponentCollapsed)) {
                    myComponent.widget.onComponentCollapsed.call(myComponent.widget, myComponent.getId());
                }
            } else {
                //have to open it
                isExpanded = true;
                skinParts.childrenContainer.show();
                if ($.isFunction(myComponent.getWidget().onComponentExpanded)) {
                    myComponent.getWidget().onComponentExpanded.call(myComponent.widget, myComponent.getId());
                }
            }*/
        };

        this.onAddTo = function (containerElement) {
            containerElement.html("<header></header><div class='attributes'></div><div class='displayChildren'><span>Show children</span></div><div class='children' style='display: none;'>child1<br>child1<br>child1<br>child1<br>child1<br></div>");
            skinParts.title = containerElement.find("> header");
            skinParts.attributes = containerElement.find(".attributes");
            skinParts.childrenContainer = containerElement.find(".children");
            skinParts.displayChildren = containerElement.find(".displayChildren");

            skinParts.displayChildren.hide();

            containerElement.bind("mouseover", function () {
                skinParts.displayChildren.show();
            });

            containerElement.bind("mouseout", function () {
                skinParts.displayChildren.hide();
            });

            skinParts.displayChildren.bind("click", toggleExpanded);

            myComponent.setChildrenContainerElement(skinParts.childrenContainer);

            containerElement.addClass("column");

            skinParts.posPanel = $("<div/>", {
                "class": "dragPosPanel"
            });
            skinParts.posPanel.css("position", "absolute");
            containerElement.append(skinParts.posPanel);
        };

        this.onRender = function (componentDescriptor) {
            if (componentDescriptor.title) {
                skinParts.title.html(componentDescriptor.title);
                skinParts.attributes.html("");
            } else {
                skinParts.title.html("Loading...");
                skinParts.attributes.html("<img src='../img/progress.gif' alt='Loading...' />");
            }

            //fill in attributes
            if (componentDescriptor.attributes) {
                skinParts.attributes.html("<ul><li>Attribute #1</li><li>Attribute #2</li></ul>");
            }
        };

        this.onDragStart = function () {
            skinParts.posPanel.show();
        };

        this.onDragStop = function () {
            skinParts.posPanel.hide();
        };

        this.onDrag = function (atValidPosition) {
            var containerElement = myComponent.getComponentContainer();
            skinParts.posPanel.html("X: " + parseInt(containerElement.css("left"), 10) + ", Y: " + parseInt(containerElement.css("top"), 10));
            skinParts.posPanel.css("left", (containerElement.outerWidth() - skinParts.posPanel.outerWidth()) / 2);
            skinParts.posPanel.css("top", containerElement.outerHeight() + 2);

            if (atValidPosition === true) {
                skinParts.posPanel.removeClass("invalidPosition");
            } else {
                skinParts.posPanel.addClass("invalidPosition");
            }
        };
    };

    return ModelEditorComponentSkin;
});
