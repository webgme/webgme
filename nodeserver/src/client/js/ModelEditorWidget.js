"use strict";
/*
 * WIDGET ModelEditor based on HTML, JS and CSS
 */
define([ './util.js', './../../common/LogManager.js', './../../common/CommonUtil.js', './../js/ModelEditorComponent.js' ], function (util, logManager, commonUtil, ModelEditorComponent) {
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorWidget.css');

    var ModelEditorWidget = function (containerId) {
        var logger,
            containerControl,
            guid,
            zoomFactor = 1.0,
            self = this,
            modelEditorE,
            titleText,
            defaultSize = { "w" : 2000, "h": 1500 },
            canvasSkin = "DefaultCanvasSkin.html";

        //get logger instance for this component
        logger = logManager.create("ModelEditorWidget");

        //save jQueried parent control
        containerControl = $("#" + containerId);

        if (containerControl.length === 0) {
            logger.error("ModelEditorWidget's container control with id:'" + containerId + "' could not be found");
            return undefined;
        }

        //clear container content
        containerControl.html("");

        //generate unique id for control
        guid = commonUtil.guid();

        //generate control dynamically
        modelEditorE = $('<div/>', {
            id: "modelEditor_" + guid,
            width: defaultSize.w,
            height: defaultSize.h
        });

        modelEditorE.css("position", "absolute");

        //add control to parent
        containerControl.append(modelEditorE);


        /* PUBLIC FUNCTIONS */
        this.clear = function () {
            modelEditorE.html("");
            modelEditorE.width(defaultSize.w).height(defaultSize.h);
        };

        this.setRootNode = function (nodeId, node, multiLevelFactor) {
            var rootComponent;

            logger.debug("Initializing multi level model editor with root: '" + node.id + "' and MultiLevelFactor: " + multiLevelFactor);

            rootComponent = new ModelEditorComponent(nodeId, node, self, true, multiLevelFactor);
            rootComponent.addTo(modelEditorE);
        };

        this.createObject = function (objDescriptor) {
            var newComponent, draggableComponents, i, hookUpDrag;

            logger.debug("Creating object with parameters: " + JSON.stringify(objDescriptor));

            //newComponent = new ModelEditorComponent(objDescriptor, self);
            //newComponent.addTo(modelEditorE);

            //resizeSVG(newComponent.getBoundingBox(), false);

            //draggableComponents = newComponent.getDraggableComponents();

            hookUpDrag = function (svgObject, component) {
                //svgObject.node.style.cursor = 'move';
                //svgObject.drag(dragMove, dragStart, dragEnd, component, component, component);
            };

            /*for (i = 0; i < draggableComponents.length; i += 1) {
                //draggableComponents[i].svgComponent = newComponent;

                hookUpDrag(draggableComponents[i], newComponent);
            }*/

            return newComponent;
        };

        this.updateObject = function (modelObject, objDescriptor) {
            /*logger.debug("Updating object with parameters: " + JSON.stringify(objDescriptor));

            modelObject.updateComponent(objDescriptor);

            resizeSVG(modelObject.getBoundingBox(), false);*/

            /*if (modelObject.attr("x") !== objDescriptor.posX) {
             modelObject.attr("x", objDescriptor.posX);
             }

             if (modelObject.attr("y") !== objDescriptor.posY) {
             modelObject.attr("y", objDescriptor.posY);
             }

             if (objDescriptor.title !== "Loading...") {
             modelObject.attr("opacity", 1.0);
             }

             var text = modelObject[1];
             if (text.attr("text") !== objDescriptor.title) {
             text.attr("text", objDescriptor.title);
             }*/
        };

        this.deleteObject = function (modelObject) {
            /*logger.debug("Deleting object with parameters: " + modelObject);
            modelObject.deleteComponent();*/
        };
    };

    return ModelEditorWidget;
});