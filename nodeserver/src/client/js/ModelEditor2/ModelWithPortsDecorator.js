"use strict";

define(['logManager',
    'clientUtil',
    'nodeAttributeNames',
    'nodeRegistryNames',
    'ModelEditor2/Port',
    'text!ModelEditor2/ModelWithPortsTmpl.html',
    'css!ModelEditor2CSS/ModelWithPortsDecorator'], function (logManager,
                                                                 util,
                                                                 nodeAttributeNames,
                                                                 nodeRegistryNames,
                                                                 Port,
                                                                 modelWithPortsTmpl) {

    var ModelWithPortsDecorator;

    ModelWithPortsDecorator = function (objectDescriptor, parentWidget) {
        this._project = objectDescriptor.client;
        this._id = objectDescriptor.id;
        this._name = objectDescriptor.name;
        this._ownerComponent = objectDescriptor.ownerComponent;
        this._parentWidget = parentWidget;

        this._selfPatterns = {};
        this._skinParts = {};
        this._ports = {};

        this._logger = logManager.create("ModelWithPortsDecorator_" + this._id);
        this._logger.debug("Created");

    };

    ModelWithPortsDecorator.prototype.beforeAppend = function () {
        this._initializeUI();

        this._territoryId = this._project.addUI(this, true);

        //specify territory
        this._selfPatterns[this._id] = { "children": 1};
        this._project.updateTerritory(this._territoryId, this._selfPatterns);
    };

    ModelWithPortsDecorator.prototype._DOMBase = $(modelWithPortsTmpl);

    ModelWithPortsDecorator.prototype._initializeUI = function () {
        var self = this;

        this.modelComponentEl = this._ownerComponent.el;
        this.modelComponentEl.append(this._DOMBase.clone());

        //find components
        this._skinParts.title = this.modelComponentEl.find(".modelTitle");
        this._skinParts.childrenContainer = this.modelComponentEl.find(".children");

        this._skinParts.leftPorts = this.modelComponentEl.find(".ports.left");
        this._skinParts.centerPorts = this.modelComponentEl.find(".ports.center");
        this._skinParts.rightPorts = this.modelComponentEl.find(".ports.right");

        this._skinParts.bottomConnRect = this.modelComponentEl.find(".myConnRect.bottom");
        this._skinParts.topConnRect = this.modelComponentEl.find(".myConnRect.top");

        this._skinParts.connEndPointLeft =  this.modelComponentEl.find(".connEndPoint.left");
        this._skinParts.connEndPointRight =  this.modelComponentEl.find(".connEndPoint.right");
        this._skinParts.connEndPointTop =  this.modelComponentEl.find(".connEndPoint.top");
        this._skinParts.connEndPointBottom =  this.modelComponentEl.find(".connEndPoint.bottom");

        //set additional attributes
        this.modelComponentEl.attr({"data-id": this._id});
        this.modelComponentEl.addClass("modelWithPorts finishConn");

        this._skinParts.bottomConnRect.attr({"data-id": this._id});
        this._skinParts.topConnRect.attr({"data-id": this._id});

        this._skinParts.connEndPointLeft.attr({"data-id": this._id});
        this._skinParts.connEndPointRight.attr({"data-id": this._id});
        this._skinParts.connEndPointTop.attr({"data-id": this._id});
        this._skinParts.connEndPointBottom.attr({"data-id": this._id});

        this._skinParts.title.text(this._name);

        //hook up double click for node title edit
        this._skinParts.title.dblclick(function (event) {
            self._editNodeTitle.call(self);
            event.stopPropagation();
            event.preventDefault();
        });
    };

    ModelWithPortsDecorator.prototype.afterAppend = function () {
    };

    ModelWithPortsDecorator.prototype.update = function (objDescriptor) {
        //we handle the updates in our own territory update handler
        //by default the update should be handled here
        //and once it finishes, call back
        //this._ownerComponent.decoratorUpdated();
    };

    // PUBLIC METHODS
    ModelWithPortsDecorator.prototype.onOneEvent = function (events) {
        var i;

        this._logger.debug("onOneEvent '" + events.length + "' items");

        this._ownerComponent.decoratorUpdating();

        this._subcomponentsDiff = { "inserted": [],
                                    "updated": [],
                                    "deleted": [] };

        for (i = 0; i < events.length; i += 1) {
            this.onEvent(events[i].etype, events[i].eid);
        }

        this._logger.debug("onOneEvent '" + events.length + "' items - DONE");

        this._refreshSideConnectability();

        this._refreshChildrenContainer();

        this._ownerComponent.decoratorUpdated();

        delete this._subcomponentsDiff;
    };

    ModelWithPortsDecorator.prototype.onEvent = function (etype, eid) {
        this._logger.debug("onEvent '" + etype + "', '" + eid + "'");
        switch (etype) {
        case "load":
            if (this._id !== eid) {
                this._onLoad(eid);
            }
            break;
        case "update":
            this._onUpdate(eid);
            break;
        case "unload":
            if (this._id !== eid) {
                this._onUnload(eid);
            }
            break;
        }
    };

    ModelWithPortsDecorator.prototype._onLoad = function (objectId) {
        var childNode = this._project.getNode(objectId);

        if (childNode && childNode.getAttribute(nodeAttributeNames.isPort) === true) {
            this._subcomponentsDiff.inserted.push(objectId);
            this._renderPort(childNode);
        }
    };

    ModelWithPortsDecorator.prototype._onUnload = function (objectId) {
        if (this._ports[objectId]) {
            this._ownerComponent.updatingSubComponent(objectId);
            this._ports[objectId].destroy();
        }
    };

    ModelWithPortsDecorator.prototype._onUpdate = function (objectId) {
        var childNode = this._project.getNode(objectId);

        if (this._id === objectId) {
            //its the model itself that has been updated
            if (this._name !== childNode.getAttribute(nodeAttributeNames.name)) {
                this._name = childNode.getAttribute(nodeAttributeNames.name);

                this._skinParts.title.text(this._name);
            }
        } else {
            //its a port
            if (this._ports[objectId]) {
                //update the title
                this._ports[objectId].update({"title": childNode.getAttribute(nodeAttributeNames.name)});
                //see if its position changed and update accordingly
                this._updatePortPosition(objectId);
            }
        }
    };

    ModelWithPortsDecorator.prototype._renderPort = function (portNode) {
        var portId = portNode.getId();

        this._ports[portId] = new Port(portId, { "title": portNode.getAttribute(nodeAttributeNames.name)});

        this._addPortToContainer(portId);

    };

    ModelWithPortsDecorator.prototype._addPortToContainer = function (portId) {
        var portNode = this._project.getNode(portId),
            portOrientation = "W",
            portContainer = this._skinParts.leftPorts,
            portPosition = portNode.getRegistry(nodeRegistryNames.position),
            portToAppendBefore = null,
            i;

        //check if the port should be on the left or right-side
        if (portPosition.x > 300) {
            portOrientation = "E";
            portContainer = this._skinParts.rightPorts;
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
            portContainer.append(this._ports[portId].el);
        } else {
            this._ports[portId].el.insertBefore(this._ports[portToAppendBefore].el);
        }
    };

    ModelWithPortsDecorator.prototype._updatePortPosition = function (portId) {
        var portNode = this._project.getNode(portId),
            portPosition = portNode.getRegistry(nodeRegistryNames.position);

        //check if is has changed at all
        if ((this._ports[portId].position.x !== portPosition.x) ||
                (this._ports[portId].position.y !== portPosition.y)) {

            this._ownerComponent.updatingSubComponent(portId);

            //remove from current position
            this._ports[portId].el.remove();

            this._addPortToContainer(portId);
        }
    };

    ModelWithPortsDecorator.prototype._refreshSideConnectability = function () {
        var leftPorts = this._skinParts.leftPorts.children(),
            rightPorts = this._skinParts.rightPorts.children();

        if (leftPorts.length === 0) {
            if (this._skinParts.connEndPointLeft.hasClass("connEndPoint") === false) {
                this._skinParts.connEndPointLeft.addClass("connEndPoint");
            }
        } else {
            this._skinParts.connEndPointLeft.removeClass("connEndPoint");
        }

        if (rightPorts.length === 0) {
            if (this._skinParts.connEndPointRight.hasClass("connEndPoint") === false) {
                this._skinParts.connEndPointRight.addClass("connEndPoint");
            }
        } else {
            this._skinParts.connEndPointRight.removeClass("connEndPoint");
        }
    };

    ModelWithPortsDecorator.prototype._editNodeTitle = function () {
        var self = this,
            alreadyEdit = this._skinParts.title.find(":input").length > 0;

        if (alreadyEdit === true) {
            return;
        }

        // Replace node with <input>
        this._skinParts.title.editInPlace("modelTitle", function (newTitle) {
            self._project.setAttributes(self._id, "name", newTitle);
            self._refreshChildrenContainer();
            self._ownerComponent.decoratorUpdated();
        });
    };

    ModelWithPortsDecorator.prototype._refreshChildrenContainer = function () {
        /*var centerPortsWidth = this._skinParts.centerPorts.css("width", "").outerWidth(true),
            childrenContainerWidth = this._skinParts.childrenContainer.width(),
            leftPortsWidth = this._skinParts.leftPorts.outerWidth(true),
            rightPortsWidth = this._skinParts.rightPorts.outerWidth(true);

        if (childrenContainerWidth > leftPortsWidth + centerPortsWidth + rightPortsWidth) {
            this._skinParts.centerPorts.outerWidth(childrenContainerWidth - leftPortsWidth - rightPortsWidth);
        }

        this._skinParts.bottomConnRect.css("left", (this.parentContainer.width() - this._skinParts.bottomConnRect.outerWidth()) / 2);
        this._skinParts.topConnRect.css("left", (this.parentContainer.width() - this._skinParts.topConnRect.outerWidth()) / 2);*/
    };

    //in the destroy there is no need to touch the UI, it will be cleared out
    //release the territory, release everything needs to be released and return
    ModelWithPortsDecorator.prototype.destroy = function () {
        this._project.removeUI(this._territoryId);

        delete this._ports;

        this._logger.debug("Destroyed");
    };

    ModelWithPortsDecorator.prototype.renderPartBrowserItem = function () {
        return $('<div class="modelWithPorts"><div class="modelTitle">' + this._name + '</div></div>');
    };


    return ModelWithPortsDecorator;
});