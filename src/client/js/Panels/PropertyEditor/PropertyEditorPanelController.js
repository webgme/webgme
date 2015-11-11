/*globals define, WebGMEGlobal, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger',
    'js/util',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Constants',
    'js/Utils/DisplayFormat',
    'js/Dialogs/DecoratorSVGExplorer/DecoratorSVGExplorerDialog',
    'js/Controls/PropertyGrid/PropertyGridWidgets',
    './PointerWidget'
], function (Logger,
             util,
             nodePropertyNames,
             REGISTRY_KEYS,
             CONSTANTS,
             displayFormat,
             DecoratorSVGExplorerDialog,
             PropertyGridWidgets,
             PointerWidget) {

    'use strict';

    var PropertyEditorController,
        META_REGISTRY_KEYS = [
            REGISTRY_KEYS.IS_PORT,
            REGISTRY_KEYS.IS_ABSTRACT,
            REGISTRY_KEYS.VALID_PLUGINS,
            REGISTRY_KEYS.USED_ADDONS,
            REGISTRY_KEYS.VALID_VISUALIZERS,
            REGISTRY_KEYS.VALID_DECORATORS
        ],
        PREFERENCES_REGISTRY_KEYS = [REGISTRY_KEYS.DECORATOR,
            REGISTRY_KEYS.DISPLAY_FORMAT,
            REGISTRY_KEYS.SVG_ICON,
            REGISTRY_KEYS.PORT_SVG_ICON],
        NON_INVALID_PTRS = [CONSTANTS.POINTER_BASE];

    PropertyEditorController = function (client, propertyGrid, type) {
        this._client = client;
        this._propertyGrid = propertyGrid;
        this._type = type || null; // CONSTANTS.PROPERTY_GROUP_ATTRIBUTES ...
        this._logger = Logger.create('gme:Panels:PropertyEditor:PropertyEditorController',
            WebGMEGlobal.gmeConfig.client.log);
        //it should be sorted alphabetically
        this._propertyGrid.setOrdered(true);

        //set custom types here
        this._propertyGrid.registerWidgetForType('boolean', 'iCheckBox');

        this._initEventHandlers();

        this._logger.debug('Created');
    };

    PropertyEditorController.prototype._initEventHandlers = function () {
        var self = this;

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, function (model, activeSelection) {
            self._logger.debug('activeSelection changed', activeSelection);
            var activeNodeId = WebGMEGlobal.State.getActiveObject();
            if (activeSelection && activeSelection.length > 0) {
                self._selectedObjectsChanged(activeSelection);
            } else {
                self._selectObjectsUsingActiveObject(activeNodeId);

            }
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, function (model, activeObjectId) {
            self._logger.debug('active object changed: ', activeObjectId);
            self._selectObjectsUsingActiveObject(activeObjectId);
        });

        this._propertyGrid.onFinishChange(function (args) {
            self._onPropertyChanged(args);
        });

        this._propertyGrid.onReset(function (propertyName) {
            self._onReset(propertyName);
        });
    };

    PropertyEditorController.prototype._selectObjectsUsingActiveObject = function (activeObjectId) {
        if (activeObjectId || activeObjectId === CONSTANTS.PROJECT_ROOT_ID) {
            this._selectedObjectsChanged([activeObjectId]);
        } else {
            this._selectedObjectsChanged([]);
        }
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
                patterns[idList[i]] = {children: 0};
            }

            this._territoryId = this._client.addUI(this, function (events) {
                self._logger.debug('about to refresh property list', events);
                self._refreshPropertyList();
            });
            this._client.updateTerritory(this._territoryId, patterns);
        } else {
            this._refreshPropertyList();
        }
    };

    PropertyEditorController.prototype._refreshPropertyList = function () {
        var propList = this._getCommonPropertiesForSelection(this._idList);
        this._logger.debug('propList', this._idList, propList);
        this._propertyGrid.setPropertyList(propList);
    };

    PropertyEditorController.prototype._getCommonPropertiesForSelection = function (selectedObjIDs) {
        var self = this,
            propList = {},
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
            noCommonValueColor = '#f89406',
            _addItemsToResultList, //fn
            commonAttrMeta = {},
            _client = this._client,
            _isResetableAttribute, //fn
            _isResetableRegistry, //fn
            _isResetablePointer, //fn
            _isInvalidAttribute, //fn
            _isInvalidPointer, //fn
            rootNode = _client.getNode(CONSTANTS.PROJECT_ROOT_ID),
            validDecorators = null,
            onlyRootSelected = selectionLength === 1 && selectedObjIDs[0] === CONSTANTS.PROJECT_ROOT_ID,
            decoratorNames = WebGMEGlobal.allDecorators;

        if (rootNode && rootNode.getRegistry(REGISTRY_KEYS.VALID_DECORATORS)) {
            validDecorators = rootNode.getRegistry(REGISTRY_KEYS.VALID_DECORATORS).split(' ');
            this._logger.debug('validDecorators registered on root-node', validDecorators);
            decoratorNames = decoratorNames.filter(function (avaliableDecorator) {
                return validDecorators.indexOf(avaliableDecorator) > -1;
            });
        } else {
            this._logger.debug('Could not get validDecorators from root-node');
            if (!rootNode) {
                this._logger.warn('rootNode was not avaliable');
            }
        }
        decoratorNames.sort(function (a, b) {
            if (a.toLowerCase() < b.toLowerCase()) {
                return -1;
            } else {
                return 1;
            }
        });

        function _getNodeAttributeValues(node) {
            var result = {},
                attrNames = node.getAttributeNames(),
                len = attrNames.length;

            while (--len >= 0) {
                result[attrNames[len]] = node.getAttribute(attrNames[len]);
            }

            return util.flattenObject(result);
        }

        function _getNodeRegistryValues(node, registryNames) {
            var result = {},
                len = registryNames.length;

            while (--len >= 0) {
                result[registryNames[len]] = node.getRegistry(registryNames[len]);
            }

            return util.flattenObject(result);
        }

        function _filterCommon(resultList, otherList, initPhase) {
            var it;

            if (initPhase === true) {
                for (it in otherList) {
                    if (otherList.hasOwnProperty(it)) {
                        if (commonAttrMeta.hasOwnProperty(it)) {
                            resultList[it] = {
                                value: otherList[it],
                                valueType: commonAttrMeta[it].type,
                                isCommon: true
                            };
                        } else {
                            resultList[it] = {
                                value: otherList[it],
                                valueType: typeof otherList[it],
                                isCommon: true
                            };
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
        }

        function _getPointerInfo(node) {
            var result = {},
                availablePointers = node.getPointerNames(),
                len = availablePointers.length,
                ptrTo;

            while (len--) {
                ptrTo = node.getPointer(availablePointers[len]).to;
                result[availablePointers[len]] = ptrTo || '';
            }

            return util.flattenObject(result);
        }

        function buildCommonAttrMeta(node, initPhase) {
            var nodeId = node.getId(),
                nodeAttributeNames = node.getAttributeNames(nodeId) || [],
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
                attrMetaDescriptor = _client.getAttributeSchema(nodeId, attrName) || {type: 'string'};
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
                                commonEnumValues = _.intersection(commonAttrMeta[attrName].enum,
                                    attrMetaDescriptor.enum);

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
        }

        function getHintMessage(name) {
            var msg = '',
                available = WebGMEGlobal['all' + name],
                debugList = [],
                i;

            if (!available) {
                self._logger.error('Could not get all' + name + ' from WebGMEGlobal');
            } else if (available.length > 0) {
                msg = 'Available ' + name + ':';
                if (name === 'Visualizers') {
                    for (i = 0; i < available.length; i += 1) {
                        if (available[i].DEBUG_ONLY) {
                            debugList.push(available[i].id);
                        } else {
                            msg += '\n - ' + available[i].id;
                        }
                    }
                    if (debugList.length > 0) {
                        msg += '\nIn debug mode only:\n - ' + debugList.join('\n - ');

                    }
                } else {
                    msg += '\n - ' + available.join('\n - ');
                }
            } else {
                msg = 'No ' + name + ' available.';
            }

            return msg;
        }

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
                var i = selectionLength,
                    ownAttrNames,
                    validNames,
                    baseValidNames,
                    baseNode;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);

                    if (cNode) {
                        baseNode = _client.getNode(cNode.getBaseId());
                        validNames = _client.getValidAttributeNames(selectedObjIDs[i]);
                        baseValidNames = baseNode === null ? [] : _client.getValidAttributeNames(baseNode.getId());
                        ownAttrNames = cNode.getOwnAttributeNames();

                        if (ownAttrNames.indexOf(attrName) === -1) {
                            return false;
                        }

                        if (baseValidNames.indexOf(attrName) === -1 && validNames.indexOf(attrName) !== -1) {
                            return false;
                        }
                    }
                }

                return true;
            };

            _isInvalidAttribute = function (attrName) {
                var i = selectionLength,
                    validNames;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);
                    if (cNode) {
                        validNames = cNode.getValidAttributeNames();

                        if (validNames.indexOf(attrName) !== -1) {
                            return false;
                        }
                    }
                }

                return true;
            };

            _isResetableRegistry = function (regName) {
                var i = selectionLength,
                    ownRegistryNames,
                    baseRegistryNames,
                    baseNode;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);

                    if (cNode) {
                        baseNode = _client.getNode(cNode.getBaseId());
                        ownRegistryNames = cNode.getOwnRegistryNames();
                        baseRegistryNames = baseNode === null ? [] : baseNode.getRegistryNames();

                        if (ownRegistryNames.indexOf(regName) === -1) {
                            return false;
                        }

                        if (baseRegistryNames.indexOf(regName) === -1) {
                            return false;
                        }

                    }
                }
                return true;
            };

            _isResetablePointer = function (pointerName) {
                var i = selectionLength,
                    ownPointerNames,
                    validNames,
                    baseValidNames,
                    baseNode;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);

                    if (cNode) {
                        baseNode = _client.getNode(cNode.getBaseId());
                        ownPointerNames = cNode.getOwnPointerNames();
                        validNames = cNode.getValidPointerNames();
                        baseValidNames = baseNode === null ? [] : baseNode.getValidPointerNames();

                        if (ownPointerNames.indexOf(pointerName) === -1) {
                            return false;
                        }

                        if (baseValidNames.indexOf(pointerName) === -1 && validNames.indexOf(pointerName) !== -1) {
                            return false;
                        }

                    }
                }

                return true;
            };

            _isInvalidPointer = function (pointerName) {
                var i = selectionLength,
                    validNames;

                while (i--) {
                    cNode = _client.getNode(selectedObjIDs[i]);
                    if (cNode) {
                        validNames = cNode.getValidPointerNames();

                        if (validNames.indexOf(pointerName) !== -1 || NON_INVALID_PTRS.indexOf(pointerName) !== -1) {
                            return false;
                        }
                    }
                }

                return true;
            };

            _addItemsToResultList = function (srcList, prefix, dstList, isAttribute, isRegistry, isPointer) {
                var i,
                    extKey,
                    keyParts,
                    doDisplay;

                if (prefix !== '') {
                    prefix += '.';
                }

                for (i in srcList) {
                    if (srcList.hasOwnProperty(i)) {


                        doDisplay = !(isAttribute && !commonAttrMeta.hasOwnProperty(i));

                        if (doDisplay) {
                            extKey = prefix + i;
                            keyParts = i.split('.');

                            dstList[extKey] = {
                                name: keyParts[keyParts.length - 1],
                                value: srcList[i].value,
                                valueType: srcList[i].valueType,
                                options: srcList[i].options
                            };

                            if (i === 'position.x' || i === 'position.y') {
                                dstList[extKey].minValue = 0;
                                dstList[extKey].stepValue = 10;
                            }

                            if (srcList[i].readOnly === false || srcList[i].readOnly === true) {
                                dstList[extKey].readOnly = srcList[i].readOnly;
                            }

                            if (srcList[i].isCommon === false) {
                                dstList[extKey].value = '';
                                dstList[extKey].options = {textColor: noCommonValueColor};
                            }

                            if (isAttribute === true) {
                                //is it inherited??? if so, it can be reseted to the inherited value
                                if (_isResetableAttribute(keyParts[0])) {
                                    dstList[extKey].options = dstList[extKey].options || {};
                                    dstList[extKey].options.resetable = true;
                                }

                                //if it is an attribute it might be invalid according the current meta rules
                                if (_isInvalidAttribute(keyParts[0])) {
                                    dstList[extKey].options = dstList[extKey].options || {};
                                    dstList[extKey].options.invalid = true;
                                }

                                //if the attribute value is an enum, display the enum values
                                if (commonAttrMeta[i].enum && commonAttrMeta[i].enum.length > 0) {
                                    dstList[extKey].valueItems = commonAttrMeta[i].enum.slice(0);
                                    dstList[extKey].valueItems.sort();
                                }
                            } else if (isRegistry === true) {
                                //is it inherited??? if so, it can be reseted to the inherited value
                                if (_isResetableRegistry(keyParts[0])) {
                                    dstList[extKey].options = dstList[extKey].options || {};
                                    dstList[extKey].options.resetable = true;
                                }

                                if (prefix === CONSTANTS.PROPERTY_GROUP_PREFERENCES + '.') {
                                    if (onlyRootSelected === false) {
                                        //decorator value should be rendered as an option list
                                        if (i === REGISTRY_KEYS.DECORATOR) {
                                            //dstList[extKey].valueType = "option";
                                            //FIXME: only the decorators for DiagramDesigner are listed so far
                                            dstList[extKey].valueItems = decoratorNames;
                                        } else if (i === REGISTRY_KEYS.SVG_ICON || i === REGISTRY_KEYS.PORT_SVG_ICON) {
                                            dstList[extKey].widget = PropertyGridWidgets.DIALOG_WIDGET;
                                            dstList[extKey].dialog = DecoratorSVGExplorerDialog;
                                        }
                                    }
                                } else if (prefix === CONSTANTS.PROPERTY_GROUP_META + '.') {
                                    if (i === REGISTRY_KEYS.VALID_VISUALIZERS) {
                                        if (onlyRootSelected) {
                                            dstList[extKey].value = dstList[extKey].value === undefined ?
                                                '' : dstList[extKey].value;
                                        }
                                        dstList[extKey].regex = '/[^\w\W]/';
                                        dstList[extKey].regexMessage = getHintMessage('Visualizers');
                                    } else if (onlyRootSelected) {
                                        if (i === REGISTRY_KEYS.VALID_PLUGINS) {
                                            dstList[extKey].value = dstList[extKey].value === undefined ?
                                                '' : dstList[extKey].value;
                                            dstList[extKey].regex = '/[^\w\W]/';
                                            dstList[extKey].regexMessage = getHintMessage('Plugins');
                                        } else if (i === REGISTRY_KEYS.VALID_DECORATORS) {
                                            dstList[extKey].value = dstList[extKey].value === undefined ?
                                                '' : dstList[extKey].value;
                                            dstList[extKey].regex = '/[^\w\W]/';
                                            dstList[extKey].regexMessage = getHintMessage('Decorators');
                                        } else if (i === REGISTRY_KEYS.USED_ADDONS) {
                                            dstList[extKey].value = dstList[extKey].value === undefined ?
                                                '' : dstList[extKey].value;
                                            dstList[extKey].regex = '/[^\w\W]/';
                                            dstList[extKey].regexMessage = getHintMessage('AddOns');
                                        }
                                    }
                                }
                            } else if (isPointer === true) {
                                if (NON_INVALID_PTRS.indexOf(keyParts[0]) === -1 && _isResetablePointer(keyParts[0])) {
                                    //what is non_invalid, cannot be reset
                                    dstList[extKey].options = dstList[extKey].options || {};
                                    dstList[extKey].options.resetable = true;
                                }

                                if (_isInvalidPointer(keyParts[0])) {
                                    dstList[extKey].options = dstList[extKey].options || {};
                                    dstList[extKey].options.invalid = true;
                                }

                                //pointers have a custom widget that allows following the pointer
                                dstList[extKey].widget = PointerWidget;
                                //add custom widget specific values
                                dstList[extKey].client = _client;
                            }
                            if (dstList[extKey].value === undefined) {
                                delete dstList[extKey];
                            }
                        }
                    }
                }
            };

            if (selectedObjIDs.length === 1) {
                propList[' ID'] = {
                    name: 'ID',
                    value: selectedObjIDs[0],
                    valueType: typeof selectedObjIDs[0],
                    isCommon: true,
                    readOnly: true
                };

                cNode = _client.getNode(selectedObjIDs[0]);
                if (cNode) {
                    propList[' GUID'] = {
                        name: 'GUID',
                        value: cNode.getGuid(),
                        valueType: typeof selectedObjIDs[0],
                        isCommon: true,
                        readOnly: true
                    };
                }
            }

            if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_ATTRIBUTES) {
                propList[CONSTANTS.PROPERTY_GROUP_ATTRIBUTES] = {
                    name: CONSTANTS.PROPERTY_GROUP_ATTRIBUTES,
                    text: CONSTANTS.PROPERTY_GROUP_ATTRIBUTES,
                    value: undefined
                };

                _addItemsToResultList(commonAttrs, CONSTANTS.PROPERTY_GROUP_ATTRIBUTES, propList, true, false, false);
            }

            if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_PREFERENCES) {
                propList[CONSTANTS.PROPERTY_GROUP_PREFERENCES] = {
                    name: CONSTANTS.PROPERTY_GROUP_PREFERENCES,
                    text: CONSTANTS.PROPERTY_GROUP_PREFERENCES,
                    value: undefined
                };

                _addItemsToResultList(commonPreferences,
                    CONSTANTS.PROPERTY_GROUP_PREFERENCES,
                    propList,
                    false, true, false);
            }

            if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_META) {
                propList[CONSTANTS.PROPERTY_GROUP_META] = {
                    name: CONSTANTS.PROPERTY_GROUP_META,
                    text: CONSTANTS.PROPERTY_GROUP_META,
                    value: undefined
                };

                _addItemsToResultList(commonMeta, CONSTANTS.PROPERTY_GROUP_META, propList, false, true, false);
            }

            if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_POINTERS) {
                propList[CONSTANTS.PROPERTY_GROUP_POINTERS] = {
                    name: CONSTANTS.PROPERTY_GROUP_POINTERS,
                    text: CONSTANTS.PROPERTY_GROUP_POINTERS,
                    value: undefined
                };

                _addItemsToResultList(commonPointers, CONSTANTS.PROPERTY_GROUP_POINTERS, propList, false, false, true);
            }

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

            keyArr = args.id.split('.');
            setterFn = undefined;
            getterFn = undefined;
            if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_ATTRIBUTES) {
                setterFn = 'setAttributes';
                getterFn = 'getEditableAttribute';
            } else if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_PREFERENCES ||
                keyArr[0] === CONSTANTS.PROPERTY_GROUP_META) {
                setterFn = 'setRegistry';
                getterFn = 'getEditableRegistry';
            } else if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_POINTERS) {
                this._client.makePointer(gmeID, keyArr[1], args.newValue);
            }

            if (setterFn && getterFn) {
                keyArr.splice(0, 1);

                //get property object from node
                path = keyArr[0];
                propObject = this._client.getNode(gmeID)[getterFn](path);

                //get root object
                propPointer = propObject;
                keyArr.splice(0, 1);

                if (keyArr.length < 1) {
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

            keyArr = propertyName.split('.');
            delFn = undefined;
            if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_ATTRIBUTES) {
                delFn = 'delAttributes';
            } else if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_PREFERENCES ||
                keyArr[0] === CONSTANTS.PROPERTY_GROUP_META) {
                delFn = 'delRegistry';
            } else if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_POINTERS) {
                delFn = 'delPointer';
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
