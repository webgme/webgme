"use strict";

define(['logManager',
        'clientUtil'], function (logManager,
                                    util) {

    var WidgetManager = function (project, containerElement) {
        var logger,
            currentWidget = null;

        //get logger instance for this component
        logger = logManager.create("WidgetManager");

        project.addEventListener(project.events.SELECTEDOBJECT_CHANGED, function (project, nodeId) {
            var selectedNode = null,
                skinPath = './js/ModelEditor/HTML/ModelEditorCanvasComponent.js';

            if (currentWidget) {
                currentWidget.destroy();
            }

            selectedNode = project.getNode(nodeId);

            if (selectedNode) {
                require([skinPath], function (SkinType) {
                    //TODO: figure out the concrete widget that should render that node
                    currentWidget = new SkinType(nodeId, project);
                    containerElement.append(currentWidget.el);
                    currentWidget.addedToParent();
                });
            }
        });
    };

    return WidgetManager;
});