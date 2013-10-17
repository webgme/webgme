"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!./DecoratorWithPorts.DiagramDesignerWidget.html',
    '../Core/DecoratorWithPorts.Core',
    'css!./DecoratorWithPorts.DiagramDesignerWidget'], function (CONSTANTS,
                                                          nodePropertyNames,
                                                          DiagramDesignerWidgetDecoratorBase,
                                                          DiagramDesignerWidgetConstants,
                                                          decoratorWithPortsTemplate,
                                                          DecoratorWithPortsCore) {

    var DecoratorWithPorts,
        DECORATOR_ID = "DecoratorWithPorts",
        PORT_CONTAINER_OFFSET_Y = 21;

    DecoratorWithPorts = function (options) {

        var opts = _.extend( {}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);

        this._initializeVariables();
        this._displayConnectors = true;

        this.logger.debug("DecoratorWithPorts ctor");
    };

    _.extend(DecoratorWithPorts.prototype, DiagramDesignerWidgetDecoratorBase.prototype);
    _.extend(DecoratorWithPorts.prototype, DecoratorWithPortsCore.prototype);
    DecoratorWithPorts.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    DecoratorWithPorts.prototype.$DOMBase = $(decoratorWithPortsTemplate);

    DecoratorWithPorts.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this.skinParts.$name.on("dblclick.editOnDblClick", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "onChange": function (oldValue, newValue) {
                        self._onNodeTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };


    DecoratorWithPorts.prototype.update = function () {
        this._updateName();
        this._updatePorts();
    };


    DecoratorWithPorts.prototype.calculateDimension = function () {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.width = this.$el.outerWidth(true);
            this.hostDesignerItem.height = this.$el.outerHeight(true);

            this._paddingTop = parseInt(this.$el.css('padding-top'), 10);
            this._borderTop = parseInt(this.$el.css('border-top-width'), 10);
        }
    };


    DecoratorWithPorts.prototype._registerAsSubcomponent = function(portId) {
        var partId = this._metaInfo[CONSTANTS.GME_ID];

        if (this.hostDesignerItem) {
            this.hostDesignerItem.registerSubcomponent(portId, {"GME_ID": portId});
        }

        //this._control.registerComponentIDForPartID(portId, partId);
    };

    DecoratorWithPorts.prototype._unregisterAsSubcomponent = function(portId) {
        var partId = this._metaInfo[CONSTANTS.GME_ID];

        if (this.hostDesignerItem) {
            this.hostDesignerItem.unregisterSubcomponent(portId);
        }

        //this._control.unregisterComponentIDFromPartID(portId, partId);
    };

    DecoratorWithPorts.prototype._portPositionChanged = function (portId) {
        this.calculateDimension();
        this.hostDesignerItem.canvas.dispatchEvent(this.hostDesignerItem.canvas.events.ITEM_SUBCOMPONENT_POSITION_CHANGED, {"ItemID": this.hostDesignerItem.id,
            "SubComponentID": portId});
    };


    DecoratorWithPorts.prototype.getConnectionAreas = function (id, isEnd, connectionMetaInfo) {
        var result = [],
            edge = 10,
            LEN = 20;

        //by default return the bounding box edges midpoints

        if (id === undefined || id === this.hostDesignerItem.id) {
            //top left
            result.push( {"id": "0",
                "x1": edge,
                "y1": 0,
                "x2": this.hostDesignerItem.width - edge,
                "y2": 0,
                "angle1": 270,
                "angle2": 270,
                "len": LEN} );

            result.push( {"id": "1",
                "x1": edge,
                "y1": this.hostDesignerItem.height,
                "x2": this.hostDesignerItem.width - edge,
                "y2": this.hostDesignerItem.height,
                "angle1": 90,
                "angle2": 90,
                "len": LEN} );
        } else {
            //subcomponent
            var portConnArea = this._ports[id].getConnectorArea(),
                idx = this._portIDs.indexOf(id);

            result.push( {"id": idx,
                "x1": portConnArea.x1,
                "y1": portConnArea.y1 + PORT_CONTAINER_OFFSET_Y + this._paddingTop + this._borderTop,
                "x2": portConnArea.x2,
                "y2": portConnArea.y2 + PORT_CONTAINER_OFFSET_Y + this._paddingTop + this._borderTop,
                "angle1": portConnArea.angle1,
                "angle2": portConnArea.angle2,
                "len": portConnArea.len} );
        }


        return result;
    };


    //called when the designer item's subcomponent should be updated
    DecoratorWithPorts.prototype.updateSubcomponent = function (portId) {
        this.updatePort(portId);
    };


    /**************** EDIT NODE TITLE ************************/

    DecoratorWithPorts.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

        //Shows the 'connectors' - appends them to the DOM
    DecoratorWithPorts.prototype.showSourceConnectors = function (params) {
        var connectors,
            i;

        if (!params) {
            this.$sourceConnectors.show();
            if (this._portIDs) {
                i = this._portIDs.length;
                while (i--) {
                    this._ports[this._portIDs[i]].showConnectors();
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
                    if (this._ports[connectors[i]]) {
                        this._ports[connectors[i]].showConnectors();
                    }
                }
            }
        }
    };

    //Hides the 'connectors' - detaches them from the DOM
    DecoratorWithPorts.prototype.hideSourceConnectors = function () {
        var i;

        this.$sourceConnectors.hide();

        if (this._portIDs) {
            i = this._portIDs.length;
            while (i--) {
                this._ports[this._portIDs[i]].hideConnectors();
            }
        }
    };


    //should highlight the connectors for the given elements
    DecoratorWithPorts.prototype.showEndConnectors = function (params) {
       this.showSourceConnectors(params);
    };

    //Hides the 'connectors' - detaches them from the DOM
    DecoratorWithPorts.prototype.hideEndConnectors = function () {
        this.hideSourceConnectors();
    };

    /********* TODO: possibly can go to CORE *************/
    DecoratorWithPorts.prototype.getTerritoryQuery = function () {
        var territoryRule = {};

        territoryRule[this._metaInfo[CONSTANTS.GME_ID]] = { "children": 1 };

        return territoryRule;
    };

    DecoratorWithPorts.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this.updatePort(componentList[len].id);
        }
        this._checkTerritoryReady();
    };

    DecoratorWithPorts.prototype._registerForNotification = function(portId) {
        var partId = this._metaInfo[CONSTANTS.GME_ID];

        this._control.registerComponentIDForPartID(portId, partId);
    };

    DecoratorWithPorts.prototype._unregisterForNotification = function(portId) {
        var partId = this._metaInfo[CONSTANTS.GME_ID];

        this._control.unregisterComponentIDFromPartID(portId, partId);
    };


    DecoratorWithPorts.prototype._renderPort = function (portId) {
        var client = this._control._client,
            portNode = client.getNode(portId),
            isPort = this._isPort(portNode);

        DecoratorWithPortsCore.prototype._renderPort.call(this, portId);

        if (portNode && isPort) {
            this._registerAsSubcomponent(portId);
        }
    };

    DecoratorWithPorts.prototype._removePort = function (portId) {
        var idx = this._portIDs.indexOf(portId);

        if (idx !== -1) {
            this._unregisterAsSubcomponent(portId);
        }

        DecoratorWithPortsCore.prototype._removePort.call(this, portId);
    };


    return DecoratorWithPorts;
});