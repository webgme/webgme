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
        'js/Constants',
        'js/NodePropertyNames',
        'js/Panels/MetaEditor/MetaEditorConstants'], function (_jquery,
                                           CONSTANTS,
                                           nodePropertyNames,
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
    var _isValidConnectionSource = function (objID, parentID) {
        var valid = false,
            validChildrenTypes,
            len,
            childID;

        validChildrenTypes = _client.getValidChildrenTypes(parentID) || [];
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
    };

    /*
     * Determines if a GME Connection can be created between source and target in parent
     */
    var _getValidConnectionTypes = function (sourceID, targetID, parentID) {
        var validTypes = [],
            validChildrenTypes,
            len,
            childID;

        validChildrenTypes = _client.getValidChildrenTypes(parentID) || [];
        len = validChildrenTypes.length;
        while (len--) {
            childID = validChildrenTypes[len];
            if (_client.getPointerMeta(childID, CONSTANTS.POINTER_SOURCE) &&
                _client.getPointerMeta(childID, CONSTANTS.POINTER_TARGET) &&
                _client.isValidTarget(childID, CONSTANTS.POINTER_SOURCE, sourceID) &&
                _client.isValidTarget(childID, CONSTANTS.POINTER_TARGET, targetID)) {
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
        var metaRuleBase = {
            "children": {},
            "attributes": {},
            "pointers": {}
        };

        _client.startTransaction();

        //create FCO, META, PROJECT_BASE
        var FCO_ID = _client.createChild({'parentId': CONSTANTS.PROJECT_ROOT_ID});
        _client.setAttributes(FCO_ID, nodePropertyNames.Attributes.name, 'FCO');
        _client.setRegistry(FCO_ID, nodePropertyNames.Registry.decorator, "");
        _client.setRegistry(FCO_ID, nodePropertyNames.Registry.isPort, false);

        var projectRegistry = {};
        projectRegistry[CONSTANTS.PROJECT_FCO_ID] = FCO_ID;
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, nodePropertyNames.Registry.ProjectRegistry, projectRegistry);

        //FCO has a DisplayAttr registry field that controls what Attribute's value should be displayed
        //by default the Attributes.name is the to-be-displayed attribute
        _client.setRegistry(FCO_ID, nodePropertyNames.Registry.DisplayFormat, CONSTANTS.DISPLAY_FORMAT_ATTRIBUTE_MARKER + nodePropertyNames.Attributes.name);

        //set META rules accordingly

        //ROOT's meta rules
        var rootMeta = $.extend(true, {}, metaRuleBase);
        rootMeta.children.items = [{'$ref': '#' + FCO_ID}];
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
        _client.setMemberRegistry(CONSTANTS.PROJECT_ROOT_ID, FCO_ID, MetaEditorConstants.META_ASPECT_SET_NAME, MetaEditorConstants.META_ASPECT_MEMBER_POSITION_REGISTRY_KEY, {'x': 100, 'y': 100} );

        _client.completeTransaction();
    };

    var _isProjectRegistryValue = function (key, objID) {
        var rootNode = _client.getNode(CONSTANTS.PROJECT_ROOT_ID),
            projectRegistry = rootNode.getRegistry(nodePropertyNames.Registry.ProjectRegistry),
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
            j;

        //TODO: implement real logic based on META and CONSTRAINTS...
        if(parentId && baseIdList && baseIdList.length > 0){
           result = true;

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
        var validReferenceTypes = _client.getValidChildrenTypes(parentId),
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

    //return utility functions
    return {
        initialize: _initialize,
        isConnection: _isConnection,
        isConnectionType: _isConnectionType,
        isValidConnectionSource: _isValidConnectionSource,
        getValidConnectionTypes: _getValidConnectionTypes,
        canCreateChild: _canCreateChild,
        isValidConnection: _isValidConnection,
        createBasicProjectSeed: _createBasicProjectSeed,
        isProjectFCO: _isProjectFCO,
        canCreateChildren: _canCreateChildren,
        getValidReferenceTypes: _getValidReferenceTypes,
        canDeleteNode: _canDeleteNode
    }
});