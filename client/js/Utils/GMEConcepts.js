/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

/*
 * Utility helper functions implementing GME concepts...
 */

define(['jquery',
        'util/guid',
        'js/Constants',
        'js/NodePropertyNames',
        'js/RegistryKeys',
        './GMEConcepts.FCO',
        './METAAspectHelper',
        'js/Panels/MetaEditor/MetaEditorConstants'], function (_jquery,
                                                               generateGuid,
                                           CONSTANTS,
                                           nodePropertyNames,
                                           REGISTRY_KEYS,
                                           GMEConceptsFCO,
                                           METAAspectHelper,
                                           MetaEditorConstants) {

    var _client;

    var _initialize = function (client) {
        if (!_client) {
            _client = client;
        }
    };

    /*
     * a connection is an object that has CONSTANTS.POINTER_SOURCE and CONSTANTS.POINTER_TARGET pointers and those values are set
     */
    var _isConnection = function (objID) {
        var validConnection = false,
            obj = _client.getNode(objID);

        if (obj) {
            var ptrNames = obj.getPointerNames();
            if (ptrNames.indexOf(CONSTANTS.POINTER_SOURCE) !== -1 &&
                ptrNames.indexOf(CONSTANTS.POINTER_TARGET) !== -1 &&
                obj.getPointer(CONSTANTS.POINTER_SOURCE).to &&
                obj.getPointer(CONSTANTS.POINTER_TARGET).to) {
                validConnection = true;
            }
        }

        return validConnection;
    };

    /*
     * a connectiontype is an object that has CONSTANTS.POINTER_SOURCE and CONSTANTS.POINTER_TARGET pointers
     */
    var _isConnectionType = function (objID) {
        var valid = false,
            obj = _client.getNode(objID);

        if (obj) {
            var ptrNames = obj.getPointerNames();
            if (ptrNames.indexOf(CONSTANTS.POINTER_SOURCE) !== -1 &&
                ptrNames.indexOf(CONSTANTS.POINTER_TARGET) !== -1) {
                valid = true;
            }
        }

        return valid;
    };

    /*
     * Determines if the given object in the given container can be a valid connection source
     *
     * The given parent has a valid children type that has CONSTANTS.POINTER_SOURCE and CONSTANTS.POINTER_TARGET pointers
     * and the given object can be a valid target for CONSTANTS.POINTER_SOURCE
     */
    /*var _isValidConnectionSource = function (objID, parentID) {
        var valid = false,
            validChildrenTypes,
            len,
            childID;

        validChildrenTypes = _getMETAAspectMergedValidChildrenTypes(parentID) || [];
        len = validChildrenTypes.length;
        while (len--) {
            childID = validChildrenTypes[len];
            if (_client.getPointerMeta(childID, CONSTANTS.POINTER_SOURCE) &&
                _client.getPointerMeta(childID, CONSTANTS.POINTER_TARGET) &&
                _client.isValidTarget(childID, CONSTANTS.POINTER_SOURCE, objID)) {
                valid = true;
                break;
            }
        }

        return valid;
    };*/

    /*
     * Determines if a GME Connection can be created between source and target in parent
     */
    var _getValidConnectionTypes = function (sourceID, targetID, parentID) {
        var validTypes = [],
            validChildrenTypes,
            len,
            childID;

        validChildrenTypes = _getMETAAspectMergedValidChildrenTypes(parentID) || [];

        len = validChildrenTypes.length;
        while (len--) {
            childID = validChildrenTypes[len];
            if (_client.isValidTarget(childID, CONSTANTS.POINTER_SOURCE, sourceID) &&
                _client.isValidTarget(childID, CONSTANTS.POINTER_TARGET, targetID)) {
                validTypes.push(childID);
            }
        }

        return validTypes;
    };

    /*
     * Determines if a GME Connection can be created between source and target in parent
     */
    var _getValidConnectionTypesInParent = function (sourceID, parentID) {
        var validTypes = [],
            validChildrenTypes,
            len,
            childID;

        validChildrenTypes = _getMETAAspectMergedValidChildrenTypes(parentID) || [];

        len = validChildrenTypes.length;
        while (len--) {
            childID = validChildrenTypes[len];
            if (_isConnectionType(childID) &&
                _client.isValidTarget(childID, CONSTANTS.POINTER_SOURCE, sourceID) &&
                _canCreateChild(parentID, childID)) {
                validTypes.push(childID);
            }
        }

        return validTypes;
    };

    /*
     * Determines if a GME Connection is valid by META between source and destination
     */
    var _isValidConnection = function (sourceID, targetID, connectionID) {
        var valid = false;

        if (sourceID !== undefined && targetID !== undefined && connectionID !== undefined) {
            if (_client.isValidTarget(connectionID, CONSTANTS.POINTER_SOURCE, sourceID) &&
                _client.isValidTarget(connectionID, CONSTANTS.POINTER_TARGET, targetID)) {
                valid = true;
            }
        }

        return valid;
    };

    /*
     * Returns true if a new child with the given baseId (instance of base) can be created in parent
     */
    var _canCreateChild = function (parentId, baseId) {
        return _canCreateChildren(parentId, [baseId]);
    };

    var _createBasicProjectSeed = function () {
        var it;
        var metaRuleBase = {
            "children": {},
            "attributes": {},
            "pointers": {}
        };

        _client.startTransaction();

        //create FCO, META, PROJECT_BASE
        var FCO_ID = _client.createChild({'parentId': CONSTANTS.PROJECT_ROOT_ID});

        //set attributes for FCO
        for (it in GMEConceptsFCO.FCO_ATTRIBUTES) {
            if (GMEConceptsFCO.FCO_ATTRIBUTES.hasOwnProperty(it)) {
                _client.setAttributes(FCO_ID, it, GMEConceptsFCO.FCO_ATTRIBUTES[it]);
            }
        }

        //set base registry for FCO
        for (it in GMEConceptsFCO.FCO_REGISTRY) {
            if (GMEConceptsFCO.FCO_REGISTRY.hasOwnProperty(it)) {
                _client.setRegistry(FCO_ID, it, GMEConceptsFCO.FCO_REGISTRY[it]);
            }
        }

        var projectRegistry = {};
        projectRegistry[CONSTANTS.PROJECT_FCO_ID] = FCO_ID;
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, REGISTRY_KEYS.PROJECT_REGISTRY, projectRegistry);

        //set META rules accordingly

        //ROOT's meta rules
        var rootMeta = $.extend(true, {}, metaRuleBase);
        rootMeta.children.items = [{'$ref': FCO_ID}];
        rootMeta.children.minItems = [-1];
        rootMeta.children.maxItems = [-1];
        rootMeta.attributes.name = {'type': 'string'};
        _client.setMeta(CONSTANTS.PROJECT_ROOT_ID, rootMeta);

        //FCO's meta rules
        var fcoMeta = $.extend(true, {}, metaRuleBase);
        fcoMeta.attributes.name = {'type': 'string'};
        _client.setMeta(FCO_ID, fcoMeta);

        //set META ASPECT to show FCO
        _client.addMember(CONSTANTS.PROJECT_ROOT_ID, FCO_ID, MetaEditorConstants.META_ASPECT_SET_NAME);
        _client.setMemberRegistry(CONSTANTS.PROJECT_ROOT_ID, FCO_ID, MetaEditorConstants.META_ASPECT_SET_NAME, REGISTRY_KEYS.POSITION, {'x': 100, 'y': 100} );

        //create a default MetaSheet
        var defaultMetaSheetID = MetaEditorConstants.META_ASPECT_SHEET_NAME_PREFIX + generateGuid();
        _client.createSet(CONSTANTS.PROJECT_ROOT_ID, defaultMetaSheetID);

        var defaultMetaSheetDesc = {'SetID': defaultMetaSheetID,
            'order': 0,
            'title': 'META'};

        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, REGISTRY_KEYS.META_SHEETS, [defaultMetaSheetDesc]);

        //add the FCO to the default META sheet
        _client.addMember(CONSTANTS.PROJECT_ROOT_ID, FCO_ID, defaultMetaSheetID);
        _client.setMemberRegistry(CONSTANTS.PROJECT_ROOT_ID, FCO_ID, defaultMetaSheetID, REGISTRY_KEYS.POSITION, {'x': 100, 'y': 100} );

        _client.completeTransaction();
    };

    var _isProjectRegistryValue = function (key, objID) {
        var rootNode = _client.getNode(CONSTANTS.PROJECT_ROOT_ID),
            projectRegistry = rootNode.getRegistry(REGISTRY_KEYS.PROJECT_REGISTRY),
            value = projectRegistry ?  projectRegistry[key] : null;

        return objID === value;
    };

    var _isProjectFCO = function (objID) {
        return _isProjectRegistryValue(CONSTANTS.PROJECT_FCO_ID, objID);
    };

    /*
     * Returns true if a new child with the given baseId (instance of base) can be created in parent
     */
    var _canCreateChildren = function (parentId, baseIdList) {
        var result = false,
            validChildrenItems,
            len,
            parentNode,
            childrenIDs,
            i,
            counter,
            childrenMeta,
            baseId,
            j,
            node;

        //TODO: implement real logic based on META and CONSTRAINTS...
        if(typeof parentId === 'string' && baseIdList && baseIdList.length > 0){
           result = true;

            //FILTER OUT ABSTRACTS
            len = baseIdList.length;
            while (len--) {
                node = _client.getNode(baseIdList[len]);
                if (node) {
                    if (node.getRegistry(REGISTRY_KEYS.IS_ABSTRACT) === true) {
                        baseIdList.splice(len, 1);
                    }
                }
            }
            if (baseIdList.length === 0) {
                result = false;
            }
            //END OF --- FILTER OUT ABSTRACTS

            //Check #1: Global children number multiplicity
            if (result === true) {
                parentNode = _client.getNode(parentId);
                childrenIDs = parentNode.getChildrenIds();
                childrenMeta = _client.getChildrenMeta(parentId);
                if (childrenMeta.max !== undefined &&
                    childrenMeta.max > -1 &&
                    childrenIDs.length + baseIdList.length > childrenMeta.max) {
                    result = false;
                }
            }

            //Check #2: is each single baseId a valid child of parentId
            var validChildrenTypes = _client.getValidChildrenTypes(parentId);
            i = validChildrenTypes.length;

            var validChildrenTypeMap = {};
            while (i--) {
                validChildrenTypeMap[validChildrenTypes[i]] = 0;
            }
            if (result === true) {
                i = baseIdList.length;
                while(i--) {
                    baseId = baseIdList[i];
                    if (!_client.isValidChild(parentId, baseId)) {
                        result = false;
                        break;
                    } else {
                        //this baseId is a valid child
                        //adjust accounting
                        j = validChildrenTypes.length;
                        while (j--) {
                            if (_client.isTypeOf(baseId, validChildrenTypes[j])) {
                                validChildrenTypeMap[validChildrenTypes[j]] += 1;
                            }
                        }
                    }
                }
            }

            //Check #3: exact child type multiplicity
            //map is already there of the children-to-be because of check #2
            if (result === true) {
                parentNode = _client.getNode(parentId);

                childrenIDs = parentNode.getChildrenIds();

                validChildrenItems = _client.getValidChildrenItems(parentId);
                len = validChildrenItems.length;
                while (len--) {
                    if (_client.isTypeOf(baseId, validChildrenItems[len].id)) {

                        counter = 0;

                        for (i = 0; i < childrenIDs.length; i += 1) {
                            if (_client.isTypeOf(childrenIDs[i], validChildrenItems[len].id)) {
                                counter += 1;
                            }
                        }

                        if (validChildrenItems[len].max !== undefined &&
                            validChildrenItems[len].max > -1 &&
                            counter + validChildrenTypeMap[validChildrenItems[len].id] > validChildrenItems[len].max) {
                            result = false;
                            break;
                        }
                    }
                }
            }
        }

        return result;
    };

    var _getValidReferenceTypes = function (parentId, targetId) {
        var validReferenceTypes = _getMETAAspectMergedValidChildrenTypes(parentId),
            i;

        i = validReferenceTypes.length;
        while (i--) {
            if (!_client.isValidTarget(validReferenceTypes[i], CONSTANTS.POINTER_REF, targetId) ||
                !_canCreateChild(parentId, validReferenceTypes[i])) {
                validReferenceTypes.splice(i, 1);
            }
        }

        return validReferenceTypes;
    };

    var _canDeleteNode = function (objID) {
        var result = false;

        //do not let delete project root and FCO
        if (objID !== CONSTANTS.PROJECT_ROOT_ID &&
            !_isProjectFCO(objID)) {
            result = true;
        }

        return result;
    };

    var _getMETAAspectMergedValidChildrenTypes = function (objID) {
        var metaAspectMembers = METAAspectHelper.getMetaAspectMembers(),
            validChildrenTypes = _client.getValidChildrenTypes(objID),
            len = metaAspectMembers.length,
            id;

        while(len--) {
            id = metaAspectMembers[len];
            if (validChildrenTypes.indexOf(id) === -1) {
                if (_client.isValidChild(objID, id)) {
                    validChildrenTypes.push(id);
                }
            }
        }

        return validChildrenTypes;
    };

    var _canAddToPointerList = function (objID, pointerListName, itemIDList) {
        var obj = _client.getNode(objID),
            pointerListMeta = _client.getPointerMeta(objID, pointerListName),
            members = obj.getMemberIds(pointerListName) || [],
            result = true,
            i,
            baseId;

        //check #1: global multiplicity
        if (pointerListMeta.max !== undefined &&
            pointerListMeta.max > -1 &&
            members.length + itemIDList.length > pointerListMeta.max) {
            result = false;
        }

        //check #2: is every item a valid target of the pointer list
        if (result === true) {
            for (i = 0; i < itemIDList.length; i += 1) {
                if (!_client.isValidTarget(objID, pointerListName, itemIDList[i])) {
                    result = false;
                    break;
                }
            }
        }

        //check #3: multiplicity check for each type
        if (result === true) {
            var maxPerType = {};
            for (i = 0; i < pointerListMeta.items.length; i += 1) {
                if (pointerListMeta.items[i].max !== undefined &&
                    pointerListMeta.items[i].max > -1) {
                    maxPerType[pointerListMeta.items[i].id] = pointerListMeta.items[i].max;
                }
            }

            for (baseId in maxPerType) {
                if (maxPerType.hasOwnProperty(baseId)) {
                    //check all the members if it's this type
                    for (i = 0; i < members.length; i += 1) {
                        if (_client.isTypeOf(members[i], baseId)) {
                            maxPerType[baseId] -= 1;
                        }
                    }

                    //check all the itemIDList if it's this type
                    for (i = 0; i < itemIDList.length; i += 1) {
                        if (_client.isTypeOf(itemIDList[i], baseId)) {
                            maxPerType[baseId] -= 1;
                        }
                    }

                    if (maxPerType[baseId] < 1) {
                        result = false;
                        break;
                    }
                }
            }
        }

        return result;
    };

    var _isAbstract = function (objID) {
        var isAbstract = false,
            obj = _client.getNode(objID);

        if (obj) {
            isAbstract = obj.getRegistry(REGISTRY_KEYS.IS_ABSTRACT);
        }

        return isAbstract === true;
    };

    var _isPort = function (objID) {
        var isPort = false,
            obj = _client.getNode(objID);

        if (obj) {
            isPort = obj.getRegistry(REGISTRY_KEYS.IS_PORT);
        }

        return isPort === true;
    };

    //return utility functions
    return {
        initialize: _initialize,
        isConnection: _isConnection,
        isConnectionType: _isConnectionType,
        /*isValidConnectionSource: _isValidConnectionSource,*/
        getValidConnectionTypes: _getValidConnectionTypes,
        canCreateChild: _canCreateChild,
        isValidConnection: _isValidConnection,
        createBasicProjectSeed: _createBasicProjectSeed,
        isProjectFCO: _isProjectFCO,
        canCreateChildren: _canCreateChildren,
        getValidReferenceTypes: _getValidReferenceTypes,
        canDeleteNode: _canDeleteNode,
        getMETAAspectMergedValidChildrenTypes: _getMETAAspectMergedValidChildrenTypes,
        getValidConnectionTypesInParent: _getValidConnectionTypesInParent,
        canAddToPointerList: _canAddToPointerList,
        isAbstract: _isAbstract,
        isPort: _isPort
    }
});