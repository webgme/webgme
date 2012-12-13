"use strict";

define(['logManager'], function (logManager) {

    var DesignerItem,
        DESIGNER_ITEM_CLASS = "designer-item",
        EVENT_POSTFIX = "DesignerItem",
        HOVER_CLASS = "hover",
        SELECTABLE_CLASS = "selectable";

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
        this.selected = false;
        this.selectedInMultiSelection = false;

        //location and dimension information
        this.positionX = objDescriptor.position.x;
        this.positionY = objDescriptor.position.y;

        this.width = 0;
        this.height = 0;

        objDescriptor.designerItem = this;
        delete objDescriptor.DecoratorClass;

        this._initializeUI();

        this._initializeDecorator(objDescriptor, decoratorClass);
    };

    DesignerItem.prototype.$_DOMBase = $('<div/>').attr({ "class": DESIGNER_ITEM_CLASS });

    DesignerItem.prototype._initializeUI = function () {
        //generate skin DOM and cache it
        this.$el = this.$_DOMBase.clone();

        //set additional CSS properties
        this.$el.attr({"id": this.id});

        this.$el.css({ "position": "absolute",
            "left": this.positionX,
            "top": this.positionY });

        this._attachUserInteractions();
    };

    DesignerItem.prototype._attachUserInteractions = function () {
        var i,
            self = this;

        this._events = {"mouseenter": { "fn": "onMouseEnter",
                                        "stopPropagation": true,
                                        "preventDefault": true },
                        "mouseleave": { "fn": "onMouseLeave",
                                        "stopPropagation": true,
                                        "preventDefault": true },
                        "mousedown": { "fn": "onMouseDown",
                                        "stopPropagation": true,
                                        "preventDefault": true },
                        "mouseup": { "fn": "onMouseUp",
                                    "stopPropagation": false,
                                    "preventDefault": true } };

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.on( i + '.' + EVENT_POSTFIX, null, null, function (event) {
                    var eventHandlerOpts = self._events[event.type],
                        result = true;

                    if (eventHandlerOpts) {
                        //call pre-decorator event handler (if exist)
                        if (_.isFunction(self[eventHandlerOpts.fn])) {
                            result = self[eventHandlerOpts.fn].call(self, event);
                        }

                        //call decorator's handle if needed
                        if (result === true) {
                            result = self._callDecoratorMethod(eventHandlerOpts.fn, event);
                        }

                        //finally marked handled if needed
                        if (eventHandlerOpts.stopPropagation === true) {
                            event.stopPropagation();
                        }

                        if (eventHandlerOpts.preventDefault === true) {
                            event.preventDefault();
                        }
                    }
                });
            }
        }

        this.canvas.dragManager.attachDraggable(this);
    };

    DesignerItem.prototype._detachUserInteractions = function () {
        var i;

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.off( i + '.' + EVENT_POSTFIX);
            }
        }

        this.canvas.dragManager.detachDraggable(this);
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

            this._callDecoratorMethod("on_addTo");

            this.render();

            this.$el.html(this._decoratorInstance.$el);

            this.$el.appendTo(this._containerElement);

            //this.$el.css("z-index", this._containerElement.css("z-index"));

            this.logger.debug("DesignerItem with id:'" + this.id + "' added.");

            this._callDecoratorMethod("on_afterAdded");
        }
    };

    DesignerItem.prototype.render = function () {
        this._callDecoratorMethod("on_render");
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

    DesignerItem.prototype.getBoundingBox = function () {
        var bBox = { "x": this.positionX,
            "y": this.positionY,
            "width": this.width,
            "height": this.height };
        bBox.x2 = bBox.x + bBox.width;
        bBox.y2 = bBox.y + bBox.height;

        return bBox;
    };

    DesignerItem.prototype.onMouseEnter = function (event) {
        var classes = [HOVER_CLASS];

        this.logger.debug("onMouseEnter: " + this.id);

        if (this.canvas.selectionManager.allowSelection === true) {
            classes.push(SELECTABLE_CLASS);
        }

        //pre-decorator handle
        this.$el.addClass(classes.join(' '));

        //in edit mode and when not participating in a multiple selection,
        //show connectors
        if (this.canvas.getIsReadOnlyMode() === false) {
            if (this.selectedInMultiSelection === false) {
                this.showConnectors();
            }
        }

        return true
    };

    DesignerItem.prototype.onMouseLeave = function (event) {
        var classes = [HOVER_CLASS, SELECTABLE_CLASS];

        this.logger.debug("onMouseLeave: " + this.id);

        //pre-decorator handle
        this.$el.removeClass(classes.join(' '));

        //when not currently selected, hide connectors
        if (this.selected === false) {
            this.hideConnectors();
        }

        return true;
    };

    DesignerItem.prototype.onMouseDown = function (event) {
        this.logger.debug("onMouseDown: " + this.id);

        this.canvas.onItemMouseDown(event, this.id);

        return true;
    };

    DesignerItem.prototype.onSelect = function (multiSelection) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;
        this.$el.addClass("selected");

        //in edit mode and when not participating in a multiple selection,
        //show connectors
        if (this.selectedInMultiSelection === true) {
            this.hideConnectors();
        } else {
            if (this.canvas.getIsReadOnlyMode() === false) {
                this.showConnectors();
            } else {
                this.hideConnectors();
            }
        }

        //let the decorator know that this item become selected
        this._callDecoratorMethod("onSelect");
    };

    DesignerItem.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;
        this.$el.removeClass("selected");

        this.hideConnectors();

        //let the decorator know that this item become deselected
        this._callDecoratorMethod("onDeselect");
    };

    DesignerItem.prototype.showConnectors = function () {
        this._callDecoratorMethod("showConnectors");
    };

    DesignerItem.prototype.hideConnectors = function () {
        this._callDecoratorMethod("hideConnectors");
    };

    DesignerItem.prototype._callDecoratorMethod = function (fnName, args) {
        var result = null;

        if (this._decoratorInstance) {
            if (_.isFunction(this._decoratorInstance[fnName])) {
                result = this._decoratorInstance[fnName].apply(this._decoratorInstance, args);
            } else {
                this.logger.warning("DecoratorInstance '" + $.type(this._decoratorInstance) + "' does not have a method with name '" + fnName + "'...");
            }
        } else {
            this.logger.error("DecoratorInstance does not exist...");
        }

        return result;
    };

    DesignerItem.prototype.update = function (objDescriptor) {
        var positionChanged = false;
        //check what might have changed

        //location and dimension information
        if (this.positionX !== objDescriptor.position.x) {
            this.positionX = objDescriptor.position.x;
            positionChanged = true;
        }

        if (this.positionY !== objDescriptor.position.y) {
            this.positionY = objDescriptor.position.y;
            positionChanged = true;
        }

        if (positionChanged) {
            this.$el.css({"left": this.positionX,
                "top": this.positionY });
        }

        //TODO: should be handled in the concrete decorator
        /*if (this.width !== objDescriptor.width) {
            this.width = objDescriptor.width
        }

        if (this.height !== objDescriptor.height) {
            this.height = objDescriptor.height
        }*/

        //TODO: check if decorator changed and need to be updated

        //if decocator instance not changed
        //let the decorator instance know about the update
        this._decoratorInstance.update(objDescriptor);
    };

    return DesignerItem;
});