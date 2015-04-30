/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define(['common/core/users/tojson'], function (toJson) {
    'use strict';

    //getNode
    function getNode(_id, _clientGlobal) {


        function getParentId() {
            //just for sure, as it may missing from the cache
            return _clientGlobal.functions.storeNode(_clientGlobal.core.getParent(_clientGlobal.nodes[_id].node));
        }

        function getId() {
            return _id;
        }

        function getGuid() {
            return _clientGlobal.core.getGuid(_clientGlobal.nodes[_id].node);
        }

        function getChildrenIds() {
            return _clientGlobal.core.getChildrenPaths(_clientGlobal.nodes[_id].node);
        }

        function getBaseId() {
            var base = _clientGlobal.core.getBase(_clientGlobal.nodes[_id].node);
            if (base) {
                return _clientGlobal.functions.storeNode(base);
            } else {
                return null;
            }

        }

        function getInheritorIds() {
            return [];
        }

        function getAttribute(name) {
            return _clientGlobal.core.getAttribute(_clientGlobal.nodes[_id].node, name);
        }

        function getOwnAttribute(name) {
            return _clientGlobal.core.getOwnAttribute(_clientGlobal.nodes[_id].node, name);
        }

        function getEditableAttribute(name) {
            var value = _clientGlobal.core.getAttribute(_clientGlobal.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getOwnEditableAttribute(name) {
            var value = _clientGlobal.core.getOwnAttribute(_clientGlobal.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getRegistry(name) {
            return _clientGlobal.core.getRegistry(_clientGlobal.nodes[_id].node, name);
        }

        function getOwnRegistry(name) {
            return _clientGlobal.core.getOwnRegistry(_clientGlobal.nodes[_id].node, name);
        }

        function getEditableRegistry(name) {
            var value = _clientGlobal.core.getRegistry(_clientGlobal.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getOwnEditableRegistry(name) {
            var value = _clientGlobal.core.getOwnRegistry(_clientGlobal.nodes[_id].node, name);
            if (typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            return value;
        }

        function getPointer(name) {
            //return _core.getPointerPath(_nodes[_id].node,name);
            if (name === 'base') {
                //base is a special case as it complicates with inherited children
                return {to: _clientGlobal.core.getPath(_clientGlobal.core.getBase(_clientGlobal.nodes[_id].node)),
                    from: []};
            }
            return {to: _clientGlobal.core.getPointerPath(_clientGlobal.nodes[_id].node, name), from: []};
        }

        function getOwnPointer(name) {
            return {to: _clientGlobal.core.getOwnPointerPath(_clientGlobal.nodes[_id].node, name), from: []};
        }

        function getPointerNames() {
            return _clientGlobal.core.getPointerNames(_clientGlobal.nodes[_id].node);
        }

        function getOwnPointerNames() {
            return _clientGlobal.core.getOwnPointerNames(_clientGlobal.nodes[_id].node);
        }

        function getAttributeNames() {
            return _clientGlobal.core.getAttributeNames(_clientGlobal.nodes[_id].node);
        }

        function getOwnAttributeNames() {
            return _clientGlobal.core.getOwnAttributeNames(_clientGlobal.nodes[_id].node);
        }

        function getRegistryNames() {
            return _clientGlobal.core.getRegistryNames(_clientGlobal.nodes[_id].node);
        }

        function getOwnRegistryNames() {
            return _clientGlobal.core.getOwnRegistryNames(_clientGlobal.nodes[_id].node);
        }

        //SET
        function getMemberIds(setid) {
            return _clientGlobal.core.getMemberPaths(_clientGlobal.nodes[_id].node, setid);
        }

        function getSetNames() {
            return _clientGlobal.core.getSetNames(_clientGlobal.nodes[_id].node);
        }

        function getMemberAttributeNames(setid, memberid) {
            return _clientGlobal.core.getMemberAttributeNames(_clientGlobal.nodes[_id].node, setid, memberid);
        }

        function getMemberAttribute(setid, memberid, name) {
            return _clientGlobal.core.getMemberAttribute(_clientGlobal.nodes[_id].node, setid, memberid, name);
        }

        function getEditableMemberAttribute(setid, memberid, name) {
            var attr = _clientGlobal.core.getMemberAttribute(_clientGlobal.nodes[_id].node, setid, memberid, name);
            if (attr !== null && attr !== undefined) {
                return JSON.parse(JSON.stringify(attr));
            }
            return null;
        }

        function getMemberRegistryNames(setid, memberid) {
            return _clientGlobal.core.getMemberRegistryNames(_clientGlobal.nodes[_id].node, setid, memberid);
        }

        function getMemberRegistry(setid, memberid, name) {
            return _clientGlobal.core.getMemberRegistry(_clientGlobal.nodes[_id].node, setid, memberid, name);
        }

        function getEditableMemberRegistry(setid, memberid, name) {
            var attr = _clientGlobal.core.getMemberRegistry(_clientGlobal.nodes[_id].node, setid, memberid, name);
            if (attr !== null && attr !== undefined) {
                return JSON.parse(JSON.stringify(attr));
            }
            return null;
        }

        //META
        function getValidChildrenTypes() {
            //return getMemberIds('ValidChildren');
            return _clientGlobal.META.getValidChildrenTypes(_id);
        }

        //constraint functions
        function getConstraintNames() {
            return _clientGlobal.core.getConstraintNames(_clientGlobal.nodes[_id].node);
        }

        function getOwnConstraintNames() {
            return _clientGlobal.core.getOwnConstraintNames(_clientGlobal.nodes[_id].node);
        }

        function getConstraint(name) {
            return _clientGlobal.core.getConstraint(_clientGlobal.nodes[_id].node, name);
        }

        function printData() {
            //probably we will still use it for test purposes, but now it goes officially
            // into printing the node's json representation
            toJson(_clientGlobal.core, _clientGlobal.nodes[_id].node, '', 'guid', function (err, jNode) {
                _clientGlobal.logger.debug('node in JSON format[status = ', err, ']:', jNode);
            });
        }

        function toString() {
            return _clientGlobal.core.getAttribute(_clientGlobal.nodes[_id].node, 'name') + ' (' + _id + ')';
        }

        function getCollectionPaths(name) {
            return _clientGlobal.core.getCollectionPaths(_clientGlobal.nodes[_id].node, name);
        }

        if (_clientGlobal.nodes[_id]) {
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

                //constraint functions
                getConstraintNames: getConstraintNames,
                getOwnConstraintNames: getOwnConstraintNames,
                getConstraint: getConstraint,

                printData: printData,
                toString: toString,

                getCollectionPaths: getCollectionPaths

            };
        }

        return null;

    }

    return getNode;
});