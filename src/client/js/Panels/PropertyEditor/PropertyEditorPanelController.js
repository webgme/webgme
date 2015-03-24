/*globals define, WebGMEGlobal, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['common/LogManager',
    'js/util',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Constants',
    'js/Utils/DisplayFormat',
    'js/Dialogs/DecoratorSVGExplorer/DecoratorSVGExplorerDialog',
    'js/Controls/PropertyGrid/PropertyGridWidgets',
    './PointerWidget'], function (logManager,
                                        util,
                                        nodePropertyNames,
                                        REGISTRY_KEYS,
                                        CONSTANTS,
                                        displayFormat,
                                        DecoratorSVGExplorerDialog,
                                        PropertyGridWidgets,
                                        PointerWidget) {

    "use strict";

    var PropertyEditorController,
        META_REGISTRY_KEYS = [
            REGISTRY_KEYS.IS_PORT,
            REGISTRY_KEYS.IS_ABSTRACT,
            REGISTRY_KEYS.VALID_PLUGINS,
            REGISTRY_KEYS.USED_ADDONS,
        ],
        PREFERENCES_REGISTRY_KEYS = [REGISTRY_KEYS.DECORATOR,
            REGISTRY_KEYS.DISPLAY_FORMAT,
            REGISTRY_KEYS.SVG_ICON,
            REGISTRY_KEYS.PORT_SVG_ICON],
        PROPERTY_GROUP_META = 'META',
        PROPERTY_GROUP_PREFERENCES = 'Preferences',
        PROPERTY_GROUP_ATTRIBUTES = 'Attributes',
        PROPERTY_GROUP_POINTERS = 'Pointers',
        NON_RESETABLE_POINTRS = [CONSTANTS.POINTER_BASE, CONSTANTS.POINTER_SOURCE, CONSTANTS.POINTER_TARGET];

    PropertyEditorController = function (client, propertyGrid) {
        this._client = client;
        this._propertyGrid = propertyGrid;

        //it should be sorted aplahbetically
        this._propertyGrid.setOrdered(true);

        //set custom types here
        this._propertyGrid.registerWidgetForType('boolean', 'iCheckBox');

        this._initEventHandlers();

        this._logger = logManager.create("PropertyEditorController");
        this._logger.debug("Created");
    };

    PropertyEditorController.prototype._initEventHandlers = function () {
        var self = this;

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, function (model, activeSelection) {
            if (activeSelection) {
                self._selectedObjectsChanged(activeSelection);
            } else {
                self._selectedObjectsChanged([]);
            }
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, function (model, activeObjectId) {
            if (activeObjectId || activeObjectId === CONSTANTS.PROJECT_ROOT_ID) {
                self._selectedObjectsChanged([activeObjectId]);
            } else {
                self._selectedObjectsChanged([]);
            }

        });

        this._propertyGrid.onFinishChange(function (args) {
            self._onPropertyChanged(args);
        });

        this._propertyGrid.onReset(function (propertyName) {
            self._onReset(propertyName);
        });
    };

    PropertyEditorController.prototype._selectedObjectsChanged = function (idList) {
        var patterns = {},
            i,
            self = this;

        this._idList = idList;

        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
        }

        if (idList.length > 0) {
            i = idList.length;
            while (i--) {
                patterns[idList[i]] = { "children": 0 };
            }

            this._territoryId = this._client.addUI(this, function (/*events*/) {
                self._refreshPropertyList();
            });
            this._client.updateTerritory(this._territoryId, patterns);
        } else {
            this._refreshPropertyList();
        }
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
            flattenedPreferences,
            flattenedMeta,
            flattenedPointers,
            commonAttrs = {},
            commonPreferences = {},
            commonMeta = {},
            commonPointers = {},
            noCommonValueColor = "#f89406",
            _getNodeAttributeValues, //fn
            _getNodeRegistryValues, //fn
            _filterCommon, //fn
            _addItemsToResultList,  //fn
            _getPointerInfo,
            commonAttrMeta = {},
            buildCommonAttrMeta,     //fn
            _client = this._client,
            _isResetableAttribute,
            _isResetableRegistry,
            _isResetablePointer,
            decoratorNames = _client.getAvailableDecoratorNames();

        decoratorNames.sort(function (a,b) {
            if (a.toLowerCase() < b.toLowerCase()) {
                return -1;
            } else {
                return 1;
            }
        });

        _getNodeAttributeValues = function (node) {
            var result =  {},
                attrNames = node.getAttributeNames(),
                len = attrNames.length;

            while (--len >= 0) {
                result[attrNames[len]] = node.getAttribute(attrNames[len]);
            }

            return util.flattenObject(result);
        };

        _getNodeRegistryValues = function (node, registryNames) {
            var result =  {},
                len = registryNames.length;

            while (--len >= 0) {
                result[registryNames[len]] = node.getRegistry(registryNames[len]);
            }

            return util.flattenObject(result);
        };

        _filterCommon = function (resultList, otherList, initPhase) {
            var it;

            if (initPhase === true) {
                for (it in otherList) {
                    if (otherList.hasOwnProperty(it)) {
                        if (commonAttrMeta.hasOwnProperty(it)) {
                            resultList[it] = { "value": otherList[it],
                                "valueType": commonAttrMeta[it].type,
                                "isCommon": true };
                        } else {
                            resultList[it] = { "value": otherList[it],
                                "valueType": typeof otherList[it],
                                "isCommon": true };
                        }
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
                len = availablePointers.length,
                ptrTo;

            while (len--) {
                ptrTo = node.getPointer(availablePointers[len]).to;
                result[availablePointers[len]] = ptrTo || '';
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
                                if (!(!isEnumCommon && !isEnumAttrMeta)) {
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
                    flattenedAttrs = _getNodeAttributeValues(cNode);
                    buildCommonAttrMeta(cNode, i === selectionLength - 1);
                    _filterCommon(commonAttrs, flattenedAttrs, i === selectionLength - 1);

                    flattenedPreferences = _getNodeRegistryValues(cNode, PREFERENCES_REGISTRY_KEYS);
                    _filterCommon(commonPreferences, flattenedPreferences, i === selectionLength - 1);

                    flattenedMeta = _getNodeRegistryValues(cNode, META_REGISTRY_KEYS);
                    _filterCommon(commonMeta, flattenedMeta, i === selectionLength - 1);

                    flattenedPointers = _getPointerInfo(cNode);
                    _filterCommon(commonPointers, flattenedPointers, i === selectionLength - 1);
                }
            }

            _isResetableAttribute = function (attrName) {
                var resetable = true,
                    i = selectionLength,
                    ownAttrNames,
                    baseNode;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);

                    if (cNode) {
                        //get parentnode
                        baseNode = _client.getNode(cNode.getBaseId());

                        //get own attribute names
                        ownAttrNames = cNode.getOwnAttributeNames();

                        if (ownAttrNames.indexOf(attrName) !== -1) {
                            //there are 1 options:
                            //#1: the attribute is defined on this level, and that's why it is in the onwAttributeNames list
                            //#2: the attribute is inherited and overridden on this level (but defined somewhere up in the hierarchy)
                            if (baseNode) {
                                resetable = baseNode.getAttributeNames().indexOf(attrName) !== -1;
                            } else {
                                resetable = false;
                            }
                        } else {
                            resetable = false;
                        }
                    }

                    if (!resetable) {
                        break;
                    }
                }

                return resetable;
            };

            _isResetableRegistry = function (regName) {
                var resetable = true,
                    i = selectionLength,
                    ownRegistryNames,
                    baseNode;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);

                    if (cNode) {
                        //get parentnode
                        baseNode = _client.getNode(cNode.getBaseId());

                        //get own registry names
                        ownRegistryNames = cNode.getOwnRegistryNames();

                        if (ownRegistryNames.indexOf(regName) !== -1) {
                            //there are 1 options:
                            //#1: the registry is defined on this level, and that's why it is in the ownRegistryNames list
                            //#2: the registry is inherited and overridden on this level (but defined somewhere up in the hierarchy)
                            if (baseNode) {
                                resetable = baseNode.getRegistryNames().indexOf(regName) !== -1;
                            } else {
                                resetable = false;
                            }
                        } else {
                            resetable = false;
                        }
                    }

                    if (!resetable) {
                        break;
                    }
                }

                return resetable;
            };

            _isResetablePointer = function (pointerName) {
                var resetable = true,
                    i = selectionLength,
                    ownPointerNames,
                    baseNode;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);

                    if (cNode) {
                        //get parentnode
                        baseNode = _client.getNode(cNode.getBaseId());

                        //get own registry names
                        ownPointerNames = cNode.getOwnPointerNames();

                        if (ownPointerNames.indexOf(pointerName) !== -1) {
                            //there are 1 options:
                            //#1: the registry is defined on this level, and that's why it is in the ownRegistryNames list
                            //#2: the registry is inherited and overridden on this level (but defined somewhere up in the hierarchy)
                            if (baseNode) {
                                resetable = baseNode.getPointerNames().indexOf(pointerName) !== -1;
                            } else {
                                resetable = false;
                            }
                        } else {
                            resetable = false;
                        }
                    }

                    if (!resetable) {
                        break;
                    }
                }

                return resetable;
            };

            _addItemsToResultList = function (srcList, prefix, dstList, isAttribute, isRegistry, isPointer) {
                var i,
                    extKey,
                    keyParts,
                    doDisplay;

                if (prefix !== "") {
                    prefix += ".";
                }

                for (i in srcList) {
                    if (srcList.hasOwnProperty(i)) {


                        doDisplay = !(isAttribute && !commonAttrMeta.hasOwnProperty(i));

                        if (doDisplay) {
                            extKey = prefix + i;
                            keyParts = i.split(".");

                            dstList[extKey] = { "name": keyParts[keyParts.length - 1],
                                "value": srcList[i].value,
                                "valueType": srcList[i].valueType,
                                "options":  srcList[i].options};

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

                            //is it inherited??? if so, it can be reseted to the inherited value
                            if (isAttribute && _isResetableAttribute(keyParts[0]) ||
                                isRegistry && _isResetableRegistry(keyParts[0])) {
                                dstList[extKey].options = dstList[extKey].options || {};
                                dstList[extKey].options.resetable = true;
                            }

                            if (isPointer &&
                                NON_RESETABLE_POINTRS.indexOf(keyParts[0]) === -1 &&
                                _isResetablePointer(keyParts[0])) {
                                dstList[extKey].options = dstList[extKey].options || {};
                                dstList[extKey].options.resetable = true;
                            }

                            //decorator value should be rendered as an option list
                            if (i === REGISTRY_KEYS.DECORATOR) {
                                //dstList[extKey].valueType = "option";
                                //TODO: only the decorators for DiagramDesigner are listed so far, needs to be fixed...
                                dstList[extKey].valueItems = decoratorNames;
                            }

                            //if the attribute value is an enum, display the enum values
                            if (isAttribute && commonAttrMeta[i].enum && commonAttrMeta[i].enum.length > 0) {
                                dstList[extKey].valueItems = commonAttrMeta[i].enum.slice(0);
                                dstList[extKey].valueItems.sort();
                            }

                            //if it is the SVG decorator's SVG Icon name
                            //list the
                            if (i === REGISTRY_KEYS.SVG_ICON ||
                                i === REGISTRY_KEYS.PORT_SVG_ICON) {
                                dstList[extKey].widget = PropertyGridWidgets.DIALOG_WIDGET;
                                dstList[extKey].dialog = DecoratorSVGExplorerDialog;
                            }

                            //pointers have a custom widget that allows following the pointer
                            if (isPointer === true) {
                                dstList[extKey].widget = PointerWidget;
                                //add custom widget specific values
                                dstList[extKey].client = _client;
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

                cNode = _client.getNode(selectedObjIDs[0]);
                if (cNode) {
                    propList[" GUID"] = { "name": 'GUID',
                        "value": cNode.getGuid(),
                        "valueType": typeof selectedObjIDs[0],
                        "isCommon": true,
                        "readOnly": true};
                }
            }

            propList[PROPERTY_GROUP_ATTRIBUTES] = { "name": PROPERTY_GROUP_ATTRIBUTES,
                "text": PROPERTY_GROUP_ATTRIBUTES,
                "value": undefined};

            propList[PROPERTY_GROUP_PREFERENCES] = { "name": PROPERTY_GROUP_PREFERENCES,
                "text": PROPERTY_GROUP_PREFERENCES,
                "value": undefined};

            propList[PROPERTY_GROUP_META] = { "name": PROPERTY_GROUP_META,
                "text": PROPERTY_GROUP_META,
                "value": undefined};

            propList[PROPERTY_GROUP_POINTERS] = { "name": PROPERTY_GROUP_POINTERS,
                "text": PROPERTY_GROUP_POINTERS,
                "value": undefined};

            _addItemsToResultList(commonAttrs, PROPERTY_GROUP_ATTRIBUTES, propList, true, false, false);

            _addItemsToResultList(commonPreferences, PROPERTY_GROUP_PREFERENCES, propList, false, true, false);

            _addItemsToResultList(commonMeta, PROPERTY_GROUP_META, propList, false, true, false);

            _addItemsToResultList(commonPointers, PROPERTY_GROUP_POINTERS, propList, false, false, true);
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
            setterFn = undefined;
            getterFn = undefined;
            if (keyArr[0] === PROPERTY_GROUP_ATTRIBUTES) {
                setterFn = "setAttributes";
                getterFn = "getEditableAttribute";
            } else if (keyArr[0] === PROPERTY_GROUP_PREFERENCES || keyArr[0] === PROPERTY_GROUP_META) {
                setterFn = "setRegistry";
                getterFn = "getEditableRegistry";
            }

            if (setterFn && getterFn) {
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
        }
        this._client.completeTransaction();
    };

    PropertyEditorController.prototype._onReset = function (propertyName) {
        var selectedObjIDs = this._idList,
            i = selectedObjIDs.length,
            keyArr,
            delFn,
            gmeID,
            path;

        this._client.startTransaction();
        while (--i >= 0) {
            gmeID = selectedObjIDs[i];

            keyArr = propertyName.split(".");
            delFn = undefined;
            if (keyArr[0] === PROPERTY_GROUP_ATTRIBUTES) {
                delFn = "delAttributes";
            } else if (keyArr[0] === PROPERTY_GROUP_PREFERENCES || keyArr[0] === PROPERTY_GROUP_META) {
                delFn = "delRegistry";
            } else if (keyArr[0] === PROPERTY_GROUP_POINTERS && NON_RESETABLE_POINTRS.indexOf(keyArr[1]) === -1) {
                delFn = "delPointer";
            }

            if (delFn) {
                keyArr.splice(0, 1);

                path = keyArr[0];
                this._client[delFn](gmeID, path);
            }
        }
        this._client.completeTransaction();
    };

    return PropertyEditorController;
});
