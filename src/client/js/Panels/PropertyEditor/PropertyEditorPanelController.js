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
    'js/Utils/GMEConcepts',
    'js/Utils/DisplayFormat',
    'js/Dialogs/DecoratorSVGExplorer/DecoratorSVGExplorerDialog',
    'js/Dialogs/ValidVisualizers/ValidVisualizersDialog',
    'js/Controls/PropertyGrid/PropertyGridWidgets'
], function (Logger,
             util,
             nodePropertyNames,
             REGISTRY_KEYS,
             CONSTANTS,
             GMEConcepts,
             displayFormat,
             DecoratorSVGExplorerDialog,
             ValidVisualizersDialog,
             PROPERTY_GRID_WIDGETS) {

    'use strict';

    var PropertyEditorController,
        NO_COMMON_VALUE_COLOR = '#f89406',
        META_REGISTRY_KEYS = [
            REGISTRY_KEYS.IS_PORT,
            REGISTRY_KEYS.IS_ABSTRACT,
            REGISTRY_KEYS.VALID_PLUGINS,
            REGISTRY_KEYS.USED_ADDONS,
            REGISTRY_KEYS.VALID_VISUALIZERS,
            REGISTRY_KEYS.VALID_DECORATORS
        ],
        TEMPLATING_SUB_GROUP = 'Templating',
        PREFERENCES_REGISTRY_KEYS = [REGISTRY_KEYS.DECORATOR,
            REGISTRY_KEYS.DISPLAY_FORMAT,
            REGISTRY_KEYS.SVG_ICON,
            REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON,
            REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON,
            REGISTRY_KEYS.SVG_ICON,
            REGISTRY_KEYS.PORT_SVG_ICON,
            REGISTRY_KEYS.REPLACEABLE
        ],
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
        this._initializeReadOnlyForSelection(this._idList);
        this._propertyGrid.setPropertyList(propList);
    };

    PropertyEditorController.prototype._getCommonPropertiesForSelection = function (selectedObjIDs) {
        var self = this,
            propList = {},
            selectionLength = selectedObjIDs.length,
            cNode,
            metaTypeId,
            i,
            flattenedAttrs,
            flattenedPreferences,
            flattenedMeta,
            flattenedPointers,
            commonAttrs = {},
            commonPreferences = {},
            commonMeta = {},
            commonPointers = {},
            commonAttrMeta = {},
            rootNode = this._client.getNode(CONSTANTS.PROJECT_ROOT_ID),
            validDecorators = null,
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

        if (selectedObjIDs.length === 0) {
            return propList;
        }

        //get all attributes
        //get all registry elements
        i = selectionLength;
        while (--i >= 0) {
            cNode = this._client.getNode(selectedObjIDs[i]);

            if (cNode) {
                flattenedAttrs = this._getNodeAttributeValues(cNode);
                this._buildCommonAttrMeta(commonAttrMeta, cNode, i === selectionLength - 1);
                this._filterCommon(commonAttrMeta, commonAttrs, flattenedAttrs, i === selectionLength - 1);

                flattenedPreferences = this._getNodeRegistryValues(cNode, PREFERENCES_REGISTRY_KEYS);
                this._filterCommon(commonAttrMeta, commonPreferences, flattenedPreferences,
                    i === selectionLength - 1);

                flattenedMeta = this._getNodeRegistryValues(cNode, META_REGISTRY_KEYS);
                this._filterCommon(commonAttrMeta, commonMeta, flattenedMeta, i === selectionLength - 1);

                flattenedPointers = self._getPointerInfo(cNode);
                this._filterCommon(commonAttrMeta, commonPointers, flattenedPointers, i === selectionLength - 1);
            }
        }

        if (selectedObjIDs.length === 1) {
            propList[' ID'] = {
                name: 'ID',
                value: selectedObjIDs[0],
                valueType: typeof selectedObjIDs[0],
                isCommon: true,
                readOnly: true
            };

            cNode = self._client.getNode(selectedObjIDs[0]);
            if (cNode) {
                propList[' GUID'] = {
                    name: 'GUID',
                    value: cNode.getGuid(),
                    valueType: typeof selectedObjIDs[0],
                    isCommon: true,
                    readOnly: true
                };

                if (cNode.isLibraryElement()) {
                    propList[' GUIDl'] = {
                        name: 'GUID (library)',
                        value: cNode.getLibraryGuid(),
                        valueType: typeof selectedObjIDs[0],
                        isCommon: true,
                        readOnly: true
                    };
                }

                metaTypeId = cNode.getMetaTypeId();
                if (metaTypeId) {
                    propList[' Meta Type'] = {
                        name: 'Meta type',
                        value: metaTypeId,
                        isCommon: true,
                        widget: PROPERTY_GRID_WIDGETS.META_TYPE_WIDGET,
                        client: self._client
                    };
                }
            }
        }

        if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_ATTRIBUTES) {
            propList[CONSTANTS.PROPERTY_GROUP_ATTRIBUTES] = {
                name: CONSTANTS.PROPERTY_GROUP_ATTRIBUTES,
                text: CONSTANTS.PROPERTY_GROUP_ATTRIBUTES,
                value: undefined,
                isFolder: true
            };

            this._addItemsToResultList(selectedObjIDs, commonAttrMeta, decoratorNames,
                commonAttrs, CONSTANTS.PROPERTY_GROUP_ATTRIBUTES, propList, true, false, false);
        }

        if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_PREFERENCES) {
            propList[CONSTANTS.PROPERTY_GROUP_PREFERENCES] = {
                name: CONSTANTS.PROPERTY_GROUP_PREFERENCES,
                text: CONSTANTS.PROPERTY_GROUP_PREFERENCES,
                value: undefined,
                isFolder: true
            };

            if (commonPointers.hasOwnProperty(CONSTANTS.POINTER_CONSTRAINED_BY)) {
                commonPreferences[CONSTANTS.POINTER_CONSTRAINED_BY] = commonPointers[CONSTANTS.POINTER_CONSTRAINED_BY];
                delete commonPointers[CONSTANTS.POINTER_CONSTRAINED_BY];
            }

            this._addItemsToResultList(selectedObjIDs, commonAttrMeta, decoratorNames,
                commonPreferences, CONSTANTS.PROPERTY_GROUP_PREFERENCES, propList, false, true, false);
        }

        if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_META) {
            propList[CONSTANTS.PROPERTY_GROUP_META] = {
                name: CONSTANTS.PROPERTY_GROUP_META,
                text: CONSTANTS.PROPERTY_GROUP_META,
                value: undefined,
                isFolder: true
            };

            this._addItemsToResultList(selectedObjIDs, commonAttrMeta, decoratorNames,
                commonMeta, CONSTANTS.PROPERTY_GROUP_META, propList, false, true, false);
        }

        if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_POINTERS) {
            propList[CONSTANTS.PROPERTY_GROUP_POINTERS] = {
                name: CONSTANTS.PROPERTY_GROUP_POINTERS,
                text: CONSTANTS.PROPERTY_GROUP_POINTERS,
                value: undefined,
                isFolder: true
            };

            this._addItemsToResultList(selectedObjIDs, commonAttrMeta, decoratorNames,
                commonPointers, CONSTANTS.PROPERTY_GROUP_POINTERS, propList, false, false, true);
        }

        return propList;
    };

    PropertyEditorController.prototype._addItemsToResultList = function (selectedObjIDs, commonAttrMeta, decoratorNames,
                                                                         src, prefix, dst,
                                                                         isAttribute, isRegistry, isPointer) {
        var onlyRootSelected = selectedObjIDs.length === 1 && selectedObjIDs[0] === CONSTANTS.PROJECT_ROOT_ID,
            keys = Object.keys(src),
            canBeReplaceable,
            key,
            range,
            i,
            extKey,
            repKey,
            cbyKey,
            keyParts;

        if (prefix !== '') {
            prefix += '.';
        }

        for (i = 0; i < keys.length; i += 1) {
            key = keys[i];

            if (key === CONSTANTS.POINTER_CONSTRAINED_BY) {
                // This is handled in replaceable.
                continue;
            }

            if (isAttribute) {
                if (commonAttrMeta.hasOwnProperty(key) === false) {
                    continue;
                }
            }

            extKey = prefix + key;
            keyParts = key.split('.');

            dst[extKey] = {
                name: keyParts[keyParts.length - 1],
                value: src[key].value,
                valueType: src[key].valueType,
                options: src[key].options
            };

            if (key === 'position.x' || key === 'position.y') {
                dst[extKey].minValue = 0;
                dst[extKey].stepValue = 10;
            }

            if (src[key].readOnly === false || src[key].readOnly === true) {
                dst[extKey].readOnly = src[key].readOnly;
            }

            if (src[key].isCommon === false) {
                dst[extKey].value = '';
                dst[extKey].options = {textColor: NO_COMMON_VALUE_COLOR};
            }

            if (isAttribute === true) {
                //is it inherited??? if so, it can be reseted to the inherited value
                if (this._isResettableAttribute(selectedObjIDs, keyParts[0])) {
                    dst[extKey].options = dst[extKey].options || {};
                    dst[extKey].options.resetable = true;
                }

                //if it is an attribute it might be invalid according the current meta rules
                if (this._isInvalidAttribute(selectedObjIDs, keyParts[0])) {
                    dst[extKey].options = dst[extKey].options || {};
                    dst[extKey].options.invalid = true;
                } else if (this._isInvalidAttributeValue(selectedObjIDs, keyParts[0])) {
                    dst[extKey].options = dst[extKey].options || {};
                    dst[extKey].options.invalidValue = true;
                }

                //if the attribute value is an enum, display the enum values
                if (commonAttrMeta[key].enum && commonAttrMeta[key].enum.length > 0) {
                    dst[extKey].valueItems = commonAttrMeta[key].enum.slice(0);
                    dst[extKey].valueItems.sort();
                }

                // Get the min max for floats and integers
                if (dst[extKey].valueType === 'float' || dst[extKey].valueType === 'integer') {
                    range = this._getAttributeRange(selectedObjIDs, keyParts[0]);
                    dst[extKey].minValue = range.min;
                    dst[extKey].maxValue = range.max;
                }
            } else if (isRegistry === true) {
                //is it inherited??? if so, it can be reseted to the inherited value
                if (this._isResettableRegistry(selectedObjIDs, keyParts[0])) {
                    dst[extKey].options = dst[extKey].options || {};
                    dst[extKey].options.resetable = true;
                }

                if (prefix === CONSTANTS.PROPERTY_GROUP_PREFERENCES + '.') {
                    if (onlyRootSelected === false) {
                        //decorator value should be rendered as an option list
                        if (key === REGISTRY_KEYS.DECORATOR) {
                            //dstList[extKey].valueType = "option";
                            //FIXME: only the decorators for DiagramDesigner are listed so far
                            dst[extKey].valueItems = decoratorNames;
                        } else if (key === REGISTRY_KEYS.SVG_ICON || key === REGISTRY_KEYS.PORT_SVG_ICON ||
                            key === REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON ||
                            key === REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON) {

                            dst[extKey].widget = PROPERTY_GRID_WIDGETS.DIALOG_WIDGET;
                            dst[extKey].dialog = DecoratorSVGExplorerDialog;
                            dst[extKey].value = dst[extKey].value === undefined ?
                                '' : dst[extKey].value;
                        } else if (key === REGISTRY_KEYS.REPLACEABLE) {
                            dst[TEMPLATING_SUB_GROUP] = {
                                name: TEMPLATING_SUB_GROUP,
                                text: TEMPLATING_SUB_GROUP,
                                value: undefined,
                                isFolder: true
                            };

                            repKey = TEMPLATING_SUB_GROUP + '.' + key;
                            dst[repKey] = dst[extKey];
                            delete dst[extKey];

                            canBeReplaceable = this._canBeReplaceable(selectedObjIDs);
                            dst[repKey].value = (!dst[repKey].value || canBeReplaceable === false) ? false : true;
                            dst[repKey].valueType = 'boolean';
                            if (canBeReplaceable === false) {
                                dst[repKey].readOnly = true;
                                dst[repKey].alwaysReadOnly = true;
                                dst[repKey].title = 'Meta nodes or inherited children cannot be templates.';
                            }

                            if (keys.indexOf(CONSTANTS.POINTER_CONSTRAINED_BY) > -1) {
                                cbyKey = TEMPLATING_SUB_GROUP + '.' + CONSTANTS.POINTER_CONSTRAINED_BY;

                                dst[cbyKey] = {
                                    name: CONSTANTS.POINTER_CONSTRAINED_BY,
                                    value: src[CONSTANTS.POINTER_CONSTRAINED_BY].value,
                                    valueType: src[CONSTANTS.POINTER_CONSTRAINED_BY].valueType,
                                    options: src[CONSTANTS.POINTER_CONSTRAINED_BY].options || {},
                                    widget: PROPERTY_GRID_WIDGETS.POINTER_WIDGET,
                                    client: this._client
                                };

                                dst[cbyKey].options.resetable =
                                    this._isResettablePointer(selectedObjIDs, CONSTANTS.POINTER_CONSTRAINED_BY);

                                dst[cbyKey].options.invalid =
                                    this._isInvalidPointer(selectedObjIDs, CONSTANTS.POINTER_CONSTRAINED_BY);

                                if (dst[repKey].value === false && !dst[cbyKey].options.resetable &&
                                    !dst[cbyKey].options.invalid) {
                                    // In this case it is only clutter to display this pointer widget.
                                    delete dst[cbyKey];
                                }
                            }
                        } else if (key === CONSTANTS.POINTER_CONSTRAINED_BY) {
                            // This is handled by the REPLACEABLE above.
                        }
                    } else {
                        if (key === REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON ||
                            key === REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON) {
                            dst[extKey].widget = PROPERTY_GRID_WIDGETS.DIALOG_WIDGET;
                            dst[extKey].dialog = DecoratorSVGExplorerDialog;
                            dst[extKey].value = dst[extKey].value === undefined ?
                                '' : dst[extKey].value;
                        }
                    }
                } else if (prefix === CONSTANTS.PROPERTY_GROUP_META + '.') {
                    if (key === REGISTRY_KEYS.VALID_VISUALIZERS) {
                        dst[extKey].widget = PROPERTY_GRID_WIDGETS.DIALOG_WIDGET;
                        dst[extKey].dialog = ValidVisualizersDialog;
                        dst[extKey].value = dst[extKey].value === undefined ?
                            '' : dst[extKey].value;
                    } else if (key === REGISTRY_KEYS.VALID_PLUGINS) {
                        dst[extKey].value = dst[extKey].value === undefined ?
                            '' : dst[extKey].value;
                        dst[extKey].valueItems = WebGMEGlobal.allPlugins;
                        dst[extKey].widget = PROPERTY_GRID_WIDGETS.MULTI_SELECT_WIDGET;
                    } else if (onlyRootSelected) {
                        if (key === REGISTRY_KEYS.VALID_DECORATORS) {
                            dst[extKey].value = dst[extKey].value === undefined ?
                                '' : dst[extKey].value;
                            dst[extKey].valueItems = WebGMEGlobal.allDecorators;
                            dst[extKey].widget = PROPERTY_GRID_WIDGETS.MULTI_SELECT_WIDGET;
                        } else if (key === REGISTRY_KEYS.USED_ADDONS) {
                            dst[extKey].value = dst[extKey].value === undefined ?
                                '' : dst[extKey].value;
                            dst[extKey].valueItems = WebGMEGlobal.allAddOns;
                            dst[extKey].widget = PROPERTY_GRID_WIDGETS.MULTI_SELECT_WIDGET;
                        }
                    }
                }
            } else if (isPointer === true) {
                dst[extKey].options = dst[extKey].options || {};

                // What is non-invalid cannot be reset
                dst[extKey].options.resetable = NON_INVALID_PTRS.indexOf(keyParts[0]) === -1 &&
                    this._isResettablePointer(selectedObjIDs, keyParts[0]);

                dst[extKey].options.invalid = this._isInvalidPointer(selectedObjIDs, keyParts[0]);

                //pointers have a custom widget that allows following the pointer
                dst[extKey].widget = PROPERTY_GRID_WIDGETS.POINTER_WIDGET;
                //add custom widget specific values
                dst[extKey].client = this._client;
            }

            if (!dst[extKey] || dst[extKey].value === undefined) {
                delete dst[extKey];
            }
        }
    };

    PropertyEditorController.prototype._getNodeAttributeValues = function (node) {
        var result = {},
            attrNames = _.union(node.getAttributeNames() || [], node.getValidAttributeNames() || []),
            len = attrNames.length;

        while (--len >= 0) {
            result[attrNames[len]] = node.getAttribute(attrNames[len]) || '';
        }

        return util.flattenObject(result);
    };

    PropertyEditorController.prototype._getNodeRegistryValues = function (node, registryNames) {
        var result = {},
            len = registryNames.length;

        while (--len >= 0) {
            result[registryNames[len]] = node.getRegistry(registryNames[len]);
        }

        return util.flattenObject(result);
    };

    PropertyEditorController.prototype._getPointerInfo = function (node) {
        var result = {},
            availablePointers = node.getPointerNames(),
            len = availablePointers.length,
            ptrTo;

        while (len--) {
            ptrTo = node.getPointer(availablePointers[len]).to;
            ptrTo = ptrTo === null ? CONSTANTS.CORE.NULLPTR_RELID : ptrTo;
            result[availablePointers[len]] = ptrTo || '';
        }

        return util.flattenObject(result);
    };

    PropertyEditorController.prototype._isInvalidAttribute = function (selectedObjIDs, attrName) {
        var i = selectedObjIDs.length,
            node,
            validNames;

        while (i--) {
            node = this._client.getNode(selectedObjIDs[i]);
            if (node) {
                validNames = node.getValidAttributeNames();

                if (validNames.indexOf(attrName) !== -1) {
                    return false;
                }
            }
        }

        return true;
    };

    PropertyEditorController.prototype._isInvalidAttributeValue = function (selectedObjIDs, attrName) {
        var result = false,
            attrValue,
            node;

        if (selectedObjIDs.length === 1) {
            node = this._client.getNode(selectedObjIDs[0]);
            if (node) {
                attrValue = node.getAttribute(attrName);
                try {
                    result = !node.isValidAttributeValueOf(attrName, attrValue);
                } catch (e) {
                    if (e.message.indexOf('Invalid regular expression') > -1) {
                        this._logger.error('Invalid regular expression defined in the meta model for attribute "' +
                            attrName + '"');
                        result = true;
                    } else {
                        throw e;
                    }
                }
            }
        }

        return result;
    };

    PropertyEditorController.prototype._getAttributeRange = function (selectedObjIDs, attrName) {
        var i = selectedObjIDs.length,
            range = {},
            schema;

        while (i--) {
            schema = this._client.getAttributeSchema(selectedObjIDs[i], attrName);
            if (schema.hasOwnProperty('min')) {
                if (range.hasOwnProperty('min')) {
                    range.min = schema.min > range.min ? schema.min : range.min;
                } else {
                    range.min = schema.min;
                }
            }

            if (schema.hasOwnProperty('max')) {
                if (range.hasOwnProperty('max')) {
                    range.max = schema.max < range.max ? schema.max : range.max;
                } else {
                    range.max = schema.max;
                }
            }
        }

        return range;
    };

    PropertyEditorController.prototype._isInvalidPointer = function (selectedObjIDs, pointerName) {
        var i = selectedObjIDs.length,
            node,
            validNames;

        while (i--) {
            node = this._client.getNode(selectedObjIDs[i]);
            if (node) {
                validNames = node.getValidPointerNames();

                if (validNames.indexOf(pointerName) !== -1 || NON_INVALID_PTRS.indexOf(pointerName) !== -1) {
                    return false;
                }
            }
        }

        return true;
    };

    PropertyEditorController.prototype._isResettableRegistry = function (selectedObjIDs, regName) {
        var i = selectedObjIDs.length,
            ownRegistryNames,
            baseRegistryNames,
            node,
            baseNode;

        while (i--) {
            node = this._client.getNode(selectedObjIDs[i]);

            if (node) {
                baseNode = this._client.getNode(node.getBaseId());
                ownRegistryNames = node.getOwnRegistryNames();
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

    PropertyEditorController.prototype._isResettableAttribute = function (selectedObjIDs, attrName) {
        var i = selectedObjIDs.length,
            ownAttrNames,
            validNames,
            baseValidNames,
            node,
            baseNode;

        while (i--) {
            node = this._client.getNode(selectedObjIDs[i]);

            if (node) {
                baseNode = this._client.getNode(node.getBaseId());
                validNames = this._client.getValidAttributeNames(selectedObjIDs[i]);
                baseValidNames = baseNode === null ? [] : this._client.getValidAttributeNames(baseNode.getId());
                ownAttrNames = node.getOwnAttributeNames();

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

    PropertyEditorController.prototype._isResettablePointer = function (selectedObjIDs, pointerName) {
        var i = selectedObjIDs.length,
            ownPointerNames,
            node,
            validNames,
            baseValidNames,
            baseNode;

        while (i--) {
            node = this._client.getNode(selectedObjIDs[i]);

            if (node) {
                baseNode = this._client.getNode(node.getBaseId());
                ownPointerNames = node.getOwnPointerNames();
                validNames = node.getValidPointerNames();
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

    PropertyEditorController.prototype._canBeReplaceable = function (selectedObjIDs) {
        var i = selectedObjIDs.length;

        while (i--) {
            if (GMEConcepts.canBeReplaceable(selectedObjIDs[i])) {
                // continue
            } else {
                return false;
            }
        }

        return true;
    };

    PropertyEditorController.prototype._filterCommon = function (commonAttrMeta, result, other, initPhase) {
        var it,
            i,
            keys;

        if (initPhase === true) {
            keys = Object.keys(other);
            for (i = 0; i < keys.length; i += 1) {
                it = keys[i];
                if (commonAttrMeta.hasOwnProperty(it)) {
                    result[it] = {
                        value: other[it],
                        valueType: commonAttrMeta[it].type,
                        isCommon: true
                    };
                } else {
                    result[it] = {
                        value: other[it],
                        valueType: typeof other[it],
                        isCommon: true
                    };
                }

            }
        } else {
            keys = Object.keys(result);
            for (i = 0; i < keys.length; i += 1) {
                it = keys[i];
                if (other.hasOwnProperty(it)) {
                    if (result[it].isCommon) {
                        result[it].isCommon = result[it].value === other[it];
                    }
                } else {
                    delete result[it];
                }
            }
        }
    };

    PropertyEditorController.prototype._buildCommonAttrMeta = function (commonAttrMeta, node, initPhase) {
        var nodeId = node.getId(),
            nodeAttributeNames = _.union(node.getAttributeNames() || [], node.getValidAttributeNames() || []),
            len = nodeAttributeNames.length,
            attrMetaDescriptor,
            attrName,
            attrNames,
            i,
            isCommon,
            commonEnumValues,
            isEnumCommon,
            isEnumAttrMeta;

        attrNames = Object.keys(commonAttrMeta);
        //first delete the ones from the common that does not exist in this node
        for (i = 0; i < attrNames.length; i += 1) {
            if (nodeAttributeNames.indexOf(attrNames[i]) === -1) {
                delete commonAttrMeta[attrName];
            }
        }

        //for the remaining list check if still common
        //common: type is the same
        //if type is enum, the common types should be the intersection of the individual enum types
        while (len--) {
            attrName = nodeAttributeNames[len];
            attrMetaDescriptor = this._client.getAttributeSchema(nodeId, attrName) || {type: 'string'};
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
            } else if (keyArr[0] === TEMPLATING_SUB_GROUP) {
                if (keyArr[1] === REGISTRY_KEYS.REPLACEABLE) {
                    setterFn = 'setRegistry';
                    getterFn = 'getEditableRegistry';
                } else if (keyArr[1] === CONSTANTS.POINTER_CONSTRAINED_BY) {
                    this._client.makePointer(gmeID, keyArr[1], args.newValue);
                }
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
            } else if (keyArr[0] === TEMPLATING_SUB_GROUP) {
                if (keyArr[1] === REGISTRY_KEYS.REPLACEABLE) {
                    delFn = 'delRegistry';
                } else if (keyArr[1] === CONSTANTS.POINTER_CONSTRAINED_BY) {
                    delFn = 'delPointer';
                }
            }

            if (delFn) {
                keyArr.splice(0, 1);

                path = keyArr[0];
                this._client[delFn](gmeID, path);
            }
        }
        this._client.completeTransaction();
    };

    PropertyEditorController.prototype._initializeReadOnlyForSelection = function (objectIds) {
        var i,
            node,
            isReadOnly = false;

        if (this._client.isProjectReadOnly()) {
            isReadOnly = true;
        } else {
            for (i = 0; i < objectIds.length; i += 1) {
                node = this._client.getNode(objectIds[i]);
                if (node && (node.isLibraryRoot() || node.isLibraryElement())) {
                    isReadOnly = true;
                    break;
                }
            }
        }

        this._propertyGrid.setReadOnly(isReadOnly);
        this.setReadOnly(isReadOnly);
    };
    
    return PropertyEditorController;
});
