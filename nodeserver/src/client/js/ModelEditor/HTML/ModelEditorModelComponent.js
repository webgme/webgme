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

        this._unregisterKnownHandles();

        if (this._decoratorInstance) {
            this._decoratorInstance.destroy();
        }

        this._logger.debug("onDestroy");
    };

    ModelEditorModelComponent.prototype._initialize = function (objDescriptor) {
        /*MODELEDITORCOMPONENT CONSTANTS*/

        this._zIndex = 10;

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
        var self = this;

         //hook up mousedown
        this.el.bind('mousedown', function (event) {
            self._onMouseDown(event);
        });

        this.el.bind('mouseup', function (event) {
            self._onMouseUp(event);
        });

        //hook up mousedown
        this.el.bind('dblclick', function (event) {
            self._onDblClick(event);
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

    ModelEditorModelComponent.prototype._onDblClick = function (event) {
        this.parentComponent.onComponentDblClick(this.getId());
        event.stopPropagation();
        event.preventDefault();
    };

    ModelEditorModelComponent.prototype._setPosition = function (pX, pY) {
        //if position is different than the given one
        this.el.css({   "left": pX,
            "top": pY });
    };

    ModelEditorModelComponent.prototype.setPosition = function (pX, pY) {
        this._setPosition(pX, pY);
    };

    /*ModelEditorModelComponent.prototype.getConnectionPoints = function () {
        var bBox = this.getBoundingBox(),
            result = [];

        if (this._decoratorInstance) {
            if ($.isFunction(this._decoratorInstance.getConnectionPoints)) {
                return this._decoratorInstance.getConnectionPoints();
            }
        }

        result.push({ "dir": "S", x: bBox.x + bBox.width / 2, y: bBox.y + bBox.height, connectorLength : 20});
        result.push({ "dir": "N", x:  bBox.x + bBox.width / 2, y: bBox.y, connectorLength : 20});
        result.push({ "dir": "E", x: bBox.x + bBox.width, y: bBox.y + bBox.height / 2, connectorLength : 20});
        result.push({ "dir": "W", x: bBox.x, y: bBox.y + bBox.height / 2, connectorLength : 20});

        return result;
    };*/

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

    /*ModelEditorModelComponent.prototype.getConnectionPointsById = function (sourceId) {
        var result = [],
            i,
            bBox = this.getBoundingBox(),
            myOffset = this.getBoundingBox(true);

        if (this._decoratorInstance) {
            result = this._decoratorInstance.getConnectionPointsById(sourceId);

            for (i = 0; i < result.length; i += 1) {
                //result[i].x += bBox.x;
                //result[i].y += bBox.y;*/

                /*result[i].x = result[i].x - myOffset.x + bBox.x;
                result[i].y = result[i].y - myOffset.y + bBox.y;
            }
        }

        return result;
    };*/

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

    /*
     * AUTOMATICALLY HOOK UP ACTIONS / EVENT HANDLERS FOR KNOWN CLASSES
     */

    ModelEditorModelComponent.prototype.beforeDecoratorUpdate = function () {
        this._unregisterKnownHandles();
    };

    ModelEditorModelComponent.prototype.afterDecoratorUpdate = function () {
        this._registerKnownHandles();
        this._notifyParentAboutBBoxChange();
    };

    ModelEditorModelComponent.prototype._registerKnownHandles = function () {
        var connStartElements = this.el.find(".startConn"),
            connFinishElements = this.el.find(".finishConn"),
            connEndPoints  = this.el.find(".connEndPoint"),
            connEndPointIds = [],
            self = this;

        if (this.el.hasClass("startConn")) {
            connStartElements.push(this.el[0]);
        }

        if (this.el.hasClass("finishConn")) {
            connFinishElements.push(this.el[0]);
        }

        if (this.el.hasClass("connEndPoint")) {
            connEndPoints.push(this.el[0]);
        }

        //register connection-draw start handler
        connStartElements.draggable({
            helper: function () {
                return $("<div class='draw-connection-drag-helper'></div>").data("sourceId", $(this).attr("data-id"));
            },
            scroll: true,
            cursor: 'pointer',
            cursorAt: {
                left: 0,
                top: 0
            },
            start: function (event) {
                $(this).addClass("connection-source");
                self.parentComponent.startDrawConnection($(this).attr("data-id"));
                event.stopPropagation();
            },
            stop: function (event) {
                self.parentComponent.endDrawConnection($(this).attr("data-id"));
                $(this).removeClass("connection-source");
                event.stopPropagation();
            },
            drag: function (event) {
                self.parentComponent.onDrawConnection(event);
            }
        });

        //register connection end accept handler
        connFinishElements.droppable({
            accept: ".connection-source",
            //activeClass: "ui-state-active",
            hoverClass: "connection-end-state-hover",
            greedy: true,
            drop: function (event, ui) {
                var data = $.extend(true, {}, ui.helper.data());
                data.targetId = $(this).attr("data-id");

                ui.helper.data("dropHandled", true);

                self.parentComponent.createConnection(data);
                event.stopPropagation();
            }
        });

        //register connection endpoint areas
        connEndPoints.each(function () {
            var cid = $(this).attr("data-id");
            if (connEndPointIds.indexOf(cid) === -1) {
                connEndPointIds.push(cid);
            }
        });

        this.registerSubcomponents(connEndPointIds);
    };

    ModelEditorModelComponent.prototype._unregisterKnownHandles = function () {
        var connStartElements = this.el.find(".startConn"),
            connFinishElements = this.el.find(".finishConn"),
            connEndPoints  = this.el.find(".connEndPoint"),
            connEndPointIds = [],
            self = this;

        if (this.el.hasClass("startConn")) {
            connStartElements.push(this.el[0]);
        }

        if (this.el.hasClass("finishConn")) {
            connFinishElements.push(this.el[0]);
        }

        if (this.el.hasClass("connEndPoint")) {
            connEndPoints.push(this.el[0]);
        }

        //register connection endpoint areas
        connEndPoints.each(function () {
            var cid = $(this).attr("data-id");
            if (connEndPointIds.indexOf(cid) === -1) {
                connEndPointIds.push(cid);
            }

            if (self._destroying === true) {
                $(this).removeClass("connEndPoint");
            }
        });

        this.unregisterSubcomponents(connEndPointIds);

        //unregister connection-draw start handler
        connStartElements.draggable("destroy");

        //unregister connection end accept handler
        connFinishElements.droppable("destroy");
    };

    /*
     *
     */

    ModelEditorModelComponent.prototype.getClonedEl = function () {
        var clonedEl = this.el.clone().attr("id", this.getId() + "_clone"),
            connStartElements = clonedEl.find(".startConn"),
            connFinishElements = clonedEl.find(".finishConn"),
            connEndPoints  = clonedEl.find(".connEndPoint");

        if (clonedEl.hasClass("startConn")) {
            connStartElements.push(clonedEl[0]);
        }

        if (clonedEl.hasClass("finishConn")) {
            connFinishElements.push(clonedEl[0]);
        }

        if (clonedEl.hasClass("connEndPoint")) {
            connEndPoints.push(clonedEl[0]);
        }

        //register connection endpoint areas
        connEndPoints.each(function () {
            $(this).attr("data-id", "");
            $(this).removeClass("connEndPoint");
        });

        connFinishElements.each(function () {
            $(this).attr("data-id", "");
            $(this).removeClass("finishConn");
        });

        connStartElements.each(function () {
            $(this).attr("data-id", "");
            $(this).removeClass("startConn");
        });

        return clonedEl;
    };

    return ModelEditorModelComponent;
});