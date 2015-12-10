/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    './DiagramDesignerWidget.Constants',
    './ErrorDecorator'
], function (Logger, DiagramDesignerWidgetConstants, ErrorDecorator) {

    'use strict';

    var DesignerItem,
        EVENT_POSTFIX = 'DesignerItem',
        HOVER_CLASS = 'hover',
        SELECTABLE_CLASS = 'selectable';

    DesignerItem = function (objId, canvas) {
        this.id = objId;
        this.canvas = canvas;

        this.__initialize();
        this.logger = Logger.create('gme:Widgets:DiagramDesigner:DesignerItem_' + this.id,
            WebGMEGlobal.gmeConfig.client.log);
        this.logger.debug('Created');
    };

    DesignerItem.prototype.__initialize = function () {
        this._decoratorInstance = null;
        this._decoratorClass = null;

        this._decoratorID = '';

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

    DesignerItem.prototype.__setDecorator = function (decoratorName, DecoratorClass, control, metaInfo,
                                                      preferencesHelper, aspect, decoratorParams) {
        if (DecoratorClass === undefined) {
            //the required decorator is not available
            metaInfo = metaInfo || {};
            metaInfo.__missingdecorator__ = decoratorName;
            DecoratorClass = ErrorDecorator;
        }
        if (this._decoratorID !== DecoratorClass.prototype.DECORATORID) {

            if (this._decoratorInstance) {
                //destroy old decorator
                this._callDecoratorMethod('destroy');
                this.$el.empty();
            }

            this._decoratorID = DecoratorClass.prototype.DECORATORID;

            this._decoratorClass = DecoratorClass;

            this._decoratorInstance = new DecoratorClass({
                'host': this,
                'preferencesHelper': preferencesHelper,
                'aspect': aspect,
                'decoratorParams': decoratorParams
            });
            this._decoratorInstance.setControl(control);
            this._decoratorInstance.setMetaInfo(metaInfo);
        }
    };

    //jshint camelcase: false
    DesignerItem.prototype.$_DOMBase = $('<div/>').attr({class: DiagramDesignerWidgetConstants.DESIGNER_ITEM_CLASS});

    DesignerItem.prototype._initializeUI = function () {
        //generate skin DOM and cache it
        this.$el = this.$_DOMBase.clone();

        //set additional CSS properties
        this.$el.attr({id: this.id});

        this.$el.css({
            position: 'absolute',
            left: this.positionX,
            top: this.positionY
        });

        this._attachUserInteractions();

        this.canvas._makeDraggable(this);
    };
    //jshint camelcase: true

    DesignerItem.prototype._attachUserInteractions = function () {
        var i,
            self = this;

        this._events = {
            mouseenter: {
                fn: 'onMouseEnter',
                stopPropagation: true,
                preventDefault: true,
                enabledInReadOnlyMode: true
            },
            mouseleave: {
                fn: 'onMouseLeave',
                stopPropagation: true,
                preventDefault: true,
                enabledInReadOnlyMode: true
            },
            dblclick: {
                fn: 'onDoubleClick',
                stopPropagation: true,
                preventDefault: true,
                enabledInReadOnlyMode: true
            }
        };

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.on(i + '.' + EVENT_POSTFIX, null, null, function (event) {
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
                }); // FIXME
            }
        }
    };

    DesignerItem.prototype._detachUserInteractions = function () {
        var i;

        for (i in this._events) {
            if (this._events.hasOwnProperty(i)) {
                this.$el.off(i + '.' + EVENT_POSTFIX);
            }
        }
    };

    DesignerItem.prototype.addToDocFragment = function (docFragment) {
        this._callDecoratorMethod('on_addTo');

        this.$el.append(this._decoratorInstance.$el);

        docFragment.appendChild(this.$el[0]);

        this.logger.debug('DesignerItem with id:"' + this.id + '" added to canvas.');
    };

    DesignerItem.prototype.renderGetLayoutInfo = function () {
        this._callDecoratorMethod('onRenderGetLayoutInfo');
    };

    DesignerItem.prototype.renderSetLayoutInfo = function () {
        this._callDecoratorMethod('onRenderSetLayoutInfo');
    };

    DesignerItem.prototype._remove = function () {
        this._containerElement = null;
        this.$el.remove();
        this.$el.empty();
        this._detachUserInteractions();
        this.$el = null;
    };

    DesignerItem.prototype.destroy = function () {
        this._destroying = true;

        this.canvas._destroyDraggable(this);

        //destroy old decorator
        this._callDecoratorMethod('destroy');

        //unregister all subcomponents
        this.canvas.unregisterAllSubcomponents(this.id);

        this._remove();

        this.logger.debug('Destroyed');
    };

    DesignerItem.prototype.getBoundingBox = function () {
        var bBox = {
            x: this.positionX,
            y: this.positionY,
            width: this._width,
            height: this._height,
            x2: this.positionX + this._width,
            y2: this.positionY + this._height
        };

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


    DesignerItem.prototype.onMouseEnter = function (/*event*/) {
        var classes = [];

        this.logger.debug('onMouseEnter: ' + this.id);

        //add few classes by default
        classes.push(HOVER_CLASS);
        classes.push(SELECTABLE_CLASS);

        this.$el.addClass(classes.join(' '));

        //in edit mode and when not participating in a multiple selection,
        //show source connectors
        //NOTE: show only if there is no connection draw in progress
        if (this.canvas.mode === this.canvas.OPERATING_MODES.DESIGN &&
            this.canvas.connectionDrawingManager.isDrawInProgress() === false) {
            if (this.selectedInMultiSelection === false) {
                this.showSourceConnectors();
            }
        }

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    DesignerItem.prototype.onMouseLeave = function (/*event*/) {
        var classes = [HOVER_CLASS, SELECTABLE_CLASS];

        this.logger.debug('onMouseLeave: ' + this.id);

        this.$el.removeClass(classes.join(' '));
        if (this.canvas.connectionDrawingManager.isDrawInProgress() !== true) {
            this.hideSourceConnectors();
        }

        //sign we need the default preventDefault and stopPropagation to be executed
        return false;
    };

    DesignerItem.prototype.onDoubleClick = function (event) {
        this.canvas.onDesignerItemDoubleClick(this.id, event);
    };

    DesignerItem.prototype.onSelect = function (multiSelection, callback) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;
        this.$el.addClass('selected');

        //when selected, no connectors are available
        if (multiSelection === true) {
            this.hideSourceConnectors();
        }

        //let the decorator know that this item became selected
        this._callDecoratorMethod('onSelect');
        callback(this);
    };

    DesignerItem.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;
        this.$el.removeClass('selected');

        //let the decorator know that this item became deselected
        this._callDecoratorMethod('onDeselect');
    };

    DesignerItem.prototype._callDecoratorMethod = function (fnName, args) {
        var result = null;

        if (this._decoratorInstance) {
            if (_.isFunction(this._decoratorInstance[fnName])) {
                result = this._decoratorInstance[fnName].apply(this._decoratorInstance, args);
            } else {
                this.logger.warn('DecoratorInstance "' + $.type(this._decoratorInstance) +
                '" does not have a method with name "' + fnName + '"...');
            }
        } else {
            this.logger.error('DecoratorInstance does not exist...');
        }

        return result;
    };

    DesignerItem.prototype.update = function (objDescriptor) {
        //check what might have changed
        //update position
        if (objDescriptor.position && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
            this.moveTo(objDescriptor.position.x, objDescriptor.position.y);
        }

        //update rotation
        if (_.isNumber(objDescriptor.rotation)) {
            this.rotateTo(objDescriptor.rotation);
        }

        //update decorator if needed
        if (objDescriptor.decoratorClass && this._decoratorID !== objDescriptor.decoratorClass.prototype.DECORATORID) {

            this.logger.debug('decorator update: "' + this._decoratorID + '" --> "' +
            objDescriptor.decoratorClass.prototype.DECORATORID + '"...');

            var oldControl = this._decoratorInstance.getControl();
            var oldMetaInfo = this._decoratorInstance.getMetaInfo();

            this.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, oldControl, oldMetaInfo,
                objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);

            //attach new one
            this.$el.html(this._decoratorInstance.$el);

            this.logger.debug('DesignerItem\'s ["' + this.id + '"] decorator  has been updated.');

            this._callDecoratorMethod('on_addTo');
        } else {
            //if decorator instance not changed
            //let the decorator instance know about the update
            if (objDescriptor.metaInfo) {
                this._decoratorInstance.setMetaInfo(objDescriptor.metaInfo);
            }
            this._decoratorInstance.update();
        }
    };

    DesignerItem.prototype.getConnectionAreas = function (id, isEnd, connectionMetaInfo) {
        var result = [],
            areas = this._decoratorInstance.getConnectionAreas(id, isEnd, connectionMetaInfo),
            disabledAreas = this._decoratorInstance._getDisabledConnectionAreas(),
            i = areas.length,
            rotatedXY,
            cArea,
            areaOK;

        while (i--) {
            cArea = areas[i];

            areaOK = true;

            if (id === undefined ||
                id === null ||
                id === this.id) {
                areaOK = disabledAreas.indexOf(cArea.id) === -1;
            }

            if (areaOK) {
                if (this.rotation === 0) {
                    cArea.x1 += this.positionX;
                    cArea.y1 += this.positionY;
                    cArea.x2 += this.positionX;
                    cArea.y2 += this.positionY;
                } else {
                    rotatedXY = this._rotatePoint(cArea.x1, cArea.y1);
                    cArea.x1 = rotatedXY.x + this.positionX;
                    cArea.y1 = rotatedXY.y + this.positionY;

                    rotatedXY = this._rotatePoint(cArea.x2, cArea.y2);
                    cArea.x2 = rotatedXY.x + this.positionX;
                    cArea.y2 = rotatedXY.y + this.positionY;

                    cArea.angle1 = (cArea.angle1 + this.rotation) % 360;
                    cArea.angle2 = (cArea.angle2 + this.rotation) % 360;
                }

                result.push(cArea);
            }
        }

        return result;
    };

    DesignerItem.prototype.moveTo = function (posX, posY) {
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
                this.$el.css({
                    left: this.positionX,
                    top: this.positionY
                });

                this.canvas.dispatchEvent(this.canvas.events.ITEM_POSITION_CHANGED, {
                    ID: this.id,
                    x: this.positionX,
                    y: this.positionY
                });
            }
        }
    };

    /*DesignerItem.prototype.moveBy = function (dX, dY) {
     this.moveTo(this.positionX + dX, this.positionY + dY);
     };*/


    /************ SUBCOMPONENT HANDLING *****************/
    DesignerItem.prototype.registerSubcomponent = function (subComponentId, metaInfo) {
        this.logger.debug('registerSubcomponent - ID: "' + this.id + '", SubComponentID: "' + subComponentId + '"');
        this.canvas.registerSubcomponent(this.id, subComponentId, metaInfo);
    };

    DesignerItem.prototype.unregisterSubcomponent = function (subComponentId) {
        this.logger.debug('unregisterSubcomponent - ID: "' + this.id + '", SubComponentID: "' + subComponentId + '"');
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

    /*********************** CONNECTION END CONNECTOR HIGHLIGHT ************************/

    DesignerItem.prototype.showSourceConnectors = function (params) {
        if (this.canvas._enableConnectionDrawing === true) {
            this._decoratorInstance.showSourceConnectors(params);
        }
    };

    DesignerItem.prototype.hideSourceConnectors = function () {
        this._decoratorInstance.hideSourceConnectors();
    };

    DesignerItem.prototype.showEndConnectors = function (params) {
        if (this.canvas._enableConnectionDrawing === true) {
            this._decoratorInstance.showEndConnectors(params);
        }
    };

    DesignerItem.prototype.hideEndConnectors = function () {
        this._decoratorInstance.hideEndConnectors();
    };

    /******************** HIGHLIGHT / UNHIGHLIGHT MODE *********************/
    DesignerItem.prototype.highlight = function () {
        this.$el.addClass(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
    };

    DesignerItem.prototype.unHighlight = function () {
        this.$el.removeClass(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
    };

    /******************* ROTATION ***********************/
    DesignerItem.prototype.rotateTo = function (degree) {
        if (_.isNumber(degree)) {
            if (this.rotation !== degree) {
                this.rotation = degree;

                this.$el.css({
                    'transform-origin': '50% 50%',
                    'transform': 'rotate(' + this.rotation + 'deg)'
                });

                this.canvas.dispatchEvent(this.canvas.events.ITEM_ROTATION_CHANGED, {
                    ID: this.id,
                    deg: this.rotation
                });
            }
        }
    };

    DesignerItem.prototype._rotatePoint = function (x, y) {
        var fixedRotation = (this.rotation < 0 ? 360 + this.rotation : this.rotation) % 360;
        var angle = fixedRotation * (Math.PI / 180);

        var s = Math.sin(angle);
        var c = Math.cos(angle);

        var fx = x - this._width / 2;
        var fy = y - this._height / 2;

        var rx = fx * c - fy * s;
        var ry = fx * s + fy * c;

        return {
            x: rx + this._width / 2,
            y: ry + this._height / 2
        };
    };

    DesignerItem.prototype.doSearch = function (searchDesc) {
        return this._decoratorInstance.doSearch(searchDesc);
    };

    DesignerItem.prototype.getDrawnConnectionVisualStyle = function (sCompId) {
        return this._decoratorInstance.getDrawnConnectionVisualStyle(sCompId);
    };

    DesignerItem.prototype.onItemComponentEvents = function (eventList) {
        this._decoratorInstance.notifyComponentEvent(eventList);
    };

    DesignerItem.prototype.getWidth = function () {
        return this._width;
    };

    DesignerItem.prototype.getHeight = function () {
        return this._height;
    };

    DesignerItem.prototype.setSize = function (w, h) {
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
                this.canvas.dispatchEvent(this.canvas.events.ITEM_SIZE_CHANGED, {
                    ID: this.id,
                    w: this._width,
                    h: this._height
                });
            }
        }
    };

    return DesignerItem;
});
