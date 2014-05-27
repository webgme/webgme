/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define(['logManager',
    './SnapEditorWidget.Constants',
    './ErrorDecorator'], function (logManager,
                                   SnapEditorWidgetConstants,
                                   ErrorDecorator) {

    var ClickableItem,
        EVENT_POSTFIX = "ClickableItem",
        HOVER_CLASS = "hover",
        SELECTABLE_CLASS = "selectable";

    ClickableItem = function (objId, canvas) {
        this.id = objId;
        this.canvas = canvas;

        this.__initialize();

        this.logger = logManager.create("ClickableItem_" + this.id);
        this.logger.debug("Created");
    };

    ClickableItem.prototype.__initialize = function () {
        this._decoratorInstance = null;
        this._decoratorClass = null;

        this._decoratorID = "";

        this.selected = false;
        this.selectedInMultiSelection = false;

        //location and dimension information
        this.positionX = 0;
        this.positionY = 0;
        this.rotation = 0;

        this._width = 0;
        this._height = 0;

        this._initializeUI();
    };

    ClickableItem.prototype.__setDecorator = function (decoratorName, decoratorClass, control, metaInfo, preferencesHelper, aspect, decoratorParams) {
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

            this._decoratorInstance = new decoratorClass({'host': this,
                                                          'preferencesHelper': preferencesHelper,
                                                          'aspect': aspect,
                                                          'decoratorParams': decoratorParams});
            this._decoratorInstance.setControl(control);
            this._decoratorInstance.setMetaInfo(metaInfo);
        }
    };

    ClickableItem.prototype.$_DOMBase = $('<div/>').attr({ "class": SnapEditorWidgetConstants.DESIGNER_ITEM_CLASS });

    ClickableItem.prototype._initializeUI = function () {
        //generate skin DOM and cache it
        this.$el = this.$_DOMBase.clone();

        //set additional CSS properties
        this.$el.attr({"id": this.id});

        this.$el.css({ "position": "absolute",
            "left": this.positionX,
            "top": this.positionY });

        this._attachUserInteractions();

        this.canvas._makeDraggable(this);
    };

    ClickableItem.prototype._attachUserInteractions = function () {
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

                    if (self.canvas.mode !== self.canvas.OPERATING_MODES.READ_ONLY &&
                        self.canvas.mode !== self.canvas.OPERATING_MODES.DESIGN) {
                        return;
                    }

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

    ClickableItem.prototype._detachUserInteractions = function () {
        var i;

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.off( i + '.' + EVENT_POSTFIX);
            }
        }
    };

    ClickableItem.prototype.addToDocFragment = function (docFragment) {
        this._callDecoratorMethod("on_addTo");

        this.$el.append(this._decoratorInstance.$el);

        docFragment.appendChild( this.$el[0] );

        this.logger.debug("ClickableItem with id:'" + this.id + "' added to canvas.");
    };

    ClickableItem.prototype.renderGetLayoutInfo = function () {
        this._callDecoratorMethod("onRenderGetLayoutInfo");
    };

    ClickableItem.prototype.renderSetLayoutInfo = function () {
        this._callDecoratorMethod("onRenderSetLayoutInfo");
    };

    ClickableItem.prototype._remove = function() {
        this._containerElement = null;
        this.$el.remove();
        this.$el.empty();
        this._detachUserInteractions();
        this.$el = null;
    };

    ClickableItem.prototype.destroy = function () {
        this._destroying = true;

        this.canvas._destroyDraggable(this);

        //destroy old decorator
        this._callDecoratorMethod("destroy");

        this._remove();

        this.logger.debug("Destroyed");
    };

    ClickableItem.prototype.getBoundingBox = function () {
        var bBox = {"x": this.positionX,
                "y": this.positionY,
                "width": this._width,
                "height": this._height,
                "x2": this.positionX + this._width,
                "y2":  this.positionY + this._height};

        if (this.rotation !== 0) {
            var topLeft = this._rotatePoint(0, 0);
            var topRight = this._rotatePoint(this._width, 0);
            var bottomLeft = this._rotatePoint(0, this._height);
            var bottomRight = this._rotatePoint(this._width, this._height);

            var x = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
            var x2 = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
            var y = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
            var y2 = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

            bBox.x = this.positionX + x;
            bBox.y = this.positionY + y;
            bBox.x2 = this.positionX + x2;
            bBox.y2 = this.positionY + y2;
            bBox.width = bBox.x2 - bBox.x;
            bBox.height = bBox.y2 - bBox.y;
        }

        return bBox;
    };


    ClickableItem.prototype.onMouseEnter = function (/*event*/) {
        var classes = [];

        this.logger.debug("onMouseEnter: " + this.id);

        //add few classes by default
        classes.push(HOVER_CLASS);
        classes.push(SELECTABLE_CLASS);

        this.$el.addClass(classes.join(' '));

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    ClickableItem.prototype.onMouseLeave = function (/*event*/) {
        var classes = [HOVER_CLASS, SELECTABLE_CLASS];

        this.logger.debug("onMouseLeave: " + this.id);

        this.$el.removeClass(classes.join(' '));
            //Show Clickable areas?
            //TODO FIXME

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    ClickableItem.prototype.onDoubleClick = function (event) {
        this.canvas.onClickableItemDoubleClick(this.id, event);
    };

    ClickableItem.prototype.onSelect = function (multiSelection) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;
        this.$el.addClass("selected");

        //when selected, no clickable areas are available
        if (multiSelection === true) {
            //this.hideSourceConnectors();
        }

        //let the decorator know that this item became selected
        this._callDecoratorMethod("onSelect");
    };

    ClickableItem.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;
        this.$el.removeClass("selected");

        //let the decorator know that this item became deselected
        this._callDecoratorMethod("onDeselect");
    };

    ClickableItem.prototype._callDecoratorMethod = function (fnName, args) {
        var result = null;

        if (this._decoratorInstance) {
            if (_.isFunction(this._decoratorInstance[fnName])) {
                result = this._decoratorInstance[fnName](args);
            } else {
                this.logger.warning("DecoratorInstance '" + $.type(this._decoratorInstance) + "' does not have a method with name '" + fnName + "'...");
            }
        } else {
            this.logger.error("DecoratorInstance does not exist...");
        }

        return result;
    };

    ClickableItem.prototype.update = function (objDescriptor) {
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

            this.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, oldControl, oldMetaInfo, objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);

            //attach new one
            this.$el.html(this._decoratorInstance.$el);

            this.logger.debug("ClickableItem's ['" + this.id + "'] decorator  has been updated.");

            this._callDecoratorMethod("on_addTo");
        } else {
            //if decorator instance not changed
            //let the decorator instance know about the update
            if (objDescriptor.metaInfo) {
                this._decoratorInstance.setMetaInfo(objDescriptor.metaInfo);
            }
            this._decoratorInstance.update();
        }
    };

    ClickableItem.prototype.getClickableAreas = function (id) {
        var result = [],
            areas = this._decoratorInstance.getClickableAreas(id),
            i = areas.length,
            cArea;

        while (i--) {
            cArea = areas[i];

            if (id === undefined ||
                id === null ||
                id === this.id) {
                    cArea.x1 += this.positionX;
                    cArea.y1 += this.positionY;
                    cArea.x2 += this.positionX;
                    cArea.y2 += this.positionY;

                result.push(cArea);
            }
        }

        return result;
    };

    ClickableItem.prototype.moveTo = function (posX, posY) {
        var positionChanged = false;
        //check what might have changed

        if (_.isNumber(posX) && _.isNumber(posY)) {
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
        }
    };

    /*ClickableItem.prototype.moveBy = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);
    };*/


    /************ SUBCOMPONENT HANDLING *****************/
    ClickableItem.prototype.registerSubcomponent = function (subComponentId, metaInfo) {
        this.logger.debug("registerSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.registerSubcomponent(this.id, subComponentId, metaInfo);
    };

    ClickableItem.prototype.unregisterSubcomponent = function (subComponentId) {
        this.logger.debug("unregisterSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.unregisterSubcomponent(this.id, subComponentId);
    };

    ClickableItem.prototype.registerConnectors = function (el, subComponentId) {
        el.attr(SnapEditorWidgetConstants.DATA_ITEM_ID, this.id);
        if (subComponentId !== undefined && subComponentId !== null) {
            el.attr(SnapEditorWidgetConstants.DATA_SUBCOMPONENT_ID, subComponentId);
        }
    };

    ClickableItem.prototype.updateSubcomponent = function (subComponentId) {
        //let the decorator instance know about the update
        this._decoratorInstance.updateSubcomponent(subComponentId);
    };

    /****** READ-ONLY HANDLER ************/
    ClickableItem.prototype.readOnlyMode = function (readOnly) {
        this._decoratorInstance.readOnlyMode(readOnly);
    };

    /*********************** CONNECTION END CONNECTOR HIGHLIGHT ************************/

    ClickableItem.prototype.showSourceConnectors = function (params) {
        if (this.canvas._enableConnectionDrawing === true) {
            //this._decoratorInstance.showSourceConnectors(params);
            //TODO Change this to be the clickable areas (connection areas)
        }
    };

    ClickableItem.prototype.hideSourceConnectors = function () {
        //this._decoratorInstance.hideSourceConnectors();
        //TODO Change this to be the clickable areas (connection areas)
    };

    ClickableItem.prototype.showEndConnectors = function (params) {
        if (this.canvas._enableConnectionDrawing === true) {
            this._decoratorInstance.showEndConnectors(params);
        }
    };

    ClickableItem.prototype.hideEndConnectors = function () {
        this._decoratorInstance.hideEndConnectors();
    };

    /******************** HIGHLIGHT / UNHIGHLIGHT MODE *********************/
    ClickableItem.prototype.highlight = function () {
        this.$el.addClass(SnapEditorWidgetConstants.ITEM_HIGHLIGHT_CLASS);
    };

    ClickableItem.prototype.unHighlight = function () {
        this.$el.removeClass(SnapEditorWidgetConstants.ITEM_HIGHLIGHT_CLASS);
    };

    ClickableItem.prototype.doSearch = function (searchDesc) {
        return this._decoratorInstance.doSearch(searchDesc);
    };

    ClickableItem.prototype.getDrawnConnectionVisualStyle = function (sCompId) {
        return this._decoratorInstance.getDrawnConnectionVisualStyle(sCompId);
    };

    ClickableItem.prototype.onItemComponentEvents = function (eventList) {
        this._decoratorInstance.notifyComponentEvent(eventList);
    };

    ClickableItem.prototype.getWidth = function () {
        return  this._width;
    };

    ClickableItem.prototype.getHeight = function () {
        return this._height;
    };

    ClickableItem.prototype.setSize = function (w, h) {
        var changed = false;

        if (_.isNumber(w) && _.isNumber(h)) {
            if (this._width !== w) {
                this._width = w;
                changed = true;
            }

            if (this._height !== h) {
                this._height = h;
                changed = true;
            }

            if (changed === true) {
                this.canvas.dispatchEvent(this.canvas.events.ITEM_SIZE_CHANGED, {"ID": this.id,
                    "w": this._width,
                    "h": this._height});
            }
        };
    };

    return ClickableItem;
});
