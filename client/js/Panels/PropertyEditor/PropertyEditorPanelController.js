"use strict";

define(['logManager',
    'clientUtil',
    'js/NodePropertyNames',
    'js/Decorators/DecoratorDB'], function (logManager,
                                        util,
                                        nodePropertyNames,
                                        DecoratorDB) {

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
            _getPointerInfo;

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
            }

            return util.flattenObject(result);
        };

        if (selectionLength > 0) {
            //get all attributes
            //get all registry elements
            i = selectionLength;
            while (--i >= 0) {
                cNode = this._client.getNode(selectedObjIDs[i]);

                if (cNode) {
                    flattenedAttrs = _getNodePropertyValues(cNode, "getAttributeNames", "getAttribute");

                    _filterCommon(commonAttrs, flattenedAttrs, i === selectionLength - 1);

                    flattenedRegs = _getNodePropertyValues(cNode, "getRegistryNames", "getRegistry");

                    _filterCommon(commonRegs, flattenedRegs, i === selectionLength - 1);

                    flattenedPointers = _getPointerInfo(cNode);

                    _filterCommon(commonPointers, flattenedPointers, i === selectionLength - 1);
                }
            }

            _addItemsToResultList = function (srcList, prefix, dstList) {
                var i,
                    extKey,
                    keyParts;

                if (prefix !== "") {
                    prefix += ".";
                }

                for (i in srcList) {
                    if (srcList.hasOwnProperty(i)) {
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
                    }
                }
            };

            if (selectedObjIDs.length === 1) {
                propList["ID"] = { "name": 'ID',
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

            _addItemsToResultList(commonAttrs, "Attributes", propList);

            //filter out rows from Registry
            //MetaEditor.MemberCoord
            for (var it in commonRegs) {
                if (commonRegs.hasOwnProperty(it)) {
                    if (commonRegs.hasOwnProperty(it)) {
                        if (it.indexOf('MetaEditor.MemberCoord.') !== -1) {
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