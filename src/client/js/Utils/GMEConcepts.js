/*globals define, _ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['jquery',
    'common/util/guid',
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    './GMEConcepts.FCO',
    'js/Panels/MetaEditor/MetaEditorConstants',
    'js/util'
], function (_jquery,
             generateGuid,
             CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             GMEConceptsFCO,
             MetaEditorConstants,
             clientUtil) {

    'use strict';

    var client,
        EXCLUDED_POINTERS = [CONSTANTS.POINTER_BASE, CONSTANTS.POINTER_SOURCE, CONSTANTS.POINTER_TARGET];

    function initialize(c) {
        if (!client) {
            client = c;
        }
    }

    /*
     * a connection is an object that has CONSTANTS.POINTER_SOURCE and CONSTANTS.POINTER_TARGET
     * pointers and those values are set
     */
    function isConnection(objID) {
        var validConnection = false,
            obj = client.getNode(objID),
            ptrNames;

        if (obj) {
            ptrNames = obj.getPointerNames();
            if (ptrNames.indexOf(CONSTANTS.POINTER_SOURCE) !== -1 &&
                ptrNames.indexOf(CONSTANTS.POINTER_TARGET) !== -1 &&
                obj.getPointer(CONSTANTS.POINTER_SOURCE).to &&
                obj.getPointer(CONSTANTS.POINTER_TARGET).to) {
                validConnection = true;
            }
        }

        return validConnection;
    }

    /*
     * a connection type is an object that has CONSTANTS.POINTER_SOURCE and CONSTANTS.POINTER_TARGET pointers
     */
    function isConnectionType(objID) {
        var valid = false,
            obj = client.getNode(objID),
            ptrNames;

        if (obj) {
            ptrNames = obj.getPointerNames();
            if (ptrNames.indexOf(CONSTANTS.POINTER_SOURCE) !== -1 &&
                ptrNames.indexOf(CONSTANTS.POINTER_TARGET) !== -1) {
                valid = true;
            }
        }

        return valid;
    }

    /*
     * Determines if a GME Connection can be created between source and target in parent
     */
    function getValidConnectionTypes(sourceID, targetID, parentID) {
        var validTypes = [],
            validChildrenTypes = getValidConnectionTypesFromSource(sourceID, parentID),
            targetNode = client.getNode(targetID),
            len = validChildrenTypes.length;

        while (len-- && targetNode) {
            if (targetNode.isValidTargetOf(validChildrenTypes[len], CONSTANTS.POINTER_TARGET)) {
                validTypes.push(validChildrenTypes[len]);
            }
        }

        return validTypes;
    }

    /*
     * Determines the GME Connection can be created from a source in a parent
     */
    function getValidConnectionTypesFromSource(sourceID, parentID) {
        var validTypes = [],
            sourceNode = client.getNode(sourceID),
            validChildrenTypes,
            len,
            childID;

        validChildrenTypes = getMETAAspectMergedValidChildrenTypes(parentID) || [];

        len = validChildrenTypes.length;
        while (len-- && sourceNode) {
            childID = validChildrenTypes[len];
            if (sourceNode && isConnectionType(childID) &&
                sourceNode.isValidTargetOf(childID, CONSTANTS.POINTER_SOURCE)) {
                validTypes.push(childID);
            }
        }

        return validTypes;
    }

    /*
     * Determines if a GME Connection is valid by META between source and destination
     */
    function isValidConnection(sourceID, targetID, connectionID) {
        var valid = false,
            sourceNode = client.getNode(sourceID),
            targetNode = client.getNode(targetID);

        if (sourceNode && targetNode && connectionID) {
            if (sourceNode.isValidTargetOf(connectionID, CONSTANTS.POINTER_SOURCE) &&
                targetNode.isValidTargetOf(connectionID, CONSTANTS.POINTER_TARGET)) {
                valid = true;
            }
        }

        return valid;
    }

    /*
     * Returns true if a new child with the given baseId (instance of base) can be created in parent
     */
    function canCreateChild(parentId, baseId) {
        return canCreateChildren(parentId, [baseId]);
    }

    function isProjectRegistryValue(key, objID) {
        var rootNode = client.getNode(CONSTANTS.PROJECT_ROOT_ID),
            projectRegistry = rootNode.getRegistry(REGISTRY_KEYS.PROJECT_REGISTRY),
            value = projectRegistry ? projectRegistry[key] : null;

        return objID === value;
    }

    function isProjectFCO(objID) {
        return isProjectRegistryValue(CONSTANTS.PROJECT_FCO_ID, objID);
    }

    // returns with all the contaners of the node plus the node itself up untill the ROOT
    function getAllContainerIds(nodeId) {
        var containers = [],
            node = client.getNode(nodeId);

        while (node !== null) {
            containers.push(node.getId());
            node = client.getNode(node.getParentId());
        }
        return containers;
    }

    /*
     * Returns true if a new child with the given baseId (instance of base) can be created in parent
     */
    function canCreateChildren(parentId, baseIdList) {
        var result = false,
            validChildrenItems,
            len,
            parentNode,
            childrenIDs,
            i,
            counter,
            childrenMeta,
            baseId,
            baseNode,
            j,
            node,
            validChildrenTypes,
            validChildrenTypeMap,
            parentIds = getAllContainerIds(parentId);

        //TODO: implement real logic based on META and CONSTRAINTS...
        if (typeof parentId === 'string' && baseIdList && baseIdList.length > 0) {
            result = true;

            //make sure that no baseId is derived from any of the containers
            len = baseIdList.length;
            while (len-- && result === true) {
                i = parentIds.length;
                while (i-- && result === true) {
                    if (client.isTypeOf(baseIdList[len], parentIds[i])) {
                        result = false;
                    }
                }

            }

            //FILTER OUT ABSTRACTS
            if (result === true) {
                //TODO: why just filter out, why not return false in the first place
                len = baseIdList.length;
                while (len--) {
                    node = client.getNode(baseIdList[len]);
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
            parentNode = client.getNode(parentId);
            if (result === true) {
                childrenIDs = parentNode.getChildrenIds();
                childrenMeta = client.getChildrenMeta(parentId);
                if (childrenMeta.max !== undefined &&
                    childrenMeta.max > -1 &&
                    childrenIDs.length + baseIdList.length > childrenMeta.max) {
                    result = false;
                }
            }

            //Check #2: is each single baseId a valid child of parentId
            validChildrenTypes = parentNode.getValidChildrenIds();
            i = validChildrenTypes.length;

            validChildrenTypeMap = {};
            while (i--) {
                validChildrenTypeMap[validChildrenTypes[i]] = 0;
            }
            if (result === true) {
                i = baseIdList.length;
                while (i--) {

                    baseId = baseIdList[i];
                    baseNode = client.getNode(baseId);
                    if (!baseNode || !baseNode.isValidChildOf(parentId)) {
                        result = false;
                        break;
                    } else {
                        //this baseId is a valid child
                        //adjust accounting
                        j = validChildrenTypes.length;
                        while (j--) {
                            if (client.isTypeOf(baseId, validChildrenTypes[j])) {
                                validChildrenTypeMap[validChildrenTypes[j]] += 1;
                            }
                        }
                    }
                }
            }

            //Check #3: exact child type multiplicity
            //map is already there of the children-to-be because of check #2
            if (result === true) {
                parentNode = client.getNode(parentId);

                childrenIDs = parentNode.getChildrenIds();

                validChildrenItems = client.getValidChildrenItems(parentId);
                len = validChildrenItems.length;
                while (len--) {
                    if (client.isTypeOf(baseId, validChildrenItems[len].id)) {

                        counter = 0;

                        for (i = 0; i < childrenIDs.length; i += 1) {
                            if (client.isTypeOf(childrenIDs[i], validChildrenItems[len].id)) {
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
    }

    function canDeleteNode(objID) {
        var result = false;

        //do not let delete project root and FCO
        if (objID !== CONSTANTS.PROJECT_ROOT_ID && !isProjectFCO(objID)) {
            result = true;
        }

        return result;
    }

    function getMETAAspectMergedValidChildrenTypes(objID) {
        var metaNodes = client.getAllMetaNodes() || [],
            nodeObj = client.getNode(objID),
            validChildrenTypes = nodeObj ? nodeObj.getValidChildrenIds() : [],
            len = metaNodes.length,
            id,
            metaNode;

        while (len--) {
            metaNode = metaNodes[len];
            id = metaNode.getId();
            if (validChildrenTypes.indexOf(id) === -1) {
                if (metaNode.isValidChildOf(objID)) {
                    validChildrenTypes.push(id);
                }
            }
        }

        return validChildrenTypes;
    }

    function canAddToSet(objID, setName, itemIDList) {
        var obj = client.getNode(objID),
            setMeta = client.getPointerMeta(objID, setName),
            members = obj.getMemberIds(setName) || [],
            result = true,
            i,
            itemNode,
            baseId,
            maxPerType;

        if (!setMeta) {
            return false;
        }

        //check #1: global multiplicity
        if (setMeta.max !== undefined &&
            setMeta.max > -1 &&
            members.length + itemIDList.length > setMeta.max) {
            result = false;
        }

        //check #2: is every item a valid target of the pointer list
        if (result === true) {
            for (i = 0; i < itemIDList.length; i += 1) {
                itemNode = client.getNode(itemIDList[i]);
                if (!(itemNode && itemNode.isValidTargetOf(objID, setName))) {
                    result = false;
                    break;
                }
            }
        }

        //check #3: multiplicity check for each type
        if (result === true) {
            maxPerType = {};
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
                        if (client.isTypeOf(members[i], baseId)) {
                            maxPerType[baseId] -= 1;
                        }
                    }

                    //check all the itemIDList if it's this type
                    for (i = 0; i < itemIDList.length; i += 1) {
                        if (client.isTypeOf(itemIDList[i], baseId)) {
                            maxPerType[baseId] -= 1;
                        }
                    }

                    if (maxPerType[baseId] < 0) {
                        result = false;
                        break;
                    }
                }
            }
        }

        return result;
    }

    function isAbstract(objID) {
        var _isAbstract = false,
            obj = client.getNode(objID);

        if (obj) {
            _isAbstract = obj.getRegistry(REGISTRY_KEYS.IS_ABSTRACT);
        }

        return _isAbstract === true;
    }

    function isPort(objID) {
        var _isPort = false,
            obj = client.getNode(objID);

        if (obj) {
            _isPort = obj.getRegistry(REGISTRY_KEYS.IS_PORT);
        }

        return _isPort === true;
    }

    function getValidPointerTypes(parentId, targetId) {
        var validChildrenTypes = getMETAAspectMergedValidChildrenTypes(parentId),
            targetNode = client.getNode(targetId),
            i,
            childObj,
            ptrNames,
            j,
            validPointerTypes = [];

        i = validChildrenTypes.length;
        while (i-- && targetNode) {
            if (canCreateChild(parentId, validChildrenTypes[i])) {
                childObj = client.getNode(validChildrenTypes[i]);
                if (childObj) {
                    ptrNames = _.difference(childObj.getPointerNames().slice(0), EXCLUDED_POINTERS);
                    j = ptrNames.length;
                    while (j--) {
                        if (targetNode.isValidTargetOf(validChildrenTypes[i], ptrNames[j])) {
                            validPointerTypes.push({
                                baseId: validChildrenTypes[i],
                                pointer: ptrNames[j]
                            });
                        }
                    }
                }
            }
        }

        return validPointerTypes;
    }

    function canCreateChildrenInAspect(parentId, baseIdList, aspectName) {
        var canCreateInAspect = true,
            parentNode = client.getNode(parentId),
            i,
            j,
            aspectTypes;

        if (aspectName && parentNode) {
            if (aspectName !== CONSTANTS.ASPECT_ALL) {
                //need to check in aspect
                aspectTypes = parentNode.getAspectMeta(parentId, aspectName);
                if (aspectTypes) {
                    //aspectTypes contains the children types the user specified to participate in this aspect

                    if (aspectTypes.length > 0) {
                        //each item in baseIdList has to be a descendant of any item in aspectTypes
                        i = baseIdList.length;
                        while (i-- && canCreateInAspect) {
                            j = aspectTypes.length;
                            canCreateInAspect = false;
                            while (j--) {
                                if (client.isTypeOf(baseIdList[i], aspectTypes[j])) {
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
            //not a valid aspect name nor valid node for parent
            canCreateInAspect = false;
        }

        if (canCreateInAspect) {
            canCreateInAspect = canCreateChildren(parentId, baseIdList);
        }

        return canCreateInAspect;
    }

    /*
     * Determines the GME Connection can be created from a source in a parent in an aspect
     */
    function getValidConnectionTypesFromSourceInAspect(sourceID, parentID, aspectName) {
        var validTypes = [],
            parentNode = client.getNode(parentID),
            i,
            j,
            canCreateInAspect,
            aspectTypes;

        if (aspectName && parentNode) {
            if (aspectName !== CONSTANTS.ASPECT_ALL) {
                //need to check in aspect
                aspectTypes = parentNode.getAspectMeta(aspectName);
                if (aspectTypes) {
                    //aspectTypes contains the children types the user specified to participate in this aspect

                    if (aspectTypes.length > 0) {
                        validTypes = getValidConnectionTypesFromSource(sourceID, parentID);
                        //each item in validTypes has to be a descendant of any item in aspectTypes
                        i = validTypes.length;
                        while (i--) {
                            j = aspectTypes.length;
                            canCreateInAspect = false;
                            while (j--) {
                                if (client.isTypeOf(validTypes[i], aspectTypes[j])) {
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
                validTypes = getValidConnectionTypesFromSource(sourceID, parentID);
            }
        }

        return validTypes;
    }

    /*
     * Determines if a GME Connection can be created between source and target in parent in an aspect
     */
    function getValidConnectionTypesInAspect(sourceID, targetID, parentID, aspectName) {
        var validTypes = [],
            parentNode = client.getNode(parentID),
            canCreateInAspect,
            i,
            j,
            aspectTypes;

        if (aspectName && parentNode) {
            if (aspectName !== CONSTANTS.ASPECT_ALL) {
                //need to check in aspect
                aspectTypes = parentNode.getAspectMeta(aspectName);
                if (aspectTypes) {
                    //aspectTypes contains the children types the user specified to participate in this aspect

                    if (aspectTypes.length > 0) {
                        validTypes = getValidConnectionTypes(sourceID, targetID, parentID);
                        //each item in validTypes has to be a descendant of any item in aspectTypes
                        i = validTypes.length;
                        while (i--) {
                            j = aspectTypes.length;
                            canCreateInAspect = false;
                            while (j--) {
                                if (client.isTypeOf(validTypes[i], aspectTypes[j])) {
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
                validTypes = getValidConnectionTypes(sourceID, targetID, parentID);
            }
        }

        return validTypes;
    }

    function isValidTypeInAspect(objID, aspectContainerID, aspectName) {
        var result = false,
            aspectTerritoryPattern = client.getAspectTerritoryPattern(aspectContainerID, aspectName),
            aspectItems = aspectTerritoryPattern.items,
            len;

        if (aspectItems) {
            len = aspectItems.length;
            while (len--) {
                if (client.isTypeOf(objID, aspectItems[len])) {
                    result = true;
                    break;
                }
            }
        }

        return result;
    }

    /*
     *
     */
    function isValidChildrenTypeInCrossCut(parentId, baseIdList) {
        //Check if each single baseId is a valid children type of parentId
        var i,
            result = true,
            baseNode,
            baseId;

        i = baseIdList.length;
        while (i--) {
            baseId = baseIdList[i];
            baseNode = client.getNode(baseId);
            if (!baseNode || !baseNode.isValidChildOf(parentId)) {
                result = false;
                break;
            }
        }

        return result;
    }

    function getValidPointerTargetTypesFromSource(objID, isSet) {
        var result = [],
            EXCLUDED_POINTERS = [CONSTANTS.POINTER_BASE],
            EXCLUDED_SETS = [],
            nodeObj = client.getNode(objID),
            pointerNames = isSet ? _.difference(nodeObj.getSetNames(),
                EXCLUDED_SETS) : _.difference(nodeObj.getPointerNames(), EXCLUDED_POINTERS),
            len = pointerNames.length,
            pointerMetaDescriptor,
            i;

        while (len--) {
            pointerMetaDescriptor = client.getValidTargetItems(objID, pointerNames[len]);
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
    }

    function getValidPointerTypesFromSourceToTarget(sourceId, targetId) {
        var result = [],
            EXCLUDED_POINTERS = [CONSTANTS.POINTER_BASE],
            sourceNode = client.getNode(sourceId),
            targetNode = client.getNode(targetId),
            pointerNames = _.difference(sourceNode.getPointerNames(), EXCLUDED_POINTERS),
            len = pointerNames.length;

        while (len-- && targetNode) {
            if (targetNode.isValidTargetOf(sourceId, pointerNames[len])) {
                result.push(pointerNames[len]);
            }
        }

        result.sort(clientUtil.caseInsensitiveSort);

        return result;
    }

    function getValidSetTypesFromContainerToMember(containerId, objId) {
        var result = [],
            EXCLUDED_SETS = [],
            nodeObj = client.getNode(containerId),
            setNames = _.difference(nodeObj.getValidSetNames(), EXCLUDED_SETS),
            len = setNames.length;

        while (len--) {
            if (canAddToSet(containerId, setNames[len], [objId])) {
                result.push(setNames[len]);
            }
        }

        result.sort(clientUtil.caseInsensitiveSort);

        return result;
    }

    function getCrosscuts(objID) {
        var obj = client.getNode(objID),
            crosscuts = [];

        if (obj) {
            crosscuts = obj.getRegistry(REGISTRY_KEYS.CROSSCUTS) || [];
        }

        return crosscuts;
    }

    function getSets(objID) {
        var obj = client.getNode(objID),
            setNames = _.union(obj.getSetNames() || [], obj.getValidSetNames() || []),
            aspects = obj.getValidAspectNames() || [],
            crossCuts = getCrosscuts(objID),
            crossCutNames = [];

        //filter out ManualAspects from the list
        _.each(crossCuts, function (element/*, index, list*/) {
            crossCutNames.push(element.SetID);
        });

        setNames = _.difference(setNames, crossCutNames, aspects);

        return setNames;
    }

    function getFCOId() {
        var FCO_ID,
            projectRootNode = client.getNode(CONSTANTS.PROJECT_ROOT_ID);

        if (projectRootNode) {
            if (projectRootNode.getRegistryNames().indexOf(REGISTRY_KEYS.PROJECT_REGISTRY) !== -1) {
                FCO_ID = projectRootNode.getRegistry(REGISTRY_KEYS.PROJECT_REGISTRY)[CONSTANTS.PROJECT_FCO_ID];
            }
        }

        return FCO_ID;
    }

    function canMoveNodeHere(parentId, nodes) {
        var node,
            i;

        for (i = 0; i < nodes.length; i += 1) {
            node = client.getNode(nodes[i]);
            if (!(node && node.isValidNewParent(parentId))) {
                return false;
            }
        }

        return true;
    }

    // Replaceable and constrainedby
    function canBeReplaceable(nodeOrId) {
        var node = typeof nodeOrId === 'string' ? client.getNode(nodeOrId) : nodeOrId,
            result = true,
            parentNode,
            parentBaseNode;

        if (!node || !node.getBaseId() || node.getMetaTypeId() === node.getId()) {
            // Root-node and FCO cannot be replaceable, nor can meta-nodes.
            result = false;
        } else {
            parentNode = client.getNode(node.getParentId());
            parentBaseNode = client.getNode(parentNode.getBaseId());
            if (parentBaseNode && parentBaseNode.getChildrenRelids().indexOf(node.getRelid()) > -1) {
                // The base node of the parent also has this node as a child
                // meaning this is an 'instance-child' and it cannot be a template.
                result = false;
            } else {
                // These are children of either the root-node or FCO
            }
        }

        return result;
    }

    function isReplaceable(nodeOrId) {
        var node = typeof nodeOrId === 'string' ? client.getNode(nodeOrId) : nodeOrId;

        return canBeReplaceable(node) && !!node.getRegistry(REGISTRY_KEYS.REPLACEABLE);
    }

    function getConstrainedById(nodeOrId) {
        var node = typeof nodeOrId === 'string' ? client.getNode(nodeOrId) : nodeOrId,
            constrainedById = node.getPointerId(CONSTANTS.POINTER_CONSTRAINED_BY);

        if (typeof constrainedById === 'string') {
            return constrainedById;
        } else {
            return node.getMetaTypeId(node);
        }
    }

    function isInstanceOf(nodeOrId, baseNodeOrId) {
        var node = typeof nodeOrId === 'string' ? client.getNode(nodeOrId) : nodeOrId,
            nodeId = node.getId(),
            prospectBaseNodeId = typeof baseNodeOrId === 'string' ? baseNodeOrId : baseNodeOrId.getId();

        while (node) {
            if (nodeId === prospectBaseNodeId) {
                return true;
            }

            nodeId = node.getBaseId();
            if (!nodeId) {
                return false;
            }

            node = client.getNode(nodeId);
        }
    }

    function isValidReplaceableTarget(nodeOrId, targetNodeOrId) {
        var node = typeof nodeOrId === 'string' ? client.getNode(nodeOrId) : nodeOrId,
            targetId = typeof targetNodeOrId === 'string' ? targetNodeOrId : targetNodeOrId.getId(),
            result = true;

        result = isReplaceable(node);
        if (result) {
            result = isInstanceOf(targetNodeOrId, getConstrainedById(node));
        }

        if (result) {
            result = node.isValidNewBase(targetId);
        }

        return result;
    }

    //return utility functions
    return {
        initialize: initialize,
        isConnection: isConnection,
        isConnectionType: isConnectionType,
        /*isValidConnectionSource: _isValidConnectionSource,*/
        canCreateChild: canCreateChild,
        isValidConnection: isValidConnection,
        isProjectFCO: isProjectFCO,
        canCreateChildren: canCreateChildren,
        canDeleteNode: canDeleteNode,
        getMETAAspectMergedValidChildrenTypes: getMETAAspectMergedValidChildrenTypes,
        canAddToSet: canAddToSet,
        isAbstract: isAbstract,
        isPort: isPort,
        getValidPointerTypes: getValidPointerTypes,
        canCreateChildrenInAspect: canCreateChildrenInAspect,
        getValidConnectionTypesFromSourceInAspect: getValidConnectionTypesFromSourceInAspect,
        getValidConnectionTypesInAspect: getValidConnectionTypesInAspect,
        isValidTypeInAspect: isValidTypeInAspect,
        isValidChildrenTypeInCrossCut: isValidChildrenTypeInCrossCut,
        getValidPointerTargetTypesFromSource: getValidPointerTargetTypesFromSource,
        getValidPointerTypesFromSourceToTarget: getValidPointerTypesFromSourceToTarget,
        getValidSetTypesFromContainerToMember: getValidSetTypesFromContainerToMember,
        getCrosscuts: getCrosscuts,
        getSets: getSets,
        getFCOId: getFCOId,
        canMoveNodeHere: canMoveNodeHere,

        // Replaceables
        canBeReplaceable: canBeReplaceable,
        isReplaceable: isReplaceable,
        getConstrainedById: getConstrainedById,
        isValidReplaceableTarget: isValidReplaceableTarget
    };
});