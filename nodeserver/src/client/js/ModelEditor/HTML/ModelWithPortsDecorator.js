"use strict";

define(['logManager',
    'clientUtil',
    'nodeAttributeNames',
    'nodeRegistryNames',
    './Port.js',
    'css!ModelEditorHTMLCSS/ModelWithPortsDecorator'], function (logManager,
                                                                 util,
                                                                 nodeAttributeNames,
                                                                 nodeRegistryNames,
                                                                 Port) {

    var ModelWithPortsDecorator;

    ModelWithPortsDecorator = function (objectDescriptor) {
        this.project = objectDescriptor.client;
        this.id = objectDescriptor.id;
        this.skinParts = {};
        this.ownerComponent = objectDescriptor.ownerComponent;
        this.parentContainer = objectDescriptor.ownerComponent.el;
        this.childrenIds = [];
        this.ports = {};

        this.territoryId = this.project.addUI(this);
        this.selfPatterns = {};

        this.logger = logManager.create("ModelWithPortsDecorator_" + this.id);
        this.logger.debug("Created");
    };

    ModelWithPortsDecorator.prototype.render = function () {
        var node = this.project.getNode(this.id),
            self = this;

        this.parentContainer.addClass("modelWithPorts");

        //create content controls
        this.skinParts.title = $('<div/>');
        this.skinParts.title.addClass("modelTitle");
        this.parentContainer.append(this.skinParts.title);

        //apply content to controls
        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        //create container for ports
        this.skinParts.childrenContainer = $('<div/>', {
            "class" : "children"
        });
        this.parentContainer.append(this.skinParts.childrenContainer);

        this.skinParts.leftPorts = $('<div/>', {
            "class" : "ports left"
        });
        this.skinParts.childrenContainer.append(this.skinParts.leftPorts);

        this.skinParts.centerPorts = $('<div/>', {
            "class" : "ports center"
        });
        this.skinParts.childrenContainer.append(this.skinParts.centerPorts);

        this.skinParts.rightPorts = $('<div/>', {
            "class" : "ports right"
        });
        this.skinParts.childrenContainer.append(this.skinParts.rightPorts);

        //hook up double click for node title edit
        this.skinParts.title.dblclick(function () {
            self._editNodeTitle.call(self);
        });

        this._updateModelComponent();

        this._renderPorts();
    };

    ModelWithPortsDecorator.prototype.update = function () {
        //this._update(this.id);
    };

    ModelWithPortsDecorator.prototype.onEvent = function (etype, eid) {
        var childNode;

        this.logger.debug("onEvent '" + etype + "', '" + eid + "'");

        switch (etype) {
        case "load":
            if (this.childrenIds.indexOf(eid) !== -1) {
                if (this.ports.hasOwnProperty(eid) !== true) {
                    childNode = this.project.getNode(eid);
                    if (childNode && childNode.getAttribute(nodeAttributeNames.isPort) === true) {
                        this._renderPort(childNode, false);
                    }
                }
            }
            break;
        case "update":
            this._update(eid);
            break;
        }
    };

    ModelWithPortsDecorator.prototype._update = function (objectId) {
        var updatedObject = this.project.getNode(objectId),
            oldChildrenIds,
            updatedChildrenIds,
            diffChildrenIds,
            i,
            childPort;

        if (objectId === this.id) {
            //the container node has been changed
            //- title change
            //- children added / removed
            this.skinParts.title.text(updatedObject.getAttribute(nodeAttributeNames.name));

            oldChildrenIds = this.childrenIds.splice(0);
            updatedChildrenIds = updatedObject.getChildrenIds() || [];

            //Handle children deletion
            diffChildrenIds = util.arrayMinus(oldChildrenIds, updatedChildrenIds);

            for (i = 0; i < diffChildrenIds.length; i += 1) {
                if (this.ports[diffChildrenIds[i]]) {
                    this.ownerComponent.unregisterSubcomponents([diffChildrenIds[i]]);
                    this.ports[diffChildrenIds[i]].el.remove();
                    delete this.ports[diffChildrenIds[i]];
                }
            }

            //Handle children addition
            diffChildrenIds = util.arrayMinus(updatedChildrenIds, oldChildrenIds);
            for (i = 0; i < diffChildrenIds.length; i += 1) {
                childPort = this.project.getNode(diffChildrenIds[i]);
                if (childPort && childPort.getAttribute(nodeAttributeNames.isPort) === true) {
                    this._renderPort(childPort, true);
                }
            }

            //finally store the actual children info for the parent
            this.childrenIds = updatedChildrenIds;
        } else {
            //a port has changed
            //here we are only interested in name change
            if (this.ports[objectId]) {
                this.ports[objectId].update({"title" : updatedObject.getAttribute(nodeAttributeNames.name)});
            }
        }

        this._refreshChildrenContainer();
    };

    ModelWithPortsDecorator.prototype._updateModelComponent = function () {
        this.ownerComponent.decoratorUpdated();
    };


    ModelWithPortsDecorator.prototype._editNodeTitle = function () {
        var self = this;

        //unbind dblclick for the time of edit
        this.skinParts.title.unbind("dblclick");

        // Replace node with <input>
        this.skinParts.title.editInPlace("modelTitle", function (newTitle) {
            self.project.setAttributes(self.id, "name", newTitle);
            self._refreshChildrenContainer();
        });

        //hook up double click for further node title edit
        this.skinParts.title.dblclick(function () {
            self._editNodeTitle.call(self);
        });
    };

    ModelWithPortsDecorator.prototype._renderPorts = function () {
        var node = this.project.getNode(this.id),
            i,
            childNode;

        this.childrenIds = node.getChildrenIds();

        //add ports
        for (i = 0; i < this.childrenIds.length; i += 1) {
            childNode = this.project.getNode(this.childrenIds[i]);
            if (childNode && childNode.getAttribute(nodeAttributeNames.isPort) === true) {
                this._renderPort(childNode, true);
            }
        }
        this._refreshChildrenContainer();

        //specify territory
        this.selfPatterns[this.id] = { "children": 1};
        this.project.updateTerritory(this.territoryId, this.selfPatterns);
    };

    ModelWithPortsDecorator.prototype._renderPort = function (portNode, ignoreChildrenContainerRefresh) {
        var portId = portNode.getId(),
            portOrientation = "W",
            portContainer = this.skinParts.leftPorts,
            portPosition = portNode.getRegistry(nodeRegistryNames.position);

        //check if the port should be on the left or right-side
        if (portPosition.x > 300) {
            portOrientation = "E";
            portContainer = this.skinParts.rightPorts;
        }

        this.ports[portId] = new Port(portId, { "title": portNode.getAttribute(nodeAttributeNames.name),
            "orientation": portOrientation,
            "modelEditorCanvas": this.ownerComponent.parentComponent});
        portContainer.append(this.ports[portId].el);
        this.ownerComponent.registerSubcomponents([portId]);

        if (ignoreChildrenContainerRefresh !== true) {
            this._refreshChildrenContainer();
        }
    };

    ModelWithPortsDecorator.prototype._refreshChildrenContainer = function () {
        var centerPortsWidth = this.skinParts.centerPorts.css("width", "").outerWidth(true),
            childrenContainerWidth = this.skinParts.childrenContainer.width(),
            leftPortsWidth = this.skinParts.leftPorts.outerWidth(true),
            rightPortsWidth = this.skinParts.rightPorts.outerWidth(true);

        if (childrenContainerWidth > leftPortsWidth + centerPortsWidth + rightPortsWidth) {
            this.skinParts.centerPorts.outerWidth(childrenContainerWidth - leftPortsWidth - rightPortsWidth);
        }

        //and let the parent object know about the bounding box change
        this._updateModelComponent();
    };

    ModelWithPortsDecorator.prototype.getConnectionPointsById = function (sourceId) {
        var result = [],
            i,
            bL = parseInt(this.parentContainer.css("border-left-width"), 10),
            bT = parseInt(this.parentContainer.css("border-top-width"), 10);

        //when this component know about the requested subcomponent
        //get its coordinate in the local model's coordinate system
        if (this.ports[sourceId]) {
            result = this.ports[sourceId].getConnectionPoints();

            for (i = 0; i < result.length; i += 1) {
                result[i].x += bL;
                result[i].y += bT;
            }
        }

        return result;
    };

    //decorator might want to override the owner element's connection points
    ModelWithPortsDecorator.prototype.getConnectionPoints = function () {
        var bBox = this.ownerComponent.getBoundingBox(),
            result = [];

        result.push({ "dir": "S", x: bBox.x + bBox.width / 2, y: bBox.y + bBox.height});
        result.push({ "dir": "N", x:  bBox.x + bBox.width / 2, y: bBox.y});

        return result;
    };

    ModelWithPortsDecorator.prototype.destroy = function () {
        var i;

        this.project.updateTerritory(this.territoryId, []);

        for (i in this.ports) {
            if (this.ports.hasOwnProperty(i)) {
                this.ports[i].el.remove();
                delete this.ports[i];
            }
        }

        this.logger.debug("Destroyed");
    };


    return ModelWithPortsDecorator;
});