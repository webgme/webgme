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
    './ModelDecorator.Constants',
    'js/Utils/DisplayFormat'], function (CONSTANTS,
                         nodePropertyNames,
                         LoaderProgressBar,
                         Port,
                         ModelDecoratorConstants,
                         displayFormat) {

    var ModelDecoratorCore,
        ABSTRACT_CLASS = 'abstract';


    ModelDecoratorCore = function () {
    };


    ModelDecoratorCore.prototype._initializeVariables = function (params) {
        this.name = "";
        this.formattedName = "";
        this._refTo = undefined;
        this._portIDs = [];
        this._ports = {};
        this.skinParts = { "$name": undefined,
            "$portsContainer": undefined,
            "$portsContainerLeft": undefined,
            "$portsContainerRight": undefined,
            "$portsContainerCenter": undefined,
            "$ref": undefined};
		
		this._displayConnectors = false;			
		if (params && params.connectors) {
			this._displayConnectors = params.connectors;			
		}
    };

    /**** Override from *.WidgetDecoratorBase ****/
	ModelDecoratorCore.prototype.getTerritoryQuery = function () {
        var territoryRule = {};

        territoryRule[this._metaInfo[CONSTANTS.GME_ID]] = { "children": 1 };

        return territoryRule;
    };


    /**** Override from *.WidgetDecoratorBase ****/
    ModelDecoratorCore.prototype.destroy = function () {
        var len = this._portIDs.length;
        while (len--) {
            this._unregisterForNotification(this._portIDs[len]);
            this._removePort(this._portIDs[len]);
        }
    };


    /**** Override from *.WidgetDecoratorBase ****/
    ModelDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString().toLowerCase();

        return (this.formattedName && this.formattedName.toLowerCase().indexOf(searchText) !== -1);
    };


    //register NodeID for notification in the client
    ModelDecoratorCore.prototype._registerForNotification = function(portId) {
    };


    //unregister NodeID from notification in the client
    ModelDecoratorCore.prototype._unregisterForNotification = function(portId) {
    };


    ModelDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find placeholders
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$portsContainer = this.$el.find(".ports");
        this.skinParts.$portsContainerLeft = this.skinParts.$portsContainer.find(".left");
        this.skinParts.$portsContainerRight = this.skinParts.$portsContainer.find(".right");
        this.skinParts.$portsContainerCenter = this.skinParts.$portsContainer.find(".center");
		
		this._update();
    };
	
	ModelDecoratorCore.prototype._update = function () {
        this._updateName();
        this._updatePorts();
        this._updateReference();
        this._updateAbstract();
    };


    /***** UPDATE THE NAME OF THE NODE *****/
    ModelDecoratorCore.prototype._updateName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            noName = "(N/A)";

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            this.formattedName = displayFormat.resolve(nodeObj);
        } else {
            this.name = "";
            this.formattedName = noName;
        }

        this.skinParts.$name.text(this.formattedName);
        this.skinParts.$name.attr("title", this.formattedName);
    };


    /***** UPDATE THE PORTS OF THE NODE *****/
    ModelDecoratorCore.prototype._updatePorts = function () {
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


    ModelDecoratorCore.prototype._isPort = function (portNode) {
        var isPort = false;

        if (portNode) {
            isPort = portNode.getRegistry(nodePropertyNames.Registry.isPort);
            isPort = (isPort === true || isPort === false) ? isPort : false;
        }

        return isPort;
    };


    ModelDecoratorCore.prototype._renderPort = function (portId) {
        var client = this._control._client,
            portNode = client.getNode(portId),
            isPort = this._isPort(portNode);

        if (isPort) {
            this._ports[portId] = new Port(portId, { "title": portNode.getAttribute(nodePropertyNames.Attributes.name),
                "decorator": this});

            this._portIDs.push(portId);
            this._addPortToContainer(portNode);
        }

        return isPort;
    };


    ModelDecoratorCore.prototype._removePort = function (portId) {
        var idx = this._portIDs.indexOf(portId);

        if (idx !== -1) {
            this._ports[portId].destroy();
            delete this._ports[portId];
            this._portIDs.splice(idx,1);
        }
    };


    ModelDecoratorCore.prototype._addPortToContainer = function (portNode) {
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


    ModelDecoratorCore.prototype._portPositionChanged = function (portId) {
    };


    ModelDecoratorCore.prototype._updatePort = function (portId) {
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


    ModelDecoratorCore.prototype._updatePortPosition = function (portId) {
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


    ModelDecoratorCore.prototype._checkTerritoryReady = function () {
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


    ModelDecoratorCore.prototype._showPortProgressBar = function () {
        var pgBar = this.$el.find('.' + ModelDecoratorConstants.PROGRESS_BAR_CLASS);
        if (pgBar.length === 0) {
            pgBar = $('<div/>', {'class': ModelDecoratorConstants.PROGRESS_BAR_CLASS});
            this.$el.append(pgBar);

            this._loader = new LoaderProgressBar({"containerElement": pgBar});
            this._loader.start();
        }
    };


    ModelDecoratorCore.prototype._hidePortProgressBar = function () {
        if (this._loader) {
            this._loader.stop();
            this._loader.destroy();
            delete this._loader;
        }

        this.$el.find('.' + ModelDecoratorConstants.PROGRESS_BAR_CLASS).remove();
    };


    ModelDecoratorCore.prototype._refUIDOMBase = $('<div class="' + ModelDecoratorConstants.REFERENCE_POINTER_CLASS + '"><i class="icon-share"></i></div>');


    ModelDecoratorCore.prototype._updateReference = function () {
        var refTo;

        if (this._hasReference()) {
            this.skinParts.$ref = this.$el.find('.' + ModelDecoratorConstants.REFERENCE_POINTER_CLASS);
            if (this.skinParts.$ref.length === 0) {
                this.skinParts.$ref = this._refUIDOMBase.clone();
                this.$el.append(this.skinParts.$ref);
            }

            refTo = this._getReferenceValue();

            if (refTo !== undefined) {
                this.skinParts.$ref.removeClass(ModelDecoratorConstants.REFERENCE_POINTER_CLASS_NONSET);
            } else {
                this.skinParts.$ref.addClass(ModelDecoratorConstants.REFERENCE_POINTER_CLASS_NONSET);
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


    ModelDecoratorCore.prototype._refToChanged = function (oldValue, newValue) {
    };


    ModelDecoratorCore.prototype._hasReference = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            hasRefPointer = false;

        if (nodeObj) {
            hasRefPointer = nodeObj.getPointerNames().indexOf(ModelDecoratorConstants.REFERENCE_POINTER_NAME) !== -1;
        }

        return hasRefPointer;
    };


    ModelDecoratorCore.prototype._getReferenceValue = function () {
        var res,
            client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        if (nodeObj) {
            res = nodeObj.getPointer(ModelDecoratorConstants.REFERENCE_POINTER_NAME);
            if (res && res.to !== undefined && res.to !== null) {
                res = res.to;
            } else {
                res = undefined;
            }
        }

        return res;
    };


    ModelDecoratorCore.prototype._setReferenceValue = function (val) {
        var client = this._control._client,
            nodeID = this._metaInfo[CONSTANTS.GME_ID];

        if (this._refTo !== val) {
            client.makePointer(nodeID, ModelDecoratorConstants.REFERENCE_POINTER_NAME, val);
        }
    };

    ModelDecoratorCore.prototype._updateAbstract = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        if (nodeObj) {
            if (nodeObj.getRegistry(nodePropertyNames.Registry.isAbstract) === true) {
                this.$el.addClass(ABSTRACT_CLASS);
            } else {
                this.$el.removeClass(ABSTRACT_CLASS);
            }
        } else {
            this.$el.removeClass(ABSTRACT_CLASS);
        }
    };


    return ModelDecoratorCore;
});