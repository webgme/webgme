/*globals define, _, requirejs, WebGMEGlobal*/

define(['jquery',
        'common/util/guid',
        'js/Constants',
        'js/NodePropertyNames',
        'js/RegistryKeys',
        './GMEConcepts.FCO',
        './METAAspectHelper',
        'js/Panels/MetaEditor/MetaEditorConstants',
        'js/util',
        'text!./metaConstraint._js'
    ], function (
    _jquery,
    generateGuid,
    CONSTANTS,
    nodePropertyNames,
    REGISTRY_KEYS,
    GMEConceptsFCO,
    METAAspectHelper,
    MetaEditorConstants,
    clientUtil,
    metaConstraint) {

    "use strict";

    var _client,
        EXCLUDED_POINTERS = [CONSTANTS.POINTER_BASE, CONSTANTS.POINTER_SOURCE, CONSTANTS.POINTER_TARGET];

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
			validChildrenTypes = _getValidConnectionTypesFromSource(sourceID, parentID),
			len = validChildrenTypes.length;
        
        while (len--) {
            if (_client.isValidTarget(validChildrenTypes[len], CONSTANTS.POINTER_TARGET, targetID)) {
                validTypes.push(validChildrenTypes[len]);
            }
        }

        return validTypes;
    };

    /*
     * Determines the GME Connection can be created from a source in a parent
     */
    var _getValidConnectionTypesFromSource = function (sourceID, parentID) {
        var validTypes = [],
            validChildrenTypes,
            len,
            childID;

        validChildrenTypes = _getMETAAspectMergedValidChildrenTypes(parentID) || [];

        len = validChildrenTypes.length;
        while (len--) {
            childID = validChildrenTypes[len];
            if (_isConnectionType(childID) &&
                _client.isValidTarget(childID, CONSTANTS.POINTER_SOURCE, sourceID)) {
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

        //create extra registry entries for root - currently allowed interpreters
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, REGISTRY_KEYS.VALID_PLUGINS, '');

        //create extra registry entries for root - currently used add-ons
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, REGISTRY_KEYS.USED_ADDONS, 'ConstraintAddOn');

        //create extra registry entries for root - currently allowed interpreters
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, REGISTRY_KEYS.VALID_PANELS,
            'ModelEditor METAAspect SetEditor Crosscut GraphViz');

        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, REGISTRY_KEYS.VALID_DECORATORS,
            'ModelDecorator CircleDecorator DefaultDecorator');
        //TODO: Should these be added too? MetaDecorator ModelicaDecorator UMLStateMachineDecorator SVGDecorator

        //create FCO, META, PROJECT_BASE
        // now as we create FCO always on the same relid and with the same GUID project have a more interchangeable base...
        var FCO_ID = _client.createChild({'parentId': CONSTANTS.PROJECT_ROOT_ID,
            'guid': CONSTANTS.PROJECT_FCO_GUID,
            'relid': CONSTANTS.PROJECT_FCO_RELID});

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

        //META constraint check
        _client.setConstraint(FCO_ID,'meta',{script:metaConstraint,info:"this constraint will check all the meta rules defined to an object",priority:10});

        //set attributes for FCO
        for (it in GMEConceptsFCO.FCO_ATTRIBUTES) {
            if (GMEConceptsFCO.FCO_ATTRIBUTES.hasOwnProperty(it)) {
                _client.setAttributes(FCO_ID, it, GMEConceptsFCO.FCO_ATTRIBUTES[it]);
            }
        }

        //set name of the ROOT
        _client.setAttributes(CONSTANTS.PROJECT_ROOT_ID,nodePropertyNames.Attributes.name,CONSTANTS.PROJECT_ROOT_NAME);

        //set base registry for FCO
        for (it in GMEConceptsFCO.FCO_REGISTRY) {
            if (GMEConceptsFCO.FCO_REGISTRY.hasOwnProperty(it)) {
                _client.setRegistry(FCO_ID, it, GMEConceptsFCO.FCO_REGISTRY[it]);
            }
        }

        var projectRegistry = {};
        projectRegistry[CONSTANTS.PROJECT_FCO_ID] = FCO_ID;
        _client.setRegistry(CONSTANTS.PROJECT_ROOT_ID, REGISTRY_KEYS.PROJECT_REGISTRY, projectRegistry);

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

            //make sure that no basIDList is not derived from parentId
            len = baseIdList.length;
            while (len-- && result === true) {
                if (_client.isTypeOf(baseIdList[len], parentId)) {
                    result = false;
                }
            }


            //FILTER OUT ABSTRACTS
            if (result === true) {
                //TODO: why just filter out, why not return false in the first place
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

    var _canAddToSet = function (objID, setName, itemIDList) {
        var obj = _client.getNode(objID),
            setMeta = _client.getPointerMeta(objID, setName),
            members = obj.getMemberIds(setName) || [],
            result = true,
            i,
            baseId;

        //check #1: global multiplicity
        if (setMeta.max !== undefined &&
            setMeta.max > -1 &&
            members.length + itemIDList.length > setMeta.max) {
            result = false;
        }

        //check #2: is every item a valid target of the pointer list
        if (result === true) {
            for (i = 0; i < itemIDList.length; i += 1) {
                if (!_client.isValidTarget(objID, setName, itemIDList[i])) {
                    result = false;
                    break;
                }
            }
        }

        //check #3: multiplicity check for each type
        if (result === true) {
            var maxPerType = {};
            for (i = 0; i < setMeta.items.length; i += 1) {
                if (setMeta.items[i].max !== undefined &&
                    setMeta.items[i].max > -1) {
                    maxPerType[setMeta.items[i].id] = setMeta.items[i].max;
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

    var _getValidPointerTypes = function (parentId, targetId) {
        var validChildrenTypes = _getMETAAspectMergedValidChildrenTypes(parentId),
            i,
            childObj,
            ptrNames,
            j,
            validPointerTypes = [];

        i = validChildrenTypes.length;
        while (i--) {
            if (_canCreateChild(parentId, validChildrenTypes[i])) {
                childObj = _client.getNode(validChildrenTypes[i]);
                if (childObj) {
                    ptrNames = _.difference(childObj.getPointerNames().slice(0), EXCLUDED_POINTERS);
                    j = ptrNames.length;
                    while (j--) {
                        if (_client.isValidTarget(validChildrenTypes[i], ptrNames[j], targetId)) {
                            validPointerTypes.push({'baseId': validChildrenTypes[i],
                                                     'pointer': ptrNames[j]});
                        }
                    }
                }
            }
        }

        return validPointerTypes;
    };


    var _canCreateChildrenInAspect = function (parentId, baseIdList, aspectName) {
        var canCreateInAspect = true,
            i,
            j;

        if (aspectName) {
            if (aspectName !== CONSTANTS.ASPECT_ALL) {
                //need to check in aspect
                var metaAspectDesc = _client.getMetaAspect(parentId, aspectName);
                if (metaAspectDesc) {
                    //metaAspectDesc.items contains the children types the user specified to participate in this aspect
                    var aspectTypes =  metaAspectDesc.items || [];

                    if (aspectTypes.length > 0) {
                        //each item in baseIdList has to be a descendant of any item in aspectTypes
                        i = baseIdList.length;
                        while (i-- && canCreateInAspect) {
                            j  = aspectTypes.length;
                            canCreateInAspect = false;
                            while (j--) {
                                if (_client.isTypeOf(baseIdList[i], aspectTypes[j])) {
                                    canCreateInAspect = true;
                                    break;
                                }
                            }
                        }
                    } else {
                        //aspect types is empty
                        canCreateInAspect = false;
                    }
                } else {
                    //unknown aspect name
                    canCreateInAspect = false;
                }
            }
        } else {
            //not a valid aspect name
            canCreateInAspect = false;
        }

        if (canCreateInAspect) {
            canCreateInAspect = _canCreateChildren(parentId, baseIdList);
        }

        return canCreateInAspect;
    };

    /*
     * Determines the GME Connection can be created from a source in a parent in an aspect
     */
    var _getValidConnectionTypesFromSourceInAspect = function (sourceID, parentID, aspectName) {
        var validTypes = [],
            i,
            j,
            canCreateInAspect;

        if (aspectName) {
            if (aspectName !== CONSTANTS.ASPECT_ALL) {
                //need to check in aspect
                var metaAspectDesc = _client.getMetaAspect(parentID, aspectName);
                if (metaAspectDesc) {
                    //metaAspectDesc.items contains the children types the user specified to participate in this aspect
                    var aspectTypes =  metaAspectDesc.items || [];

                    if (aspectTypes.length > 0) {
                        validTypes = _getValidConnectionTypesFromSource(sourceID, parentID);
                        //each item in validTypes has to be a descendant of any item in aspectTypes
                        i = validTypes.length;
                        while (i--) {
                            j  = aspectTypes.length;
                            canCreateInAspect = false;
                            while (j--) {
                                if (_client.isTypeOf(validTypes[i], aspectTypes[j])) {
                                    canCreateInAspect = true;
                                    break;
                                }
                            }

                            if (!canCreateInAspect) {
                                validTypes.splice(i, 1);
                            }
                        }
                    }
                }
            } else {
                validTypes = _getValidConnectionTypesFromSource(sourceID, parentID);
            }
        }

        return validTypes;
    };

    /*
     * Determines if a GME Connection can be created between source and target in parent in an aspect
     */
    var _getValidConnectionTypesInAspect = function (sourceID, targetID, parentID, aspectName) {
        var validTypes = [],
            canCreateInAspect,
            i,
            j;

        if (aspectName) {
            if (aspectName !== CONSTANTS.ASPECT_ALL) {
                //need to check in aspect
                var metaAspectDesc = _client.getMetaAspect(parentID, aspectName);
                if (metaAspectDesc) {
                    //metaAspectDesc.items contains the children types the user specified to participate in this aspect
                    var aspectTypes =  metaAspectDesc.items || [];

                    if (aspectTypes.length > 0) {
                        validTypes = _getValidConnectionTypes(sourceID, targetID, parentID);
                        //each item in validTypes has to be a descendant of any item in aspectTypes
                        i = validTypes.length;
                        while (i--) {
                            j  = aspectTypes.length;
                            canCreateInAspect = false;
                            while (j--) {
                                if (_client.isTypeOf(validTypes[i], aspectTypes[j])) {
                                    canCreateInAspect = true;
                                    break;
                                }
                            }

                            if (!canCreateInAspect) {
                                validTypes.splice(i, 1);
                            }
                        }
                    }
                }
            } else {
                validTypes = _getValidConnectionTypes(sourceID, targetID, parentID);
            }
        }

        return validTypes;
    };

    var _isValidTypeInAspect = function (objID, aspectContainerID, aspectName) {
        var result = false,
            aspectTerritoryPattern = _client.getAspectTerritoryPattern(aspectContainerID, aspectName),
            aspectItems = aspectTerritoryPattern.items,
            len;

        if (aspectItems) {
            len = aspectItems.length;
            while (len--) {
                if (_client.isTypeOf(objID, aspectItems[len])) {
                    result = true;
                    break;
                }
            }
        }

        return result;
    };

    /*
     *
     */
    var _isValidChildrenTypeInCrossCut = function (parentId, baseIdList) {
        //Check if each single baseId is a valid children type of parentId
        var i,
            result = true,
            baseId;

        i = baseIdList.length;
        while (i--) {
            baseId = baseIdList[i];
            if (!_client.isValidChild(parentId, baseId)) {
                result = false;
                break;
            }
        }

        return result;
    } ;

    var _getValidPointerTargetTypesFromSource = function (objID, isSet) {
        var result = [],
            EXCLUDED_POINTERS = [CONSTANTS.POINTER_BASE],
            EXCLUDED_SETS = [],
            nodeObj = _client.getNode(objID),
            pointerNames = isSet ? _.difference(nodeObj.getSetNames(), EXCLUDED_SETS) : _.difference(nodeObj.getPointerNames(), EXCLUDED_POINTERS),
            len = pointerNames.length,
            pointerMetaDescriptor,
            i;

        while (len--) {
            pointerMetaDescriptor = _client.getValidTargetItems(objID,pointerNames[len]);
            if (pointerMetaDescriptor && pointerMetaDescriptor.length > 0) {
                i = pointerMetaDescriptor.length;
                while (i--) {
                    if (result.indexOf(pointerMetaDescriptor[i].id) === -1) {
                        result.push(pointerMetaDescriptor[i].id);
                    }
                }
            }
        }

        return result;
    };


    var _getValidPointerTypesFromSourceToTarget = function (sourceId, targetId) {
        var result = [],
            EXCLUDED_POINTERS = [CONSTANTS.POINTER_BASE],
            nodeObj = _client.getNode(sourceId),
            pointerNames = _.difference(nodeObj.getPointerNames(), EXCLUDED_POINTERS),
            len = pointerNames.length;

        while (len--) {
            if (_client.isValidTarget(sourceId,pointerNames[len],targetId)) {
                result.push(pointerNames[len]);
            }
        }

        result.sort(clientUtil.caseInsensitiveSort);

        return result;
    };


    var _getValidSetTypesFromContainerToMember = function (containerId, objId) {
        var result = [],
            EXCLUDED_SETS = [],
            nodeObj = _client.getNode(containerId),
            setNames = _.difference(nodeObj.getSetNames(), EXCLUDED_SETS),
            len = setNames.length;

        while (len--) {
            if (_canAddToSet(containerId, setNames[len], [objId])) {
                result.push(setNames[len]);
            }
        }

        result.sort(clientUtil.caseInsensitiveSort);

        return result;
    };

    var _getCrosscuts = function (objID) {
        var obj = _client.getNode(objID),
            crosscuts = [];

        if (obj) {
            crosscuts = obj.getRegistry(REGISTRY_KEYS.CROSSCUTS) || [];
        }

        return crosscuts;
    };

    var _getSets = function (objID) {
        var obj = _client.getNode(objID),
            setNames = obj.getSetNames() || [],
            aspects = _client.getMetaAspectNames(objID) || [],
            crossCuts = _getCrosscuts(objID),
            crossCutNames = [];

        //filter out ManualAspects from the list
        _.each(crossCuts, function (element/*, index, list*/) {
            crossCutNames.push(element.SetID);
        });

        setNames = _.difference(setNames, crossCutNames, aspects);

        return setNames;
    };

    var _getFCOId = function () {
        var FCO_ID,
            projectRootNode = _client.getNode(CONSTANTS.PROJECT_ROOT_ID);

        if (projectRootNode) {
            if(projectRootNode.getRegistryNames().indexOf(REGISTRY_KEYS.PROJECT_REGISTRY) !== -1){
                FCO_ID = projectRootNode.getRegistry(REGISTRY_KEYS.PROJECT_REGISTRY)[CONSTANTS.PROJECT_FCO_ID];
            }
        }

        return FCO_ID;
    };

    var _canMoveNodeHere = function(parentId,nodes){
        var parent = _client.getNode(parentId),
            parentBase = parent.getBaseId();

        if(parentBase){
            if(nodes.indexOf(parentBase) !== -1){
                return false;
            }
        }

        return true;
    };

    //return utility functions
    return {
        initialize: _initialize,
        isConnection: _isConnection,
        isConnectionType: _isConnectionType,
        /*isValidConnectionSource: _isValidConnectionSource,*/
        canCreateChild: _canCreateChild,
        isValidConnection: _isValidConnection,
        createBasicProjectSeed: _createBasicProjectSeed,
        isProjectFCO: _isProjectFCO,
        canCreateChildren: _canCreateChildren,
        canDeleteNode: _canDeleteNode,
        getMETAAspectMergedValidChildrenTypes: _getMETAAspectMergedValidChildrenTypes,
        canAddToSet: _canAddToSet,
        isAbstract: _isAbstract,
        isPort: _isPort,
        getValidPointerTypes: _getValidPointerTypes,
        canCreateChildrenInAspect: _canCreateChildrenInAspect,
        getValidConnectionTypesFromSourceInAspect: _getValidConnectionTypesFromSourceInAspect,
        getValidConnectionTypesInAspect: _getValidConnectionTypesInAspect,
        isValidTypeInAspect: _isValidTypeInAspect,
        isValidChildrenTypeInCrossCut: _isValidChildrenTypeInCrossCut,
        getValidPointerTargetTypesFromSource: _getValidPointerTargetTypesFromSource,
        getValidPointerTypesFromSourceToTarget: _getValidPointerTypesFromSourceToTarget,
        getValidSetTypesFromContainerToMember: _getValidSetTypesFromContainerToMember,
        getCrosscuts: _getCrosscuts,
        getSets: _getSets,
        getFCOId: _getFCOId,
        canMoveNodeHere: _canMoveNodeHere
    };
});