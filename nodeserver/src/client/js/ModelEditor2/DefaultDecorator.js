"use strict";

define(['logManager',
    'clientUtil',
    'text!ModelEditor2/DefaultTmpl.html',
    'css!ModelEditor2CSS/DefaultDecorator'], function (logManager,
                                                                   util,
                                                                   defaultTmpl) {

    var DefaultDecorator;

    DefaultDecorator = function (objectDescriptor, parentWidget) {
        this._project = objectDescriptor.client;
        this._id = objectDescriptor.id;
        this._name = objectDescriptor.name;
        this._ownerComponent = objectDescriptor.ownerComponent;
        this._parentWidget = parentWidget;

        this._skinParts = {};

        this._logger = logManager.create("DefaultDecorator_" + this._id);
        this._logger.debug("Created");

    };

    DefaultDecorator.prototype.beforeAppend = function () {
        this._initializeUI();

        this._ownerComponent.decoratorUpdated();
    };

    DefaultDecorator.prototype._DOMBase = $(defaultTmpl);

    DefaultDecorator.prototype._initializeUI = function () {
        var self = this;

        this.modelComponentEl = this._ownerComponent.el;
        this.modelComponentEl.append(this._DOMBase.clone());

        //find components
        this._skinParts.title = this.modelComponentEl.find(".modelTitle");
        this._skinParts.attributesContainer = this.modelComponentEl.find(".attributes");

        this._skinParts.bottomConnRect = this.modelComponentEl.find(".myConnRect.bottom");
        this._skinParts.topConnRect = this.modelComponentEl.find(".myConnRect.top");

        this._skinParts.connEndPointLeft =  this.modelComponentEl.find(".connEndPoint.left");
        this._skinParts.connEndPointRight =  this.modelComponentEl.find(".connEndPoint.right");
        this._skinParts.connEndPointTop =  this.modelComponentEl.find(".connEndPoint.top");
        this._skinParts.connEndPointBottom =  this.modelComponentEl.find(".connEndPoint.bottom");

        //set additional attributes
        this.modelComponentEl.attr({"data-id": this._id});
        this.modelComponentEl.addClass("modelDefault finishConn");

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

    DefaultDecorator.prototype.afterAppend = function () {
    };

    DefaultDecorator.prototype.update = function (objDescriptor) {
        //we handle the updates in our own territory update handler
        //by default the update should be handled here
        //and once it finishes, call back
        if (this._name !== objDescriptor.name) {
            this._name = objDescriptor.name;
            this._skinParts.title.text(this._name);
        }

        this._ownerComponent.decoratorUpdated();
    };

    DefaultDecorator.prototype._editNodeTitle = function () {
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

    //in the destroy there is no need to touch the UI, it will be cleared out
    //release the territory, release everything needs to be released and return
    DefaultDecorator.prototype.destroy = function () {
        this._logger.debug("Destroyed");
    };

    DefaultDecorator.prototype.renderPartBrowserItem = function () {
        return $('<div class="modelDefault"><div class="modelTitle">' + this._name + '</div></div>');
    };


    return DefaultDecorator;
});