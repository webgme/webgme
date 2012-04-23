"use strict";
/*
 * WIDGET ModelEditor based on SVG
 */
define([ './util.js', './../../common/LogManager.js', './../../common/CommonUtil.js', './../js/ModelEditorSVGComponent.js', 'raphael.amd' ], function (util, logManager, commonUtil, ModelEditorSVGComponent) {
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorSVGWidget = function (containerId) {
        var logger,
            containerControl,
            guid,
            paper,
            zoomFactor = 1.0,
            self = this,
            dragStartPos = {},
            dragStart,
            dragEnd,
            dragMove,
            modelEditorE,
            titleText,
            resizeSVG,
            paperCanvas,
            defaultPaperSize = { "w" : 2000, "h": 1500 };

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
        paper = Raphael(modelEditorE.attr("id"), defaultPaperSize.w, defaultPaperSize.h);

        paperCanvas = $(paper.canvas);

        dragStart = function () {
            dragStartPos = this.getPosition();
            this.updateComponent({ "opacity": 0.5});
        };

        dragEnd = function () {
            this.updateComponent({ "opacity": 1.0});

            resizeSVG(this.getBoundingBox(), true);

            if ($.isFunction(self.onObjectPositionChanged)) {
                self.onObjectPositionChanged.call(self, this.id, this.getPosition());
            }
        };

        dragMove = function (dx, dy) {
            this.updateComponent({ "posX": Math.round(dragStartPos.posX + dx * zoomFactor), "posY": Math.round(dragStartPos.posY + dy * zoomFactor) });
        };

        resizeSVG = function (bBox, doScroll) {
            var needResize = false,
                cW = paperCanvas.outerWidth(),
                cH = paperCanvas.outerHeight();

            if (cW < (bBox.x + bBox.width) * zoomFactor) {
                cW = bBox.x + bBox.width + 100;
                needResize = true;
            }

            if (cH < (bBox.y + bBox.height) * zoomFactor) {
                cH =  bBox.y + bBox.height + 100;
                needResize = true;
            }

            if (needResize === true) {
                logger.debug("Resizing canvas to the size: " + cW + ", " + cH);
                paper.setSize(cW, cH);
                if (doScroll === true) {
                    $("#middlePane").prop("scrollTop", $("#middlePane").prop("scrollHeight") - $("#middlePane").height());
                }
            }
        };

        /* PUBLIC FUNCTIONS */
        this.clear = function () {
            paper.clear();
            paper.setSize(defaultPaperSize.w, defaultPaperSize.h);
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
            var newComponent, draggableComponent;

            logger.debug("Creating object with parameters: " + JSON.stringify(objDescriptor));

            newComponent = new ModelEditorSVGComponent(objDescriptor, paper);

            resizeSVG(newComponent.getBoundingBox(), false);

            newComponent.getDraggableComponent().drag(dragMove, dragStart, dragEnd);

            newComponent.getDraggableComponent().mouseover(function () { modelEditorE.css('cursor', 'move'); });
            newComponent.getDraggableComponent().mouseout(function () { modelEditorE.css('cursor', 'default'); });

            /*st = paper.set();

            rect = paper.rect(objDescriptor.posX, objDescriptor.posY, 100, 100, 10);
            rect.attr("fill", "#d0d0d0");
            //rect.data( "id", objDescriptor.id );

            text = paper.text(objDescriptor.posX + 50, objDescriptor.posY + 30, objDescriptor.title);
            //text.transform("t50,30");
            //text.data( "id", objDescriptor.id );

            rect.drag(move, dragStart, dragEnd);

            if (objDescriptor.title === "Loading...") {
                rect.attr("opacity", 0.1);
            }

            st.push(rect);
            st.push(text);*/

            //rect.attr("clip-rect", objDescriptor.posX + "," + objDescriptor.posY + ",70,50");

            //st.transform("t" + objDescriptor.posX + "," + objDescriptor.posY);

            return newComponent;
        };

        this.updateObject = function (modelObject, objDescriptor) {
            logger.debug("Updating object with parameters: " + JSON.stringify(objDescriptor));

            modelObject.updateComponent(objDescriptor);

            resizeSVG(modelObject.getBoundingBox(), false);

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
            logger.debug("Deleting object with parameters: " + modelObject);
            modelObject.deleteComponent();
        };
    };

    return ModelEditorSVGWidget;
});