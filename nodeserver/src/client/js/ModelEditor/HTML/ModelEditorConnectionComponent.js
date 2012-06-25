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
    './ComponentBase.js' ], function (logManager,
             util,
             commonUtil,
             nodeAttributeNames,
             nodeRegistryNames,
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

    ModelEditorConnectionComponent.prototype.redrawConnection = function (sourceCoordinates, targetCoordinates) {
        this.skinParts.path.attr({ "path": "M" + sourceCoordinates.x + "," + sourceCoordinates.y + "L" + targetCoordinates.x + "," + targetCoordinates.y});
    };

    return ModelEditorConnectionComponent;
});