"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'raphaeljs',
    './GraphVizObject',
    './GraphVizColorManager',
    'text!GraphViz/GraphVizViewTmpl.html',
    'css!GraphVizCSS/GraphVizView'], function (logManager,
                                                 util,
                                                 commonUtil,
                                                 raphaeljs,
                                                 GraphVizObject,
                                                 GraphVizColorManager,
                                                 graphVizViewTmpl) {

    var GraphVizView;

    GraphVizView = function (params) {
        this._logger = logManager.create("GraphVizView_" + params.containerElement.attr("id"));

        this._el = params.containerElement;
        if (this._el.length === 0) {
            this._logger.warning("GraphVizView's container control does not exist");
            throw "GraphVizView's container control does not exist";
        }

        this._graphVizObjects = {};
        this._pointers = {};
        this._pointerTypeSettings = {};

        this._pointerInDrawSettings = { "strokeWidth" : 2,
            "strokeColor" : "#FF7800",
            "lineType": "-" };



        this._initialize();

        this._logger.debug("Created");
    };

    GraphVizView.prototype._initialize = function () {
        var pWidth = this._el.outerWidth(),
            graphVizViewOffset,
            self = this,
            domString,
            data = {};

        domString = _.template(graphVizViewTmpl, data);

        this._defaultSize = { "w": 1500, //pWidth,
                             "h": 1000 };

        this._el.append($(domString));

        this._el = this._el.find("> .graphVizView");
        this._el.outerWidth(this._defaultSize.w).outerHeight(this._defaultSize.h);

        this._objectLayer = this._el.find(".objectLayer");
        this._paperLayer = this._el.find(".paperLayer");
        this._pointerFilterContainer = this._el.find(".pointerFilterContainer");

        /*make it floating at the top-left corner*/
        graphVizViewOffset = this._el.offset();
        this._pointerFilterContainer.css({"position": "fixed",
                                            "top": graphVizViewOffset.top + 50,
                                            "left": graphVizViewOffset.left + 230 });

        this._svgPaper = Raphael(this._paperLayer[0], "100%", "100%");
        //this._svgPaper.canvas.style.pointerEvents = "visiblePainted";

        this._pathContextMenu = this._el.find(".pathContextMenu").hide();

        this._paperLayer.bind('click', function (event) {
            self._onBackGroundClick(event);
            event.stopPropagation();
            event.preventDefault();
        });

        this._colorManager = new GraphVizColorManager();

        this._setPointerTypeModalDialog = this._el.find(".setPointerTypeModalDialog");
    };

    GraphVizView.prototype.onExpand = function (objectId) {
        this._logger.warning("onExpand is not overridden in Controller...[objectId: '" + objectId + "']");
    };

    GraphVizView.prototype.onCollapse = function (objectId) {
        this._logger.warning("onCollapse is not overridden in Controller...[objectId: '" + objectId + "']");
    };

    GraphVizView.prototype.createObject = function (objDesc, parentObject) {
        var newObject,
            id = objDesc.id,
            i;

        newObject = new GraphVizObject(objDesc, this);

        if (parentObject) {
            parentObject.addChild(newObject);
        } else {
            newObject.parentObject = null;

            this._objectLayer.append(newObject._el);
            newObject.afterAppend();
        }

        this._graphVizObjects[id] = newObject;

        this._pointers[objDesc.id] = {};

        for (i in objDesc.pointers) {
            if (objDesc.pointers.hasOwnProperty(i)) {
                this._pointers[objDesc.id][i] = { "from": id,
                    "to": objDesc.pointers[i],
                    "name": i};
            }
        }

        //this._redrawPointers();

        return newObject;
    };

    GraphVizView.prototype.deleteObject = function (obj, parentObject) {
        var id = obj._id;

        if (this._pointers.hasOwnProperty(id)) {
            delete this._pointers[id];
        }

        if (parentObject) {
            parentObject.removeChild(obj);
        } else {
            obj.destroy();
        }

        delete this._graphVizObjects[id];
    };

    GraphVizView.prototype.updateObject = function (obj, objDesc) {
        var i,
            id = objDesc.id,
            oldPointerNames = [],
            newPointerNames = [],
            deletedPointers;

        obj.update(objDesc);

        if (this._pointers.hasOwnProperty(id)) {
            for (i in this._pointers[id]) {
                if (this._pointers[id].hasOwnProperty(i)) {
                    oldPointerNames.push(i);
                }
            }
        }

        //we have to handle pointer updates
        for (i in objDesc.pointers) {
            if (objDesc.pointers.hasOwnProperty(i)) {
                this._pointers[objDesc.id][i] = { "from": objDesc.id,
                    "to": objDesc.pointers[i],
                    "name": i};

                newPointerNames.push(i);
            }
        }

        deletedPointers = util.arrayMinus(oldPointerNames, newPointerNames);
        for (i = 0; i < deletedPointers.length; i += 1) {
            delete this._pointers[id][deletedPointers[i]];
        }

        this._redrawPointers();
    };

    GraphVizView.prototype.getObjectById = function (objectId) {
        if (this._graphVizObjects[objectId]) {
            return this._graphVizObjects[objectId];
        }

        return null;
    };

    GraphVizView.prototype.setWidth = function (w) {
        this._el.outerWidth(this._defaultSize.w > w ? this._defaultSize.w : w);
        this._redrawPointers();
    };

    GraphVizView.prototype.clear = function () {
        var i;
        for (i in this._graphVizObjects) {
            if (this._graphVizObjects.hasOwnProperty(i)) {
                this._graphVizObjects[i].destroy();
                delete this._graphVizObjects[i];
            }
        }

        for (i in this._pointers) {
            if (this._pointers.hasOwnProperty(i)) {
                delete this._pointers[i];
            }
        }

        this._svgPaper.clear();

        this._pointerTypeSettings = {};
        this._pointerFilterContainer.html("");

        this._el.outerWidth(this._defaultSize.w).outerHeight(this._defaultSize.h);
    };

    GraphVizView.prototype._redrawPointers = function () {
        var i,
            sourceCoord,
            targetCoord,
            selfOffset = this._paperLayer.offset(),
            pathDef,
            c = 3,
            path,
            sourceDX = 0,
            sourceDY = 0,
            targetDX = 0,
            targetDY = 0,
            pointerTypes = ["containment"],
            self = this,
            pTypeControl,
            handlePointerTypeClick,
            bezierCoeff = 30,
            pathOutline,
            j,
            conretePointer;

        return;

        this._svgPaper.clear();
        this._pointerFilterContainer.html("");

        if (this._pointerTypeSettings.hasOwnProperty("containment") === false) {
            this._pointerTypeSettings.containment = {"opacity": 1.0};
        }

        for (i in this._pointers) {
            if (this._pointers.hasOwnProperty(i)) {
                for (j in this._pointers[i]) {
                    if (this._pointers[i].hasOwnProperty(j)) {
                        conretePointer = this._pointers[i][j];
                        sourceCoord = null;

                        if (this._pointerTypeSettings.hasOwnProperty(conretePointer.name) === false) {
                            this._pointerTypeSettings[conretePointer.name] = {"opacity": 1.0};
                        }

                        if (pointerTypes.indexOf(conretePointer.name) === -1) {
                            pointerTypes.push(conretePointer.name);
                        }

                        if (this._graphVizObjects[conretePointer.from]) {
                            sourceCoord = this._graphVizObjects[conretePointer.from]._topConnectionPoint.offset();
                        }

                        if (conretePointer.name === "source") {
                            sourceDX = -30;
                        }

                        if (conretePointer.name === "target") {
                            sourceDX = 30;
                        }

                        if (conretePointer.name === "ref") {
                            sourceDX = -40;
                        }

                        targetCoord = null;

                        if (this._graphVizObjects[conretePointer.to]) {
                            targetCoord = this._graphVizObjects[conretePointer.to]._topConnectionPoint.offset();
                        }

                        bezierCoeff = 30;

                        if ((sourceCoord.left !== 0) && (targetCoord === null || targetCoord.left === 0)) {
                            targetCoord = targetCoord || {};
                            targetCoord.left = sourceCoord.left + sourceDX + 10 * (sourceDX === 0 ? 1 : (sourceDX / Math.abs(sourceDX)));
                            targetCoord.top = sourceCoord.top + sourceDY - 30 * (sourceDY === 0 ? 1 : (sourceDY / Math.abs(sourceDY)));
                            bezierCoeff = 0;
                        }

                        if (sourceCoord && targetCoord && sourceCoord.left !== 0 && targetCoord.left !== 0) {
                            pathDef = ["M",
                                sourceCoord.left - selfOffset.left + sourceDX,
                                sourceCoord.top - selfOffset.top + sourceDY,
                                "L",
                                sourceCoord.left - selfOffset.left + sourceDX,
                                sourceCoord.top - selfOffset.top + sourceDY - 25,
                                "L", targetCoord.left - selfOffset.left + targetDX, targetCoord.top - selfOffset.top + targetDY - 25,
                                "L", targetCoord.left - selfOffset.left + targetDX, targetCoord.top - selfOffset.top + targetDY];

                            pathDef = Raphael.path2curve(pathDef.join(","));

                            pathDef[2][2] -= c * bezierCoeff;
                            pathDef[2][4] -= c * bezierCoeff;

                            c += 2;

                            if (c >= 10) {
                                c = 3;
                            }

                            path = this._svgPaper.path(pathDef.join(",")).attr({
                                "stroke": this._colorManager.getColorForPointer(conretePointer.name),
                                "stroke-width": "2",
                                "arrow-start": "oval",
                                "arrow-end": "block"
                            });

                            pathOutline = this._svgPaper.path(pathDef.join(",")).attr({
                                "stroke": this._colorManager.getColorForPointer(conretePointer.name),
                                "stroke-width": "8",
                                "opacity": 0.001
                            });

                            this._handlePathMouseEvents(pathOutline, i, j);

                            $(path.node).attr("class", "pointer " + conretePointer.name);
                        }
                    }
                }
            }
        }

        handlePointerTypeClick = function (ctrl) {
            ctrl.bind("click", function (e) {
                var pointerType = $(this).text(),
                    cOpacity = self._pointerTypeSettings[pointerType].opacity;

                if (cOpacity === 1.0) {
                    cOpacity = 0.2;
                } else if (cOpacity === 0.2) {
                    cOpacity = 0.0;
                } else {
                    cOpacity = 1.0;
                }

                self._pointerTypeSettings[pointerType].opacity = cOpacity;

                self._setFilterTypeOpacity(pointerType);

                e.preventDefault();
                e.stopPropagation();
            });
        };

        this._pointerFilterContainer.css("position", "");
        this._pointerFilterContainer.hide();
        for (i = 0; i < pointerTypes.length; i += 1) {
            pTypeControl =  $('<div/>', {
                "class" : "pointerType " + pointerTypes[i]
            });
            pTypeControl.text(pointerTypes[i]);
            pTypeControl.css("background-color", this._colorManager.getColorForPointer(pointerTypes[i]));

            this._pointerFilterContainer.append(pTypeControl);

            handlePointerTypeClick(pTypeControl);

            this._setFilterTypeOpacity(pointerTypes[i]);
        }
        this._pointerFilterContainer.css("position", "fixed");
        this._pointerFilterContainer.show();

    };

    GraphVizView.prototype._setFilterTypeOpacity = function (pointerType) {
        var cOpacity = this._pointerTypeSettings[pointerType].opacity,
            textColor = "#FFFFFF",
            bColor,
            newColor;

        if (cOpacity !== 1.0) {
            textColor = "#000000";
        }

        if (pointerType === "containment") {
            $(".graphVizView").find(".objectContainer > .paper > svg > ." + pointerType).css("opacity", cOpacity);
        } else {
            $(".graphVizView").find(".paperLayer > svg > ." + pointerType).css("opacity", cOpacity);
        }

        bColor = $(".graphVizView").find(".pointerFilterContainer > .pointerType." + pointerType).css("background-color");
        bColor = bColor.substring(bColor.indexOf("(") + 1, bColor.length - 1).split(",");

        newColor = "rgba(" + [ bColor[0], bColor[1], bColor[2], cOpacity ].join(",") + ")";

        $(".graphVizView").find(".pointerFilterContainer > .pointerType." + pointerType).css({"background-color": newColor,
                                                                                                "color": textColor });
    };

    GraphVizView.prototype._onBackGroundClick = function (event) {
        this._pathContextMenu.hide();
    };

    /*
     * Click on a path
     */

    GraphVizView.prototype._handlePathMouseEvents = function (pathOutline, sourceObject, pointerName) {
        var self = this;

        pathOutline.click(function (event) {
            self._handlePathClick(pathOutline, sourceObject, pointerName);
            event.stopPropagation();
            event.preventDefault();
        });

        pathOutline.mouseover(function (event) {
            pathOutline.attr({"opacity": 0.2});
            event.stopPropagation();
            event.preventDefault();
        });

        pathOutline.mouseout(function (event) {
            pathOutline.attr({"opacity": 0.001});
            event.stopPropagation();
            event.preventDefault();
        });
    };

    GraphVizView.prototype._handlePathClick = function (pathOutline, sourceObject, pointerName) {
        var coord = pathOutline.getPointAtLength(pathOutline.getTotalLength() / 2),
            buttonBarWidth,
            self = this;

        this._pathContextMenu.show();

        this._pathContextMenu.outerWidth(100).outerHeight(30);

        this._pathContextMenu.html("<div class='button-bar'><div class='button-bar-item' style='display: block; '><div class='icon-18 icon-18-remove'></div></div></div>");

        buttonBarWidth = this._pathContextMenu.find(".button-bar").outerWidth(true);

        this._pathContextMenu.css({"left": coord.x - (buttonBarWidth / 2),
            "top": coord.y + 20,
            "position": "absolute",
            "background-color": "rgba(0, 0, 0, 0)"});

        this._removeDiv = this._pathContextMenu.find(".icon-18-remove").parent();
        this._removeDiv.attr("title", "Remove pointer");

        this._removeDiv.bind('click', function (event) {
            self._deletePointer(sourceObject, pointerName);
            self._removeDiv.unbind('click');
            self._pathContextMenu.hide();
            event.stopPropagation();
            event.preventDefault();
        });
    };

    GraphVizView.prototype._deletePointer = function (sourceId, pointerName) {
        this.onDeletePointer(sourceId, pointerName);
    };

    /*
     * END OF - CLICK ON PATH
     */

    /*
     * DRAW POINTER IN EDIT MODE
     */

    GraphVizView.prototype._getMousePos = function (e) {
        var selfOffset = this._paperLayer.offset();
        return { "mX": e.pageX - selfOffset.left,
            "mY": e.pageY - selfOffset.top };
    };

    GraphVizView.prototype.startDrawPointer = function (srcId) {
        this._pointerInDraw = {};
        this._pointerInDraw.source = srcId;
        this._pointerInDraw.path = this._svgPaper.path("M0,0").attr(
            {   "stroke-width": this._pointerInDrawSettings.strokeWidth,
                "stroke": this._pointerInDrawSettings.strokeColor,
                "stroke-dasharray": this._pointerInDrawSettings.lineType}
        );
    };

    GraphVizView.prototype.onDrawPointer = function (event) {
        var mousePos = this._getMousePos(event);

        this._drawConnectionTo({"x": mousePos.mX, "y": mousePos.mY});
    };

    GraphVizView.prototype.endDrawPointer = function () {
        this._pointerInDraw.path.remove();
        delete this._pointerInDraw.source;
        delete this._pointerInDraw.path;
    };

    GraphVizView.prototype._drawConnectionTo = function (toPosition) {
        var srcConnectionPoints,
            pathDefinition,
            sourceId = this._pointerInDraw.source,
            selfOffset = this._paperLayer.offset();

        if (this._graphVizObjects[sourceId]) {
            srcConnectionPoints = this._graphVizObjects[sourceId]._topConnectionPoint.offset();
            srcConnectionPoints.left -= selfOffset.left;
            srcConnectionPoints.top -= selfOffset.top;
            srcConnectionPoints.top += 20;

            pathDefinition = "M" + srcConnectionPoints.left + "," + srcConnectionPoints.top + "L" + toPosition.x + "," + toPosition.y;

            this._pointerInDraw.path.attr({ "path": pathDefinition});
        }
    };

    GraphVizView.prototype.createPointer = function (sourceId, targetId) {
        var self = this,
            i,
            rbType,
            pointerTypesContainer = this._setPointerTypeModalDialog.find(".pointerTypes").html(""),
            checkedString = " checked";

        this._logger.debug("createPointer, sourceId: '" + sourceId + "', targetId: '" + targetId + "'");

        //fill the modal dialog body with all the known pointer types
        //<input type="radio" name="group1" value="Butter" checked>
        for (i in this._pointerTypeSettings) {
            if (this._pointerTypeSettings.hasOwnProperty(i)) {
                if (i !== "containment") {
                    rbType =  $('<input type="radio" name="pType" value="' + i + '"' + checkedString  + '> ' + i + '<br/>');
                    pointerTypesContainer.append(rbType);
                    checkedString = "";
                }
            }
        }

        //select 'Custom' is nothing else is selected
        if (checkedString !== "") {
            this._setPointerTypeModalDialog.find('input[type="radio"]').attr('checked', 'checked');
        }

        this._setPointerTypeModalDialog.modal({
            keyboard: false
        });

        this._saveButton = this._setPointerTypeModalDialog.find("#btnSave");

        this._saveButton.bind('click', function (event) {
            var selectedPointerType = pointerTypesContainer.parent().find('input[type="radio"]:checked').val();

            if (selectedPointerType === "customPointer") {
                selectedPointerType = pointerTypesContainer.parent().find("#customPointer").val();
            }

            if (selectedPointerType !== "") {
                self.onCreatePointer(sourceId, targetId, selectedPointerType);
                self._setPointerTypeModalDialog.modal('hide');
                self._saveButton.unbind('click');
                event.stopPropagation();
                event.preventDefault();
            }
        });
    };

    /*
     * END OF - DRAW POINTER IN EDIT MODE
     */


    /*
     * PUBLIC INTERFACE TO OVERRIDE IN CONTROLLER
     */

    GraphVizView.prototype.onCreatePointer = function (sourceId, targetId, pointerName) {
        this._logger.warning("onCreatePointer is not implemented in Controller... name: '" + pointerName + "', sourceId: '" + sourceId + "', targetId: '" + targetId + "'");
    };

    GraphVizView.prototype.onDeletePointer = function (sourceId, pointerName) {
        this._logger.warning("onDeletePointer is not implemented in Controller... name: '" + pointerName + "', sourceId: '" + sourceId + "'");
    };

    /*
     * END OF - PUBLIC INTERFACE TO OVERRIDE IN CONTROLLER
     */

    //TODO: check this here...
    GraphVizView.prototype.destroy = function () {
        this._el.parent().empty();
    };

    GraphVizView.prototype.parentContainerSizeChanged = function (nW, nH) {
        //TODO
    };


    return GraphVizView;
});
