"use strict";

define(['logManager',
    'clientUtil',
    'nodeAttributeNames',
    'nodeRegistryNames',
    './Port.js',
    'text!ModelEditorHTML/ModelWithPortsTmpl.html',
    'css!ModelEditorHTMLCSS/ModelWithPortsDecorator'], function (logManager,
                                                                 util,
                                                                 nodeAttributeNames,
                                                                 nodeRegistryNames,
                                                                 Port,
                                                                 modelWithPortsTmpl) {

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
            self = this,
            data = { "pid" : this.id};

        this.parentContainer.addClass("modelWithPorts");

        this.parentContainer.append($(_.template(modelWithPortsTmpl, data)));

        this.parentContainer.addClass("finishConn");
        this.parentContainer.attr("data-id", this.id);

        //create content controls
        this.skinParts.title = this.parentContainer.find(".modelTitle");
        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        this.skinParts.childrenContainer = this.parentContainer.find(".children");

        this.skinParts.leftPorts = this.parentContainer.find(".ports.left");
        this.skinParts.centerPorts = this.parentContainer.find(".ports.center");
        this.skinParts.rightPorts = this.parentContainer.find(".ports.right");

        this.skinParts.bottomConnRect = this.parentContainer.find(".myConnRect.bottom");
        this.skinParts.topConnRect = this.parentContainer.find(".myConnRect.top");

        this.skinParts.connLeft =  this.parentContainer.find("#connLeft");
        this.skinParts.connRight =  this.parentContainer.find("#connRight");

        /*this.skinParts.bottomConnRect.hide();
        this.skinParts.topConnRect.hide();*/

        //hook up double click for node title edit
        this.skinParts.title.dblclick(function (event) {
            self._editNodeTitle.call(self);
            event.stopPropagation();
            event.preventDefault();
        });

        //this._updateModelComponent();

        this._renderPorts();

        this.ownerComponent.afterDecoratorUpdate();
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
                    this.ownerComponent.beforeDecoratorUpdate();
                    childNode = this.project.getNode(eid);
                    if (childNode && childNode.getAttribute(nodeAttributeNames.isPort) === true) {
                        this._renderPort(childNode, false);
                    }
                    this.ownerComponent.afterDecoratorUpdate();
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
            childPort,
            leftPorts,
            rightPorts;

        //let the ModelComponent know that the decorator starts refreshing itself
        this.ownerComponent.beforeDecoratorUpdate();

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
                    //this.ownerComponent.unregisterSubcomponents([diffChildrenIds[i]]);
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
            //TODO: left or right orientation should be recalculated on port update????
            if (this.ports[objectId]) {
                this.ports[objectId].update({"title" : updatedObject.getAttribute(nodeAttributeNames.name)});
            }
        }

        //reset side connectability
        leftPorts = this.skinParts.leftPorts.find(".port");
        rightPorts = this.skinParts.rightPorts.find(".port");

        if (leftPorts.length === 0) {
            if (this.skinParts.connLeft.hasClass("connEndPoint") === false) {
                this.skinParts.connLeft.addClass("connEndPoint");
            }
        } else {
            this.skinParts.connLeft.removeClass("connEndPoint");
        }

        if (rightPorts.length === 0) {
            if (this.skinParts.connRight.hasClass("connEndPoint") === false) {
                this.skinParts.connRight.addClass("connEndPoint");
            }
        } else {
            this.skinParts.connRight.removeClass("connEndPoint");
        }

        //fix the layout of the ports
        this._refreshChildrenContainer();

        //let the ModelComponent know that the decorator has finished refreshing itself
        this.ownerComponent.afterDecoratorUpdate();
    };

    ModelWithPortsDecorator.prototype._editNodeTitle = function () {
        var self = this;

        //unbind dblclick for the time of edit
        this.skinParts.title.unbind("dblclick");

        // Replace node with <input>
        this.skinParts.title.editInPlace("modelTitle", function (newTitle) {
            self.ownerComponent.beforeDecoratorUpdate();
            self.project.setAttributes(self.id, "name", newTitle);
            self._refreshChildrenContainer();
            self.ownerComponent.afterDecoratorUpdate();
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

        if (portOrientation === "E") {
            this.skinParts.connRight.removeClass("connEndPoint");
        } else {
            this.skinParts.connLeft.removeClass("connEndPoint");
        }

        this.ports[portId] = new Port(portId, { "title": portNode.getAttribute(nodeAttributeNames.name),
            "orientation": portOrientation,
            "modelEditorCanvas": this.ownerComponent.parentComponent});
        portContainer.append(this.ports[portId].el);
        //this.ownerComponent.registerSubcomponents([portId]);

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

        this.skinParts.bottomConnRect.css("left", (this.parentContainer.width() - this.skinParts.bottomConnRect.outerWidth()) / 2);
        this.skinParts.topConnRect.css("left", (this.parentContainer.width() - this.skinParts.topConnRect.outerWidth()) / 2);
    };

    ModelWithPortsDecorator.prototype.destroy = function () {
        var i;

        this.project.updateTerritory(this.territoryId, {});

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