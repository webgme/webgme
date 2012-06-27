/**
 * Created with JetBrains WebStorm.
 * User: roby
 * Date: 6/22/12
 * Time: 9:54 PM
 * To change this template use File | Settings | File Templates.
 */
"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'nodeAttributeNames',
    'nodeRegistryNames',
    'bezierHelper',
    './ComponentBase.js' ], function (logManager,
             util,
             commonUtil,
             nodeAttributeNames,
             nodeRegistryNames,
             bezierHelper,
             ComponentBase) {

    var ModelEditorConnectionComponent;

    ModelEditorConnectionComponent = function (id, proj, raphaelPaper) {
        $.extend(this, new ComponentBase(id, proj));

        this.logger = logManager.create("ModelEditorConnectionComponent_" + id);
        this.logger.debug("Created");

        this.paper = raphaelPaper;

        this.borderW = 5;

        this.pathAttributes = {};

        /*
         * OVERRIDE COMPONENTBASE MEMBERS
         */
        this.addedToParent = function () {
            this._addedToParent();
        };

        this.onDestroy = function () {
            this._onDestroy();
        };

        this.isSelectable = function () {
            return true;
        };

        this.isMultiSelectable = function () {
            return false;
        };
        /*
         * END OVERRIDE COMPONENTBASE MEMBERS
         */

        this._initialize();
    };

    ModelEditorConnectionComponent.prototype._initialize = function () {
        //generate skin controls
        this.el.addClass("connection");

        this.el.css({ "position": "absolute",
                      "background-color": "rgba(0, 0, 0, 0)",
                      "left": 0,
                       "top": 0 });

        this.el.outerWidth(2 * this.borderW).outerHeight(2 * this.borderW);

        this.skinParts.path = this.paper.path("M0,0").attr({ stroke: "#000", fill: "none", "stroke-width": "2" });

        $(this.skinParts.path.node).attr("id", this.getId());

        this._initializeFromNode();
    };

    ModelEditorConnectionComponent.prototype._initializeFromNode = function () {
        var node = this.project.getNode(this.getId());

        this.pathAttributes.arrowStart = "oval";
        this.pathAttributes.arrowEnd = "oval";
        if (node.getAttribute(nodeAttributeNames.directed) === true) {
            this.pathAttributes.arrowEnd = "block";
        }

        this.pathAttributes.color = "#000000";
        this.pathAttributes.width = "2";

        //TODO: figure out something here....
        //in Safari and FireFox setting the arrow-end and arrow-start makes the drawing of the path so sloooooooooooow.....
        this.skinParts.path.attr({ /*"arrow-start": this.pathAttributes.arrowStart,
                                    "arrow-end": this.pathAttributes.arrowEnd,*/
                                    "stroke": this.pathAttributes.color,
                                    "fill": "none",
                                    "stroke-width": this.pathAttributes.width });
    };

    ModelEditorConnectionComponent.prototype._addedToParent = function () {

    };

    ModelEditorConnectionComponent.prototype._onDestroy = function () {
        if (this.skinParts.path) {
            this.skinParts.path.remove();
            delete this.skinParts.path;
        }

        this.logger.debug("_onDestroy");
    };

    ModelEditorConnectionComponent.prototype.onSelect = function () {

    };

    ModelEditorConnectionComponent.prototype.onDeselect = function () {

    };

    ModelEditorConnectionComponent.prototype.update = function () {
        this._initializeFromNode();

        this.redrawConnection();
    };

    ModelEditorConnectionComponent.prototype.redrawConnection = function (srcCoordinates, tgtCoordinates) {
        var cX,
            cY,
            cW,
            cH,
            pathDef,
            bezierControlPoints;

        bezierControlPoints = bezierHelper.getBezierControlPoints2(srcCoordinates, tgtCoordinates);

        //TODO: do we really need the DIV over the path?
        cX = Math.min(bezierControlPoints[0].x, bezierControlPoints[3].x);
        cY = Math.min(bezierControlPoints[0].y, bezierControlPoints[3].y);
        cW = Math.abs(bezierControlPoints[0].x - bezierControlPoints[3].x);
        cH = Math.abs(bezierControlPoints[0].y - bezierControlPoints[3].y);

        this.el.css({"left": cX - this.borderW,
                        "top": cY - this.borderW });
        this.el.outerWidth(cW + 2 * this.borderW).outerHeight(cH + 2 * this.borderW);

        //build up path from points
        pathDef = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y].join(",");

        //set new path definition
        this.skinParts.path.attr({ "path": pathDef});
    };

    return ModelEditorConnectionComponent;
});