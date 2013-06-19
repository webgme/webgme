"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DecoratorBase',
    'text!./AttributesDecoratorTemplate.html',
    './Attribute',
    'css!/css/Decorators/DiagramDesigner/AttributesDecorator/AttributesDecorator'], function (logManager,
                                                          util,
                                                          CONSTANTS,
                                                          nodePropertyNames,
                                                          DecoratorBase,
                                                          AttributesDecoratorTemplate,
                                                          Attribute) {

    var AttributesDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "AttributesDecorator";

    AttributesDecorator = function (options) {

        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.name = "";
        this._attributeNames = [];
        this._attributes = {};
        this._skinParts = { "$name": undefined,
                            "$attributesContainer": undefined,
                            "$addAttributeContainer": undefined };

        this.logger.debug("AttributesDecorator ctor");
    };

    _.extend(AttributesDecorator.prototype, __parent_proto__);
    AttributesDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    AttributesDecorator.prototype.$DOMBase = $(AttributesDecoratorTemplate);

    AttributesDecorator.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this._skinParts.$name.on("dblclick.editOnDblClick", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "onChange": function (oldValue, newValue) {
                        self._onNodeTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //set the "Add new..." editable
        this._skinParts.$addAttributeContainer.on("click", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                self._onNewAttributeClick();
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    AttributesDecorator.prototype.on_addToPartBrowser = function () {
        //let the parent decorator class do its job first
        __parent_proto__.on_addToPartBrowser.apply(this, arguments);

        this._renderContent();
    };

    AttributesDecorator.prototype._renderContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find name placeholder
        this._skinParts.$name = this.$el.find(".name");
        this._skinParts.$attributesContainer = this.$el.find(".attributes");
        this._skinParts.$addAttributeContainer = this.$el.find(".add-new");

        if (this.renderedInPartBrowser === true) {
            this._skinParts.$addAttributeContainer.remove();
        } else {
            if (this.hostDesignerItem.canvas.getIsReadOnlyMode() === true) {
                this._skinParts.$addAttributeContainer.detach();
            }
        }

        /* FILL WITH DATA */
        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";
            this._refreshName();

            this._updateAttributes();
        }
    };

    AttributesDecorator.prototype.update = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newName = "";

        if (nodeObj) {
            newName = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";

            if (this.name !== newName) {
                this.name = newName;
                this._refreshName();
            }

            this._updateAttributes();
        }
    };

    AttributesDecorator.prototype._refreshName = function () {
        this._skinParts.$name.text(this.name);
        this._skinParts.$name.attr("title", this.name);
    };

    /***************  CUSTOM DECORATOR PART ****************************/
    AttributesDecorator.prototype._updateAttributes = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newAttributes = nodeObj ? nodeObj.getAttributeNames() : [],
            len,
            displayedAttributes = this._attributeNames.slice(0),
            diff;

        //first get the ones that are not there anymore
        diff = _.difference(displayedAttributes, newAttributes);
        len = diff.length;
        while (len--) {
            this._removeAttribute(diff[len]);
        }

        //second get the ones that are new
        diff = _.difference(newAttributes, displayedAttributes);
        len = diff.length;
        while (len--) {
            this._addAttribute(diff[len]);
        }
    };

    AttributesDecorator.prototype._addAttribute = function (attrName) {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            attr = nodeObj.getAttribute(attrName),
            attrDesc = {"name": attrName,
                        "type": typeof attr},
            i,
            len = this._attributeNames.length,
            li = $('<li/>');


        this._attributes[attrName] = {'li': li,
                                    'attrInstance': new Attribute(attrDesc)};

                                    //find its place in the ordered list
        for (i = 0; i < len; i+= 1) {
            if (this._attributeNames[i] > attrName) {
                break;
            }
        }
        
        if (i === len) {
            //append to the end
            this._skinParts.$attributesContainer.append(li.append(this._attributes[attrName].attrInstance.$el));
            this._attributeNames.push(attrName);
        } else {
            //insert at index i
            li.append(this._attributes[attrName].attrInstance.$el).insertBefore(this._attributes[this._attributeNames[i]].li);
            this._attributeNames.splice(i, 0, attrName);
        }
    };

    AttributesDecorator.prototype._removeAttribute = function (attrName) {
        var idx = this._attributeNames.indexOf(attrName);

        if (idx !== -1) {
            this._attributes[attrName].attrInstance.destroy();
            this._attributes[attrName].li.remove();
            delete this._attributes[attrName];
            this._attributeNames.splice(idx, 1);
        }
    };



    AttributesDecorator.prototype.destroy = function () {
        var len = this._attributeNames.length;
        while (len--) {
            this._removeAttribute(this._attributeNames[len]);
        }
    };

    /**************** EDIT NODE TITLE ************************/

    AttributesDecorator.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

    /**************** CREATE NEW ATTRIBUTE ********************/
    AttributesDecorator.prototype._onNewAttributeClick = function () {
        var inputCtrl,
            w = this._skinParts.$attributesContainer.width(),
            cancel,
            save,
            endEdit,
            self = this,
            ctrlGroup;

        this._skinParts.$addAttributeContainer.detach();

        endEdit = function () {
            ctrlGroup.remove();
            self._skinParts.$addAttributeContainer.insertAfter(self._skinParts.$attributesContainer);
        };

        cancel = function () {
            endEdit();
        };

        save = function () {
            var attrName = inputCtrl.val();

            if (self._isValidName(attrName)) {
                //call onNewAttrCreate
                self._onNewAttributeCreate(attrName);

                //call finish
                endEdit();
            }
        };

        ctrlGroup = $("<div/>",
                    {"class": "control-group"});

        inputCtrl = $("<input/>", {
                    "type": "text",
                    "class": "new-attr"});

        inputCtrl.outerWidth(w);
        inputCtrl.css({"box-sizing": "border-box",
                    "margin": "0px"});

        ctrlGroup.append(inputCtrl);

        ctrlGroup.insertAfter(this._skinParts.$attributesContainer);

        //finally put the control in focus
        inputCtrl.focus();

        //hook up event handlers to 'save' and 'cancel'
        inputCtrl.keydown(
            function (event) {
                switch (event.which) {
                    case 27: // [esc]
                        // discard changes on [esc]
                        inputCtrl.val('');
                        event.preventDefault();
                        event.stopPropagation();
                        cancel();
                        break;
                    case 13: // [enter]
                        // simulate blur to accept new value
                        event.preventDefault();
                        event.stopPropagation();
                        save();
                        break;
                    case 46:// DEL
                        //don't need to handle it specially but need to prevent propagation
                        event.stopPropagation();
                        break;
                }
            }
        ).keyup( function (/*event*/) {
            if (self._isValidName(inputCtrl.val())) {
                ctrlGroup.removeClass("error");
            } else {
                ctrlGroup.addClass("error");
            }
        }).blur(function (/*event*/) {
            cancel();
        });
    };


    AttributesDecorator.prototype._onNewAttributeCreate = function (attrName) {
        var client = this._control._client,
            defaultValue = '';

        this.logger.debug("_onNewAttributeCreate: " + attrName);

        if (this._isValidName(attrName)) {
            client.setAttributes(this._metaInfo[CONSTANTS.GME_ID],attrName,defaultValue);
        }
    };

    AttributesDecorator.prototype._isValidName = function (attrName) {
        if (typeof attrName !== 'string') {
            return false;
        }

        if (attrName === '') {
            return false;
        }

        if (this._attributeNames.indexOf(attrName) !== -1) {
            return false;
        }

        return true;
    };

    AttributesDecorator.prototype.readOnlyMode = function (readOnlyMode) {
        __parent_proto__.readOnlyMode.call(this, readOnlyMode);

        this._setReadOnlyMode(readOnlyMode);
    };

    AttributesDecorator.prototype._setReadOnlyMode = function (readOnly) {
        if (readOnly === true) {
            this._skinParts.$addAttributeContainer.detach();
            this.$el.find('input.new-attr').val('').blur();
        } else {
            this._skinParts.$addAttributeContainer.insertAfter(this._skinParts.$attributesContainer);
        }
    };

    AttributesDecorator.prototype.getConnectionAreas = function (id) {
        var result = [],
            edge = 10;

        //by default return the bounding box edges midpoints

        if (id === undefined || id === this.hostDesignerItem.id) {
            //top left
            result.push( {"id": "0",
                "x": edge,
                "y": 0,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "N",
                "len": 10} );

            result.push( {"id": "1",
                "x": edge,
                "y": this.hostDesignerItem.height,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "S",
                "len": 10} );
        }


        return result;
    };

    return AttributesDecorator;
});