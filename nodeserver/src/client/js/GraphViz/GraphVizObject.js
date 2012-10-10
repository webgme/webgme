"use strict";

define(['logManager',
    'text!GraphViz/GraphVizObjectTmpl.html',
    'css!GraphVizCSS/GraphVizObject'], function (logManager,
                                              graphVizObjectTmpl) {

    var GraphVizObject;

    GraphVizObject = function (objDesc, myGraphVizView) {
        this._id = objDesc.id;

        this._name = objDesc.name || "";
        this._expandable = objDesc.expandable || false;

        this._graphVizView = myGraphVizView;

        this._children = {};

        //get logger instance for this component
        this._logger = logManager.create("GraphVizObject_" + this._id);

        this._initialize();

        this._logger.debug("Created");
    };

    GraphVizObject.prototype._initialize = function () {
        var self = this,
            domString,
            data = {};

        data.name = this._name;
        data.pid = this._id;
        domString = _.template(graphVizObjectTmpl, data);

        this._el = $(domString);

        this._paper = this._el.find(".paper");

        this._nameHolder = this._el.find(".title");

        this._childrenContainer = this._el.find(".children");

        this._expandButton = this._el.find(".expandButton");
        this._collapseButton = this._el.find(".collapseButton");

        this._bottomControls = this._el.find(".bottomControls");

        this._core = this._el.find(".core");

        this._bottomConnectionPoint = this._el.find(".bottomConnectionPoint");
        this._topConnectionPoint = this._el.find(".topConnectionPoint");

        this._expandButton.bind('click', function (event) {
            self._expand();
            event.preventDefault();
            event.stopPropagation();
        });

        this._collapseButton.bind('click', function (event) {
            self._collapse();
            event.preventDefault();
            event.stopPropagation();
        });

        this._isExpanded = false;

        if (this._expandable === false) {
            this._bottomControls.hide();
        }

        this._core.draggable({
            helper: function () {
                return $("<div class='draw-pointer-drag-helper'></div>").data("sourceId", self._id);
            },
            scroll: true,
            cursor: 'pointer',
            cursorAt: {
                left: 0,
                top: 0
            },
            start: function (event) {
                self._core.addClass("pointer-source");
                self._graphVizView.startDrawPointer(self._id);
                event.stopPropagation();
            },
            stop: function (event) {
                self._graphVizView.endDrawPointer();
                self._core.removeClass("pointer-source");
                event.stopPropagation();
            },
            drag: function (event) {
                self._graphVizView.onDrawPointer(event);
            }
        });

        this._core.droppable({
            accept: ".pointer-source",
            hoverClass: "pointer-end-state-hover",
            greedy: true,
            drop: function (event, ui) {
                var sourceId = ui.helper.data("sourceId");

                self._graphVizView.createPointer(sourceId, self._id);
                event.stopPropagation();
            }
        });
    };

    GraphVizObject.prototype.afterAppend = function () {
        this._svgPaper = Raphael(this._paper[0], "100%", "100%");
        //this._svgPaper.canvas.style.pointerEvents = "visiblePainted";
    };

    GraphVizObject.prototype._expand = function () {
        if (this._isExpanded === false) {
            this._isExpanded = true;
            this._doExpand();
            if (this._graphVizView) {
                this._graphVizView.onExpand(this._id);
            }
        }
    };

    GraphVizObject.prototype._collapse = function () {
        if (this._isExpanded === true) {
            this._isExpanded = false;
            this._doExpand();
            if (this._graphVizView) {
                this._graphVizView.onCollapse(this._id);
            }
        }
    };

    GraphVizObject.prototype._doExpand = function () {
        if (this._isExpanded) {
            this._expandButton.hide();
            this._collapseButton.show();
            this._childrenContainer.show();
            this._drawContainmentLines();
        } else {
            this._expandButton.show();
            this._collapseButton.hide();
            this._childrenContainer.hide();
            this._removeContainmentLines();
            if (this.parentObject) {
                this.parentObject._drawContainmentLines();
            } else {

                    this._graphVizView.setWidth( 100);
            }
        }
    };

    GraphVizObject.prototype._drawContainmentLines = function () {
        var i,
            paperOffset = this._paper.offset(),
            bottomConnectionPoint = this._bottomConnectionPoint.offset(),
            startPos = { "x": bottomConnectionPoint.left + 0.5 - paperOffset.left,
                        "y": bottomConnectionPoint.top - paperOffset.top},
            childTopConnectionPoints = [],
            childrenSumWidth = 0,
            childNum = 0,
            gap,
            pathDef,
            path,
            len;

        //remove existing lines first
        this._removeContainmentLines();

        //in the toplevel object first we set the correct width to the container
        if (this.parentObject === undefined || this.parentObject === null) {
            for (i in this._children) {
                if (this._children.hasOwnProperty(i)) {
                    childrenSumWidth += this._children[i]._el.outerWidth();
                    childNum += 1;
                }
            }
            gap = parseInt(this._el.css("margin-left"), 10) * 2;
            this._graphVizView.setWidth(childrenSumWidth + (childNum - 1) * gap + 100);

            paperOffset = this._paper.offset();
            bottomConnectionPoint = this._bottomConnectionPoint.offset();
            startPos = { "x": bottomConnectionPoint.left + 0.5 - paperOffset.left,
                "y": bottomConnectionPoint.top - paperOffset.top};
        }

        for (i in this._children) {
            if (this._children.hasOwnProperty(i)) {
                childTopConnectionPoints.push(this._children[i]._topConnectionPoint.offset());
            }
        }

        i = childTopConnectionPoints.length;
        while (--i >= 0) {
            pathDef = ["M", startPos.x, startPos.y, "L", childTopConnectionPoints[i].left - paperOffset.left, childTopConnectionPoints[i].top - paperOffset.top];

            pathDef = Raphael.path2curve(pathDef.join(","));

            pathDef[1][2] += 70;
            pathDef[1][4] -= 70;

            path = this._svgPaper.path(pathDef.join(","));/*.attr({
             "stroke": "",
             "fill": ""
             });*/

            $(path.node).attr("class", "containment");
            //$(path.node).removeAttr("stroke");
            //$(path.node).removeAttr("fill");
        }

        if (this.parentObject) {
            this.parentObject._drawContainmentLines();
        }
    };

    GraphVizObject.prototype._removeContainmentLines = function () {
        this._svgPaper.clear();
    };

    GraphVizObject.prototype.addChild = function (child) {
        if (child) {
            if (child._id) {
                if (this._children[child._id]) {
                    this._children[child._id].destroy();
                }

                this._children[child._id] = child;

                child.parentObject = this;

                if (child._el) {
                    this._childrenContainer.append(child._el);
                    //this._drawContainmentLines();
                    child.afterAppend();
                }
            }
        }
    };

    GraphVizObject.prototype.removeChild = function (child) {
        if (child) {
            if (child._id) {
                if (this._children[child._id]) {
                    this._children[child._id].destroy();
                    delete this._children[child._id];
                    //this._drawContainmentLines();
                }
            }
        }
    };

    GraphVizObject.prototype.destroy = function () {
        this._removeContainmentLines();

        this._el.remove();
    };

    GraphVizObject.prototype.update = function (objDesc) {
        if (objDesc.name) {
            if (this._name !== objDesc.name) {
                this._name = objDesc.name;
                this._nameHolder.text(this._name).attr("title", this._name);
            }
        }

        if (objDesc.hasOwnProperty("expandable")) {
            if (this._expandable !== objDesc.expandable) {
                this._expandable = objDesc.expandable || false;
                if (this._expandable === true) {
                    this._bottomControls.show();
                } else {
                    this._bottomControls.hide();
                }
                this._isExpanded = false;
                this._doExpand();
            }
        }

    };


    return GraphVizObject;
});