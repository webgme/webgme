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
        __parent__ = DiagramDesignerWidgetDecoratorBase,
        DECORATOR_ID = "DecoratorWithPorts";

    DecoratorWithPorts = function (options) {

        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this._initializeVariables();
        this._displayConnectors = true;

        this.logger.debug("DecoratorWithPorts ctor");
    };

    _.extend(DecoratorWithPorts.prototype, __parent__.prototype);
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
            this.offset = this.hostDesignerItem.canvas.getAdjustedOffset(this.$el.offset());

            var i = this._portIDs.length;

            while (i--) {
                this._ports[this._portIDs[i]].calculatePortConnectionArea();
            }
        }
    };


    DecoratorWithPorts.prototype._registerAsSubcomponent = function(portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.registerSubcomponent(portId, {"GME_ID": portId});
        }
    };

    DecoratorWithPorts.prototype._unregisterAsSubcomponent = function(portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.unregisterSubcomponent(portId);
        }
    };

    DecoratorWithPorts.prototype._portPositionChanged = function (portId) {
        this.calculateDimension();
        this.hostDesignerItem.canvas.dispatchEvent(this.hostDesignerItem.canvas.events.ITEM_SUBCOMPONENT_POSITION_CHANGED, {"ItemID": this.hostDesignerItem.id,
            "SubComponentID": portId});
    };


    DecoratorWithPorts.prototype.getConnectionAreas = function (id) {
        var result = [],
            edge = 10;

        //by default return the bounding box edges midpoints

        if (id === undefined || id === this.hostDesignerItem.id) {
            //top left
            result.push( {"id": "0",
                "x": edge,
                "y": 0,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "N",
                "len": 10} );

            result.push( {"id": "1",
                "x": edge,
                "y": this.hostDesignerItem.height,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "S",
                "len": 10} );
        } else {
            //subcomponent
            var portConnArea = this._ports[id].getConnectorArea(),
                idx = this._portIDs.indexOf(id);

            result.push( {"id": idx,
                "x": portConnArea.x - this.offset.left,
                "y": portConnArea.y - this.offset.top,
                "w": portConnArea.w,
                "h": portConnArea.h,
                "orientation": portConnArea.orientation,
                "len": portConnArea.len /*+ idx * 5*/} );
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

    return DecoratorWithPorts;
});