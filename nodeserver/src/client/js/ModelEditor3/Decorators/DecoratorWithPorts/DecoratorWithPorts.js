"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/DiagramDesigner/DecoratorBase',
    'text!js/ModelEditor3/Decorators/DecoratorWithPorts/DecoratorWithPortsTemplate.html',
    'js/ModelEditor3/Decorators/DecoratorWithPorts/Port',
    'css!ModelEditor3CSS/Decorators/DecoratorWithPorts/DecoratorWithPorts'], function (logManager,
                                                          util,
                                                          CONSTANTS,
                                                          nodePropertyNames,
                                                          DecoratorBase,
                                                          decoratorWithPortsTemplate,
                                                          Port) {

    var DecoratorWithPorts,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "DecoratorWithPorts";

    DecoratorWithPorts = function (options) {

        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.name = "";
        this._portIDs = [];
        this._ports = {};
        this._skinParts = { "$name": undefined,
                            "$portsContainer": undefined,
                            "$portsContainerLeft": undefined,
                            "$portsContainerRight": undefined,
                            "$portsContainerCenter": undefined };

        this.logger.debug("DecoratorWithPorts ctor");
    };

    _.extend(DecoratorWithPorts.prototype, __parent_proto__);
    DecoratorWithPorts.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    DecoratorWithPorts.prototype.$DOMBase = $(decoratorWithPortsTemplate);

    DecoratorWithPorts.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this.skinParts.$name.editOnDblClick({"class": "",
                                             "onChange": function (oldValue, newValue) {
                                                 self._onNodeTitleChanged(oldValue, newValue);
                                             }});
    };

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    DecoratorWithPorts.prototype.on_addToPartBrowser = function () {
        //let the parent decorator class do its job first
        __parent_proto__.on_addToPartBrowser.apply(this, arguments);

        this._renderContent();
    };

    DecoratorWithPorts.prototype._renderContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            childrenIDs,
            len;

        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$portsContainer = this.$el.find(".ports");
        this.skinParts.$portsContainerLeft = this.skinParts.$portsContainer.find(".left");
        this.skinParts.$portsContainerRight = this.skinParts.$portsContainer.find(".right");
        this.skinParts.$portsContainerCenter = this.skinParts.$portsContainer.find(".center");

        /* FILL WITH DATA */
        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";
            this._refreshName();

            childrenIDs = nodeObj.getChildrenIds();
            len = childrenIDs.length;

            while (len--) {
                this._renderPort(childrenIDs[len]);
            }
        }
    };

    DecoratorWithPorts.prototype.calculateDimension = function () {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.width = this.$el.outerWidth(true);
            this.hostDesignerItem.height = this.$el.outerHeight(true);
        }

        this.offset = this.$el.offset();
        var i = this._portIDs.length;

        while (i--) {
            this._ports[this._portIDs[i]].calculatePortConnectionArea();
        }
    };

    DecoratorWithPorts.prototype.update = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newName = "";

        if (nodeObj) {
            newName = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";

            if (this.name !== newName) {
                this.name = newName;
                this._refreshName();
            }
        }

        this._updatePorts();
    };

    DecoratorWithPorts.prototype._refreshName = function () {
        this.skinParts.$name.text(this.name);
        this.skinParts.$name.attr("title", this.name);
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

    /***************  CUSTOM DECORATOR PART ****************************/
    DecoratorWithPorts.prototype._updatePorts = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newChildrenIDs = nodeObj ?  nodeObj.getChildrenIds() : [],
            len,
            currentChildrenIDs = this._portIDs.slice(0),
            addedChildren,
            removedChildren;

        removedChildren = _.difference(currentChildrenIDs, newChildrenIDs);
        len = removedChildren.length;
        while (len--) {
            this._removePort(removedChildren[len]);
        }

        addedChildren = _.difference(newChildrenIDs, currentChildrenIDs);
        len = addedChildren.length;
        while (len--) {
            this._renderPort(addedChildren[len]);
        }
    };

    DecoratorWithPorts.prototype._renderPort = function (portId) {
        var client = this._control._client,
            portNode = client.getNode(portId);

        if (portNode) {
            this._ports[portId] = new Port(portId, { "title": portNode.getAttribute(nodePropertyNames.Attributes.name),
                "decorator": this});

            this._portIDs.push(portId);
            this._addPortToContainer(portNode);
            if (this.hostDesignerItem) {
                this.hostDesignerItem.registerSubcomponent(portId, {"GME_ID": portId});
            }
        }
    };

    DecoratorWithPorts.prototype._removePort = function (portId) {
        var idx = this._portIDs.indexOf(portId);

        if (idx !== -1) {
            this._ports[portId].destroy();
            delete this._ports[portId];
            this._portIDs.splice(idx,1);
            if (this.hostDesignerItem) {
                this.hostDesignerItem.unregisterSubcomponent(portId);
            }
        }
    };

    DecoratorWithPorts.prototype._addPortToContainer = function (portNode) {
        var portId = portNode.getId(),
            portOrientation = "W",
            portContainer = this.skinParts.$portsContainerLeft,
            portPosition = portNode.getRegistry(nodePropertyNames.Registry.position) || { "x": 0, "y": 0 },
            portToAppendBefore = null,
            i;

        //check if the port should be on the left or right-side
        if (portPosition.x > 300) {
            portOrientation = "E";
            portContainer = this.skinParts.$portsContainerRight;
        }

        this._ports[portId].updateOrPos(portOrientation, portPosition);

        //find its correct position
        for (i in this._ports) {
            if (this._ports.hasOwnProperty(i)) {
                if (i !== portId) {
                    if (this._ports[i].orientation === this._ports[portId].orientation) {
                        if ((this._ports[portId].position.y < this._ports[i].position.y) ||
                            ((this._ports[portId].position.y === this._ports[i].position.y) && (this._ports[portId].title < this._ports[i].title))) {
                            if (portToAppendBefore === null) {
                                portToAppendBefore = i;
                            } else {
                                if ((this._ports[i].position.y < this._ports[portToAppendBefore].position.y) ||
                                    ((this._ports[i].position.y === this._ports[portToAppendBefore].position.y) && (this._ports[i].title < this._ports[portToAppendBefore].title))) {
                                    portToAppendBefore = i;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (portToAppendBefore === null) {
            portContainer.append(this._ports[portId].$el);
        } else {
            this._ports[portId].$el.insertBefore(this._ports[portToAppendBefore].$el);
        }
    };

    DecoratorWithPorts.prototype.attachConnectableSubcomponent = function (el, sCompID) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.attachConnectable(el, sCompID);
        }
    };

    DecoratorWithPorts.prototype.detachConnectableSubcomponent = function (el) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.detachConnectable(el);
        }
    };

    DecoratorWithPorts.prototype.destroy = function () {
        var len = this._portIDs.length;
        while (len--) {
            this._removePort(this._portIDs[len]);
        }
    };

    //called when the designer item's subcomponent should be updated
    DecoratorWithPorts.prototype.updateSubcomponent = function (portId) {
        var idx = this._portIDs.indexOf(portId),
            client = this._control._client,
            portNode = client.getNode(portId);

        if (idx !== -1) {
            this._ports[portId].update({"title": portNode.getAttribute(nodePropertyNames.Attributes.name)});
            this._updatePortPosition(portId);
        }
    };

    DecoratorWithPorts.prototype._updatePortPosition = function (portId) {
        var portNode = this._control._client.getNode(portId),
            portPosition = portNode.getRegistry(nodePropertyNames.Registry.position) || { "x": 0, "y": 0 };

        //check if is has changed at all
        if ((this._ports[portId].position.x !== portPosition.x) ||
            (this._ports[portId].position.y !== portPosition.y)) {

            //remove from current position
            this._ports[portId].$el.remove();

            this._addPortToContainer(portNode);
        }
    };

    /**************** EDIT NODE TITLE ************************/

    DecoratorWithPorts.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

    return DecoratorWithPorts;
});