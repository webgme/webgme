"use strict";

define(['logManager',
    'clientUtil',
    'text!ModelEditor2/ModelWithAttributesTmpl.html',
    'css!ModelEditor2CSS/ModelWithAttributesDecorator'], function (logManager,
                                                                   util,
                                                                   modelWithAttributesTmpl) {

    var ModelWithAttributesDecorator;

    ModelWithAttributesDecorator = function (objectDescriptor) {
        this._project = objectDescriptor.client;
        this._id = objectDescriptor.id;
        this._name = objectDescriptor.name;
        this._ownerComponent = objectDescriptor.ownerComponent;

        this._skinParts = {};

        this._logger = logManager.create("ModelWithAttributesDecorator_" + this._id);
        this._logger.debug("Created");

    };

    ModelWithAttributesDecorator.prototype.beforeAppend = function () {
        this._initializeUI();

        this._ownerComponent.decoratorUpdated();
    };

    ModelWithAttributesDecorator.prototype._DOMBase = $(modelWithAttributesTmpl);

    ModelWithAttributesDecorator.prototype._initializeUI = function () {
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
        this.modelComponentEl.addClass("modelWithAttributes finishConn");

        this._skinParts.bottomConnRect.attr({"data-id": this._id});
        this._skinParts.topConnRect.attr({"data-id": this._id});

        this._skinParts.connEndPointLeft.attr({"data-id": this._id});
        this._skinParts.connEndPointRight.attr({"data-id": this._id});
        this._skinParts.connEndPointTop.attr({"data-id": this._id});
        this._skinParts.connEndPointBottom.attr({"data-id": this._id});

        this._skinParts.title.text(this._name);
        this._renderAttributes();

        //hook up double click for node title edit
        this._skinParts.title.dblclick(function (event) {
            self._editNodeTitle.call(self);
            event.stopPropagation();
            event.preventDefault();
        });
    };

    ModelWithAttributesDecorator.prototype.afterAppend = function () {
    };

    ModelWithAttributesDecorator.prototype.update = function (objDescriptor) {
        //we handle the updates in our own territory update handler
        //by default the update should be handled here
        //and once it finishes, call back
        if (this._name !== objDescriptor.name) {
            this._name = objDescriptor.name;
            this._skinParts.title.text(this._name);
        }

        this._renderAttributes();

        this._ownerComponent.decoratorUpdated();
    };

    ModelWithAttributesDecorator.prototype._renderAttributes = function () {
        var modelNode = this._project.getNode(this._id),
            modelAttrNames = modelNode.getAttributeNames().sort().reverse(),
            modelAttributeValues = {},
            i,
            str = "";

        this._skinParts.attributesContainer.empty();

        i = modelAttrNames.length;

        if (i > 0) {
            i -= 1;

            while (i >= 0) {
                modelAttributeValues[modelAttrNames[i]] = modelNode.getAttribute(modelAttrNames[i]);
                str += "<tr><td>" + modelAttrNames[i] + ":</td><td class='sep'></td><td>" + modelAttributeValues[modelAttrNames[i]] + "</td></tr>";
                i -= 1;
            }

            this._skinParts.attributesContainer.html("<table>" + str + "</table>");
        }
    };

    ModelWithAttributesDecorator.prototype._editNodeTitle = function () {
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
    ModelWithAttributesDecorator.prototype.destroy = function () {
        this._logger.debug("Destroyed");
    };


    return ModelWithAttributesDecorator;
});