"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'raphaeljs',
    './GraphVizObject',
    'css!GraphVizCSS/GraphVizView'], function (logManager,
                                                 util,
                                                 commonUtil,
                                                 raphaeljs,
                                                 GraphVizObject) {

    var GraphVizView;

    GraphVizView = function (containerElement) {
        this._logger = logManager.create("GraphVizView_" + containerElement);

        this._el = $("#" + containerElement);

        this._graphVizObjects = {};
        this._pointers = {};
        this._pointerTypeSettings = {};

        if (this._el.length === 0) {
            this._logger.warning("GraphVizView's container control with id:'" + containerElement + "' could not be found");
            return undefined;
        }

        this._initialize();

        this._logger.debug("Created");
    };

    GraphVizView.prototype._initialize = function () {
        var pWidth = this._el.outerWidth(),
            graphVizViewOffset;

        this._defaultSize = { "w": pWidth,
                             "h": 1000 };

        this._el.append($('<div/>', {
            "class" : "graphVizView"
        }));

        this._el = this._el.find("> .graphVizView");
        this._el.outerWidth(this._defaultSize.w).outerHeight(this._defaultSize.h);

        this._objectLayer = $('<div/>', {
            "class" : "objectLayer"
        });

        this._paperLayer = $('<div/>', {
            "class" : "paperLayer"
        });

        this._pointerFilterContainer = $('<div/>', {
            "class" : "pointerFilterContainer"
        });

        this._el.append(this._paperLayer).append(this._objectLayer).append(this._pointerFilterContainer);

        /*make it floating at the topleft corner*/
        graphVizViewOffset = this._el.offset();
        this._pointerFilterContainer.css({"position": "fixed",
                                            "top": graphVizViewOffset.top + 30,
                                            "left": graphVizViewOffset.left + 30 });

        this._svgPaper = Raphael(this._paperLayer[0], "100%", "100%");
        this._svgPaper.canvas.style.pointerEvents = "visiblePainted";
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

        for (i in objDesc.pointers) {
            if (objDesc.pointers.hasOwnProperty(i)) {
                this._pointers[objDesc.id + "_" + i] = { "from": id,
                    "to": objDesc.pointers[i],
                    "name": i};
            }
        }

        this._redrawPointers();

        return newObject;
    };

    GraphVizView.prototype.deleteObject = function (obj, parentObject) {
        var id = obj._id;

        if (parentObject) {
            parentObject.removeChild(obj);
        } else {
            obj.destroy();
        }

        delete this._graphVizObjects[id];
    };

    GraphVizView.prototype.updateObject = function (obj, objDesc) {
        obj.update(objDesc);
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
            c = 1,
            path,
            sourceDX = 0,
            sourceDY = 0,
            targetDX = 0,
            targetDY = 0,
            pointerTypes = ["containment"],
            self = this,
            pTypeControl,
            handlePointerTypeClick,
            bezierCoeff = 30;

        this._svgPaper.clear();
        this._pointerFilterContainer.html("");

        if (this._pointerTypeSettings.hasOwnProperty("containment") === false) {
            this._pointerTypeSettings.containment = {"opacity": 1.0};
        }

        for (i in this._pointers) {
            if (this._pointers.hasOwnProperty(i)) {
                sourceCoord = null;

                if (this._pointerTypeSettings.hasOwnProperty(this._pointers[i].name) === false) {
                    this._pointerTypeSettings[this._pointers[i].name] = {"opacity": 1.0};
                }

                if (pointerTypes.indexOf(this._pointers[i].name) === -1) {
                    pointerTypes.push(this._pointers[i].name);
                }

                if (this._graphVizObjects[this._pointers[i].from]) {
                    sourceCoord = this._graphVizObjects[this._pointers[i].from]._topConnectionPoint.offset();
                }

                if (this._pointers[i].name === "source") {
                    sourceDX = -30;
                }

                if (this._pointers[i].name === "target") {
                    sourceDX = 30;
                }

                if (this._pointers[i].name === "ref") {
                    sourceDX = -40;
                }

                targetCoord = null;

                if (this._graphVizObjects[this._pointers[i].to]) {
                    targetCoord = this._graphVizObjects[this._pointers[i].to]._topConnectionPoint.offset();
                }

                bezierCoeff = 30;

                if ((sourceCoord.left !== 0) && (targetCoord === null || targetCoord.left === 0)) {
                    targetCoord = targetCoord || {};
                    targetCoord.left = sourceCoord.left + sourceDX + 10 * (sourceDX === 0 ? 1 : (sourceDX / Math.abs(sourceDX)));
                    targetCoord.top = sourceCoord.top + sourceDY - 30 * (sourceDY === 0 ? 1 : (sourceDY / Math.abs(sourceDY)));
                    bezierCoeff = 0;
                }

                if (sourceCoord && targetCoord && sourceCoord.left !== 0 && targetCoord.left !== 0) {
                    pathDef = ["M", sourceCoord.left - selfOffset.left + sourceDX, sourceCoord.top - selfOffset.top + sourceDY, "L", targetCoord.left - selfOffset.left + targetDX, targetCoord.top - selfOffset.top + targetDY];

                    pathDef = Raphael.path2curve(pathDef.join(","));

                    pathDef[1][2] -= c * bezierCoeff;
                    pathDef[1][4] -= c * bezierCoeff;

                    c += 1;

                    path = this._svgPaper.path(pathDef.join(",")).attr({
                        "stroke-width": "2",
                        "arrow-start": "oval",
                        "arrow-end": "block"
                    });

                    $(path.node).attr("class", "pointer " + this._pointers[i].name);
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
        for (i = 0; i < pointerTypes.length; i += 1) {
            pTypeControl =  $('<div/>', {
                "class" : "pointerType " + pointerTypes[i]
            });
            pTypeControl.text(pointerTypes[i]);

            this._pointerFilterContainer.append(pTypeControl);

            handlePointerTypeClick(pTypeControl);

            this._setFilterTypeOpacity(pointerTypes[i]);
        }
        this._pointerFilterContainer.css("position", "fixed");

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


    return GraphVizView;
});
