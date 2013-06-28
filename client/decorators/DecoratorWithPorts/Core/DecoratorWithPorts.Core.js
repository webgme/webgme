/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    './Port'], function (CONSTANTS,
                         nodePropertyNames,
                         Port) {

    var DecoratorWidthPortsCore;

    DecoratorWidthPortsCore = function () {
    };

    DecoratorWidthPortsCore.prototype._initializeVariables = function () {
        this._portIDs = [];
        this._ports = {};
        this.skinParts = { "$name": undefined,
            "$portsContainer": undefined,
            "$portsContainerLeft": undefined,
            "$portsContainerRight": undefined,
            "$portsContainerCenter": undefined };
    };

    DecoratorWidthPortsCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$portsContainer = this.$el.find(".ports");
        this.skinParts.$portsContainerLeft = this.skinParts.$portsContainer.find(".left");
        this.skinParts.$portsContainerRight = this.skinParts.$portsContainer.find(".right");
        this.skinParts.$portsContainerCenter = this.skinParts.$portsContainer.find(".center");

        this._updateName();
        this._updatePorts();
    };

    DecoratorWidthPortsCore.prototype._updateName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            name;

        if (nodeObj) {
            name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";

            this.skinParts.$name.text(name);
            this.skinParts.$name.attr("title", name);
        }
    };

    /***************  CUSTOM DECORATOR PART ****************************/
    DecoratorWidthPortsCore.prototype._updatePorts = function () {
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

    DecoratorWidthPortsCore.prototype._renderPort = function (portId) {
        var client = this._control._client,
            portNode = client.getNode(portId),
            isPort = this._isPort(portNode);

        if (portNode && isPort) {
            this._ports[portId] = new Port(portId, { "title": portNode.getAttribute(nodePropertyNames.Attributes.name),
                "decorator": this});

            this._portIDs.push(portId);
            this._addPortToContainer(portNode);
            this._registerAsSubcomponent(portId);
        }
    };

    DecoratorWidthPortsCore.prototype._registerAsSubcomponent = function(portId) {
    };

    DecoratorWidthPortsCore.prototype._unregisterAsSubcomponent = function(portId) {
    };

    DecoratorWidthPortsCore.prototype._isPort = function (portNode) {
        var isPort = false;

        if (portNode) {
            isPort = portNode.getRegistry(nodePropertyNames.Registry.isPort);
            isPort = (isPort === true || isPort === false) ? isPort : false;
        }

        return isPort;
    };

    DecoratorWidthPortsCore.prototype._removePort = function (portId) {
        var idx = this._portIDs.indexOf(portId);

        if (idx !== -1) {
            this._unregisterAsSubcomponent(portId);
            this._ports[portId].destroy();
            delete this._ports[portId];
            this._portIDs.splice(idx,1);
        }
    };

    DecoratorWidthPortsCore.prototype._addPortToContainer = function (portNode) {
        var portId = portNode.getId(),
            portOrientation = "W",
            portContainer = this.skinParts.$portsContainerLeft,
            portPosition = portNode.getRegistry(nodePropertyNames.Registry.position) || { "x": 0, "y": 0 },
            portToAppendBefore = null,
            i,
            changed;

        //check if the port should be on the left or right-side
        if (portPosition.x > 300) {
            portOrientation = "E";
            portContainer = this.skinParts.$portsContainerRight;
        }

        changed = this._ports[portId].updateOrPos(portOrientation, portPosition);

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

        if (changed === true) {
            this._portPositionChanged(portId);
        }
    };

    DecoratorWidthPortsCore.prototype._portPositionChanged = function (portId) {
    };

    DecoratorWidthPortsCore.prototype.destroy = function () {
        var len = this._portIDs.length;
        while (len--) {
            this._removePort(this._portIDs[len]);
        }
    };

    DecoratorWidthPortsCore.prototype.updatePort = function (portId) {
        var idx = this._portIDs.indexOf(portId),
            client = this._control._client,
            portNode = client.getNode(portId),
            isPort = this._isPort(portNode);

        //check if it is already displayed as port
        if (idx !== -1) {
            //port already, should it stay one?
            if (isPort === true) {
                this._ports[portId].update({"title": portNode.getAttribute(nodePropertyNames.Attributes.name)});
                this._updatePortPosition(portId);
            } else {
                this._removePort(portId);
            }
        }
    };

    DecoratorWidthPortsCore.prototype._updatePortPosition = function (portId) {
        var portNode = this._control._client.getNode(portId),
            portPosition = portNode.getRegistry(nodePropertyNames.Registry.position) || { "x": 0, "y": 0 };

        //check if is has changed at all
        if ((this._ports[portId].position.x !== portPosition.x) ||
            (this._ports[portId].position.y !== portPosition.y)) {

            //detach from DOM
            this._ports[portId].$el.detach();

            //reattach
            this._addPortToContainer(portNode);
        }
    };

    return DecoratorWidthPortsCore;
});