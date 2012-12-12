"use strict";

define(['logManager'], function (logManager) {

    var DesignerItem,
        DESIGNER_ITEM_CLASS = "designer-item",
        EVENT_POSTFIX = "DesignerItem",
        HOVER_CLASS = "hover";

    DesignerItem = function (objId) {
        this.id = objId;

        this.logger = logManager.create("DesignerItem_" + this.id);
        this.logger.debug("Created");
    };

    DesignerItem.prototype._initialize = function (objDescriptor) {
        var decoratorClass = objDescriptor.DecoratorClass;
        /*MODELEDITORCOMPONENT CONSTANTS*/

        this.canvas = objDescriptor.designerCanvas;
        this._containerElement = null;

        /*ENDOF - MODELEDITORCOMPONENT CONSTANTS*/

        /*instance variables*/
        this._decoratorInstance = null;

        this.position = {"x": objDescriptor.position.x,
            "y": objDescriptor.position.y};

        objDescriptor.designerItem = this;
        delete objDescriptor.DecoratorClass;

        this._initializeUI();

        this._initializeDecorator(objDescriptor, decoratorClass);
    };

    DesignerItem.prototype._DOMBase = $('<div/>').attr({ "class": DESIGNER_ITEM_CLASS });

    DesignerItem.prototype._initializeUI = function () {
        //generate skin DOM and cache it
        this.$el = this._DOMBase.clone();

        //set additional CSS properties
        this.$el.attr({"id": this.id});

        this.$el.css({ "position": "absolute",
            "left": this.position.x,
            "top": this.position.y });

        this._attachUserInteractions();
    };

    DesignerItem.prototype._attachUserInteractions = function () {
        var i,
            self = this;

        this._events = {"mouseenter": "onMouseEnter",
                        "mouseleave": "onMouseLeave" };

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.on( i + '.' + EVENT_POSTFIX, null, null, function (event) {
                    var eventHandler = self._events[event.type],
                        result = true;

                    if (eventHandler) {
                        //call pre-decorator event handler (if exist)
                        if ($.isFunction(self[eventHandler])) {
                            result = self[eventHandler].call(self, event);
                        }

                        //call decorator's handle if needed
                        if (result === true) {
                            if ($.isFunction(self._decoratorInstance[eventHandler])) {
                                result = self._decoratorInstance[eventHandler].call(self._decoratorInstance, event);
                            }
                        }
                    }

                    //finally marked handled
                    event.stopPropagation();
                    event.preventDefault();
                });
            }
        }
    };

    DesignerItem.prototype._detachUserInteractions = function () {
        var i;

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.off( i + '.' + EVENT_POSTFIX);
            }
        }
    };

    DesignerItem.prototype.onMouseEnter = function (event) {
        this.logger.debug("_onMouseEnter: " + this.id);

        //TODO: does it needs to be called when the item is selected / part of multiple selection

        //pre-decorator handle
        this.$el.addClass(HOVER_CLASS);

        return true;
    };

    DesignerItem.prototype.onMouseLeave = function (event) {
        this.logger.debug("_onMouseLeave: " + this.id);

        //TODO: does it needs to be called when the item is selected / part of multiple selection

        //pre-decorator handle
        this.$el.removeClass(HOVER_CLASS);

        return true;
    };

    DesignerItem.prototype._initializeDecorator = function (objDescriptor, DecoratorClass) {
        //decorator class downloaded, attach it to the designeritem
        this._decoratorInstance = new DecoratorClass(objDescriptor);
    };

    DesignerItem.prototype.addTo = function (cElement) {
        if (this._containerElement != cElement){

            if (this._containerElement){
                this.$el.remove();
            }

            this._containerElement = cElement;

            if ($.isFunction(this._decoratorInstance.on_addTo)) {
                this._decoratorInstance.on_addTo.call(this._decoratorInstance);
            }

            this.render();

            this.$el.html(this._decoratorInstance.$el);

            this.$el.appendTo(this._containerElement);

            //this.$el.css("z-index", this._containerElement.css("z-index"));

            this.logger.debug("DesignerItem with id:'" + this.id + "' added.");

            if ($.isFunction(this._decoratorInstance.on_afterAdded)) {
                this._decoratorInstance.on_afterAdded.call(this._decoratorInstance);
            }
        }
    };

    DesignerItem.prototype.render = function () {
        if (this._decoratorInstance) {
            if ($.isFunction(this._decoratorInstance.on_render)) {
                this._decoratorInstance.on_render.call(this._decoratorInstance);
            }
        }
    };

    DesignerItem.prototype._remove = function() {
        this._containerElement = null;
        this.$el.remove();
        this.$el.empty();
        this._detachUserInteractions();
        this.$el = null;
    };

    DesignerItem.prototype.destroy = function () {
        this._destroying = true;

        if (this._decoratorInstance) {
            this._decoratorInstance.destroy();
        }

        this._remove();

        this.logger.debug("destroyed");
    };

/*    DesignerItem.prototype.onSelect = function () {
        this.el.addClass("selected");
    };

    DesignerItem.prototype.onDeselect = function () {
        this.el.removeClass("selected");
    };*/

    return DesignerItem;
});