"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'nodeAttributeNames',
    'nodeRegistryNames',
    './ComponentBase.js',
    './SimpleModelDecorator.js'], function (logManager,
                                         util,
                                         commonUtil,
                                         nodeAttributeNames,
                                         nodeRegistryNames,
                                         ComponentBase) {

    var ModelEditorModelComponent;

    ModelEditorModelComponent = function (objDescriptor) {
        $.extend(this, new ComponentBase(objDescriptor.id, objDescriptor.kind));

        this._logger = logManager.create("ModelEditorModelComponent_" + this.getId());
        this._logger.debug("Created");

        this.parentComponent = objDescriptor.modelEditorView;

        /*
         * OVERRIDE COMPONENTBASE MEMBERS
         */
        this.onDestroy = function () {
            this._onDestroy();
        };

        this.render = function () {
            this._render();
        };

        /*
         * END OVERRIDE COMPONENTBASE MEMBERS
         */

        this._initialize(objDescriptor);
    };

    ModelEditorModelComponent.prototype._onDestroy = function () {
        //remove extra connection rectangle from DOM
        this._skinParts.connectionRect.remove();

        if (this._decoratorInstance) {
            this._decoratorInstance.destroy();
        }

        this._logger.debug("onDestroy");
    };

    ModelEditorModelComponent.prototype._initialize = function (objDescriptor) {
        /*MODELEDITORCOMPONENT CONSTANTS*/

        this._zIndex = 10;
        this._connectionRectProps = { "width" : 10,
                                        "color": "rgba(255,0,0,0.2)"}; //TODO: remove color if not needed anymore

        /*ENDOF - MODELEDITORCOMPONENT CONSTANTS*/

        /*instance variables*/
        this._decoratorInstance = null;

        //generate skin controls
        this.el.addClass("model");

        this.el.css({"z-index": this._zIndex,
                        "position": "absolute" });

        //position self on parent canvas
        this._setPosition(objDescriptor.position.x, objDescriptor.position.y);

        objDescriptor.ownerComponent = this;

        this._initializeDecorator(objDescriptor);
    };

    ModelEditorModelComponent.prototype._initializeDecorator = function (objDescriptor) {
        var decoratorName = objDescriptor.decorator,
            self = this;

        if (_.isString(decoratorName)) {
            //TODO: delete
            //decoratorName = "SimpleModelDecorator";
            decoratorName = "ModelWithPortsDecorator";
            //TODO: enddelete
            decoratorName = './js/ModelEditor/HTML/' + decoratorName + '.js';

            require([ decoratorName ],
                function (DecoratorClass) {
                    self._decoratorInstance = new DecoratorClass(objDescriptor);
                });
        } else {
            this._logger.error("Invalid decorator name '" + decoratorName + "'");
        }
    };

    ModelEditorModelComponent.prototype._render = function () {
        var self = this;

        if (this._decoratorInstance === null) {
            setTimeout(function () {
                self._render();
            }, 100);
        } else {
            this._initializeModelUI();
            this._decoratorInstance.render();
        }
    };

    ModelEditorModelComponent.prototype._initializeModelUI = function () {
        var self = this,
            selfId = this.getId();

        //create a thin edge around it that can be used to initiate connection drawing
        this._skinParts.connectionRect = $('<div/>', {
            "id": "connectionRect_" + this.getId()
        });
        this._skinParts.connectionRect.css({"z-index": this._zIndex - 1,
                                            "cursor": "crosshair" });

        if (this._connectionRectProps.color) {
            this._skinParts.connectionRect.css({ "backgroundColor": this._connectionRectProps.color });
        }

        this._skinParts.connectionRect.insertBefore(this.el);

        this._skinParts.connectionRect.draggable({
            helper: function () {
                return $("<div class='draw-connection-drag-helper'></div>").data("sourceId", selfId);
            },
            scroll: true,
            cursor: 'crosshair',
            cursorAt: { left: 0,
                        top: 0 },
            start: function (event) {
                self._skinParts.connectionRect.addClass("connection-source");
                self.parentComponent.startDrawConnection(selfId);
                event.stopPropagation();
            },
            stop: function (event) {
                self._skinParts.connectionRect.removeClass("connection-source");
                self.parentComponent.endDrawConnection();
                event.stopPropagation();
            },
            drag: function (event) {
                self.parentComponent.onDrawConnection(event);
            }
        });

        this._skinParts.connectionRect.bind("mousedown", function (event) {
            event.stopPropagation();
        });

        //make the whole parent container to be able to accept connection end drop
        this.el.droppable({
            accept: ".connection-source",
            hoverClass: "connection-end-state-hover",
            drop: function (event, ui) {
                var data = $.extend(true, {}, ui.helper.data());
                data.targetId = selfId;

                ui.helper.data("dropHandled", true);

                self.parentComponent.createConnection(data);
                event.stopPropagation();
            }
        });

        this._repositionConnectionRect();

        //hook up mousedown
        this.el.bind('mousedown', function (event) {
            self._onMouseDown(event);
        });

        this.el.bind('mouseup', function (event) {
            self._onMouseUp(event);
        });
    };

    ModelEditorModelComponent.prototype._onMouseDown = function (event) {
        this.parentComponent.onComponentMouseDown(event, this.getId());
        event.stopPropagation();
        event.preventDefault();
    };

    ModelEditorModelComponent.prototype._onMouseUp = function (event) {
        this.parentComponent.onComponentMouseUp(event, this.getId());
//        event.stopPropagation();
    };

    ModelEditorModelComponent.prototype.decoratorUpdated = function () {
        this._repositionConnectionRect();
        this._notifyParentAboutBBoxChange();
    };

    ModelEditorModelComponent.prototype._setPosition = function (pX, pY) {
        //if position is different than the given one
        this.el.css({   "left": pX,
            "top": pY });

        //fix the connection rect around it
        this._repositionConnectionRect();
    };

    ModelEditorModelComponent.prototype.setPosition = function (pX, pY) {
        this._setPosition(pX, pY);
    };

    ModelEditorModelComponent.prototype._repositionConnectionRect = function () {
        var bBox = this.getBoundingBox();

        if (this._skinParts.connectionRect) {
            this._skinParts.connectionRect.css({
                "position": "absolute",
                "left": bBox.x - this._connectionRectProps.width,
                "top": bBox.y - this._connectionRectProps.width,
                "width": bBox.width + this._connectionRectProps.width * 2,
                "height": bBox.height + this._connectionRectProps.width * 2
            });
        }
    };

    ModelEditorModelComponent.prototype.getConnectionPoints = function () {
        var bBox = this.getBoundingBox(),
            result = [];

        if (this._decoratorInstance) {
            if ($.isFunction(this._decoratorInstance.getConnectionPoints)) {
                return this._decoratorInstance.getConnectionPoints();
            }
        }

        result.push({ "dir": "S", x: bBox.x + bBox.width / 2, y: bBox.y + bBox.height});
        result.push({ "dir": "N", x:  bBox.x + bBox.width / 2, y: bBox.y});
        result.push({ "dir": "E", x: bBox.x + bBox.width, y: bBox.y + bBox.height / 2});
        result.push({ "dir": "W", x: bBox.x, y: bBox.y + bBox.height / 2});

        return result;
    };

    ModelEditorModelComponent.prototype._notifyParentAboutBBoxChange = function () {
        if (this.parentComponent) {
            this.parentComponent.childBBoxChanged.call(this.parentComponent, this.getId());
        }
    };

    ModelEditorModelComponent.prototype.onSelect = function () {
        this.el.addClass("selected");
    };

    ModelEditorModelComponent.prototype.onDeselect = function () {
        this.el.removeClass("selected");
    };

    ModelEditorModelComponent.prototype.update = function (objDescriptor) {
        this._setPosition(objDescriptor.position.x, objDescriptor.position.y);

        if (this._decoratorInstance) {
            this._decoratorInstance.update();
        }

        this._notifyParentAboutBBoxChange();
    };

    ModelEditorModelComponent.prototype.getConnectionPointsById = function (sourceId) {
        var result = [],
            i,
            bBox = this.getBoundingBox();

        if (this._decoratorInstance) {
            result = this._decoratorInstance.getConnectionPointsById(sourceId);

            for (i = 0; i < result.length; i += 1) {
                result[i].x += bBox.x;
                result[i].y += bBox.y;
            }
        }

        return result;
    };

    ModelEditorModelComponent.prototype.registerSubcomponents = function (subComponentIds) {
        var list = {},
            i;

        for (i = 0; i < subComponentIds.length; i += 1) {
            list[subComponentIds[i]] = this.getId();
        }

        this.parentComponent.registerSubcomponents(list);
    };

    ModelEditorModelComponent.prototype.unregisterSubcomponents = function (subComponentIds) {
        var list = {},
            i;

        for (i = 0; i < subComponentIds.length; i += 1) {
            list[subComponentIds[i]] = this.getId();
        }

        this.parentComponent.unregisterSubcomponents(list);
    };

    return ModelEditorModelComponent;
});