"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil'], function (logManager,
                                        util,
                                        commonUtil) {

    var DesignerItem;

    DesignerItem = function (objId) {
        this.guid = objId;

        this.logger = logManager.create("DesignerItem_" + this.guid);
        this.logger.debug("Created");
    };

    DesignerItem.prototype._initialize = function (objDescriptor) {
        var decoratorClass = objDescriptor.DecoratorClass;
        /*MODELEDITORCOMPONENT CONSTANTS*/

        this.canvas = objDescriptor.designerCanvas;
        this._name = objDescriptor.name || "";

        /*ENDOF - MODELEDITORCOMPONENT CONSTANTS*/

        /*instance variables*/
        this._decoratorInstance = null;

        this.position = {"x": objDescriptor.position.x,
            "y": objDescriptor.position.y};

        objDescriptor.designerItem = this;
        delete objDescriptor.DecoratorClass;

        this._initializeDecorator(objDescriptor, decoratorClass);
    };

    DesignerItem.prototype._DOMBase = $('<div/>').attr({ "class": "model" });

    DesignerItem.prototype._initializeDecorator = function (objDescriptor, DecoratorClass) {
        var self = this;
        this._decoratorInstance = new DecoratorClass(objDescriptor);
    };

    DesignerItem.prototype.render = function () {
        //generate skin DOM and cache it
        this.el = this._DOMBase.clone();

        //set additional CSS properties
        this.el.attr({"id": this.guid});

        this.el.css({ "position": "absolute",
            "left": this.position.x,
            "top": this.position.y });

        this._decoratorInstance.render();
    };

    DesignerItem.prototype.destroy = function () {
        this._destroying = true;

        //no good because if we do it here, cleanup will happen earlier than the usage of this information
        this._updateConnEndPointsInView(false);

        if (this._decoratorInstance) {
            this._decoratorInstance.destroy();
        }

        this._logger.debug("destroyed");
    };

    DesignerItem.prototype.onSelect = function () {
        this.el.addClass("selected");
    };

    DesignerItem.prototype.onDeselect = function () {
        this.el.removeClass("selected");
    };

    return DesignerItem;
});