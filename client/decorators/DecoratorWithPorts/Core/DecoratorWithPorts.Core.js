/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'loaderProgressBar',
    './Port',
    './DecoratorWithPorts.Constants'], function (CONSTANTS,
                         nodePropertyNames,
                         LoaderProgressBar,
                         Port,
                         DecoratorWithPortsConstants) {

    var DecoratorWidthPortsCore,
        PROGRESS_BAR_CLASS = 'progress-bar';

    DecoratorWidthPortsCore = function () {
    };

    DecoratorWidthPortsCore.prototype._initializeVariables = function () {
        this.name = "";
        this._refTo = undefined;
        this._portIDs = [];
        this._ports = {};
        this.skinParts = { "$name": undefined,
            "$portsContainer": undefined,
            "$portsContainerLeft": undefined,
            "$portsContainerRight": undefined,
            "$portsContainerCenter": undefined,
            "$ref": undefined};
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
        this._updateReference();
    };

    DecoratorWidthPortsCore.prototype._updateName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            name;

        if (nodeObj) {
            name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "(N/A)";

            this.name = name;
            this.skinParts.$name.text(name);
            this.skinParts.$name.attr("title", name);
        }
    };

    DecoratorWidthPortsCore.prototype._registerForNotification = function(portId) {
    };

    DecoratorWidthPortsCore.prototype._unregisterForNotification = function(portId) {
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
            this._unregisterForNotification(removedChildren[len]);
            this._removePort(removedChildren[len]);
        }

        addedChildren = _.difference(newChildrenIDs, currentChildrenIDs);
        len = addedChildren.length;
        while (len--) {
            this._registerForNotification(addedChildren[len]);
            this._renderPort(addedChildren[len]);
        }

        this._checkTerritoryReady();
    };

    DecoratorWidthPortsCore.prototype._isPort = function (portNode) {
        var isPort = false;

        if (portNode) {
            isPort = portNode.getRegistry(nodePropertyNames.Registry.isPort);
            isPort = (isPort === true || isPort === false) ? isPort : false;
        }

        return isPort;
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
        }
    };

    DecoratorWidthPortsCore.prototype._removePort = function (portId) {
        var idx = this._portIDs.indexOf(portId);

        if (idx !== -1) {
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
        } else {
            this._renderPort(portId);
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

    DecoratorWidthPortsCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString();
        if (this.name && this.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
            return true;
        }

        return false;
    };


    DecoratorWidthPortsCore.prototype._checkTerritoryReady = function () {
        //the territory rule here is all children
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            tReady = true,
            childrenIDs,
            len;

        if (nodeObj) {
            childrenIDs = nodeObj.getChildrenIds();
            len = childrenIDs.length;
            while (len--) {
                nodeObj = client.getNode(childrenIDs[len]);
                if (!nodeObj) {
                    tReady = false;
                    break;
                }
            }
        } else {
            tReady = false;
        }

        if (tReady === true) {
            this._hidePortProgressBar();
        } else {
            this._showPortProgressBar();
        }
    };

    DecoratorWidthPortsCore.prototype._showPortProgressBar = function () {
        var pgBar = this.$el.find('.' + PROGRESS_BAR_CLASS);
        if (pgBar.length === 0) {
            pgBar = $('<div/>', {'class': PROGRESS_BAR_CLASS});
            this.$el.append(pgBar);

            this._loader = new LoaderProgressBar({"containerElement": pgBar});
            this._loader.start();
        }
    };

    DecoratorWidthPortsCore.prototype._hidePortProgressBar = function () {
        if (this._loader) {
            this._loader.stop();
            this._loader.destroy();
            delete this._loader;
        }

        this.$el.find('.' + PROGRESS_BAR_CLASS).remove();
    };

    DecoratorWidthPortsCore.prototype._refUIDOMBase = $('<div class="' + DecoratorWithPortsConstants.REFERENCE_POINTER_CLASS + '"><i class="icon-share"></i></div>');
    DecoratorWidthPortsCore.prototype._updateReference = function () {
        var refTo;

        if (this._hasReference()) {
            this.skinParts.$ref = this.$el.find('.' + DecoratorWithPortsConstants.REFERENCE_POINTER_CLASS);
            if (this.skinParts.$ref.length === 0) {
                this.skinParts.$ref = this._refUIDOMBase.clone();
                this.$el.append(this.skinParts.$ref);
            }

            refTo = this._getReferenceValue();

            if (refTo !== undefined) {
                this.skinParts.$ref.removeClass(DecoratorWithPortsConstants.REFERENCE_POINTER_CLASS_NONSET);
            } else {
                this.skinParts.$ref.addClass(DecoratorWithPortsConstants.REFERENCE_POINTER_CLASS_NONSET);
            }

            //if the old value is different than the new
            if (this._refTo !== refTo) {
                var oldRefTo = this._refTo;
                this._refTo = refTo;

                this._refToChanged(oldRefTo, this._refTo);
            }
        } else {
            if (this.skinParts.$ref) {
                this.skinParts.$ref.remove();
                this.skinParts.$ref = undefined;
            }
        }
    };

    DecoratorWidthPortsCore.prototype._refToChanged = function (oldValue, newValue) {

    };

    DecoratorWidthPortsCore.prototype._hasReference = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            hasRefPointer = false;

        if (nodeObj) {
            //TODO: FIXME getPointerNames
            hasRefPointer = nodeObj.getAttributeNames().indexOf(DecoratorWithPortsConstants.REFERENCE_POINTER_NAME) !== -1;
        }

        return hasRefPointer;
    };

    DecoratorWidthPortsCore.prototype._getReferenceValue = function () {
        var res,
            client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        if (nodeObj) {
            //TODO: FIXME getPointer
            res = nodeObj.getAttribute(DecoratorWithPortsConstants.REFERENCE_POINTER_NAME);
            if (res === '' || res === null) {
                res = undefined;
            }
        }

        return res;
    };

    DecoratorWidthPortsCore.prototype._setReferenceValue = function (val) {
        var client = this._control._client,
            nodeID = this._metaInfo[CONSTANTS.GME_ID];

        if (this._refTo !== val) {
            //TODO: FIXME getPointer
            client = client.setAttributes(nodeID, DecoratorWithPortsConstants.REFERENCE_POINTER_NAME, val);
        }
    };

    return DecoratorWidthPortsCore;
});