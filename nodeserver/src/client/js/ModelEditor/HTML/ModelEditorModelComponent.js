"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'nodeAttributeNames',
    'nodeRegistryNames',
    './ComponentBase.js',
    './SimpleModelDecorator.js'
    ], function (logManager,
             util,
             commonUtil,
             nodeAttributeNames,
             nodeRegistryNames,
             ComponentBase,
             SimpleModelDecorator) {

    var ModelEditorModelComponent;

    ModelEditorModelComponent = function (id, proj) {
        $.extend(this, new ComponentBase(id, proj));

        this.logger = logManager.create("ModelEditorModelComponent_" + id);
        this.logger.debug("Created");

        this.zIndex = 10;
        this.connectionRectWidth = 5;

        /*
         * OVERRIDE COMPONENTBASE MEMBERS
         */
        this.addedToParent = function () {
            this._addedToParent();
        };

        this.onDestroy = function () {
            //remove extra connection rectangle from DOM
            this.skinParts.connectionRect.remove();

            if (this.decoratorInstance) {
                this.decoratorInstance.destroy();
            }

            this.project.updateTerritory(this.territoryId, []);

            this.logger.debug("onDestroy");
        };

        this.isSelectable = function () {
            return true;
        };

        this.isMultiSelectable = function () {
            return true;
        };
        /*
         * END OVERRIDE COMPONENTBASE MEMBERS
         */

        this.decoratorInstance = null;
        this.DecoratorClass = SimpleModelDecorator;

        this._initialize();
    };

    ModelEditorModelComponent.prototype._initialize = function () {
        var node = this.project.getNode(this.getId()),
            nodePosition = node.getRegistry(nodeRegistryNames.position);

        //generate skin controls
        this.el.addClass("model");

        this.el.css("z-index", this.zIndex);
        this.el.css("position", "absolute");

        //position self on parent canvas
        this._setPosition(nodePosition.x, nodePosition.y, false);
    };

    ModelEditorModelComponent.prototype._initializeDecorator = function () {
        var node = this.project.getNode(this.getId()),
            decoratorName = "",
            customDecorator = node.getRegistry(nodeRegistryNames.decorator),
            self = this;

        if (_.isString(customDecorator)) {
            //TODO: delete
            customDecorator = "ModelWithPortsDecorator";
            //TODO: enddelete
            decoratorName = './js/ModelEditor/HTML/' + customDecorator + '.js';

            require([ decoratorName ],
                function (customDecoratorClass) {
                    self.DecoratorClass = customDecoratorClass;
                    self.decoratorInstance = new self.DecoratorClass(self);
                    self.decoratorInstance.render();
                });

        } else {
            //instantiate the decorator class and let it render the content
            this.decoratorInstance = new this.DecoratorClass(this);
            this.decoratorInstance.render();
        }
    };

    ModelEditorModelComponent.prototype._addedToParent = function () {
        var self = this,
            selfId = this.getId();

        //create a thin edge around it that can be used to initiate connection drawing
        this.skinParts.connectionRect = $('<div/>', {
            "id": "connectionRect_" + this.getId()
        });
        this.skinParts.connectionRect.css({"z-index": this.zIndex - 1,
            "cursor": "crosshair" });

        this.skinParts.connectionRect.insertBefore(this.el);

        this.skinParts.connectionRect.draggable({
            helper: function () {
                return $("<div class='draw-connection-drag-helper'></div>").data("id", selfId);
            },
            scroll: true,
            cursor: 'pointer',
            cursorAt: {
                left: 0,
                top: 0
            },
            start: function (event) {
                self.skinParts.connectionRect.addClass("connection-source");
                self.parentComponent.startDrawConnection(selfId);
                event.stopPropagation();
            },
            stop: function (event) {
                self.skinParts.connectionRect.removeClass("connection-source");
                self.parentComponent.endDrawConnection();
                event.stopPropagation();
            },
            drag: function (event) {
                self.parentComponent.onDrawConnection(event);
            }
        });

        self.skinParts.connectionRect.bind("mousedown", function (event) {
            event.stopPropagation();
        });

        //make the whole parent container to be able to accept connection end drop
        this.el.droppable({
            accept: ".connection-source",
            hoverClass: "connection-end-state-hover",
            drop: function (event, ui) {
                var srcId = ui.helper.data("id");

                self.parentComponent.createConnection(srcId, selfId);
                event.stopPropagation();
            }
        });

        this._repositionConnectionRect();

        this._notifyParentAboutBBoxChange();

        this._initializeDecorator();
    };

    ModelEditorModelComponent.prototype._repositionConnectionRect = function () {
        var bBox = this.getBoundingBox();

        if (this.skinParts.connectionRect) {
            this.skinParts.connectionRect.css({
                "position": "absolute",
                "left": bBox.x - this.connectionRectWidth,
                "top": bBox.y - this.connectionRectWidth,
                "width": bBox.width + this.connectionRectWidth * 2,
                "height": bBox.height + this.connectionRectWidth * 2
            });
        }
    };

    ModelEditorModelComponent.prototype.onSelect = function () {
        this.el.addClass("selected");
    };

    ModelEditorModelComponent.prototype.onDeselect = function () {
        this.el.removeClass("selected");
    };

    ModelEditorModelComponent.prototype._setPosition = function (pX, pY, updateDB) {
        //if position is different than the given one
        this.el.css({   "left": pX,
                        "top": pY });

        if (updateDB === true) {
            this.project.setRegistry(this.getId(), nodeRegistryNames.position, { "x": pX, "y": pY });
        }

        this.logger.debug("Object position changed to [" + pX + ", " + pY + "]" + (updateDB === true ? ", new position is saved back to database" : ""));

        //fix the connection rect around it
        this._repositionConnectionRect();
    };

    ModelEditorModelComponent.prototype.setPosition = function (pX, pY) {
        this._setPosition(pX, pY, true);
    };

    ModelEditorModelComponent.prototype.update = function () {
        var node = this.project.getNode(this.getId()),
            nodePosition = node.getRegistry(nodeRegistryNames.position);

        this._setPosition(nodePosition.x, nodePosition.y, false);

        if (this.decoratorInstance) {
            this.decoratorInstance.update.call(this.decoratorInstance);
        }

        this._notifyParentAboutBBoxChange();
    };

    ModelEditorModelComponent.prototype._notifyParentAboutBBoxChange = function () {
        if (this.parentComponent) {
            this.parentComponent.childBBoxChanged.call(this.parentComponent, this.getId());
        }
    };

    ModelEditorModelComponent.prototype.getConnectionPoints = function () {
        var bBox = this.getBoundingBox(),
            result = [];

        if (this.decoratorInstance) {
            if ($.isFunction(this.decoratorInstance.getConnectionPoints)) {
                return this.decoratorInstance.getConnectionPoints();
            }
        }

        result.push({ "dir": "S", x: bBox.x + bBox.width / 2, y: bBox.y + bBox.height});
        result.push({ "dir": "N", x:  bBox.x + bBox.width / 2, y: bBox.y});
        result.push({ "dir": "E", x: bBox.x + bBox.width, y: bBox.y + bBox.height / 2});
        result.push({ "dir": "W", x: bBox.x, y: bBox.y + bBox.height / 2});

        return result;
    };

    ModelEditorModelComponent.prototype.getConnectionPointsById = function (sourceId) {
        var result = [],
            i,
            bBox = this.getBoundingBox();

        if (this.decoratorInstance) {
            result = this.decoratorInstance.getConnectionPointsById.call(this.decoratorInstance, sourceId);

            for (i = 0; i < result.length; i += 1) {
                result[i].x += bBox.x;
                result[i].y += bBox.y;
            }
        }

        return result;
    };

    ModelEditorModelComponent.prototype.decoratorUpdated = function () {
        this._repositionConnectionRect();
        this._notifyParentAboutBBoxChange();
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