/*globals define, console*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/RegistryKeys'], function (REG_KEYS) {
    'use strict';

    function _logDeprecated(oldFn, newFn, comment) {
        var commentStr = comment ? comment : '';
        console.warn('"gmeNode.' + oldFn + '" is deprecated and will eventually be removed, use "gmeNode.' + newFn +
            '" instead.' + commentStr);
    }

    function _getNode(nodes, path) {
        return nodes[path] && nodes[path].node;
    }

    /**
     * @param {string} _id - Path of node.
     * @param {GmeLogger} logger - logger.
     * @param {object} state - state of the client.
     * @param {function} storeNode - invoked when storing new nodes.
     * @constructor
     */
    function GMENode(_id, logger, state, storeNode) {
        this._id = _id;
        this._logger = logger;
        this._state = state;
        this._storeNode = storeNode;
    }

    GMENode.prototype.getParentId = function () {
        //just for sure, as it may missing from the cache
        return this._storeNode(this._state.core.getParent(this._state.nodes[this._id].node));
    };

    GMENode.prototype.getId = function () {
        return this._id;
    };

    GMENode.prototype.getRelid = function () {
        return this._state.core.getRelid(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getGuid = function () {
        return this._state.core.getGuid(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getChildrenIds = function () {
        return this._state.core.getChildrenPaths(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getChildrenRelids = function () {
        return this._state.core.getChildrenRelids(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getBaseId = function () {
        return this._storeNode(this._state.core.getBase(this._state.nodes[this._id].node));
    };

    GMENode.prototype.isValidNewBase = function (basePath) {
        var base;
        if (typeof basePath === 'string') {
            base = _getNode(this._state.nodes, basePath);
            if (base) {
                return this._state.core.isValidNewBase(this._state.nodes[this._id].node, base);
            } else {
                return false;
            }
        } else if (basePath === undefined || basePath === null) {
            return true;
        } else {
            return false;
        }
    };

    GMENode.prototype.isValidNewParent = function (parentPath) {
        var parent;
        if (typeof parentPath === 'string') {
            parent = _getNode(this._state.nodes, parentPath);
            if (parent) {
                return this._state.core.isValidNewParent(this._state.nodes[this._id].node, parent);
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    GMENode.prototype.getInheritorIds = function () {
        return this._state.core.getInstancePaths(this._state.nodes[this._id].node);
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
        return {to: this._state.core.getPointerPath(this._state.nodes[this._id].node, name), from: []};
    };

    GMENode.prototype.getPointerId = function (name) {
        return this.getPointer(name).to;
    };

    GMENode.prototype.getOwnPointer = function (name) {
        return {to: this._state.core.getOwnPointerPath(this._state.nodes[this._id].node, name), from: []};
    };

    GMENode.prototype.getOwnPointerId = function (name) {
        return this.getOwnPointer(name).to;
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

    GMENode.prototype.getAttributeMeta = function (name) {
        return this._state.core.getAttributeMeta(this._state.nodes[this._id].node, name);
    };

    GMENode.prototype.getRegistryNames = function () {
        return this._state.core.getRegistryNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnRegistryNames = function () {
        return this._state.core.getOwnRegistryNames(this._state.nodes[this._id].node);
    };

    //SET
    GMENode.prototype.getMemberIds = function (setName) {
        return this._state.core.getMemberPaths(this._state.nodes[this._id].node, setName);
    };

    GMENode.prototype.getSetNames = function () {
        return this._state.core.getSetNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getMemberAttributeNames = function (setName, memberId) {
        return this._state.core.getMemberAttributeNames(this._state.nodes[this._id].node, setName, memberId);
    };

    GMENode.prototype.getMemberAttribute = function (setName, memberId, attrName) {
        return this._state.core.getMemberAttribute(this._state.nodes[this._id].node, setName, memberId, attrName);
    };

    GMENode.prototype.getEditableMemberAttribute = function (setName, memberId, attrName) {
        var attr = this._state.core.getMemberAttribute(this._state.nodes[this._id].node, setName, memberId, attrName);
        if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
        }
        return null;
    };

    GMENode.prototype.getMemberRegistryNames = function (setName, memberId) {
        return this._state.core.getMemberRegistryNames(this._state.nodes[this._id].node, setName, memberId);
    };

    GMENode.prototype.getMemberRegistry = function (setName, memberId, regName) {
        return this._state.core.getMemberRegistry(this._state.nodes[this._id].node, setName, memberId, regName);
    };

    GMENode.prototype.getEditableMemberRegistry = function (setName, memberId, regName) {
        var attr = this._state.core.getMemberRegistry(this._state.nodes[this._id].node, setName, memberId, regName);
        if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
        }
        return null;
    };

    GMENode.prototype.getSetRegistry = function (setName, regName) {
        return this._state.core.getSetRegistry(this._state.nodes[this._id].node, setName, regName);
    };

    GMENode.prototype.getSetRegistryNames = function (setName) {
        return this._state.core.getSetRegistryNames(this._state.nodes[this._id].node, setName);
    };

    GMENode.prototype.getSetAttribute = function (setName, attrName) {
        return this._state.core.getSetAttribute(this._state.nodes[this._id].node, setName, attrName);
    };

    GMENode.prototype.getSetAttributeNames = function (setName) {
        return this._state.core.getSetAttributeNames(this._state.nodes[this._id].node, setName);
    };

    //META
    GMENode.prototype.getValidChildrenTypes = function () {
        _logDeprecated('getValidChildrenTypes()', 'getValidChildrenIds()');
        return this.getValidChildrenIds();
    };

    GMENode.prototype.getValidAttributeNames = function () {
        return this._state.core.getValidAttributeNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnValidAttributeNames = function () {
        return this._state.core.getOwnValidAttributeNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isValidAttributeValueOf = function (name, value) {
        return this._state.core.isValidAttributeValueOf(this._state.nodes[this._id].node, name, value);
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

    GMENode.prototype.getInstancePaths = function () {
        return this._state.core.getInstancePaths(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getJsonMeta = function () {
        return this._state.core.getJsonMeta(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isConnection = function () {
        return this._state.core.isConnection(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isAbstract = function () {
        return this._state.core.isAbstract(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isLibraryRoot = function () {
        return this._state.core.isLibraryRoot(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isLibraryElement = function () {
        return this._state.core.isLibraryElement(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getFullyQualifiedName = function () {
        return this._state.core.getFullyQualifiedName(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getNamespace = function () {
        return this._state.core.getNamespace(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getLibraryGuid = function () {
        return this._state.core.getLibraryGuid(this._state.nodes[this._id].node);
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
                members: [],
                sensitive: true,
                multiplicity: false,
                name: setName
            },
            fullList,
            filteredList,
            validTypes = {},
            keys = this.getMemberIds(setName),
            i;

        for (i = 0; i < keys.length; i++) {
            if (this._state.nodes[keys[i]]) {
                parameters.members.push(this._state.nodes[keys[i]].node);
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

    GMENode.prototype.getMetaTypeId = GMENode.prototype.getBaseTypeId = function () {
        var metaType = this._state.core.getMetaType(this._state.nodes[this._id].node);

        if (metaType) {
            return this._storeNode(metaType);
        } else {
            return null;
        }
    };

    GMENode.prototype.isMetaNode = function () {
        return this._state.core.isMetaNode(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isTypeOf = function (typePath) {
        var typeNode = _getNode(this._state.nodes, typePath);

        if (typeNode) {
            return this._state.core.isTypeOf(this._state.nodes[this._id].node, typeNode);
        } else {
            return false;
        }
    };

    GMENode.prototype.isValidChildOf = function (parentPath) {
        var parentNode = _getNode(this._state.nodes, parentPath);

        if (parentNode) {
            return this._state.core.isValidChildOf(this._state.nodes[this._id].node, parentNode);
        } else {
            return false;
        }
    };

    GMENode.prototype.getValidChildrenIds = function () {
        return this._state.core.getValidChildrenPaths(this._state.nodes[this._id].node);
    };

    GMENode.prototype.isValidTargetOf = function (sourcePath, name) {
        var sourceNode = _getNode(this._state.nodes, sourcePath);

        if (sourceNode) {
            return this._state.core.isValidTargetOf(this._state.nodes[this._id].node, sourceNode, name);
        } else {
            return false;
        }
    };

    GMENode.prototype.getValidAspectNames = function () {
        return this._state.core.getValidAspectNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getOwnValidAspectNames = function () {
        return this._state.core.getOwnValidAspectNames(this._state.nodes[this._id].node);
    };

    GMENode.prototype.getAspectMeta = function (name) {
        return this._state.core.getAspectMeta(this._state.nodes[this._id].node, name);
    };

    //MIXINS
    GMENode.prototype.getMixinPaths = function () {
        return this._state.core.getMixinPaths(this._state.nodes[this._id].node);
    };

    GMENode.prototype.canSetAsMixin = function (mixinPath) {
        return this._state.core.canSetAsMixin(this._state.nodes[this._id].node, mixinPath);
    };

    GMENode.prototype.isReadOnly = function () {
        return this._state.readOnlyProject || this._state.viewer || this.isLibraryRoot() || this.isLibraryElement();
    };

    //getNode
    function getNode(_id, logger, state, storeNode) {
        if (state.nodes[_id]) {
            return new GMENode(_id, logger, state, storeNode);

        } else {
            //logger.warn('Tried to get node with path "' + _id + '" but was not in state.nodes');
        }

        return null;
    }

    return getNode;
});