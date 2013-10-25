"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    '../../DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget',
    'text!./MetaDecorator.DiagramDesignerWidget.html',
    './Attribute',
    './AttributeDetailsDialog',
    'js/Panels/MetaEditor/MetaRelations',
    'css!./MetaDecorator.DiagramDesignerWidget'], function (CONSTANTS,
                                                          nodePropertyNames,
                                                          DefaultDecoratorDiagramDesignerWidget,
                                                          MetaDecoratorTemplate,
                                                          Attribute,
                                                          AttributeDetailsDialog,
                                                          MetaRelations) {

    var MetaDecorator,
        __parent__ = DefaultDecoratorDiagramDesignerWidget,
        __parent_proto__ = DefaultDecoratorDiagramDesignerWidget.prototype,
        DECORATOR_ID = "MetaDecorator";

    MetaDecorator = function (options) {

        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.name = "";
        this._attributeNames = [];
        this._attributes = {};
        this._skinParts = { "$name": undefined,
                            "$attributesContainer": undefined,
                            "$addAttributeContainer": undefined };

        this.logger.debug("MetaDecorator ctor");
    };

    _.extend(MetaDecorator.prototype, __parent_proto__);
    MetaDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    MetaDecorator.prototype.$DOMBase = $(MetaDecoratorTemplate);

    MetaDecorator.prototype.on_addTo = function () {
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

    MetaDecorator.prototype._renderContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            self = this;

        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find name placeholder
        this._skinParts.$name = this.$el.find(".name");
        this._skinParts.$attributesContainer = this.$el.find(".attributes");
        this._skinParts.$addAttributeContainer = this.$el.find(".add-new");

        if (this.hostDesignerItem.canvas.getIsReadOnlyMode() === true) {
            this._skinParts.$addAttributeContainer.detach();
        }

        /* FILL WITH DATA */
        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";
            this._refreshName();

            this._updateAttributes();
        }

        this._skinParts.$attributesContainer.on('dblclick', 'li', function (e) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                var attrName = $(this).find('.n').text().replace(":", ""),
                    attrNames = self._attributeNames.slice(0),
                    dialog = new AttributeDetailsDialog(),
                    desc = _.extend({}, nodeObj.getAttributeDescriptor(attrName));

                //pass all the other attribute names to the dialog
                attrNames.splice(self._attributeNames.indexOf(attrName), 1);

                dialog.show(desc, attrNames, function (attrDesc) {
                        self.saveAttributeDescriptor(attrName, attrDesc);
                    },
                    function () {
                        self.deleteAttributeDescriptor(attrName);
                    }
                );
            }

            e.stopPropagation();
            e.preventDefault();
        });
    };

    MetaDecorator.prototype.update = function () {
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

    MetaDecorator.prototype._refreshName = function () {
        this._skinParts.$name.text(this.name);
        this._skinParts.$name.attr("title", this.name);
    };

    /***************  CUSTOM DECORATOR PART ****************************/
    MetaDecorator.prototype._updateAttributes = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newAttributes = nodeObj ? nodeObj.getAttributeNames() : [],
            len,
            displayedAttributes = this._attributeNames.slice(0),
            diff,
            attrLIBase = $('<li/>'),
            i;

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

        //finally update UI
        this._attributeNames.sort();
        this._skinParts.$attributesContainer.empty();
        len = this._attributeNames.length;
        for (i = 0; i < len; i += 1) {
            this._skinParts.$attributesContainer.append(attrLIBase.clone().append(this._attributes[this._attributeNames[i]].$el));
        }


    };

    MetaDecorator.prototype._addAttribute = function (attrName) {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            attrMetaDescriptor = nodeObj.getAttributeDescriptor(attrName);

        if (attrMetaDescriptor) {
            this._attributes[attrName] = new Attribute(attrMetaDescriptor);
            this._attributeNames.push(attrName);
        }
    };


    MetaDecorator.prototype._removeAttribute = function (attrName) {
        var idx = this._attributeNames.indexOf(attrName);

        if (idx !== -1) {
            this._attributes[attrName].destroy();
            delete this._attributes[attrName];
            this._attributeNames.splice(idx, 1);
        }
    };


    MetaDecorator.prototype.destroy = function () {
        var len = this._attributeNames.length;
        while (len--) {
            this._removeAttribute(this._attributeNames[len]);
        }
    };

    /**************** EDIT NODE TITLE ************************/

    MetaDecorator.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

    /**************** CREATE NEW ATTRIBUTE ********************/
    MetaDecorator.prototype._onNewAttributeClick = function () {
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


    MetaDecorator.prototype._onNewAttributeCreate = function (attrName) {
        var desc,
            self = this,
            attrNames = this._attributeNames.slice(0),
            dialog = new AttributeDetailsDialog();

        this.logger.debug("_onNewAttributeCreate: " + attrName);

        //pass all the other attribute names to the dialog
        attrNames.splice(this._attributeNames.indexOf(attrName), 1);

        desc = {'name': attrName,
            'type': 'string',
            'isEnum': false };

        dialog.show(desc, attrNames, function (attrDesc) {
            self.saveAttributeDescriptor(attrName, attrDesc);
        });
    };

    MetaDecorator.prototype._isValidName = function (attrName) {
        var result = true;

        if (attrName === '' ||
            typeof attrName !== 'string' ||
            this._attributeNames.indexOf(attrName) !== -1) {
            result = false;
        }

        return result;
    };

    MetaDecorator.prototype.readOnlyMode = function (readOnlyMode) {
        __parent_proto__.readOnlyMode.call(this, readOnlyMode);

        this._setReadOnlyMode(readOnlyMode);
    };

    MetaDecorator.prototype._setReadOnlyMode = function (readOnly) {
        if (readOnly === true) {
            this._skinParts.$addAttributeContainer.detach();
            this.$el.find('input.new-attr').val('').blur();
        } else {
            this._skinParts.$addAttributeContainer.insertAfter(this._skinParts.$attributesContainer);
        }
    };

    MetaDecorator.prototype.saveAttributeDescriptor = function (attrName, attrDesc) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID];

        client.startTransaction();

        //this.logger.warning('saveAttributeDescriptor: ' + name + ', attrDesc: ' + JSON.stringify(attrDesc));
        if (attrName !== attrDesc.name) {
            //name has changed --> delete the descriptor with the old name
            client.delAttributeDescriptor(objID, attrName);
            //TODO: as of now we have to create an alibi attribute instance with the same name
            //TODO: just because of this hack, make sure that the name is not overwritten
            //TODO: just because of this hack, delete the alibi attribute as well
            if (attrName !== nodePropertyNames.Attributes.name)
            {
                client.delAttributes(objID, attrName);
            }
        }

        client.setAttributeDescriptor(objID, attrDesc.name, attrDesc);
        //TODO: as of now we have to create an alibi attribute instance with the same name
        //TODO: just because of this hack, make sure that the name is not overwritten
        if (attrDesc.name !== nodePropertyNames.Attributes.name)
        {
            client.setAttributes(objID, attrDesc.name, attrDesc.defaultValue);
        }

        client.completeTransaction();
    };

    MetaDecorator.prototype.deleteAttributeDescriptor = function (attrName) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID];

        client.startTransaction();

        client.delAttributeDescriptor(objID, attrName);
        //TODO: as of now we have to create an alibi attribute instance with the same name
        //TODO: just because of this hack, make sure that the name is not overwritten
        //TODO: just because of this hack, delete the alibi attribute as well
        if (attrName !== nodePropertyNames.Attributes.name)
        {
            client.delAttributes(objID, attrName);
        }

        client.completeTransaction();
    };


    MetaDecorator.prototype.getConnectionAreas = function (id, isEnd, connectionMetaInfo) {
        var result = [],
            edge = 10,
            LEN = 20,
            connType = connectionMetaInfo && connectionMetaInfo[MetaRelations.CONNECTION_META_INFO.TYPE] ? connectionMetaInfo[MetaRelations.CONNECTION_META_INFO.TYPE] : null,
            cN,
            cE,
            cW,
            cS;

        //by default return the bounding box edge's midpoints

        if (id === undefined || id == this.hostDesignerItem.id) {
            //NORTH
            cN = {"id": "0",
                "x1": edge,
                "y1": 0,
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": 0,
                "angle1": 270,
                "angle2": 270,
                "len": LEN};

            //EAST
            cE = {"id": "1",
                "x1": this.hostDesignerItem.getWidth(),
                "y1": edge,
                "x2": this.hostDesignerItem.getWidth(),
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 0,
                "angle2": 0,
                "len": LEN};

            //SOUTH
            cS = {"id": "2",
                "x1": edge,
                "y1": this.hostDesignerItem.getHeight(),
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": this.hostDesignerItem.getHeight(),
                "angle1": 90,
                "angle2": 90,
                "len": LEN};

            //WEST
            cW = {"id": "3",
                "x1": 0,
                "y1": edge,
                "x2": 0,
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 180,
                "angle2": 180,
                "len": LEN};

            if (connType && connType === MetaRelations.META_RELATIONS.INHERITANCE) {
                //if the connection is inheritance
                //it can be NORTH only if destination
                //it can be SOUTH only if source
                if (isEnd) {
                    result.push(cN);
                } else {
                    result.push(cS);
                }
            } else {
                result.push(cN);
                result.push(cE);
                result.push(cS);
                result.push(cW);
            }
        }

        return result;
    };

    return MetaDecorator;
});