/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define(['js/RegistryKeys'], function (REG_KEYS) {
    'use strict';

    //getNode
    function getNode(_id, logger, state, meta, storeNode) {

        function getParentId() {
            //just for sure, as it may missing from the cache
            return storeNode(state.core.getParent(state.nodes[_id].node));
        }

        function getId() {
            return _id;
        }

        function getGuid() {
            return state.core.getGuid(state.nodes[_id].node);
        }

        function getChildrenIds() {
            return state.core.getChildrenPaths(state.nodes[_id].node);
        }

        function getBaseId() {
            var base = state.core.getBase(state.nodes[_id].node);
            if (base) {
                return storeNode(base);
            } else {
                return null;
            }

        }

        function getInheritorIds() {
            return [];
        }

        function getAttribute(name) {
            return state.core.getAttribute(state.nodes[_id].node, name);
        }

        function getOwnAttribute(name) {
            return state.core.getOwnAttribute(state.nodes[_id].node, name);
        }

        function getEditableAttribute(name) {
            var value = state.core.getAttribute(state.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getOwnEditableAttribute(name) {
            var value = state.core.getOwnAttribute(state.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getRegistry(name) {
            return state.core.getRegistry(state.nodes[_id].node, name);
        }

        function getOwnRegistry(name) {
            return state.core.getOwnRegistry(state.nodes[_id].node, name);
        }

        function getEditableRegistry(name) {
            var value = state.core.getRegistry(state.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getOwnEditableRegistry(name) {
            var value = state.core.getOwnRegistry(state.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getPointer(name) {
            //return _core.getPointerPath(_nodes[_id].node,name);
            if (name === 'base') {
                //base is a special case as it complicates with inherited children
                return {
                    to: state.core.getPath(state.core.getBase(state.nodes[_id].node)),
                    from: []
                };
            }
            return {to: state.core.getPointerPath(state.nodes[_id].node, name), from: []};
        }

        function getOwnPointer(name) {
            return {to: state.core.getOwnPointerPath(state.nodes[_id].node, name), from: []};
        }

        function getPointerNames() {
            return state.core.getPointerNames(state.nodes[_id].node);
        }

        function getOwnPointerNames() {
            return state.core.getOwnPointerNames(state.nodes[_id].node);
        }

        function getAttributeNames() {
            return state.core.getAttributeNames(state.nodes[_id].node);
        }

        function getOwnAttributeNames() {
            return state.core.getOwnAttributeNames(state.nodes[_id].node);
        }

        function getRegistryNames() {
            return state.core.getRegistryNames(state.nodes[_id].node);
        }

        function getOwnRegistryNames() {
            return state.core.getOwnRegistryNames(state.nodes[_id].node);
        }

        //SET
        function getMemberIds(setid) {
            return state.core.getMemberPaths(state.nodes[_id].node, setid);
        }

        function getSetNames() {
            return state.core.getSetNames(state.nodes[_id].node);
        }

        function getMemberAttributeNames(setid, memberid) {
            return state.core.getMemberAttributeNames(state.nodes[_id].node, setid, memberid);
        }

        function getMemberAttribute(setid, memberid, name) {
            return state.core.getMemberAttribute(state.nodes[_id].node, setid, memberid, name);
        }

        function getEditableMemberAttribute(setid, memberid, name) {
            var attr = state.core.getMemberAttribute(state.nodes[_id].node, setid, memberid, name);
            if (attr !== null && attr !== undefined) {
                return JSON.parse(JSON.stringify(attr));
            }
            return null;
        }

        function getMemberRegistryNames(setid, memberid) {
            return state.core.getMemberRegistryNames(state.nodes[_id].node, setid, memberid);
        }

        function getMemberRegistry(setid, memberid, name) {
            return state.core.getMemberRegistry(state.nodes[_id].node, setid, memberid, name);
        }

        function getEditableMemberRegistry(setid, memberid, name) {
            var attr = state.core.getMemberRegistry(state.nodes[_id].node, setid, memberid, name);
            if (attr !== null && attr !== undefined) {
                return JSON.parse(JSON.stringify(attr));
            }
            return null;
        }

        //META
        function getValidChildrenTypes() {
            //return getMemberIds('ValidChildren');
            return meta.getValidChildrenTypes(_id);
        }

        function getValidAttributeNames() {
            return state.core.getValidAttributeNames(state.nodes[_id].node);
        }

        function getValidPointerNames() {
            return state.core.getValidPointerNames(state.nodes[_id].node);
        }

        function getValidSetNames() {
            return state.core.getValidSetNames(state.nodes[_id].node);
        }

        //constraint functions
        function getConstraintNames() {
            return state.core.getConstraintNames(state.nodes[_id].node);
        }

        function getOwnConstraintNames() {
            return state.core.getOwnConstraintNames(state.nodes[_id].node);
        }

        function getConstraint(name) {
            return state.core.getConstraint(state.nodes[_id].node, name);
        }

        function toString() {
            return state.core.getAttribute(state.nodes[_id].node, 'name') + ' (' + _id + ')';
        }

        function getCollectionPaths(name) {
            return state.core.getCollectionPaths(state.nodes[_id].node, name);
        }

        //adding functionality to get rid of GMEConcepts
        function isConnection() {
            return state.core.isConnection(state.nodes[_id].node);
        }

        function isAbstract() {
            return state.core.isAbstract(state.nodes[_id].node);
        }

        function getCrosscutsInfo() {
            return state.core.getRegistry(state.nodes[_id].node, REG_KEYS.CROSSCUTS) || [];
        }

        function getValidChildrenTypesDetailed(aspect) {
            var parameters = {
                    node: state.nodes[_id].node,
                    children: [],
                    sensitive: true,
                    multiplicity: false,
                    aspect: aspect
                },
                fullList,
                filteredList,
                validTypes = {},
                keys = getChildrenIds(),
                i;

            for (i = 0; i < keys.length; i++) {
                if (state.nodes[keys[i]]) {
                    parameters.children.push(state.nodes[keys[i]].node);
                }
            }

            fullList = state.core.getValidChildrenMetaNodes(parameters);

            parameters.multiplicity = true;
            filteredList = state.core.getValidChildrenMetaNodes(parameters);

            for (i = 0; i < fullList.length; i += 1) {
                validTypes[state.core.getPath(fullList[i])] = false;
            }

            for (i = 0; i < filteredList.length; i += 1) {
                validTypes[state.core.getPath(filteredList[i])] = true;
            }

            return validTypes;
        }

        if (state.nodes[_id]) {
            return {
                getParentId: getParentId,
                getId: getId,
                getGuid: getGuid,
                getChildrenIds: getChildrenIds,
                getBaseId: getBaseId,
                getInheritorIds: getInheritorIds,
                getAttribute: getAttribute,
                getEditableAttribute: getEditableAttribute,
                getRegistry: getRegistry,
                getEditableRegistry: getEditableRegistry,
                getOwnAttribute: getOwnAttribute,
                getOwnEditableAttribute: getOwnEditableAttribute,
                getOwnRegistry: getOwnRegistry,
                getOwnEditableRegistry: getOwnEditableRegistry,
                getPointer: getPointer,
                getPointerNames: getPointerNames,
                getAttributeNames: getAttributeNames,
                getRegistryNames: getRegistryNames,
                getOwnAttributeNames: getOwnAttributeNames,
                getOwnRegistryNames: getOwnRegistryNames,
                getOwnPointer: getOwnPointer,
                getOwnPointerNames: getOwnPointerNames,

                //SetFunctions
                getMemberIds: getMemberIds,
                getSetNames: getSetNames,
                getMemberAttributeNames: getMemberAttributeNames,
                getMemberAttribute: getMemberAttribute,
                getEditableMemberAttribute: getEditableMemberAttribute,
                getMemberRegistryNames: getMemberRegistryNames,
                getMemberRegistry: getMemberRegistry,
                getEditableMemberRegistry: getEditableMemberRegistry,

                //META functions
                getValidChildrenTypes: getValidChildrenTypes,
                getValidAttributeNames: getValidAttributeNames,
                getValidPointerNames: getValidPointerNames,
                getValidSetNames: getValidSetNames,
                getValidChildrenTypesDetailed: getValidChildrenTypesDetailed,
                isConnection: isConnection,
                isAbstract: isAbstract,
                getCrosscutsInfo: getCrosscutsInfo,

                //constraint functions
                getConstraintNames: getConstraintNames,
                getOwnConstraintNames: getOwnConstraintNames,
                getConstraint: getConstraint,

                toString: toString,

                getCollectionPaths: getCollectionPaths

            };
        } else {
            //logger.warn('Tried to get node with path "' + _id + '" but was not in state.nodes');
        }

        return null;
    }

    return getNode;
});