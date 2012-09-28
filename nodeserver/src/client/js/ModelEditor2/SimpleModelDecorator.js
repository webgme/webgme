"use strict";

define(['logManager',
    'nodeAttributeNames',
    'css!ModelEditor2CSS/SimpleModelDecorator'], function (logManager,
                                                              nodeAttributeNames) {

    var SimpleModelDecorator;

    SimpleModelDecorator = function (objectDescriptor) {
        this.project = objectDescriptor.client;
        this.id = objectDescriptor.id;
        this.skinParts = {};
        this.ownerComponent = objectDescriptor.ownerComponent;
        this.parentContainer = objectDescriptor.ownerComponent.el;

        this.logger = logManager.create("SimpleModelDecorator_" + this.id);
        this.logger.debug("Created");
    };

    SimpleModelDecorator.prototype.render = function () {
        var node = this.project.getNode(this.id);

        this.parentContainer.addClass("modelBasic");

        //create content controls
        this.skinParts.title = $('<div/>');
        this.skinParts.title.addClass("modelTitle");
        this.parentContainer.append(this.skinParts.title);

        //apply content to controls
        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        this._updateModelComponent();
    };

    SimpleModelDecorator.prototype._updateModelComponent = function () {
        this.ownerComponent.decoratorUpdated();
    };

    SimpleModelDecorator.prototype.update = function () {
        var node = this.project.getNode(this.id);

        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        this._updateModelComponent();
    };

    SimpleModelDecorator.prototype.destroy = function () {
        this.logger.debug("Destroyed");
    };

    return SimpleModelDecorator;
});