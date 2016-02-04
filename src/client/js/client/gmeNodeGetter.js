/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['js/RegistryKeys'], function (REG_KEYS) {
    'use strict';

    var initialized = false;

    /**
     * @param _id
     * @constructor
     */
    function GMENode(_id) {
        this._id = _id;
    }

    GMENode.prototype.getParentId = function () {
        //just for sure, as it may missing from the cache
        return this.storeNode(this.state.core.getParent(this.state.nodes[this._id].node));
    };

    GMENode.prototype.getId = function () {
        return this._id;
    };

    GMENode.prototype.getGuid = function () {
        return this.state.core.getGuid(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getChildrenIds = function () {
        return this.state.core.getChildrenPaths(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getBaseId = function () {
        var base = this.state.core.getBase(this.state.nodes[this._id].node);
        if (base) {
            return this.storeNode(base);
        } else {
            return null;
        }

    };

    GMENode.prototype.getInheritorIds = function () {
        return [];
    };

    GMENode.prototype.getAttribute = function (name) {
        return this.state.core.getAttribute(this.state.nodes[this._id].node, name);
    };

    GMENode.prototype.getOwnAttribute = function (name) {
        return this.state.core.getOwnAttribute(this.state.nodes[this._id].node, name);
    };

    GMENode.prototype.getEditableAttribute = function (name) {
        var value = this.state.core.getAttribute(this.state.nodes[this._id].node, name);
        if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    };

    GMENode.prototype.getOwnEditableAttribute = function (name) {
        var value = this.state.core.getOwnAttribute(this.state.nodes[this._id].node, name);
        if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    };

    GMENode.prototype.getRegistry = function (name) {
        return this.state.core.getRegistry(this.state.nodes[this._id].node, name);
    };

    GMENode.prototype.getOwnRegistry = function (name) {
        return this.state.core.getOwnRegistry(this.state.nodes[this._id].node, name);
    };

    GMENode.prototype.getEditableRegistry = function (name) {
        var value = this.state.core.getRegistry(this.state.nodes[this._id].node, name);
        if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    };

    GMENode.prototype.getOwnEditableRegistry = function (name) {
        var value = this.state.core.getOwnRegistry(this.state.nodes[this._id].node, name);
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
                to: this.state.core.getPath(this.state.core.getBase(this.state.nodes[this._id].node)),
                from: []
            };
        }
        return {to: this.state.core.getPointerPath(this.state.nodes[this._id].node, name), from: []};
    };

    GMENode.prototype.getOwnPointer = function (name) {
        return {to: this.state.core.getOwnPointerPath(this.state.nodes[this._id].node, name), from: []};
    };

    GMENode.prototype.getPointerNames = function () {
        return this.state.core.getPointerNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnPointerNames = function () {
        return this.state.core.getOwnPointerNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getAttributeNames = function () {
        return this.state.core.getAttributeNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnAttributeNames = function () {
        return this.state.core.getOwnAttributeNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getRegistryNames = function () {
        return this.state.core.getRegistryNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnRegistryNames = function () {
        return this.state.core.getOwnRegistryNames(this.state.nodes[this._id].node);
    };

    //SET
    GMENode.prototype.getMemberIds = function (setid) {
        return this.state.core.getMemberPaths(this.state.nodes[this._id].node, setid);
    };

    GMENode.prototype.getSetNames = function () {
        return this.state.core.getSetNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getMemberAttributeNames = function (setid, memberid) {
        return this.state.core.getMemberAttributeNames(this.state.nodes[this._id].node, setid, memberid);
    };

    GMENode.prototype.getMemberAttribute = function (setid, memberid, name) {
        return this.state.core.getMemberAttribute(this.state.nodes[this._id].node, setid, memberid, name);
    };

    GMENode.prototype.getEditableMemberAttribute = function (setid, memberid, name) {
        var attr = this.state.core.getMemberAttribute(this.state.nodes[this._id].node, setid, memberid, name);
        if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
        }
        return null;
    };

    GMENode.prototype.getMemberRegistryNames = function (setid, memberid) {
        return this.state.core.getMemberRegistryNames(this.state.nodes[this._id].node, setid, memberid);
    };

    GMENode.prototype.getMemberRegistry = function (setid, memberid, name) {
        return this.state.core.getMemberRegistry(this.state.nodes[this._id].node, setid, memberid, name);
    };

    GMENode.prototype.getEditableMemberRegistry = function (setid, memberid, name) {
        var attr = this.state.core.getMemberRegistry(this.state.nodes[this._id].node, setid, memberid, name);
        if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
        }
        return null;
    };

    //META
    GMENode.prototype.getValidChildrenTypes = function () {
        //return getMemberIds('ValidChildren');
        return this.meta.getValidChildrenTypes(this._id);
    };

    GMENode.prototype.getValidAttributeNames = function () {
        return this.state.core.getValidAttributeNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getValidPointerNames = function () {
        return this.state.core.getValidPointerNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getValidSetNames = function () {
        return this.state.core.getValidSetNames(this.state.nodes[this._id].node);
    };

    //constraint functions
    GMENode.prototype.getConstraintNames = function () {
        return this.state.core.getConstraintNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnConstraintNames = function () {
        return this.state.core.getOwnConstraintNames(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getConstraint = function (name) {
        return this.state.core.getConstraint(this.state.nodes[this._id].node, name);
    };

    GMENode.prototype.toString = function () {
        return this.state.core.getAttribute(this.state.nodes[this._id].node, 'name') + ' (' + this._id + ')';
    };

    GMENode.prototype.getCollectionPaths = function (name) {
        return this.state.core.getCollectionPaths(this.state.nodes[this._id].node, name);
    };

    //adding functionality to get rid of GMEConcepts
    GMENode.prototype.isConnection = function () {
        return this.state.core.isConnection(this.state.nodes[this._id].node);
    };

    GMENode.prototype.isAbstract = function () {
        return this.state.core.isAbstract(this.state.nodes[this._id].node);
    };

    GMENode.prototype.getCrosscutsInfo = function () {
        return this.state.core.getRegistry(this.state.nodes[this._id].node, REG_KEYS.CROSSCUTS) || [];
    };

    GMENode.prototype.getValidChildrenTypesDetailed = function (aspect, noFilter) {
        var parameters = {
                node: this.state.nodes[this._id].node,
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
            if (this.state.nodes[keys[i]]) {
                parameters.children.push(this.state.nodes[keys[i]].node);
            }
        }

        fullList = this.state.core.getValidChildrenMetaNodes(parameters);

        parameters.multiplicity = true;
        filteredList = this.state.core.getValidChildrenMetaNodes(parameters);

        for (i = 0; i < fullList.length; i += 1) {
            validTypes[this.state.core.getPath(fullList[i])] = false;
        }

        for (i = 0; i < filteredList.length; i += 1) {
            validTypes[this.state.core.getPath(filteredList[i])] = true;
        }

        return validTypes;
    };

    GMENode.prototype.getValidSetMemberTypesDetailed = function (setName) {
        var parameters = {
                node: this.state.nodes[this._id].node,
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
            if (this.state.nodes[keys[i]]) {
                parameters.children.push(this.state.nodes[keys[i]].node);
            }
        }

        fullList = this.state.core.getValidSetElementsMetaNodes(parameters);

        parameters.multiplicity = true;
        filteredList = this.state.core.getValidSetElementsMetaNodes(parameters);

        for (i = 0; i < fullList.length; i += 1) {
            validTypes[this.state.core.getPath(fullList[i])] = false;
        }

        for (i = 0; i < filteredList.length; i += 1) {
            validTypes[this.state.core.getPath(filteredList[i])] = true;
        }

        return validTypes;
    };

    GMENode.prototype.getMetaTypeId = function () {
        var metaType = this.state.core.getMetaType(this.state.nodes[this._id].node);

        if (metaType) {
            return this.storeNode(metaType);
        } else {
            return null;
        }
    };

    GMENode.prototype.getValidAspectNames = function () {
        return this.state.core.getValidAspectNames(this.state.nodes[this._id].node);
    };

    function initialize(logger, state, meta, storeNode) {
        GMENode.prototype.logger = logger;
        GMENode.prototype.state = state;
        GMENode.prototype.meta = meta;
        GMENode.prototype.storeNode = storeNode;

        initialized = true;
    }

    //getNode
    function getNode(_id, logger, state, meta, storeNode) {

        if (initialized === false) {
            initialize(logger, state, meta, storeNode);
        }

        if (state.nodes[_id]) {
            return new GMENode(_id);
        } else {
            //logger.warn('Tried to get node with path "' + _id + '" but was not in state.nodes');
        }

        return null;
    }

    return getNode;
});