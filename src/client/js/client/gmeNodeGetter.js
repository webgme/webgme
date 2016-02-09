/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['js/RegistryKeys'], function (REG_KEYS) {
    'use strict';

    /**
     * @param {string} _id - Path of node.
     * @param {GmeLogger} logger - logger.
     * @param {object} state - state of the client.
     * @param {object} meta - collected meta nodes.
     * @param {function} storeNode - invoked when storing new nodes.
     * @constructor
     */
    function GMENode(_id, logger, state, meta, storeNode) {
        this._id = _id;
        this._logger = logger;
        this._state = state;
        this._meta = meta;
        this._storeNode = storeNode;
    }

    GMENode.prototype.getParentId = function () {
        //just for sure, as it may missing from the cache
        return this._storeNode(this._state.core.getParent(this._state.nodes[this._id].node));
    };

    GMENode.prototype.getId = function () {
        return this._id;
    };

    GMENode.prototype.getGuid = function () {
        return this._state.core.getGuid(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getChildrenIds = function () {
        return this._state.core.getChildrenPaths(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getBaseId = function () {
        var base = this._state.core.getBase(this._state.nodes[this._id].node);
        if (base) {
            return this._storeNode(base);
        } else {
            return null;
        }

    };

    GMENode.prototype.getInheritorIds = function () {
        return [];
    };

    GMENode.prototype.getAttribute = function (name) {
        return this._state.core.getAttribute(this._state.nodes[this._id].node, name);
    };

    GMENode.prototype.getOwnAttribute = function (name) {
        return this._state.core.getOwnAttribute(this._state.nodes[this._id].node, name);
    };

    GMENode.prototype.getEditableAttribute = function (name) {
        var value = this._state.core.getAttribute(this._state.nodes[this._id].node, name);
        if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    };

    GMENode.prototype.getOwnEditableAttribute = function (name) {
        var value = this._state.core.getOwnAttribute(this._state.nodes[this._id].node, name);
        if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    };

    GMENode.prototype.getRegistry = function (name) {
        return this._state.core.getRegistry(this._state.nodes[this._id].node, name);
    };

    GMENode.prototype.getOwnRegistry = function (name) {
        return this._state.core.getOwnRegistry(this._state.nodes[this._id].node, name);
    };

    GMENode.prototype.getEditableRegistry = function (name) {
        var value = this._state.core.getRegistry(this._state.nodes[this._id].node, name);
        if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    };

    GMENode.prototype.getOwnEditableRegistry = function (name) {
        var value = this._state.core.getOwnRegistry(this._state.nodes[this._id].node, name);
        if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    };

    GMENode.prototype.getPointer = function (name) {
        //return _core.getPointerPath(_nodes[this._id].node,name);
        if (name === 'base') {
            //base is a special case as it complicates with inherited children
            return {
                to: this._state.core.getPath(this._state.core.getBase(this._state.nodes[this._id].node)),
                from: []
            };
        }
        return {to: this._state.core.getPointerPath(this._state.nodes[this._id].node, name), from: []};
    };

    GMENode.prototype.getOwnPointer = function (name) {
        return {to: this._state.core.getOwnPointerPath(this._state.nodes[this._id].node, name), from: []};
    };

    GMENode.prototype.getPointerNames = function () {
        return this._state.core.getPointerNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnPointerNames = function () {
        return this._state.core.getOwnPointerNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getAttributeNames = function () {
        return this._state.core.getAttributeNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnAttributeNames = function () {
        return this._state.core.getOwnAttributeNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getRegistryNames = function () {
        return this._state.core.getRegistryNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnRegistryNames = function () {
        return this._state.core.getOwnRegistryNames(this._state.nodes[this._id].node);
    };

    //SET
    GMENode.prototype.getMemberIds = function (setid) {
        return this._state.core.getMemberPaths(this._state.nodes[this._id].node, setid);
    };

    GMENode.prototype.getSetNames = function () {
        return this._state.core.getSetNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getMemberAttributeNames = function (setid, memberid) {
        return this._state.core.getMemberAttributeNames(this._state.nodes[this._id].node, setid, memberid);
    };

    GMENode.prototype.getMemberAttribute = function (setid, memberid, name) {
        return this._state.core.getMemberAttribute(this._state.nodes[this._id].node, setid, memberid, name);
    };

    GMENode.prototype.getEditableMemberAttribute = function (setid, memberid, name) {
        var attr = this._state.core.getMemberAttribute(this._state.nodes[this._id].node, setid, memberid, name);
        if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
        }
        return null;
    };

    GMENode.prototype.getMemberRegistryNames = function (setid, memberid) {
        return this._state.core.getMemberRegistryNames(this._state.nodes[this._id].node, setid, memberid);
    };

    GMENode.prototype.getMemberRegistry = function (setid, memberid, name) {
        return this._state.core.getMemberRegistry(this._state.nodes[this._id].node, setid, memberid, name);
    };

    GMENode.prototype.getEditableMemberRegistry = function (setid, memberid, name) {
        var attr = this._state.core.getMemberRegistry(this._state.nodes[this._id].node, setid, memberid, name);
        if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
        }
        return null;
    };

    //META
    GMENode.prototype.getValidChildrenTypes = function () {
        //return getMemberIds('ValidChildren');
        return this._meta.getValidChildrenTypes(this._id);
    };

    GMENode.prototype.getValidAttributeNames = function () {
        return this._state.core.getValidAttributeNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getValidPointerNames = function () {
        return this._state.core.getValidPointerNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getValidSetNames = function () {
        return this._state.core.getValidSetNames(this._state.nodes[this._id].node);
    };

    //constraint functions
    GMENode.prototype.getConstraintNames = function () {
        return this._state.core.getConstraintNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnConstraintNames = function () {
        return this._state.core.getOwnConstraintNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getConstraint = function (name) {
        return this._state.core.getConstraint(this._state.nodes[this._id].node, name);
    };

    GMENode.prototype.toString = function () {
        return this._state.core.getAttribute(this._state.nodes[this._id].node, 'name') + ' (' + this._id + ')';
    };

    GMENode.prototype.getCollectionPaths = function (name) {
        return this._state.core.getCollectionPaths(this._state.nodes[this._id].node, name);
    };

    //adding functionality to get rid of GMEConcepts
    GMENode.prototype.isConnection = function () {
        return this._state.core.isConnection(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isAbstract = function () {
        return this._state.core.isAbstract(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getCrosscutsInfo = function () {
        return this._state.core.getRegistry(this._state.nodes[this._id].node, REG_KEYS.CROSSCUTS) || [];
    };

    GMENode.prototype.getValidChildrenTypesDetailed = function (aspect, noFilter) {
        var parameters = {
                node: this._state.nodes[this._id].node,
                children: [],
                sensitive: !noFilter,
                multiplicity: false,
                aspect: aspect
            },
            fullList,
            filteredList,
            validTypes = {},
            keys = this.getChildrenIds(),
            i;

        for (i = 0; i < keys.length; i++) {
            if (this._state.nodes[keys[i]]) {
                parameters.children.push(this._state.nodes[keys[i]].node);
            }
        }

        fullList = this._state.core.getValidChildrenMetaNodes(parameters);

        parameters.multiplicity = true;
        filteredList = this._state.core.getValidChildrenMetaNodes(parameters);

        for (i = 0; i < fullList.length; i += 1) {
            validTypes[this._state.core.getPath(fullList[i])] = false;
        }

        for (i = 0; i < filteredList.length; i += 1) {
            validTypes[this._state.core.getPath(filteredList[i])] = true;
        }

        return validTypes;
    };

    GMENode.prototype.getValidSetMemberTypesDetailed = function (setName) {
        var parameters = {
                node: this._state.nodes[this._id].node,
                children: [],
                sensitive: true,
                multiplicity: false,
                name: setName
            },
            fullList,
            filteredList,
            validTypes = {},
            keys = this.getChildrenIds(),
            i;

        for (i = 0; i < keys.length; i++) {
            if (this._state.nodes[keys[i]]) {
                parameters.children.push(this._state.nodes[keys[i]].node);
            }
        }

        fullList = this._state.core.getValidSetElementsMetaNodes(parameters);

        parameters.multiplicity = true;
        filteredList = this._state.core.getValidSetElementsMetaNodes(parameters);

        for (i = 0; i < fullList.length; i += 1) {
            validTypes[this._state.core.getPath(fullList[i])] = false;
        }

        for (i = 0; i < filteredList.length; i += 1) {
            validTypes[this._state.core.getPath(filteredList[i])] = true;
        }

        return validTypes;
    };

    GMENode.prototype.getMetaTypeId = function () {
        var metaType = this._state.core.getMetaType(this._state.nodes[this._id].node);

        if (metaType) {
            return this._storeNode(metaType);
        } else {
            return null;
        }
    };

    GMENode.prototype.getValidAspectNames = function () {
        return this._state.core.getValidAspectNames(this._state.nodes[this._id].node);
    };

    //getNode
    function getNode(_id, logger, state, meta, storeNode) {
        if (state.nodes[_id]) {
            return new GMENode(_id, logger, state, meta, storeNode);
        } else {
            //logger.warn('Tried to get node with path "' + _id + '" but was not in state.nodes');
        }

        return null;
    }

    return getNode;
});