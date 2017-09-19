/*globals define, WebGMEGlobal, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger',
    'common/util/canon',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Constants',
    'assets/line/lineSvgs',
    'js/Utils/DisplayFormat',
    './PropertyEditorPanelControllerHelpers',
    'js/Dialogs/DecoratorSVGExplorer/DecoratorSVGExplorerDialog',
    'js/Dialogs/ValidVisualizers/ValidVisualizersDialog',
    'js/Controls/PropertyGrid/PropertyGridWidgets'
], function (Logger,
             CANON,
             nodePropertyNames,
             REGISTRY_KEYS,
             CONSTANTS,
             LINE_SVG_DIRECTORY,
             displayFormat,
             PropertyEditorPanelControllerHelpers,
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
        LINE_SUB_GROUP = 'Line',
        COLOR_SUB_GROUP = 'Color',
        ICON_SUB_GROUP = 'Icon',
        PREFERENCES_BASIC_SUB_GROUP = 'Basic',
        PREFERENCES_REGISTRY_KEYS = [
            REGISTRY_KEYS.DECORATOR,
            REGISTRY_KEYS.DISPLAY_FORMAT,
            REGISTRY_KEYS.SVG_ICON,
            REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON,
            REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON,
            REGISTRY_KEYS.SVG_ICON,
            REGISTRY_KEYS.PORT_SVG_ICON,
            REGISTRY_KEYS.COLOR,
            REGISTRY_KEYS.TEXT_COLOR,
            REGISTRY_KEYS.BORDER_COLOR,
            REGISTRY_KEYS.LINE_STYLE,
            REGISTRY_KEYS.LINE_START_ARROW,
            REGISTRY_KEYS.LINE_END_ARROW,
            REGISTRY_KEYS.LINE_WIDTH,
            REGISTRY_KEYS.LINE_LABEL_PLACEMENT,
            REGISTRY_KEYS.LINE_LABEL_X_OFFSET,
            REGISTRY_KEYS.LINE_LABEL_Y_OFFSET,
            REGISTRY_KEYS.REPLACEABLE
        ],
        LINE_REG_KEYS = [
            REGISTRY_KEYS.LINE_STYLE,
            REGISTRY_KEYS.LINE_START_ARROW,
            REGISTRY_KEYS.LINE_END_ARROW,
            REGISTRY_KEYS.LINE_WIDTH,
            REGISTRY_KEYS.LINE_LABEL_PLACEMENT,
            REGISTRY_KEYS.LINE_LABEL_X_OFFSET,
            REGISTRY_KEYS.LINE_LABEL_Y_OFFSET,
        ],
        NON_INVALID_PTRS = [CONSTANTS.POINTER_BASE];

    PropertyEditorController = function (client, propertyGrid, type) {
        this._client = client;
        this._propertyGrid = propertyGrid;
        this.NON_INVALID_PTRS = NON_INVALID_PTRS;
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

    // Prototypical inheritance from PropertyEditorPanelControllerHelpers.
    PropertyEditorController.prototype = Object.create(PropertyEditorPanelControllerHelpers.prototype);
    PropertyEditorController.prototype.constructor = PropertyEditorController;

    // Event handling and update triggering
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
            isFirstNode = true,
            selectedNodes = [],
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
        i = selectedObjIDs.length;
        while (--i >= 0) {
            cNode = this._client.getNode(selectedObjIDs[i]);

            if (cNode) {
                selectedNodes.push(cNode);
                flattenedAttrs = this._getNodeAttributeValues(cNode);
                this._buildCommonAttrMeta(commonAttrMeta, cNode, isFirstNode);
                this._filterCommon(commonAttrMeta, commonAttrs, flattenedAttrs, isFirstNode);

                flattenedPreferences = this._getNodeRegistryValues(cNode, PREFERENCES_REGISTRY_KEYS);
                this._filterCommon(commonAttrMeta, commonPreferences, flattenedPreferences, isFirstNode);

                flattenedMeta = this._getNodeRegistryValues(cNode, META_REGISTRY_KEYS);
                this._filterCommon(commonAttrMeta, commonMeta, flattenedMeta, isFirstNode);

                flattenedPointers = self._getPointerInfo(cNode);
                this._filterCommon(commonAttrMeta, commonPointers, flattenedPointers, isFirstNode);
                isFirstNode = false;
            }
        }

        if (selectedNodes.length === 1) {
            cNode = selectedNodes[0];
            propList[' ID/Path'] = {
                name: 'ID',
                value: cNode.getId(),
                valueType: 'string',
                isCommon: true,
                readOnly: true,
                clipboard: true
            };

            if (cNode) {
                propList[' GUID'] = {
                    name: 'GUID',
                    value: cNode.getGuid(),
                    valueType: 'string',
                    isCommon: true,
                    readOnly: true,
                    clipboard: true
                };

                if (cNode.isLibraryElement()) {
                    propList[' GUIDl'] = {
                        name: 'GUID (library)',
                        value: cNode.getLibraryGuid(),
                        valueType: 'string',
                        isCommon: true,
                        readOnly: true,
                        clipboard: true
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

            this._addItemsToResultList(selectedNodes, commonAttrMeta, decoratorNames,
                commonAttrs, CONSTANTS.PROPERTY_GROUP_ATTRIBUTES, propList, true, false, false);
        }

        if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_PREFERENCES) {
            propList[PREFERENCES_BASIC_SUB_GROUP] = {
                name: CONSTANTS.PROPERTY_GROUP_PREFERENCES,
                text: PREFERENCES_BASIC_SUB_GROUP,
                value: undefined,
                isFolder: true
            };

            if (commonPointers.hasOwnProperty(CONSTANTS.POINTER_CONSTRAINED_BY)) {
                commonPreferences[CONSTANTS.POINTER_CONSTRAINED_BY] = commonPointers[CONSTANTS.POINTER_CONSTRAINED_BY];
                delete commonPointers[CONSTANTS.POINTER_CONSTRAINED_BY];
            }

            this._addItemsToResultList(selectedNodes, commonAttrMeta, decoratorNames,
                commonPreferences, CONSTANTS.PROPERTY_GROUP_PREFERENCES, propList, false, true, false);
        }

        if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_META) {
            propList[CONSTANTS.PROPERTY_GROUP_META] = {
                name: CONSTANTS.PROPERTY_GROUP_META,
                text: CONSTANTS.PROPERTY_GROUP_META,
                value: undefined,
                isFolder: true
            };

            this._addItemsToResultList(selectedNodes, commonAttrMeta, decoratorNames,
                commonMeta, CONSTANTS.PROPERTY_GROUP_META, propList, false, true, false);
        }

        if (self._type === null || self._type === CONSTANTS.PROPERTY_GROUP_POINTERS) {
            propList[CONSTANTS.PROPERTY_GROUP_POINTERS] = {
                name: CONSTANTS.PROPERTY_GROUP_POINTERS,
                text: CONSTANTS.PROPERTY_GROUP_POINTERS,
                value: undefined,
                isFolder: true
            };

            this._addItemsToResultList(selectedNodes, commonAttrMeta, decoratorNames,
                commonPointers, CONSTANTS.PROPERTY_GROUP_POINTERS, propList, false, false, true);
        }

        return propList;
    };

    PropertyEditorController.prototype._addItemsToResultList = function (selectedNodes, commonAttrMeta, decoratorNames,
                                                                         src, prefix, dst,
                                                                         isAttribute, isRegistry, isPointer) {
        var onlyRootSelected = selectedNodes.length === 1 && selectedNodes[0].getId() === CONSTANTS.PROJECT_ROOT_ID,
            keys = Object.keys(src),
            onlyConnectionsSelected = true,
            canBeReplaceable,
            key,
            range,
            i,
            extKey,
            repKey,
            cbyKey,
            keyParts;

        for (i = 0; i < selectedNodes.length; i += 1) {
            if (selectedNodes[i].isConnection() === false) {
                onlyConnectionsSelected = false;
                break;
            }
        }

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

            if (onlyRootSelected) {
                // If only the root is selected...
                if (prefix === CONSTANTS.PROPERTY_GROUP_PREFERENCES + '.' &&
                    key !== REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON &&
                    key !== REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON) {
                    // all but the tree icons are hidden in the preferences
                    continue;
                } else if (prefix === CONSTANTS.PROPERTY_GROUP_META + '.' &&
                    key === REGISTRY_KEYS.IS_ABSTRACT || key === REGISTRY_KEYS.IS_PORT) {
                    // isAbstract and isPort are hidden i meta.
                    continue;
                }
            } else {
                // If not only the root is selected...
                if (prefix === CONSTANTS.PROPERTY_GROUP_META + '.' &&
                    (key === REGISTRY_KEYS.USED_ADDONS || key === REGISTRY_KEYS.VALID_DECORATORS)) {
                    // we hide the used addon' and 'valid decorators' fields.
                    continue;
                }
            }

            // If not only connections are selected, the connection related preferences are filtered out.
            if (onlyConnectionsSelected !== true && prefix === CONSTANTS.PROPERTY_GROUP_PREFERENCES + '.' &&
                LINE_REG_KEYS.indexOf(key) > -1) {
                continue;
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

                if (this._isReadonlyAttribute(selectedNodes, keyParts[0])) {
                    dst[extKey].readOnly = true;
                } else {
                    //is it inherited??? if so, it can be reseted to the inherited value
                    if (this._isResettableAttribute(selectedNodes, keyParts[0])) {
                        dst[extKey].options = dst[extKey].options || {};
                        dst[extKey].options.resetable = true;
                    }

                    //if it is an attribute it might be invalid according the current meta rules
                    if (this._isInvalidAttribute(selectedNodes, keyParts[0])) {
                        dst[extKey].options = dst[extKey].options || {};
                        dst[extKey].options.invalid = true;
                    } else if (this._isInvalidAttributeValue(selectedNodes, keyParts[0])) {
                        dst[extKey].options = dst[extKey].options || {};
                        dst[extKey].options.invalidValue = true;
                    }
                }

                //if the attribute value is an enum, display the enum values
                if (commonAttrMeta[key].enum && commonAttrMeta[key].enum.length > 0) {
                    dst[extKey].valueItems = commonAttrMeta[key].enum.slice(0);
                    dst[extKey].valueItems.sort();
                }

                // Get the min max for floats and integers
                if (dst[extKey].valueType === 'float' || dst[extKey].valueType === 'integer') {
                    range = this._getAttributeRange(selectedNodes, keyParts[0]);
                    dst[extKey].minValue = range.min;
                    dst[extKey].maxValue = range.max;
                }

                // Check if the attribute is a multi-line
                if (commonAttrMeta[key].multiline) {
                    dst[extKey].multiline = true;
                    dst[extKey].multilineType = commonAttrMeta[key].multilineType || 'generic';
                }
            } else if (isRegistry === true) {
                //is it inherited??? if so, it can be reseted to the inherited value
                if (this._isResettableRegistry(selectedNodes, keyParts[0])) {
                    dst[extKey].options = dst[extKey].options || {};
                    dst[extKey].options.resetable = true;
                }

                if (prefix === CONSTANTS.PROPERTY_GROUP_PREFERENCES + '.') {
                    //decorator value should be rendered as an option list
                    if (key === REGISTRY_KEYS.DECORATOR) {
                        //dstList[extKey].valueType = "option";
                        //FIXME: only the decorators for DiagramDesigner are listed so far
                        dst[extKey].valueItems = decoratorNames;
                    } else if (key === REGISTRY_KEYS.SVG_ICON || key === REGISTRY_KEYS.PORT_SVG_ICON ||
                        key === REGISTRY_KEYS.TREE_ITEM_COLLAPSED_ICON ||
                        key === REGISTRY_KEYS.TREE_ITEM_EXPANDED_ICON) {
                        dst[ICON_SUB_GROUP] = {
                            name: ICON_SUB_GROUP,
                            text: ICON_SUB_GROUP,
                            value: undefined,
                            isFolder: true
                        };
                        repKey = ICON_SUB_GROUP + '.' + key;
                        dst[repKey] = dst[extKey];
                        delete dst[extKey];
                        dst[repKey].widget = PROPERTY_GRID_WIDGETS.DIALOG_WIDGET;
                        dst[repKey].dialog = DecoratorSVGExplorerDialog;
                        dst[repKey].value = typeof dst[repKey].value !== 'string' ? '' : dst[repKey].value;
                        if (WebGMEGlobal.SvgManager.isSvg(dst[repKey].value)) {
                            dst[repKey].displayedValue = '_inmodel svg_';
                            dst[repKey].useDisplayedValue = WebGMEGlobal.SvgManager.isSvg;
                        }
                        dst[repKey].clipboard = true;
                    } else if (key === REGISTRY_KEYS.COLOR || key === REGISTRY_KEYS.BORDER_COLOR ||
                        key === REGISTRY_KEYS.TEXT_COLOR) {
                        dst[COLOR_SUB_GROUP] = {
                            name: COLOR_SUB_GROUP,
                            text: COLOR_SUB_GROUP,
                            value: undefined,
                            isFolder: true
                        };
                        repKey = COLOR_SUB_GROUP + '.' + key;
                        dst[repKey] = dst[extKey];
                        delete dst[extKey];
                        dst[repKey].widget = PROPERTY_GRID_WIDGETS.COLOR_PICKER;
                    } else if (key === REGISTRY_KEYS.LINE_STYLE) {
                        // all option is always available so we create the subgroup only here
                        dst[LINE_SUB_GROUP] = {
                            name: LINE_SUB_GROUP,
                            text: LINE_SUB_GROUP,
                            value: undefined,
                            isFolder: true
                        };
                        repKey = LINE_SUB_GROUP + '.' + key;
                        dst[repKey] = dst[extKey];
                        delete dst[extKey];
                        dst[repKey].widget = PROPERTY_GRID_WIDGETS.SVG_SELECT;
                        dst[repKey].items = LINE_SVG_DIRECTORY[REGISTRY_KEYS.LINE_STYLE];
                        dst[repKey].value = dst[repKey].value || CONSTANTS.LINE_STYLE.PATTERNS.SOLID;
                    } else if (key === REGISTRY_KEYS.LINE_START_ARROW || key === REGISTRY_KEYS.LINE_END_ARROW) {
                        repKey = LINE_SUB_GROUP + '.' + key;
                        dst[repKey] = dst[extKey];
                        delete dst[extKey];
                        dst[repKey].widget = PROPERTY_GRID_WIDGETS.SVG_SELECT;
                        dst[repKey].items = LINE_SVG_DIRECTORY[REGISTRY_KEYS.LINE_END_ARROW];
                        dst[repKey].value = dst[repKey].value || CONSTANTS.LINE_STYLE.LINE_ARROWS.NONE;
                    } else if (key === REGISTRY_KEYS.LINE_WIDTH) {
                        repKey = LINE_SUB_GROUP + '.' + key;
                        dst[repKey] = dst[extKey];
                        delete dst[extKey];
                        dst[repKey].widget = PROPERTY_GRID_WIDGETS.SVG_SELECT;
                        dst[repKey].items = LINE_SVG_DIRECTORY[REGISTRY_KEYS.LINE_WIDTH];
                        dst[repKey].value = dst[repKey].value || 1;
                    } else if (key === REGISTRY_KEYS.LINE_LABEL_PLACEMENT) {
                        repKey = LINE_SUB_GROUP + '.' + key;
                        dst[repKey] = dst[extKey];
                        delete dst[extKey];
                        dst[repKey].widget = PROPERTY_GRID_WIDGETS.SVG_SELECT;
                        dst[repKey].items = LINE_SVG_DIRECTORY[REGISTRY_KEYS.LINE_LABEL_PLACEMENT];
                        dst[repKey].value = dst[repKey].value || CONSTANTS.LINE_STYLE.LABEL_PLACEMENTS.MIDDLE;
                    } else if (key === REGISTRY_KEYS.LINE_LABEL_X_OFFSET || key === REGISTRY_KEYS.LINE_LABEL_Y_OFFSET) {
                        repKey = LINE_SUB_GROUP + '.' + key;
                        dst[repKey] = dst[extKey];
                        dst[repKey].valueType = 'integer';
                        delete dst[extKey];
                        dst[repKey].value = dst[repKey].value || 0;
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

                        canBeReplaceable = this._canBeReplaceable(selectedNodes);
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
                                this._isResettablePointer(selectedNodes, CONSTANTS.POINTER_CONSTRAINED_BY);

                            dst[cbyKey].options.invalid =
                                this._isInvalidPointer(selectedNodes, CONSTANTS.POINTER_CONSTRAINED_BY);

                            if (dst[repKey].value === false &&
                                !dst[cbyKey].options.resetable && !dst[cbyKey].options.invalid) {
                                // In this case it is only clutter to display this pointer widget.
                                delete dst[cbyKey];
                            }
                        }
                    } else if (key === CONSTANTS.POINTER_CONSTRAINED_BY) {
                        // This is handled by the REPLACEABLE above.
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
                    } else if (key === REGISTRY_KEYS.IS_ABSTRACT || key === REGISTRY_KEYS.IS_PORT) {
                        // Make sure they're treated like a boolean.
                        dst[extKey].value = !!dst[extKey].value;
                        dst[extKey].valueType = 'boolean';
                    }
                }
            } else if (isPointer === true) {
                dst[extKey].options = dst[extKey].options || {};

                // What is non-invalid cannot be reset
                dst[extKey].options.resetable = NON_INVALID_PTRS.indexOf(keyParts[0]) === -1 &&
                    this._isResettablePointer(selectedNodes, keyParts[0]);

                dst[extKey].options.invalid = this._isInvalidPointer(selectedNodes, keyParts[0]);

                //pointers have a custom widget that allows following the pointer
                dst[extKey].widget = PROPERTY_GRID_WIDGETS.POINTER_WIDGET;
                //add custom widget specific values
                dst[extKey].client = this._client;
            }

            if (!dst[extKey]) {
                delete dst[extKey];
            }
        }
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
        var nodeAttributeNames = _.union(node.getAttributeNames() || [], node.getValidAttributeNames() || []),
            len = nodeAttributeNames.length,
            attrMetaDescriptor,
            attrName,
            attrNames,
            i;

        attrNames = Object.keys(commonAttrMeta);

        // First delete the ones from the common that do not exist at this node.
        for (i = 0; i < attrNames.length; i += 1) {
            if (nodeAttributeNames.indexOf(attrNames[i]) === -1) {
                delete commonAttrMeta[attrName];
            }
        }

        // For the remaining list check if still common, that is the attribute-meta's are deeply equal.
        while (len--) {
            attrName = nodeAttributeNames[len];
            attrMetaDescriptor = node.getAttributeMeta(attrName) || {type: 'string'};

            if (commonAttrMeta.hasOwnProperty(attrName)) {
                if (CANON.stringify(commonAttrMeta[attrName]) !== CANON.stringify(attrMetaDescriptor)) {
                    delete commonAttrMeta[attrName];
                }
            } else if (initPhase) {
                commonAttrMeta[attrName] = {};
                _.extend(commonAttrMeta[attrName], attrMetaDescriptor);
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

        if (args.newValue === undefined) {
            //cannot set value to undefined, so we handle as removal
            this._onReset(args.id);
            return;
        }

        this._client.startTransaction();
        while (--i >= 0) {
            gmeID = selectedObjIDs[i];

            keyArr = args.id.split('.');
            setterFn = undefined;
            getterFn = undefined;
            if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_ATTRIBUTES) {
                setterFn = 'setAttribute';
                getterFn = 'getEditableAttribute';
            } else if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_PREFERENCES ||
                keyArr[0] === CONSTANTS.PROPERTY_GROUP_META) {
                setterFn = 'setRegistry';
                getterFn = 'getEditableRegistry';
            } else if (keyArr[0] === CONSTANTS.PROPERTY_GROUP_POINTERS) {
                this._client.setPointer(gmeID, keyArr[1], args.newValue);
            } else if (keyArr[0] === LINE_SUB_GROUP || keyArr[0] === ICON_SUB_GROUP ||
                keyArr[0] === COLOR_SUB_GROUP) {
                setterFn = 'setRegistry';
                getterFn = 'getEditableRegistry';
            } else if (keyArr[0] === TEMPLATING_SUB_GROUP) {
                if (keyArr[1] === REGISTRY_KEYS.REPLACEABLE) {
                    setterFn = 'setRegistry';
                    getterFn = 'getEditableRegistry';
                } else if (keyArr[1] === CONSTANTS.POINTER_CONSTRAINED_BY) {
                    this._client.setPointer(gmeID, keyArr[1], args.newValue);
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
                delFn = 'delAttribute';
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
            } else if (keyArr[0] === LINE_SUB_GROUP ||
                keyArr[0] === COLOR_SUB_GROUP ||
                keyArr[0] === ICON_SUB_GROUP) {
                delFn = 'delRegistry';
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

        if (this._client.isProjectReadOnly() || this._client.isCommitReadOnly()) {
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
