"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    './DefaultDecorator.js'], function (logManager,
                                         util,
                                         commonUtil,
                                         DefaultDecorator) {

    var ModelComponent;

    ModelComponent = function (objId) {
        this._guid = objId;

        this._logger = logManager.create("ModelComponent_" + this._guid);
        this._logger.debug("Created");
    };

    ModelComponent.prototype._initialize = function (objDescriptor) {
        /*MODELEDITORCOMPONENT CONSTANTS*/

        this._zIndex = 10;

        this._parentView = objDescriptor.modelEditorView;
        this._name = objDescriptor.name || "";

        /*ENDOF - MODELEDITORCOMPONENT CONSTANTS*/

        /*instance variables*/
        this._decoratorInstance = null;

        this.position = {"x": objDescriptor.position.x,
            "y": objDescriptor.position.y};

        objDescriptor.ownerComponent = this;

        this._initializeDecorator(objDescriptor);
    };

    ModelComponent.prototype._initializeDecorator = function (objDescriptor) {
        var decoratorName = objDescriptor.decorator,
            self = this;

        if (_.isString(decoratorName)) {
            //TODO: delete
            //decoratorName = "ModelWithAttributesDecorator";
            decoratorName = "ModelWithPortsDecorator";
            //TODO: enddelete
            decoratorName = './js/ModelEditor2/' + decoratorName + '.js';

            this._logger.debug("require(['" + decoratorName + "'] - phase1");
            require([ decoratorName ],
                function (DecoratorClass) {
                    self._logger.debug("require(['" + decoratorName + "'] - phase3");
                    self._decoratorDownloaded(objDescriptor, DecoratorClass);
                },
                function (err) {
                    self._logger.error("Failed to load decorator because of '" + err.requireType + "' with module" + err.requireModules[0] + "'. Fallback to DefaultDecorator...");
                    //for any error use the default decorator, does not know anything, just displays a box and writes title
                    self._decoratorDownloaded(objDescriptor, DefaultDecorator);
                });
            this._logger.debug("require(['" + decoratorName + "'] - phase2");
        } else {
            this._logger.error("Invalid decorator name '" + decoratorName + "'");
        }
    };

    ModelComponent.prototype._DOMBase = $('<div/>').attr({ "class": "model" });

    ModelComponent.prototype._decoratorDownloaded = function (objDescriptor, DecoratorClass) {
        var self = this;
        this._decoratorInstance = new DecoratorClass(objDescriptor);

        //generate skin DOM and cache it
        this.el = this._DOMBase.clone();

        //set additional CSS properties
        this.el.attr({"id": this._guid});

        this.el.css({ "z-index": this._zIndex,
            "position": "absolute",
            "left": this.position.x,
            "top": this.position.y });

        this.firstLoad = true;

        //hook up mousedown
        this.el.on('mousedown', function (event) {
            self._onMouseDown(event);
        });

        this.el.on('mouseup', function (event) {
            self._onMouseUp(event);
        });

        //hook up mousedown
        this.el.on('dblclick', function (event) {
            self._onDblClick(event);
        });

        this._decoratorInstance.beforeAppend();

        /*this.el.droppable({
            greedy: true,
            over: function( event, ui ) {
                self._parentView.onModelDropOver(self._guid, event, ui);
            },
            drop: function (event, ui) {
                self._logger.warning("drop on model");
                event.stopPropagation();
            }
        });*/

        //this._parentView.modelInitializationCompleted(this._guid);

        //this._decoratorInstance.afterAppend();
    };

    ModelComponent.prototype._onMouseDown = function (event) {
        this._parentView.onComponentMouseDown(event, this._guid);
        event.stopPropagation();
        event.preventDefault();
    };

    ModelComponent.prototype._onMouseUp = function (event) {
        this._parentView.onComponentMouseUp(event, this._guid);
//        event.stopPropagation();
    };

    ModelComponent.prototype._onDblClick = function (event) {
        this._parentView.onComponentDblClick(this._guid);
        event.stopPropagation();
        event.preventDefault();
    };

    ModelComponent.prototype.decoratorUpdating = function () {
        this._updateConnEndPointsInView(false);
    };

    ModelComponent.prototype.decoratorUpdated = function () {
        this._updateConnEndPointsInView(true);
        this._registerMouseHandlers();

        if (this.firstLoad === true) {
            this.firstLoad = false;
            this._parentView.modelInitializationCompleted(this._guid);
        } else {
            //
            this._parentView.modelUpdated(this._guid);
        }
    };

    ModelComponent.prototype._updateConnEndPointsInView = function (register) {
        var connEndPoints  = this.el.find(".connEndPoint"),
            connEndPointIds = [],
            list = {},
            i;

        if (this.el.hasClass("connEndPoint")) {
            connEndPoints.push(this.el[0]);
        }

        //register connection endpoint areas
        connEndPoints.each(function () {
            var cid = $(this).attr("data-id");
            if (connEndPointIds.indexOf(cid) === -1) {
                connEndPointIds.push(cid);
            }
        });

        for (i = 0; i < connEndPointIds.length; i += 1) {
            list[connEndPointIds[i]] = this._guid;
        }

        if (register === true) {
            this._parentView.registerSubcomponents(list);
        } else {
            this._parentView.unregisterSubcomponents(list);
        }
    };

    ModelComponent.prototype._registerMouseHandlers = function () {
        var connStartElements = this.el.find(".startConn"),
            connFinishElements = this.el.find(".finishConn"),
            self = this;

        if (this.el.hasClass("startConn")) {
            connStartElements.push(this.el[0]);
        }

        if (this.el.hasClass("finishConn")) {
            connFinishElements.push(this.el[0]);
        }

        //register connection-draw start handler
        connStartElements.on('mousedown', function (event) {
            event.stopPropagation();
            event.preventDefault();
        });
        connStartElements.draggable({
            helper: function () {
                var h = $("<div class='draw-connection-drag-helper'></div>").data("sourceId", $(this).attr("data-id"));

                    h[0].GMEDragData = { "type": "create-connection",
                        "source-id": $(this).attr("data-id")};

                return h;
            },
            scroll: true,
            cursor: 'pointer',
            cursorAt: {
                left: 0,
                top: 0
            },
            start: function (event) {
                event.stopPropagation();
                $(this).addClass("connection-source");
                self._parentView.startDrawConnection($(this).attr("data-id"));
            },
            stop: function (event) {
                event.stopPropagation();
                self._parentView.endDrawConnection($(this).attr("data-id"));
                $(this).removeClass("connection-source");
            },
            drag: function (event) {
                self._parentView.onDrawConnection(event);
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

                self._parentView.createConnection(data);
                event.stopPropagation();
            }
        });
    };

    ModelComponent.prototype.updatingSubComponent = function (subComponentId) {
        var draggedComponent = this.el.find('.ui-draggable-dragging');

        if (draggedComponent.length > 0) {
            if (draggedComponent.data("sourceId") === subComponentId) {
                //the subcomponent under update is the currently dragged componenet, stop drag
                this.el.find('.connection-source[data-id="' + subComponentId + '"]').removeClass("connection-source");
                $('.connection-end-state-hover').removeClass("connection-end-state-hover");
                draggedComponent.trigger('mouseup');
            }
        }
    };

    ModelComponent.prototype.getBoundingBox = function (absolute) {
        var bBox = {    "x": absolute === true ? $(this.el).offset().left : parseInt($(this.el).css("left"), 10),
            "y": absolute === true ? $(this.el).offset().top : parseInt($(this.el).css("top"), 10),
            "width": parseInt($(this.el).outerWidth(true), 10),
            "height": parseInt($(this.el).outerHeight(true), 10) };
        bBox.x2 = bBox.x + bBox.width;
        bBox.y2 = bBox.y + bBox.height;

        return bBox;
    };

    ModelComponent.prototype.destroy = function () {
        this._destroying = true;

        //no good because if we do it here, cleanup will happen earlier than the usage of this information
        this._updateConnEndPointsInView(false);

        if (this._decoratorInstance) {
            this._decoratorInstance.destroy();
        }

        this._logger.debug("destroyed");
    };

    ModelComponent.prototype.onSelect = function () {
        this.el.addClass("selected");
    };

    ModelComponent.prototype.onDeselect = function () {
        this.el.removeClass("selected");
    };

    ModelComponent.prototype.update = function (objDescriptor) {
        this._name = objDescriptor.name || "";

        this._updateConnEndPointsInView(false);

        if (this._decoratorInstance) {
            this._decoratorInstance.update(objDescriptor);
        }
    };

    ModelComponent.prototype.getClonedEl = function () {
        var clonedEl = this.el.clone().attr("id", this._guid + "_clone"),
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

        //unregister connection endpoint areas from the cloned DOM
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

    return ModelComponent;
});