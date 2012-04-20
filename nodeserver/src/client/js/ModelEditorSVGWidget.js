/*
 * WIDGET ModelEditor based on SVG
 */
define([ './util.js', './../../common/LogManager.js', './../../common/CommonUtil.js', 'raphael.amd' ], function (util, logManager, commonUtil) {
    "use strict";

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorSVGWidget = function (containerId) {
        var logger, containerControl, guid, modelEditorE, paper, titleText = null;

        //get logger instance for this component
        logger = logManager.create("ModelEditorSVGWidget");

        //save jQueried parent control
        containerControl = $("#" + containerId);

        if (containerControl.length === 0) {
            logger.error("ModelEditorSVGWidget's container control with id:'" + containerId + "' could not be found");
            return undefined;
        }

        //clear container content
        containerControl.html("");

        //generate unique id for control
        guid = commonUtil.guid();

        //generate control dynamically
        modelEditorE = $('<div/>', {
            id: "modelEditor_" + guid
        });

        //add control to parent
        containerControl.append(modelEditorE);

        //create Raphael paper
        paper = Raphael(modelEditorE.attr("id"), 2000, 1500);

        //var paperCanvas = $(paper.canvas);

        /* PUBLIC FUNCTIONS */
        this.clear = function () {
            paper.clear();
        };

        this.setTitle = function (title) {
            if (titleText) {
                titleText.remove();
            }
            titleText = paper.text(5, 15, title);
            titleText.attr("text-anchor", "start");
            titleText.attr("font-size", 16);
            titleText.attr("font-weight", "bold");
            titleText.attr("fill", "#ff0000");
        };

        this.createObject = function (objDescriptor) {
            var st, rect, text;
            logger.debug("Creating object with parameters: " + JSON.stringify(objDescriptor));

            st = paper.set();

            rect = paper.rect(objDescriptor.posX, objDescriptor.posY, 100, 100, 10);
            rect.attr("fill", "#d0d0d0");
            //rect.data( "id", objDescriptor.id );

            text = paper.text(objDescriptor.posX, objDescriptor.posY, objDescriptor.title);
            text.transform("t50,30");
            //text.data( "id", objDescriptor.id );

            if (objDescriptor.title === "Loading...") {
                rect.attr("opacity", 0.1);
            }

            st.push(rect);
            st.push(text);

            return st;
        };

        this.updateObject = function (modelObject, objDescriptor) {
            logger.debug("Updating object with parameters: " + JSON.stringify(objDescriptor));

            if (modelObject.attr("x") !== objDescriptor.posX) {
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
            }
        };

        this.deleteObject = function (modelObject) {
            logger.debug("Deleting object with parameters: " + modelObject);

            modelObject.forEach(function (obj) {
                obj.remove();
            }, null);
        };
    };

    return ModelEditorSVGWidget;
});