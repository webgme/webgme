"use strict";

define(['logManager',
    'clientUtil',
    'js/NodePropertyNames',
    'js/Decorators/DecoratorDB',
    'js/Constants',
    'js/Panels/MetaEditor/MetaEditorConstants'], function (logManager,
                                        util,
                                        nodePropertyNames,
                                        DecoratorDB,
                                        CONSTANTS,
                                        MetaEditorConstants) {

    var PropertyEditorController;

    PropertyEditorController = function (client, propertyGrid) {
        this._client = client;
        this._propertyGrid = propertyGrid;

        this._initEventHandlers();

        this._logger = logManager.create("PropertyEditorController");
        this._logger.debug("Created");
    };

    PropertyEditorController.prototype._initEventHandlers = function () {
        var self = this;

        if (this._client) {
            this._client.addEventListener(this._client.events.PROPERTY_EDITOR_SELECTION_CHANGED, function (__project, idList) {
                self._selectedObjectsChanged(idList);
            });
        }

        this._propertyGrid.onFinishChange(function (args) {
            self._onPropertyChanged(args);
        });
    };

    PropertyEditorController.prototype._selectedObjectsChanged = function (idList) {
        var patterns = {},
            i;

        this._idList = idList;

        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
        }

        if (idList.length > 0) {
            i = idList.length;
            while (i--) {
                patterns[idList[i]] = { "children": 0 };
            }

            this._territoryId = this._client.addUI(this, true);
            this._client.updateTerritory(this._territoryId, patterns);
        }
    };

    PropertyEditorController.prototype.onOneEvent = function (/*events*/) {
        this._refreshPropertyList();
    };

    PropertyEditorController.prototype._refreshPropertyList = function () {
        var propList = this._getCommonPropertiesForSelection(this._idList);
        this._propertyGrid.setPropertyList(propList);
    };

    PropertyEditorController.prototype._getCommonPropertiesForSelection = function (selectedObjIDs) {
        var propList = {},
            selectionLength = selectedObjIDs.length,
            cNode,
            i,
            flattenedAttrs,
            flattenedRegs,
            flattenedPointers,
            commonAttrs = {},
            commonRegs = {},
            commonPointers = {},
            noCommonValueColor = "#f89406",
            _getNodePropertyValues, //fn
            _filterCommon, //fn
            _addItemsToResultList,  //fn
            _getPointerInfo,
            commonAttrMeta = {},
            buildCommonAttrMeta,     //fn
            _client = this._client;

        _getNodePropertyValues = function (node, propNameFn, propValueFn) {
            var result =  {},
                attrNames = node[propNameFn](),
                len = attrNames.length;

            while (--len >= 0) {
                result[attrNames[len]] = node[propValueFn](attrNames[len]);
            }

            return util.flattenObject(result);
        };

        _filterCommon = function (resultList, otherList, initPhase) {
            var it;

            if (initPhase === true) {
                for (it in otherList) {
                    if (otherList.hasOwnProperty(it)) {
                        resultList[it] = { "value": otherList[it],
                            "valueType": typeof otherList[it],
                            "isCommon": true };
                    }
                }
            } else {
                for (it in resultList) {
                    if (resultList.hasOwnProperty(it)) {
                        if (otherList.hasOwnProperty(it)) {
                            if (resultList[it].isCommon) {
                                resultList[it].isCommon = resultList[it].value === otherList[it];
                            }
                        } else {
                            delete resultList[it];
                        }
                    }
                }
            }
        };

        _getPointerInfo = function (node) {
            var result = {},
                availablePointers = node.getPointerNames(),
                len = availablePointers.length;

            while (len--) {
                result[availablePointers[len]] = node.getPointer(availablePointers[len]).to || '';
                if (availablePointers[len] === CONSTANTS.POINTER_BASE) {
                    var baseNode = _client.getNode(result[availablePointers[len]]);
                    if (baseNode) {
                        result[availablePointers[len]] = baseNode.getAttribute(nodePropertyNames.Attributes.name) + ' (' + result[availablePointers[len]] + ')';
                    }
                }
            }

            return util.flattenObject(result);
        };

        buildCommonAttrMeta = function (node, initPhase) {
            var nodeId = node.getId(),
                nodeAttributeNames = _client.getValidAttributeNames(nodeId) || [],
                len = nodeAttributeNames.length,
                attrMetaDescriptor,
                attrName,
                isCommon,
                commonEnumValues,
                isEnumCommon,
                isEnumAttrMeta;

            //first delete the ones from the common that does not exist in this node
            for (attrName in commonAttrMeta) {
                if (commonAttrMeta.hasOwnProperty(attrName)) {
                    if (nodeAttributeNames.indexOf(attrName) === -1) {
                        delete commonAttrMeta[attrName];
                    }
                }
            }

            //for the remaining list check if still common
            //common: type is the same
            //if type is enum, the common types should be the intersection of the individual enum types
            while (len--) {
                attrName = nodeAttributeNames[len];
                attrMetaDescriptor = _client.getAttributeSchema(nodeId,attrName);
                if (commonAttrMeta.hasOwnProperty(attrName)) {
                    isCommon = true;
                    //this attribute already exist in the attribute meta map
                    //let's see if it is still common
                    if (attrMetaDescriptor) {
                        if (commonAttrMeta[attrName].type === attrMetaDescriptor.type) {
                            isEnumCommon = commonAttrMeta[attrName].enum && commonAttrMeta[attrName].enum.length > 0;
                            isEnumAttrMeta = attrMetaDescriptor.enum && attrMetaDescriptor.enum.length > 0;
                            if (isEnumCommon && isEnumAttrMeta) {
                                //same type, both enum
                                //get the intersection of the enum values
                                commonEnumValues = _.intersection(commonAttrMeta[attrName].enum, attrMetaDescriptor.enum);

                                if (commonEnumValues.length !== commonAttrMeta[attrName].enum.length) {
                                    if (commonEnumValues.length === 0) {
                                        //0 common enum values, can not consider common attribute anymore
                                        isCommon = false;
                                    } else {
                                        //has common values but less than before
                                        //store the new common values
                                        commonAttrMeta[attrName].enum = commonEnumValues.slice(0);
                                    }
                                }
                            } else {
                                //not both are enum
                                //if only one is enum --> not common anymore
                                //if both are not enum --> still common
                                if (!isEnumCommon && !isEnumAttrMeta) {

                                } else {
                                    isCommon = false;
                                }
                            }
                        } else {
                            //different types, for sure it's not common anymore
                            isCommon = false;
                        }
                    } else {
                        //node meta descriptor in this node
                        //it's not common then
                        //NOTE: it should never happen probably
                        isCommon = false;
                    }

                    //if not common, delete it from attribute map
                    if (!isCommon) {
                        delete commonAttrMeta[attrName];
                    }
                } else {
                    //no entry for this attribute
                    //in init phase, create entry
                    if (initPhase) {
                        if (attrMetaDescriptor) {
                            commonAttrMeta[attrName] = {};
                            _.extend(commonAttrMeta[attrName], attrMetaDescriptor);
                        }
                    }
                }
            }
        };

        if (selectionLength > 0) {
            //get all attributes
            //get all registry elements
            i = selectionLength;
            while (--i >= 0) {
                cNode = this._client.getNode(selectedObjIDs[i]);

                if (cNode) {
                    flattenedAttrs = _getNodePropertyValues(cNode, "getAttributeNames", "getAttribute");
                    buildCommonAttrMeta(cNode, i === selectionLength - 1);

                    _filterCommon(commonAttrs, flattenedAttrs, i === selectionLength - 1);

                    flattenedRegs = _getNodePropertyValues(cNode, "getRegistryNames", "getRegistry");

                    _filterCommon(commonRegs, flattenedRegs, i === selectionLength - 1);

                    flattenedPointers = _getPointerInfo(cNode);

                    _filterCommon(commonPointers, flattenedPointers, i === selectionLength - 1);
                }
            }

            _addItemsToResultList = function (srcList, prefix, dstList, isAttribute) {
                var i,
                    extKey,
                    keyParts,
                    doDisplay;

                if (prefix !== "") {
                    prefix += ".";
                }

                for (i in srcList) {
                    if (srcList.hasOwnProperty(i)) {
                        doDisplay = true;

                        if (isAttribute && !commonAttrMeta.hasOwnProperty(i)) {
                            doDisplay = false;
                        }

                        if (doDisplay) {
                            extKey = prefix + i;
                            keyParts = i.split(".");

                            dstList[extKey] = { "name": keyParts[keyParts.length - 1],
                                "value": srcList[i].value,
                                "valueType": srcList[i].valueType};

                            if (i === "position.x" || i === "position.y") {
                                dstList[extKey].minValue = 0;
                                dstList[extKey].stepValue = 10;
                            }

                            if (srcList[i].readOnly === false || srcList[i].readOnly === true) {
                                dstList[extKey].readOnly = srcList[i].readOnly;
                            }

                            if (srcList[i].isCommon === false) {
                                dstList[extKey].value = "";
                                dstList[extKey].options = {"textColor": noCommonValueColor};
                            }

                            if (extKey.indexOf(".x") > -1) {
                                //let's say its inherited, make it italic
                                dstList[extKey].options = dstList[extKey].options || {};
                                dstList[extKey].options.textItalic = true;
                                dstList[extKey].options.textBold = true;
                            }

                            //decorator value should be rendered as an option list
                            if (i === nodePropertyNames.Registry.decorator) {
                                //dstList[extKey].valueType = "option";
                                //TODO: only the decorators for DiagramDesigner are listed so far, needs to be fixed...
                                dstList[extKey].valueItems = DecoratorDB.getDecoratorsByWidget('DiagramDesigner');
                            }

                            //if the attribute value is an enum, display the enum values
                            if (isAttribute && commonAttrMeta[i].enum && commonAttrMeta[i].enum.length > 0) {
                                dstList[extKey].valueItems = commonAttrMeta[i].enum.slice(0);
                                dstList[extKey].valueItems.sort();
                            }
                        }
                    }
                }
            };

            if (selectedObjIDs.length === 1) {
                propList[" ID"] = { "name": 'ID',
                    "value": selectedObjIDs[0],
                    "valueType": typeof selectedObjIDs[0],
                    "isCommon": true,
                    "readOnly": true};
            }

            propList["Attributes"] = { "name": 'Attributes',
                "text": "Attributes",
                "value": undefined};

            propList["Registry"] = { "name": 'Registry',
                "text": "Registry",
                "value": undefined};

            propList["Pointers"] = { "name": 'Pointers',
                "text": "Pointers",
                "value": undefined};

            _addItemsToResultList(commonAttrs, "Attributes", propList, true);

            //modify registry
            for (var it in commonRegs) {
                if (commonRegs.hasOwnProperty(it)) {
                    if (commonRegs.hasOwnProperty(it)) {
                        //#1: filter out rows of 'MetaEditor.MemberCoord' from Registry
                        if (it.indexOf( nodePropertyNames.Registry.ProjectRegistry + '.') === 0) {   //#3: make ProjectRegistry entries readonly
                            commonRegs[it].readOnly = true;
                        } else if (it.indexOf(MetaEditorConstants.META_SHEET_REGISTRY_KEY) === 0 ) {
                            delete commonRegs[it];
                        }
                    }
                }
            }

            _addItemsToResultList(commonRegs, "Registry", propList);

            //filter out ros from Pointers
            for (var it in commonPointers) {
                if (commonPointers.hasOwnProperty(it)) {
                    if (commonPointers.hasOwnProperty(it)) {
                        commonPointers[it].readOnly = true;
                    }
                }
            }
            _addItemsToResultList(commonPointers, "Pointers", propList);
        }

        return propList;
    };

    PropertyEditorController.prototype._onPropertyChanged = function (args) {
        var selectedObjIDs = this._idList,
            i = selectedObjIDs.length,
            keyArr,
            setterFn,
            getterFn,
            propObject,
            propPointer,
            gmeID,
            path;

        this._client.startTransaction();
        while (--i >= 0) {
            gmeID = selectedObjIDs[i];

            keyArr = args.id.split(".");
            if (keyArr[0] === "Attributes") {
                setterFn = "setAttributes";
                getterFn = "getEditableAttribute";
            } else {
                setterFn = "setRegistry";
                getterFn = "getEditableRegistry";
            }

            keyArr.splice(0, 1);

            //get property object from node
            path = keyArr[0];
            propObject = this._client.getNode(gmeID)[getterFn](path);

            //get root object
            propPointer = propObject;
            keyArr.splice(0, 1);

            if(keyArr.length < 1){
                //simple value so just set it
                propObject = args.newValue;
            } else {
                //dig down to leaf property
                while (keyArr.length > 1) {
                    propPointer = propPointer[keyArr[0]];
                    keyArr.splice(0, 1);
                }

                //set value
                propPointer[keyArr[0]] = args.newValue;
            }

            //save back object
            this._client[setterFn](gmeID, path, propObject);
        }
        this._client.completeTransaction();
    };

    return PropertyEditorController;
});