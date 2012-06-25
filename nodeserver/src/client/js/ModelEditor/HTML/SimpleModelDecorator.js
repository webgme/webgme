"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'nodeAttributeNames'], function (logManager,
             util,
             commonUtil,
             nodeAttributeNames) {

    var SimpleModelDecorator;

    //load its own CSS file
    util.loadCSS('css/ModelEditor/SimpleModelDecorator.css');

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
        var node = this.project.getNode(this.id),
            self = this;

        this.parentContainer.addClass("modelBasic");

        //create content controls
        this.skinParts.title = $('<div/>');
        this.skinParts.title.addClass("modelTitle");
        this.parentContainer.append(this.skinParts.title);

        //apply content to controls
        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        setTimeout(function () {self._updateModelComponent(); }, 10);
    };

    SimpleModelDecorator.prototype.update = function () {
        var node = this.project.getNode(this.id);

        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        this._updateModelComponent();
    };

    SimpleModelDecorator.prototype._updateModelComponent = function () {
        this.ownerComponent.decoratorUpdated();
    };

    return SimpleModelDecorator;
});