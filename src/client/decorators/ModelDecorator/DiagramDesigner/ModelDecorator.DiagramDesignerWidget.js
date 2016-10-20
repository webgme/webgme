/*globals define, _, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBaseWithDragPointerHelpers',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../Core/ModelDecorator.html',
    '../Core/ModelDecorator.Core',
    '../Core/ModelDecorator.Constants',
    'js/Controls/ContextMenu',
    'css!./ModelDecorator.DiagramDesignerWidget.css'
], function (CONSTANTS,
             nodePropertyNames,
             DiagramDesignerWidgetDecoratorBase,
             DiagramDesignerWidgetConstants,
             modelDecoratorTemplate,
             ModelDecoratorCore,
             ModelDecoratorConstants,
             ContextMenu) {

    'use strict';

    var ModelDecoratorDiagramDesignerWidget,
        DECORATOR_ID = 'ModelDecoratorDiagramDesignerWidget',
        PORT_CONTAINER_OFFSET_Y = 15;

    ModelDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend({}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);
        ModelDecoratorCore.apply(this, [opts]);

        this._initializeVariables({connectors: true});

        this._selfPatterns = {};

        this.logger.debug('ModelDecoratorDiagramDesignerWidget ctor');
    };

    /************************ INHERITANCE *********************/
    _.extend(ModelDecoratorDiagramDesignerWidget.prototype, DiagramDesignerWidgetDecoratorBase.prototype);
    _.extend(ModelDecoratorDiagramDesignerWidget.prototype, ModelDecoratorCore.prototype);

    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    ModelDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    ModelDecoratorDiagramDesignerWidget.prototype.$DOMBase = $(modelDecoratorTemplate);

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //jshint camelcase: false
    ModelDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this.skinParts.$name.on('dblclick.editOnDblClick', null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({
                    class: '',
                    value: self.name,
                    onChange: function (oldValue, newValue) {
                        self.__onNodeTitleChanged(oldValue, newValue);
                    },
                    onFinish: function () {
                        self.skinParts.$name.text(self.formattedName);
                        self.skinParts.$name.attr('title', self.formattedName);
                    }
                });
            }
            event.stopPropagation();
            event.preventDefault();
        });

        // reference icon on double-click
        this.$el.on('dblclick.ptrDblClick', '.' + ModelDecoratorConstants.POINTER_CLASS, function (event) {
            if (!($(this).hasClass(ModelDecoratorConstants.POINTER_CLASS_NON_SET))) {
                self.__onPointerDblClick({x: event.clientX, y: event.clientY});
            }
            event.stopPropagation();
            event.preventDefault();
        });

        this._updateDropArea();
    };
    //jshint camelcase: true

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    ModelDecoratorDiagramDesignerWidget.prototype.update = function () {
        this._update();
        this._updateDropArea();
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    ModelDecoratorDiagramDesignerWidget.prototype.onRenderGetLayoutInfo = function () {
        this._paddingTop = parseInt(this.$el.css('padding-top'), 10);
        this._borderTop = parseInt(this.$el.css('border-top-width'), 10);

        DiagramDesignerWidgetDecoratorBase.prototype.onRenderGetLayoutInfo.call(this);
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    ModelDecoratorDiagramDesignerWidget.prototype.destroy = function () {
        //drop territory
        if (this._territoryId) {
            this._control._client.removeUI(this._territoryId);
        }

        //call base destroy
        ModelDecoratorCore.prototype.destroy.call(this);
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    ModelDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id/*, isEnd, connectionMetaInfo*/) {
        var result = [],
            edge = 10,
            LEN = 20;

        //by default return the bounding box edges midpoints

        if (id === undefined || id === this.hostDesignerItem.id) {
            //North side
            result.push({
                id: 'N',
                x1: edge,
                y1: 0,
                x2: this.hostDesignerItem.getWidth() - edge,
                y2: 0,
                angle1: 270,
                angle2: 270,
                len: LEN
            });

            //South side
            result.push({
                id: 'S',
                x1: edge,
                y1: this.hostDesignerItem.getHeight(),
                x2: this.hostDesignerItem.getWidth() - edge,
                y2: this.hostDesignerItem.getHeight(),
                angle1: 90,
                angle2: 90,
                len: LEN
            });

            //check east and west
            //if there is port on the side, it's disabled for drawing connections
            //otherwise enabled
            var eastEnabled = true;
            var westEnabled = true;
            for (var pId in this.ports) {
                if (this.ports.hasOwnProperty(pId)) {
                    if (this.ports[pId].orientation === 'E') {
                        eastEnabled = false;
                    }
                    if (this.ports[pId].orientation === 'W') {
                        westEnabled = false;
                    }
                }
                if (!eastEnabled && !westEnabled) {
                    break;
                }
            }

            if (eastEnabled) {
                result.push({
                    id: 'E',
                    x1: this.hostDesignerItem.getWidth(),
                    y1: edge,
                    x2: this.hostDesignerItem.getWidth(),
                    y2: this.hostDesignerItem.getHeight() - edge,
                    angle1: 0,
                    angle2: 0,
                    len: LEN
                });
            }

            if (westEnabled) {
                result.push({
                    id: 'W',
                    x1: 0,
                    y1: edge,
                    x2: 0,
                    y2: this.hostDesignerItem.getHeight() - edge,
                    angle1: 180,
                    angle2: 180,
                    len: LEN
                });
            }

        } else if (this.ports[id]) {
            //subcomponent
            var portConnArea = this.ports[id].getConnectorArea(),
                idx = this.portIDs.indexOf(id);

            result.push({
                id: idx,
                x1: portConnArea.x1,
                y1: portConnArea.y1 + PORT_CONTAINER_OFFSET_Y + this._paddingTop + this._borderTop,
                x2: portConnArea.x2,
                y2: portConnArea.y2 + PORT_CONTAINER_OFFSET_Y + this._paddingTop + this._borderTop,
                angle1: portConnArea.angle1,
                angle2: portConnArea.angle2,
                len: portConnArea.len
            });
        }

        return result;
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //called when the designer item's subcomponent should be updated
    ModelDecoratorDiagramDesignerWidget.prototype.updateSubcomponent = function (portId) {
        this._updatePort(portId);
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //Shows the 'connectors' - appends them to the DOM
    ModelDecoratorDiagramDesignerWidget.prototype.showSourceConnectors = function (params) {
        var connectors,
            i;

        if (!params) {
            this.$sourceConnectors.show();
            if (this.portIDs) {
                i = this.portIDs.length;
                while (i--) {
                    this.ports[this.portIDs[i]].showConnectors();
                }
            }
        } else {
            connectors = params.connectors;
            i = connectors.length;
            while (i--) {
                if (connectors[i] === undefined) {
                    //show connector for the represented item itself
                    this.$sourceConnectors.show();
                } else {
                    //one of the ports' connector should be displayed
                    if (this.ports[connectors[i]]) {
                        this.ports[connectors[i]].showConnectors();
                    }
                }
            }
        }
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    ModelDecoratorDiagramDesignerWidget.prototype.hideSourceConnectors = function () {
        var i;

        this.$sourceConnectors.hide();

        if (this.portIDs) {
            i = this.portIDs.length;
            while (i--) {
                this.ports[this.portIDs[i]].hideConnectors();
            }
        }
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //should highlight the connectors for the given elements
    ModelDecoratorDiagramDesignerWidget.prototype.showEndConnectors = function (params) {
        this.showSourceConnectors(params);
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    ModelDecoratorDiagramDesignerWidget.prototype.hideEndConnectors = function () {
        this.hideSourceConnectors();
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    ModelDecoratorDiagramDesignerWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this._updatePort(componentList[len].id);
        }
        this._checkTerritoryReady();
    };
    
    ModelDecoratorDiagramDesignerWidget.prototype._portPositionChanged = function (portId) {
        this.onRenderGetLayoutInfo();
        this.hostDesignerItem.canvas.dispatchEvent(
            this.hostDesignerItem.canvas.events.ITEM_SUBCOMPONENT_POSITION_CHANGED,
            {
                ItemID: this.hostDesignerItem.id,
                SubComponentID: portId
            }
        );
    };

    ModelDecoratorDiagramDesignerWidget.prototype.renderPort = function (portId) {
        this.__registerAsSubcomponent(portId);

        return ModelDecoratorCore.prototype.renderPort.call(this, portId);
    };
    
    ModelDecoratorDiagramDesignerWidget.prototype.removePort = function (portId) {
        var idx = this.portIDs.indexOf(portId);

        if (idx !== -1) {
            this.__unregisterAsSubcomponent(portId);
        }

        ModelDecoratorCore.prototype.removePort.call(this, portId);
    };

    ModelDecoratorDiagramDesignerWidget.prototype._updateDropArea = function () {
        var inverseClass = 'inverse-on-hover';

        if (this.skinParts.$ptr || this.skinParts.$replaceable) {

            if (this.skinParts.$ptr) {
                if (this.skinParts.$ptr.hasClass(ModelDecoratorConstants.POINTER_CLASS_NON_SET)) {
                    this.skinParts.$ptr.removeClass(inverseClass);
                } else {
                    this.skinParts.$ptr.addClass(inverseClass);
                }
            }
            this._enableDragEvents();
        } else {
            this._disableDragEvents();
        }

        this._setPointerTerritory(this._getPointerTargets());
    };

    ModelDecoratorDiagramDesignerWidget.prototype.__registerAsSubcomponent = function (portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.registerSubcomponent(portId, {GME_ID: portId});
        }
    };

    ModelDecoratorDiagramDesignerWidget.prototype.__unregisterAsSubcomponent = function (portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.unregisterSubcomponent(portId);
        }
    };

    ModelDecoratorDiagramDesignerWidget.prototype.__onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttribute(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    ModelDecoratorDiagramDesignerWidget.prototype.__onPointerDblClick = function (mousePos) {
        var pointerTargets = this._getPointerTargets(),
            menu,
            self = this,
            menuItems = {},
            i,
            ptrTargets = {};

        if (pointerTargets.length > 0) {
            if (pointerTargets.length === 1) {
                this._navigateToPointerTarget(pointerTargets[0][1]);
            } else {
                for (i = 0; i < pointerTargets.length; i += 1) {
                    menuItems[pointerTargets[i][0]] = {
                        name: 'Follow pointer "' + pointerTargets[i][0] + '"'
                    };
                    ptrTargets[pointerTargets[i][0]] = pointerTargets[i][1];
                }

                menu = new ContextMenu({
                    items: menuItems,
                    callback: function (key) {
                        self._navigateToPointerTarget(ptrTargets[key]);
                    }
                });

                menu.show(mousePos);
            }
        }
    };

    ModelDecoratorDiagramDesignerWidget.prototype._navigateToPointerTarget = function (targetID) {
        var client = this._control._client,
            targetNodeObj;

        targetNodeObj = client.getNode(targetID);
        if (targetNodeObj) {
            if (targetNodeObj.getParentId() || targetNodeObj.getParentId() === CONSTANTS.PROJECT_ROOT_ID) {
                WebGMEGlobal.State.registerActiveObject(targetNodeObj.getParentId());
                WebGMEGlobal.State.registerActiveSelection([targetID]);
            } else {
                WebGMEGlobal.State.registerActiveObject(CONSTANTS.PROJECT_ROOT_ID);
                WebGMEGlobal.State.registerActiveSelection([targetID]);
            }
        }
    };

    return ModelDecoratorDiagramDesignerWidget;
});