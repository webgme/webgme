/*globals define, _*/
/*jshint browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


define([
    'js/util',
    'js/Constants',
    'js/Utils/GMEConcepts'
], function (util,
             CONSTANTS,
             GMEConcepts) {
    'use strict';

    function PropertyEditorControllerHelpers() {

    }

    PropertyEditorControllerHelpers.prototype._getNodeAttributeValues = function (node) {
        var result = {},
            attrNames = _.union(node.getAttributeNames() || [], node.getValidAttributeNames() || []),
            len = attrNames.length;

        while (--len >= 0) {
            result[attrNames[len]] = node.getAttribute(attrNames[len]);
        }

        return util.flattenObject(result);
    };

    PropertyEditorControllerHelpers.prototype._getNodeRegistryValues = function (node, registryNames) {
        var result = {},
            len = registryNames.length;

        while (--len >= 0) {
            result[registryNames[len]] = node.getRegistry(registryNames[len]);
        }

        return util.flattenObject(result);
    };

    PropertyEditorControllerHelpers.prototype._getPointerInfo = function (node) {
        var result = {},
            availablePointers = _.union(node.getValidPointerNames() || [], node.getPointerNames() || []),
            len = availablePointers.length,
            ptrTo;

        while (len--) {
            if (availablePointers[len] === CONSTANTS.POINTER_BASE) {
                ptrTo = node.getBaseId();
            } else {
                ptrTo = node.getPointerId(availablePointers[len]);
            }

            ptrTo = ptrTo === null ? CONSTANTS.CORE.NULLPTR_RELID : ptrTo;
            result[availablePointers[len]] = ptrTo || '';
        }

        return util.flattenObject(result);
    };

    PropertyEditorControllerHelpers.prototype._isInvalidAttribute = function (selectedNodes, attrName) {
        var i = selectedNodes.length,
            node,
            validNames;

        while (i--) {
            node = selectedNodes[i];
            validNames = selectedNodes[i].getValidAttributeNames();
            if (validNames.indexOf(attrName) !== -1) {
                return false;
            }
        }

        return true;
    };

    PropertyEditorControllerHelpers.prototype._isInvalidAttributeValue = function (selectedNodes, attrName) {
        var result = false,
            attrValue,
            node;

        if (selectedNodes.length === 1) {
            node = selectedNodes[0];
            if (node) {
                attrValue = node.getAttribute(attrName);

                // We should not complain when there is no value at all.
                if (typeof attrValue === 'undefined') {
                    return false;
                }

                try {
                    result = !node.isValidAttributeValueOf(attrName, attrValue);
                } catch (e) {
                    if (e.message.indexOf('Invalid regular expression') > -1) {
                        this._logger.error('Invalid regular expression defined in the meta model for attribute "' +
                            attrName + '"');
                        result = true;
                    } else {
                        throw e;
                    }
                }
            }
        }

        return result;
    };

    PropertyEditorControllerHelpers.prototype._getAttributeRange = function (selectedNodes, attrName) {
        var i = selectedNodes.length,
            range = {},
            nodeObj,
            schema;

        while (i--) {
            nodeObj = selectedNodes[i];
            schema = nodeObj.getAttributeMeta(attrName) || {};
            if (schema.hasOwnProperty('min')) {
                if (range.hasOwnProperty('min')) {
                    range.min = schema.min > range.min ? schema.min : range.min;
                } else {
                    range.min = schema.min;
                }
            }

            if (schema.hasOwnProperty('max')) {
                if (range.hasOwnProperty('max')) {
                    range.max = schema.max < range.max ? schema.max : range.max;
                } else {
                    range.max = schema.max;
                }
            }
        }

        return range;
    };

    PropertyEditorControllerHelpers.prototype._isInvalidPointer = function (selectedNodes, pointerName) {
        var i = selectedNodes.length,
            node,
            validNames;

        while (i--) {
            node = selectedNodes[i];
            if (node) {
                validNames = node.getValidPointerNames();

                if (validNames.indexOf(pointerName) !== -1 || this.NON_INVALID_PTRS.indexOf(pointerName) !== -1) {
                    return false;
                }
            }
        }

        return true;
    };

    PropertyEditorControllerHelpers.prototype._isResettableRegistry = function (selectedNodes, regName) {
        var i = selectedNodes.length,
            ownRegistryNames,
            node;

        while (i--) {
            node = selectedNodes[i];

            if (node) {
                ownRegistryNames = node.getOwnRegistryNames();

                if (node.getOwnRegistryNames().indexOf(regName) === -1) {
                    return false;
                }
            }
        }

        return true;
    };

    PropertyEditorControllerHelpers.prototype._isResettableAttribute = function (selectedNodes, attrName) {
        var i = selectedNodes.length,
            ownAttrNames,
            validNames,
            baseValidNames,
            node,
            baseNode;

        while (i--) {
            node = selectedNodes[i];

            if (node) {
                baseNode = this._client.getNode(node.getBaseId());
                validNames = node.getValidAttributeNames();
                baseValidNames = baseNode === null ? [] : baseNode.getValidAttributeNames();
                ownAttrNames = node.getOwnAttributeNames();

                if (ownAttrNames.indexOf(attrName) === -1) {
                    return false;
                }

                if (baseValidNames.indexOf(attrName) === -1 && validNames.indexOf(attrName) !== -1) {
                    return false;
                }
            }
        }

        return true;
    };

    PropertyEditorControllerHelpers.prototype._isReadonlyAttribute = function (selectedNodes, attrName) {
        var i;

        for (i = 0; i < selectedNodes.length; i += 1) {
            if ((selectedNodes[i].getAttributeMeta(attrName) || {}).readonly &&
                selectedNodes[i].isMetaNode() !== true) {
                return true;
            }
        }

        return false;
    };

    PropertyEditorControllerHelpers.prototype._isResettablePointer = function (selectedNodes, pointerName) {
        var i = selectedNodes.length,
            ownPointerNames,
            node,
            validNames,
            baseValidNames,
            baseNode;

        while (i--) {
            node = selectedNodes[i];

            if (node) {
                baseNode = this._client.getNode(node.getBaseId());
                ownPointerNames = node.getOwnPointerNames();
                validNames = node.getValidPointerNames();
                baseValidNames = baseNode === null ? [] : baseNode.getValidPointerNames();

                if (ownPointerNames.indexOf(pointerName) === -1) {
                    return false;
                }

                if (baseValidNames.indexOf(pointerName) === -1 && validNames.indexOf(pointerName) !== -1) {
                    return false;
                }

            }
        }

        return true;
    };

    PropertyEditorControllerHelpers.prototype._canBeReplaceable = function (selectedNodes) {
        var i = selectedNodes.length;

        while (i--) {
            if (GMEConcepts.canBeReplaceable(selectedNodes[i].getId())) {
                // continue
            } else {
                return false;
            }
        }

        return true;
    };

    return PropertyEditorControllerHelpers;
});