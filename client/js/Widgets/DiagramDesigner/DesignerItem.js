"use strict";

define(['logManager',
    './DiagramDesignerWidget.Constants',
    './ErrorDecorator'], function (logManager,
                                 DiagramDesignerWidgetConstants,
                                 ErrorDecorator) {

    var DesignerItem,
        EVENT_POSTFIX = "DesignerItem",
        HOVER_CLASS = "hover",
        SELECTABLE_CLASS = "selectable";

    DesignerItem = function (objId, canvas) {
        this.id = objId;
        this.canvas = canvas;

        this.__initialize();

        this.logger = logManager.create("DesignerItem_" + this.id);
        this.logger.debug("Created");
    };

    DesignerItem.prototype.__initialize = function () {
        this._decoratorInstance = null;
        this._decoratorClass = null;

        this._decoratorID = "";

        this.selected = false;
        this.selectedInMultiSelection = false;

        //location and dimension information
        this.positionX = 0;
        this.positionY = 0;

        this.width = 0;
        this.height = 0;

        this._initializeUI();
    };

    DesignerItem.prototype.__setDecorator = function (decoratorName, decoratorClass, control, metaInfo) {
        if (decoratorClass === undefined) {
            //the required decorator is not available
            metaInfo = metaInfo || {};
            metaInfo["__missingdecorator__"] = decoratorName;
            decoratorClass = ErrorDecorator;
        }
        if (this._decoratorID !== decoratorClass.prototype.DECORATORID) {

            if (this._decoratorInstance) {
                //destroy old decorator
                this._callDecoratorMethod("destroy");
                this.$el.empty();
            }

            this._decoratorID = decoratorClass.prototype.DECORATORID;

            this._decoratorClass = decoratorClass;

            this._decoratorInstance = new decoratorClass({'host': this});
            this._decoratorInstance.setControl(control);
            this._decoratorInstance.setMetaInfo(metaInfo);
        }
    };

    DesignerItem.prototype.$_DOMBase = $('<div/>').attr({ "class": DiagramDesignerWidgetConstants.DESIGNER_ITEM_CLASS });

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
                                        "preventDefault": true,
                                        "enabledInReadOnlyMode": true},
                        "mouseleave": { "fn": "onMouseLeave",
                                        "stopPropagation": true,
                                        "preventDefault": true,
                                        "enabledInReadOnlyMode": true},
                        "dblclick": { "fn": "onDoubleClick",
                                        "stopPropagation": true,
                                        "preventDefault": true,
                                        "enabledInReadOnlyMode": true}};

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.on( i + '.' + EVENT_POSTFIX, null, null, function (event) {
                    var eventHandlerOpts = self._events[event.type],
                        handled = false,
                        enabled = true;

                    if (eventHandlerOpts) {
                        if (self.canvas.mode === self.canvas.OPERATING_MODES.READ_ONLY) {
                            enabled = eventHandlerOpts.enabledInReadOnlyMode;
                        }

                        if (enabled) {
                            //call decorators event handler first
                            handled = self._callDecoratorMethod(eventHandlerOpts.fn, event);

                            if (handled !== true) {
                                handled = self[eventHandlerOpts.fn].call(self, event);
                            }

                            //if still not marked as handled
                            if (handled !== true) {
                                //finally marked handled if needed
                                if (eventHandlerOpts.stopPropagation === true) {
                                    event.stopPropagation();
                                }

                                if (eventHandlerOpts.preventDefault === true) {
                                    event.preventDefault();
                                }
                            }
                        }
                    }
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

    DesignerItem.prototype.addToDocFragment = function (docFragment) {
        this._callDecoratorMethod("on_addTo");

        this.$el.html(this._decoratorInstance.$el);

        docFragment.appendChild( this.$el[0] );

        this.logger.debug("DesignerItem with id:'" + this.id + "' added to canvas.");
    };

    DesignerItem.prototype.renderGetLayoutInfo = function () {
        this._callDecoratorMethod("onRenderGetLayoutInfo");
    };

    DesignerItem.prototype.renderSetLayoutInfo = function () {
        this._callDecoratorMethod("onRenderSetLayoutInfo");
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

        //destroy old decorator
        this._callDecoratorMethod("destroy");

        this._remove();

        this.logger.debug("Destroyed");
    };

    DesignerItem.prototype.getBoundingBox = function () {
        return {"x": this.positionX,
                "y": this.positionY,
                "width": this.width,
                "height": this.height,
                "x2": this.positionX + this.width,
                "y2":  this.positionY + this.height};
    };

    DesignerItem.prototype.onMouseEnter = function (/*event*/) {
        var classes = [];

        this.logger.debug("onMouseEnter: " + this.id);

        //add few classes by default
        classes.push(HOVER_CLASS);
        classes.push(SELECTABLE_CLASS);

        this.$el.addClass(classes.join(' '));

        //in edit mode and when not participating in a multiple selection,
        //show connectors
        if (this.canvas.mode === this.canvas.OPERATING_MODES.NORMAL ||
            this.canvas.mode === this.canvas.OPERATING_MODES.CREATE_CONNECTION ||
            this.canvas.mode === this.canvas.OPERATING_MODES.RECONNECT_CONNECTION) {

            if (this.selectedInMultiSelection === false) {
                this.showConnectors();
            }
        }

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    DesignerItem.prototype.onMouseLeave = function (/*event*/) {
        var classes = [HOVER_CLASS, SELECTABLE_CLASS];

        this.logger.debug("onMouseLeave: " + this.id);

        this.$el.removeClass(classes.join(' '));

        this.hideConnectors();

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    DesignerItem.prototype.onDoubleClick = function (event) {
        this.canvas.onDesignerItemDoubleClick(this.id, event);
    };

    DesignerItem.prototype.onSelect = function (multiSelection) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;
        this.$el.addClass("selected");

        //when selected, no connectors are available
        if (multiSelection === true) {
            this.hideConnectors();
        }

        //let the decorator know that this item became selected
        this._callDecoratorMethod("onSelect");
    };

    DesignerItem.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;
        this.$el.removeClass("selected");

        //let the decorator know that this item became deselected
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
        //check what might have changed
        //update position
        if (objDescriptor.position && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
            this.moveTo(objDescriptor.position.x, objDescriptor.position.y);
        }

        //update decorator if needed
        if (objDescriptor.decoratorClass && this._decoratorID !== objDescriptor.decoratorClass.prototype.DECORATORID) {

            this.logger.debug("decorator update: '" + this._decoratorID + "' --> '" + objDescriptor.decoratorClass.prototype.DECORATORID + "'...");

            var oldControl = this._decoratorInstance.getControl();
            var oldMetaInfo = this._decoratorInstance.getMetaInfo();

            this.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, oldControl, oldMetaInfo);

            //attach new one
            this.$el.html(this._decoratorInstance.$el);

            this.logger.debug("DesignerItem's ['" + this.id + "'] decorator  has been updated.");

            this._callDecoratorMethod("on_addTo");
        } else {
            //if decorator instance not changed
            //let the decorator instance know about the update
            this._decoratorInstance.update();
        }
    };

    DesignerItem.prototype.getConnectionAreas = function (id) {
        return this._decoratorInstance.getConnectionAreas(id);
    };

    DesignerItem.prototype.moveTo = function (posX, posY) {
        var positionChanged = false;
        //check what might have changed

        //location and dimension information
        if (this.positionX !== posX) {
            this.positionX = posX;
            positionChanged = true;
        }

        if (this.positionY !== posY) {
            this.positionY = posY;
            positionChanged = true;
        }

        if (positionChanged) {
            this.$el.css({"left": this.positionX,
                "top": this.positionY });

            this.canvas.dispatchEvent(this.canvas.events.ITEM_POSITION_CHANGED, {"ID": this.id,
                                                                                 "x": this.positionX,
                                                                                 "y": this.positionY});
        }
    };

    /*DesignerItem.prototype.moveBy = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);
    };*/

    /************ SUBCOMPONENT HANDLING *****************/
    DesignerItem.prototype.registerSubcomponent = function (subComponentId, metaInfo) {
        this.logger.debug("registerSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.registerSubcomponent(this.id, subComponentId, metaInfo);
    };

    DesignerItem.prototype.unregisterSubcomponent = function (subComponentId) {
        this.logger.debug("unregisterSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.unregisterSubcomponent(this.id, subComponentId);
    };

    DesignerItem.prototype.registerConnectors = function (el, subComponentId) {
        el.attr(DiagramDesignerWidgetConstants.DATA_ITEM_ID, this.id);
        if (subComponentId !== undefined && subComponentId !== null) {
            el.attr(DiagramDesignerWidgetConstants.DATA_SUBCOMPONENT_ID, subComponentId);
        }
    };

    DesignerItem.prototype.updateSubcomponent = function (subComponentId) {
        //let the decorator instance know about the update
        this._decoratorInstance.updateSubcomponent(subComponentId);
    };

    /****** READ-ONLY HANDLER ************/
    DesignerItem.prototype.readOnlyMode = function (readOnly) {
        this._decoratorInstance.readOnlyMode(readOnly);
    };

    return DesignerItem;
});