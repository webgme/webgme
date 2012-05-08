"use strict";

define(['./../../../common/LogManager.js', './../../../common/EventDispatcher.js', './../util.js' /*, './ModelEditorCanvasWidget2.js'*/], function (logManager, EventDispatcher, util, ModelEditorCanvasWidget) {

    var WidgetManager = function (project, containerElement) {
        var logger,
            currentWidget = null;

        //get logger instance for this component
        logger = logManager.create("WidgetManager");

        project.addEventListener(project.events.SELECTEDOBJECT_CHANGED, function (project, nodeId) {
            var selectedNode = null,
                skinPath = './js/WidgetAPI/ModelEditorCanvasWidget.js',
                widgetContext;

            if (currentWidget) {
                currentWidget.destroy();
            }

            selectedNode = project.getNode(nodeId);

            if (selectedNode) {
                require([skinPath], function (SkinType) {
                    //TODO: figure out the concrete widget that should render that node
                    widgetContext = { "isRoot": true };
                    currentWidget = new SkinType(nodeId);
                    currentWidget.project = project;
                    currentWidget.initializeFromNode(selectedNode);
                    containerElement.append(currentWidget.el);
                    currentWidget.addedToParent();
                });
            }
        });
    };

    return WidgetManager;
});