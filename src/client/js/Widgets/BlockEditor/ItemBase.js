/*globals define,_*/
/*
 * @author brollb / https://github/brollb
 *
 */

define(['common/LogManager',
    './ErrorDecorator'], function (logManager,
                                   ErrorDecorator) {

   "use strict";

    var ItemBase,
        HOVER_CLASS = "hover",
        SELECTABLE_CLASS = "selectable",
        ITEM_CLASS,
        EVENT_POSTFIX;

    ItemBase = function(){
    };

    ItemBase.prototype.initialize = function (name, objId, canvas) {
        EVENT_POSTFIX = "LinkableItem";
        ITEM_CLASS = name;

        this.id = objId;
        this.canvas = canvas;

        //Initialization
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

        //Custom Initialization
        this.__initialize();

        this._initializeUI();

        this.logger = logManager.create(name + "_" + this.id);
        this.logger.debug("Created");
    };

    ItemBase.prototype.__initialize = function(){
        //Override in inherited classes as needed
    };

    //Need to override the following in the main item file
    //ItemBase.prototype.$_DOMBase = $('<div/>').attr({ "class": CONSTANTS.DESIGNER_ITEM_CLASS });

    ItemBase.prototype.__setDecorator = function (decoratorName, DecoratorClass, control, metaInfo, preferencesHelper, aspect, decoratorParams) {
        if (DecoratorClass === undefined) {
            //the required decorator is not available
            metaInfo = metaInfo || {};
            metaInfo.__missingdecorator__ = decoratorName;
            DecoratorClass = ErrorDecorator;
        }
        if (this._decoratorID !== DecoratorClass.prototype.DECORATORID) {

            if (this._decoratorInstance) {
                //destroy old decorator
                this._callDecoratorMethod("destroy");
                this.$el.empty();
            }

            this._decoratorID = DecoratorClass.prototype.DECORATORID;

            this._DecoratorClass = DecoratorClass;

            this._decoratorInstance = new DecoratorClass({'host': this,
                'preferencesHelper': preferencesHelper,
                'aspect': aspect,
                'decoratorParams': decoratorParams});
            this._decoratorInstance.setControl(control);
            this._decoratorInstance.setMetaInfo(metaInfo);
        }
    };

    ItemBase.prototype._initializeUI = function () {
        //generate skin DOM and cache it
        this.$el = this.$_DOMBase.clone();

        //set additional CSS properties
        this.$el.attr({"id": this.id});

        this.$el.css({ "position": "absolute",
            "left": this.positionX,
            "top": this.positionY });

        this._attachUserInteractions();

        if(this.canvas._makeDraggable !== undefined){
            this.canvas._makeDraggable(this);
        }
    };

    ItemBase.prototype._attachUserInteractions = function () {
        var handleEvent,
            self = this,
            i;

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

        handleEvent = function (event){
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
        };

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.on( i + '.' + EVENT_POSTFIX, null, null, handleEvent);
            }
        }
    };

    ItemBase.prototype._detachUserInteractions = function () {
        var i;

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.off( i + '.' + EVENT_POSTFIX);
            }
        }
    };

    ItemBase.prototype.addToDocFragment = function (docFragment) {
        this._callDecoratorMethod("on_addTo");

        this.$el.append(this._decoratorInstance.$el);

        docFragment.appendChild( this.$el[0] );

        this.logger.debug("ItemBase with id:'" + this.id + "' added to canvas.");
    };

    ItemBase.prototype._callDecoratorMethod = function (fnName, args) {
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

    ItemBase.prototype.update = function (objDescriptor) {
        //check what might have changed
        //update position
        if (objDescriptor.position && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
            var dx = objDescriptor.position.x - this.positionX,
                dy = objDescriptor.position.y - this.positionY;

            this.moveBy(dx, dy);
        }

        //update decorator if needed
        if (objDescriptor.decoratorClass && this._decoratorID !== objDescriptor.decoratorClass.prototype.DECORATORID) {

            this.logger.debug("decorator update: '" + this._decoratorID + "' --> '" + objDescriptor.decoratorClass.prototype.DECORATORID + "'...");

            var oldControl = this._decoratorInstance.getControl();
            var oldMetaInfo = this._decoratorInstance.getMetaInfo();

            this.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, oldControl, oldMetaInfo, objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);

            //attach new one
            this.$el.html(this._decoratorInstance.$el);

            this.logger.debug("ItemBase's ['" + this.id + "'] decorator  has been updated.");

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

    ItemBase.prototype.moveTo = function (posX, posY) {
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

    ItemBase.prototype.renderGetLayoutInfo = function () {
        this._callDecoratorMethod("onRenderGetLayoutInfo");
    };

    ItemBase.prototype.renderSetLayoutInfo = function () {
        this._callDecoratorMethod("onRenderSetLayoutInfo");
    };

    ItemBase.prototype._remove = function() {
        this._containerElement = null;
        this.$el.remove();
        this.$el.empty();
        this._detachUserInteractions();
        this.$el = null;
    };

    ItemBase.prototype.destroy = function () {
        this._destroying = true;

        this.canvas._destroyDraggable(this);

        //destroy old decorator
        this._callDecoratorMethod("destroy");

        this._remove();

        this.logger.debug("Destroyed");
    };

    ItemBase.prototype.getBoundingBox = function () {
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

    ItemBase.prototype.onMouseEnter = function (event) {
        var classes = [];

        this.logger.debug("onMouseEnter: " + this.id);

        //add few classes by default
        classes.push(HOVER_CLASS);
        classes.push(SELECTABLE_CLASS);

        this.$el.addClass(classes.join(' '));
        this.onHover(event);

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    ItemBase.prototype.onMouseLeave = function (event) {
        var classes = [HOVER_CLASS, SELECTABLE_CLASS];

        this.logger.debug("onMouseLeave: " + this.id);

        this.$el.removeClass(classes.join(' '));

        this.onUnHover(event);

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    ItemBase.prototype.onDoubleClick = function (event) {
        if (this.canvas.onItemBaseDoubleClick && _.isFunction(this.canvas.onItemBaseDoubleClick)){
            this.canvas.onItemBaseDoubleClick(this.id, event);
        }
    };

    ItemBase.prototype.onSelect = function (multiSelection) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;
        this.$el.addClass("selected");

        //let the decorator know that this item became selected
        this._callDecoratorMethod("onSelect");
    };

    ItemBase.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;
        this.$el.removeClass("selected");

        //let the decorator know that this item became deselected
        this._callDecoratorMethod("onDeselect");
    };

    /****** READ-ONLY HANDLER ************/
    ItemBase.prototype.readOnlyMode = function (readOnly) {
        this._decoratorInstance.readOnlyMode(readOnly);
    };

    ItemBase.prototype.getWidth = function () {
        return this._width;
    };

    ItemBase.prototype.getHeight = function () {
        return this._height;
    };

    ItemBase.prototype.setSize = function (w, h) {
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
        }
    };

    /* * * * * * * FUNCTIONS TO OVERRIDE * * * * * * */

    ItemBase.prototype.onHover = function (event) {
        //OVERRIDE
    };

    ItemBase.prototype.onUnHover = function (event) {
        //OVERRIDE
    };


    return ItemBase;
});
