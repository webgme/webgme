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
        var result = false,
            validChildrenItems,
            len,
            parentNode,
            childrenIDs,
            i,
            counter,
            childrenMeta;

        //TODO: implement real logic based on META and CONSTRAINTS...
        if(parentId && baseId){
            if (parentId === CONSTANTS.PROJECT_ROOT_ID) {
                //do not let them create
                // - FCO instances and
                // - META instances
                if (!_isProjectFCO(baseId) && !_isProjectMETA(baseId)) {
                    result = true;
                }
            } else {
                result = true;
            }

            //Check #1: is baseId a valid child of parentId
            if (result === true) {
                result = _client.isValidChild(parentId, baseId);
            }

            //Check #2: Global children number multiplicity
            if (result === true) {
                result = false;

                parentNode = _client.getNode(parentId);
                childrenIDs = parentNode.getChildrenIds();
                childrenMeta = _client.getChildrenMeta(parentId);
                if (childrenMeta.max === undefined ||
                    (childrenMeta.max && childrenIDs.length < childrenMeta.max)) {
                    result = true;
                }
            }

            //Check #3: exact child type multiplicity
            if (result === true) {
                result = false;
                parentNode = _client.getNode(parentId);

                validChildrenItems = _client.getValidChildrenItems(parentId);
                len = validChildrenItems.length;
                while (len--) {
                    if (_client.isTypeOf(baseId, validChildrenItems[len].id)) {
                        childrenIDs = parentNode.getChildrenIds();
                        counter = 0;
                        result = false;

                        for (i = 0; i < childrenIDs.length; i += 1) {
                            if (_client.isTypeOf(childrenIDs[i], validChildrenItems[len].id)) {
                                counter += 1;
                            }
                        }

                        if (validChildrenItems[len].max === undefined ||
                            (validChildrenItems[len].max && counter < validChildrenItems[len].max)) {
                            result = true;
                        }

                        if (result === false) {
                            break;
                        }
                    }
                }
            }
        }

        return result;
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

        var META_ID = _client.createChild({'parentId': CONSTANTS.PROJECT_ROOT_ID});
        _client.setAttributes(META_ID, nodePropertyNames.Attributes.name, 'META');

        var PROJECT_BASE_ID = _client.createChild({'parentId': CONSTANTS.PROJECT_ROOT_ID});
        _client.setAttributes(PROJECT_BASE_ID, nodePropertyNames.Attributes.name, 'PROJECT');

        var projectRegistry = {};
        projectRegistry[CONSTANTS.PROJECT_FCO_ID] = FCO_ID;
        projectRegistry[CONSTANTS.PROJECT_META_ID] = META_ID;
        projectRegistry[CONSTANTS.PROJECT_PROJECT_BASE_ID] = PROJECT_BASE_ID;
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, nodePropertyNames.Registry.ProjectRegistry, projectRegistry);

        //FCO has a DisplayAttr registry field that controls what Attribute's value should be displayed
        //by default the Attributes.name is the to-be-displayed attribute
        _client.setRegistry(FCO_ID, nodePropertyNames.Registry.DisplayFormat, "%" + nodePropertyNames.Attributes.name);

        //set META rules accordingly

        //ROOT's meta rules
        var rootMeta = $.extend(true, {}, metaRuleBase);
        rootMeta.children.items = [{'$ref': '#' + FCO_ID}, {'$ref': '#' + META_ID}, {'$ref': '#' + PROJECT_BASE_ID}];
        rootMeta.children.minItems = [1,1,-1];
        rootMeta.children.maxItems = [1,1,-1];
        rootMeta.attributes.name = {'type': 'string'};
        _client.setMeta(CONSTANTS.PROJECT_ROOT_ID, rootMeta);

        //META's meta rules
        var metaMeta = $.extend(true, {}, metaRuleBase);
        metaMeta.children.items = [{'$ref': '#' + FCO_ID}, {'$ref': '#' + PROJECT_BASE_ID}];
        metaMeta.children.minItems = [-1,-1];
        metaMeta.children.maxItems = [-1,-1];
        metaMeta.attributes.name = {'type': 'string'};
        _client.setMeta(META_ID, metaMeta);

        //META's meta rules
        var projectBaseMeta = $.extend(true, {}, metaRuleBase);
        projectBaseMeta.attributes.name = {'type': 'string'};
        _client.setMeta(PROJECT_BASE_ID, projectBaseMeta);

        //FCO's meta rules
        var fcoMeta = $.extend(true, {}, metaRuleBase);
        fcoMeta.attributes.name = {'type': 'string'};
        _client.setMeta(FCO_ID, fcoMeta);

        //set METAEDITOR object containment correctly
        var rootMetaEditorDesc = MetaEditorConstants.GET_EMPTY_META_EDITOR_REGISTRY_OBJ();
        rootMetaEditorDesc.Members = [PROJECT_BASE_ID];
        rootMetaEditorDesc.MemberCoord[PROJECT_BASE_ID] = {'x': 100, 'y': 100};
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, MetaEditorConstants.META_EDITOR_REGISTRY_KEY, rootMetaEditorDesc);

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

    var _isProjectMETA = function (objID) {
        return _isProjectRegistryValue(CONSTANTS.PROJECT_META_ID, objID);
    };

    var _isProjectPROJECTBASE = function (objID) {
        return _isProjectRegistryValue(CONSTANTS.PROJECT_PROJECT_BASE_ID, objID);
    };

    var _isBrowsable = function (objID) {
        var result = false;

        if (!_isProjectFCO(objID) &&
            !_isProjectPROJECTBASE(objID)) {
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
        isBrowsable: _isBrowsable,
        isProjectFCO: _isProjectFCO,
        isProjectMETA: _isProjectMETA,
        isProjectPROJECTBASE: _isProjectPROJECTBASE
    }
});