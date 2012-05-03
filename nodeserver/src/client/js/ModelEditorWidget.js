"use strict";
/*
 * WIDGET ModelEditor based on HTML, JS and CSS
 */
define([    './util.js', './../../common/LogManager.js',
            './../../common/CommonUtil.js',
            './../js/ModelEditorComponent.js',
            './../js/ModelEditorCanvasSkin.js',
            './../js/ModelEditorComponentSkin.js'  ], function (util,
                                                                logManager,
                                                                commonUtil,
                                                                ModelEditorComponent,
                                                                ModelEditorCanvasSkin,
                                                                ModelEditorComponentSkin) {
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorWidget.css');

    var ModelEditorWidget = function (containerId) {
        var logger,
            containerControl,
            guid,
            self = this,
            modelEditorE,
            defaultSize = { "w" : 2000, "h": 1500 },
            nodeAttributeKeys = { "id" : "_id" },
            rootComponent = null,
            project = null,
            generateComponentDescriptorFromNode;

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
            rootComponent = null;
        };

        this.setProject = function (myProject) {
            project = myProject;
        };

        this.getProject = function () {
            return project;
        };

        generateComponentDescriptorFromNode = function (node, skinPropertyDescriptor) {
            var componentDescriptor = {},
                i;

            for (i in skinPropertyDescriptor) {
                if (skinPropertyDescriptor.hasOwnProperty(i)) {
                    componentDescriptor[i] = node.getAttribute(skinPropertyDescriptor[i]);
                }
            }

            return componentDescriptor;
        };

        this.createRootFromNode = function (node) {
            var rootSkinInstance = new ModelEditorCanvasSkin();

            logger.debug("Initializing multi level model editor with root: '" + node.getAttribute(nodeAttributeKeys.id) + "'");

            rootComponent = new ModelEditorComponent(generateComponentDescriptorFromNode(node, rootSkinInstance.getSkinPropertyDescriptor()), self, rootSkinInstance);
            rootComponent.addTo(modelEditorE);

            return rootComponent;
        };

        this.createObject = function (nodeId, node, parentModelComponent) {
            var newComponent,
                componentDescriptor = {},
                modelSkinInstance = new ModelEditorComponentSkin();

            logger.debug("Creating object with parameters: '" + nodeId + "'");

            if (node) {
                componentDescriptor = generateComponentDescriptorFromNode(node, modelSkinInstance.getSkinPropertyDescriptor());
            } else {
                componentDescriptor.id = nodeId;
            }

            newComponent = new ModelEditorComponent(componentDescriptor, self, modelSkinInstance);
            parentModelComponent.addChild(newComponent);

            //resizeSVG(newComponent.getBoundingBox(), false);

            //draggableComponents = newComponent.getDraggableComponents();

            /*hookUpDrag = function (svgObject, component) {
                //svgObject.node.style.cursor = 'move';
                //svgObject.drag(dragMove, dragStart, dragEnd, component, component, component);
            };*/

            /*for (i = 0; i < draggableComponents.length; i += 1) {
                //draggableComponents[i].svgComponent = newComponent;

                hookUpDrag(draggableComponents[i], newComponent);
            }*/

            return newComponent;
        };

        this.updateObject = function (modelComponent, node) {
            var componentDescriptor = {};

            componentDescriptor = generateComponentDescriptorFromNode(node, modelComponent.getSkinInstance().getSkinPropertyDescriptor());

            logger.debug("Updating object with parameters: " + JSON.stringify(componentDescriptor));

            modelComponent.updateProperties(componentDescriptor);
        };

        this.deleteObject = function (modelObject) {
            /*logger.debug("Deleting object with parameters: " + modelObject);
            modelObject.deleteComponent();*/
        };
    };

    return ModelEditorWidget;
});