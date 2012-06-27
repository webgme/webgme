"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'nodeAttributeNames',
    'css!ModelEditorHTMLCSS/SimpleModelDecorator'], function (logManager,
             util,
             commonUtil,
             nodeAttributeNames) {

    var SimpleModelDecorator;

    SimpleModelDecorator = function (ownerComponent) {
        this.project = ownerComponent.project;
        this.id = ownerComponent.getId();
        this.skinParts = {};
        this.parentContainer = ownerComponent.el;
        this.ownerComponent = ownerComponent;

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

    SimpleModelDecorator.prototype.update = function () {
        var node = this.project.getNode(this.id);

        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        this._updateModelComponent();
    };

    SimpleModelDecorator.prototype._updateModelComponent = function () {
        this.ownerComponent.decoratorUpdated();
    };

    SimpleModelDecorator.prototype.destroy = function () {
        this.logger.debug("Destroyed");
    };

    return SimpleModelDecorator;
});