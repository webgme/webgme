/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/util/assert',
    'common/core/tasync',
    'common/util/canon',
    'common/core/constants'
], function (ASSERT, TASYNC, CANON, CONSTANTS) {
    'use strict';

    var MetaCore = function (innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        logger.debug('initialized MetaCore');

        //<editor-fold=Helper Functions>
        function sameNode(nodeA, nodeB) {
            if (self.getPath(nodeA) === self.getPath(nodeB)) {
                return true;
            }
            return false;
        }

        function getMetaNode(node) {
            return self.getChild(node, CONSTANTS.META_NODE);
        }

        function getMetaChildrenNode(node) {
            return self.getChild(getMetaNode(node), CONSTANTS.META_CHILDREN);
        }

        function getMetaPointerNode(node, name) {
            var meta = getMetaNode(node),
                pointerNames = self.getPointerNames(meta) || [];
            if (pointerNames.indexOf(name) !== -1) {
                return self.getChild(meta, CONSTANTS.META_POINTER_PREFIX + name);
            }
            return null;
        }

        function metaPointerNode(node, name) {
            //this function always gives back a node, use this if you just want to create the node as well
            self.setPointer(getMetaNode(node), name, null);
            return self.getChild(getMetaNode(node), CONSTANTS.META_POINTER_PREFIX + name);
        }

        function getMetaAspectsNode(node) {
            return self.getChild(getMetaNode(node), CONSTANTS.META_ASPECTS);
        }

        function getMetaAspectNode(node, name) {
            var aspectNode = getMetaAspectsNode(node),
                names = self.getPointerNames(aspectNode) || [];
            if (names.indexOf(name) !== -1) {
                return self.getChild(aspectNode, CONSTANTS.META_ASPECT_PREFIX + name);
            }
            return null;
        }

        function metaAspectNode(node, name) {
            //this function always gives back a node, use this if you just want to create the node as well
            var aspectNode = self.getChild(getMetaNode(node), CONSTANTS.META_ASPECTS);

            self.setPointer(aspectNode, name, null);
            return self.getChild(aspectNode, CONSTANTS.META_ASPECT_PREFIX + name);
        }

        function getMetaObjectDiff(bigger, smaller) {
            //TODO this is a specific diff calculation for META rule JSONs
            var diff = {},
                names, i,
                itemedElementDiff = function (bigItem, smallItem) {
                    var diffItems = {},
                        diff, i, index, names;
                    for (i = 0; i < bigItem.items.length; i++) {
                        if (smallItem.items.indexOf(bigItem.items[i]) === -1) {
                            diffItems[bigItem.items[i]] = true;
                        }
                    }
                    names = Object.keys(diffItems);
                    for (i = 0; i < names.length; i++) {
                        diff = diff || {items: [], minItems: [], maxItems: []};
                        index = bigItem.items.indexOf(names[i]);
                        diff.items.push(bigItem.items[index]);
                        diff.minItems.push(bigItem.minItems[index]);
                        diff.maxItems.push(bigItem.maxItems[index]);

                    }
                    if (bigItem.min && ((smallItem.min && bigItem.min !== smallItem.min) || !smallItem.min)) {
                        diff = diff || {};
                        diff.min = bigItem.min;
                    }
                    if (bigItem.max && ((smallItem.max && bigItem.max !== smallItem.max) || !smallItem.max)) {
                        diff = diff || {};
                        diff.max = bigItem.max;
                    }
                    return diff || {};
                };
            //attributes
            if (smaller.attributes) {
                names = Object.keys(bigger.attributes);
                for (i = 0; i < names.length; i++) {
                    if (smaller.attributes[names[i]]) {
                        //they both have the attribute - if it differs we keep the whole of the bigger
                        if (CANON.stringify(smaller.attributes[names[i]]) !==
                            CANON.stringify(bigger.attributes[names[i]])) {

                            diff.attributes = diff.attributes || {};
                            diff.attributes[names[i]] = bigger.attributes[names[i]];
                        }
                    } else {
                        diff.attributes = diff.attributes || {};
                        diff.attributes[names[i]] = bigger.attributes[names[i]];
                    }
                }
            } else if (bigger.attributes) {
                diff.attributes = bigger.attributes;
            }
            //children
            if (smaller.children) {
                diff.children = itemedElementDiff(bigger.children, smaller.children);
                if (Object.keys(diff.children).length < 1) {
                    delete diff.children;
                }
            } else if (bigger.children) {
                diff.children = bigger.children;
            }
            //pointers
            if (smaller.pointers) {
                diff.pointers = {};
                names = Object.keys(bigger.pointers);
                for (i = 0; i < names.length; i++) {
                    if (smaller.pointers[names[i]]) {
                        diff.pointers[names[i]] = itemedElementDiff(bigger.pointers[names[i]],
                            smaller.pointers[names[i]]);
                        if (Object.keys(diff.pointers[names[i]]).length < 1) {
                            delete diff.pointers[names[i]];
                        }
                    } else {
                        diff.pointers[names[i]] = bigger.pointers[names[i]];
                    }
                }
            } else if (bigger.pointers) {
                diff.pointers = bigger.pointers;
            }
            if (Object.keys(diff.pointers).length < 1) {
                delete diff.pointers;
            }
            //aspects
            if (smaller.aspects) {
                diff.aspects = {};
                names = Object.keys(bigger.aspects);
                for (i = 0; i < names.length; i++) {
                    if (smaller.aspects[names[i]]) {
                        smaller.aspects[names[i]] = smaller.aspects[names[i]].sort();
                        bigger.aspects[names[i]] = bigger.aspects[names[i]].sort();
                        if (bigger.aspects[names[i]].length > smaller.aspects[names[i]].length) {
                            diff.aspects[names[i]] = bigger.aspects[names[i]].slice(smaller.aspects[names[i]].length);
                        }
                    } else {
                        diff.aspects[names[i]] = bigger.aspects[names[i]];
                    }
                }
            } else if (bigger.aspects) {
                diff.aspects = bigger.aspects;
            }

            if (Object.keys(diff.aspects).length < 1) {
                delete diff.aspects;
            }
            return diff;
        }

        //type related extra query functions
        function isOnMetaSheet(node) {
            //MetaAspectSet
            var sets = self.isMemberOf(node);

            if (sets && sets[''] && sets[''].indexOf(CONSTANTS.META_SET_NAME) !== -1) {
                return true;
            }
            return false;
        }

        //</editor-fold>

        //<editor-fold=Added Methods>
        this.isTypeOf = function (node, typeNode) {
            while (node) {
                if (sameNode(node, typeNode)) {
                    return true;
                }
                node = self.getBase(node);
            }
            return false;
        };

        this.isValidChildOf = function (node, parentNode) {
            var validChildTypePaths = self.getMemberPaths(getMetaChildrenNode(parentNode), CONSTANTS.SET_ITEMS) || [];
            while (node) {
                if (validChildTypePaths.indexOf(self.getPath(node)) !== -1) {
                    return true;
                }
                node = self.getBase(node);
            }
            return false;
        };

        this.getValidPointerNames = function (node) {
            var metaDefNode = getMetaNode(node),
                validNames = self.getPointerNames(metaDefNode) || [],
                i,
                validPointerNames = [],
                metaPointerNode, max;

            for (i = 0; i < validNames.length; i++) {
                metaPointerNode = self.getChild(metaDefNode, CONSTANTS.META_POINTER_PREFIX + validNames[i]);
                max = self.getAttribute(metaPointerNode, CONSTANTS.SET_ITEMS_MAX);
                if (max === 1) {
                    //TODO Specify what makes something a pointer and what a set???
                    //TODO Can you extend a pointer to a set????
                    validPointerNames.push(validNames[i]);
                }
            }

            return validPointerNames;
        };

        this.getOwnValidPointerNames = function (node) {
            var metaDefNode = getMetaNode(node),
                validNames = self.getOwnPointerNames(metaDefNode) || [],
                i,
                validPointerNames = [],
                metaPointerNode, max;

            for (i = 0; i < validNames.length; i++) {
                metaPointerNode = self.getChild(metaDefNode, CONSTANTS.META_POINTER_PREFIX + validNames[i]);
                max = self.getOwnAttribute(metaPointerNode, CONSTANTS.SET_ITEMS_MAX);
                if (max === 1) {
                    //TODO Specify what makes something a pointer and what a set???
                    //TODO Can you extend a pointer to a set????
                    validPointerNames.push(validNames[i]);
                }
            }

            return validPointerNames;
        };

        this.getValidSetNames = function (node) {
            var metaDefNode = getMetaNode(node),
                validNames = self.getPointerNames(metaDefNode) || [],
                i,
                validSetNames = [],
                metaPointerNode, max;

            for (i = 0; i < validNames.length; i++) {
                metaPointerNode = self.getChild(metaDefNode, CONSTANTS.META_POINTER_PREFIX + validNames[i]);
                max = self.getAttribute(metaPointerNode, CONSTANTS.SET_ITEMS_MAX);

                // FIXME: max seems to always be undefined - there is no such attribute on the set definitions
                if (max === undefined || max === -1 || max > 1) {
                    //TODO specify what makes something a pointer and what a set???
                    //TODO can you extend a pointer to a set????
                    validSetNames.push(validNames[i]);
                }
            }

            return validSetNames;
        };

        this.getOwnValidSetNames = function (node) {
            var metaDefNode = getMetaNode(node),
                validNames = self.getOwnPointerNames(metaDefNode) || [],
                i,
                validSetNames = [],
                metaPointerNode, max;

            for (i = 0; i < validNames.length; i++) {
                metaPointerNode = self.getChild(metaDefNode, CONSTANTS.META_POINTER_PREFIX + validNames[i]);
                max = self.getOwnAttribute(metaPointerNode, CONSTANTS.SET_ITEMS_MAX);

                // FIXME: max seems to always be undefined - there is no such attribute on the set definitions
                if (max === undefined || max === -1 || max > 1) {
                    //TODO specify what makes something a pointer and what a set???
                    //TODO can you extend a pointer to a set????
                    validSetNames.push(validNames[i]);
                }
            }

            return validSetNames;
        };

        this.isValidTargetOf = function (node, source, name) {
            var pointerMetaNode = getMetaPointerNode(source, name);

            if (pointerMetaNode) {
                var validTargetTypePaths = self.getMemberPaths(pointerMetaNode, CONSTANTS.SET_ITEMS) || [];
                while (node) {
                    if (validTargetTypePaths.indexOf(self.getPath(node)) !== -1) {
                        return true;
                    }
                    node = self.getBase(node);
                }
            }
            return false;
        };

        this.getValidAttributeNames = function (node) {
            return self.getAttributeNames(getMetaNode(node)) || [];
        };

        this.getOwnValidAttributeNames = function (node) {
            return self.getOwnAttributeNames(getMetaNode(node)) || [];
        };

        this.isValidAttributeValueOf = function (node, name, value) {
            var typedValue;

            if (self.getValidAttributeNames(node).indexOf(name) === -1) {
                return false;
            }
            var meta = self.getAttribute(getMetaNode(node), name);

            if (meta.enum && meta.enum instanceof Array) {
                return meta.enum.indexOf(value) !== -1; //TODO should we check type beforehand?
            }

            switch (meta.type) {
                case CONSTANTS.ATTRIBUTE_TYPES.BOOLEAN:
                    if (value === true || value === false) {
                        return true;
                    }
                    break;
                case CONSTANTS.ATTRIBUTE_TYPES.STRING:
                    if (typeof value === 'string') {
                        if (meta.regexp) {
                            return (new RegExp(meta.regexp).test(value));
                        }
                        return true;
                    }
                    break;
                case CONSTANTS.ATTRIBUTE_TYPES.ASSET:
                    if (typeof value === 'string') {
                        return true;
                    }
                    break;
                case CONSTANTS.ATTRIBUTE_TYPES.INTEGER:
                    typedValue = parseInt(value);
                    if (!isNaN(typedValue) && parseFloat(value) === typedValue) {
                        if ((typeof meta.min !== 'number' || typedValue >= meta.min) &&
                            (typeof meta.max !== 'number' || typedValue <= meta.max)) {
                            return true;
                        }
                        return false;
                    }
                    break;
                case CONSTANTS.ATTRIBUTE_TYPES.FLOAT:
                    typedValue = parseFloat(value);
                    if (!isNaN(typedValue)) {
                        if ((typeof meta.min !== 'number' || typedValue >= meta.min) &&
                            (typeof meta.max !== 'number' || typedValue <= meta.max)) {
                            return true;
                        }
                        return false;
                    }
                    break;
                default:
                    break;
            }

            return false;
        };

        this.getValidAspectNames = function (node) {
            return self.getPointerNames(getMetaAspectsNode(node)) || [];
        };

        this.getOwnValidAspectNames = function (node) {
            return self.getOwnPointerNames(getMetaAspectsNode(node)) || [];
        };

        this.getAspectMeta = function (node, name) {
            return self.getMemberPaths(getMetaAspectNode(node, name), CONSTANTS.SET_ITEMS);
        };

        //additional meta functions for getting meta definitions
        this.getJsonMeta = function (node) {
            var meta = {children: {}, attributes: {}, pointers: {}, aspects: {}, constraints: {}},
                tempNode,
                names,
                pointer,
                i, j;

            //fill children part
            tempNode = getMetaChildrenNode(node);

            meta.children.minItems = [];
            meta.children.maxItems = [];
            meta.children.items = self.getMemberPaths(tempNode, CONSTANTS.SET_ITEMS);
            for (i = 0; i < meta.children.items.length; i++) {
                meta.children.minItems.push(
                    self.getMemberAttribute(tempNode, CONSTANTS.SET_ITEMS, meta.children.items[i],
                        CONSTANTS.SET_ITEMS_MIN) || -1);

                meta.children.maxItems.push(
                    self.getMemberAttribute(tempNode, CONSTANTS.SET_ITEMS, meta.children.items[i],
                        CONSTANTS.SET_ITEMS_MAX) || -1);
            }
            meta.children.min = self.getAttribute(tempNode, CONSTANTS.SET_ITEMS_MIN);
            meta.children.max = self.getAttribute(tempNode, CONSTANTS.SET_ITEMS_MAX);

            //attributes
            names = self.getValidAttributeNames(node);
            for (i = 0; i < names.length; i++) {
                meta.attributes[names[i]] = self.getAttribute(getMetaNode(node), names[i]);
            }

            //pointers
            names = self.getPointerNames(getMetaNode(node));
            for (i = 0; i < names.length; i++) {
                tempNode = getMetaPointerNode(node, names[i]);
                pointer = {};

                pointer.items = self.getMemberPaths(tempNode, CONSTANTS.SET_ITEMS);
                pointer.min = self.getAttribute(tempNode, CONSTANTS.SET_ITEMS_MIN);
                pointer.max = self.getAttribute(tempNode, CONSTANTS.SET_ITEMS_MAX);
                pointer.minItems = [];
                pointer.maxItems = [];

                for (j = 0; j < pointer.items.length; j++) {
                    pointer.minItems.push(self.getMemberAttribute(tempNode, CONSTANTS.SET_ITEMS, pointer.items[j],
                            CONSTANTS.SET_ITEMS_MIN) || -1);
                    pointer.maxItems.push(self.getMemberAttribute(tempNode, CONSTANTS.SET_ITEMS, pointer.items[j],
                            CONSTANTS.SET_ITEMS_MAX) || -1);

                }

                meta.pointers[names[i]] = pointer;
            }

            //aspects
            names = self.getValidAspectNames(node);

            for (i = 0; i < names.length; i++) {
                tempNode = getMetaAspectNode(node, names[i]);
                meta.aspects[names[i]] = self.getMemberPaths(tempNode, CONSTANTS.SET_ITEMS) || [];
            }

            //constraints
            names = self.getConstraintNames(node);
            for (i = 0; i < names.length; i++) {
                meta.constraints[names[i]] = self.getConstraint(node, names[i]);
            }

            return meta;
        };

        //this.getOwnJsonMeta = function (node) {
        //    var base = self.getBase(node),
        //        baseMeta = base ? self.getJsonMeta(base) : {},
        //        meta = self.getJsonMeta(node);
        //
        //    return getMetaObjectDiff(meta, baseMeta);
        //};

        this.getOwnJsonMeta = function (node) {
            var meta = {children: {}, attributes: {}, pointers: {}, aspects: {}, constraints: {}},
                tempNode,
                metaNode = getMetaNode(node),
                childrenNode = self.getChild(metaNode, CONSTANTS.META_CHILDREN),
                aspectsNode = self.getChild(metaNode, CONSTANTS.META_ASPECTS),
                names,
                pointer,
                i, j;

            //fill children part

            meta.children.minItems = [];
            meta.children.maxItems = [];
            meta.children.items = self.getOwnMemberPaths(childrenNode, CONSTANTS.SET_ITEMS);
            if (meta.children.items.length > 0) {
                for (i = 0; i < meta.children.items.length; i++) {
                    meta.children.minItems.push(
                        self.getMemberAttribute(childrenNode, CONSTANTS.SET_ITEMS, meta.children.items[i],
                            CONSTANTS.SET_ITEMS_MIN) || -1);

                    meta.children.maxItems.push(
                        self.getMemberAttribute(childrenNode, CONSTANTS.SET_ITEMS, meta.children.items[i],
                            CONSTANTS.SET_ITEMS_MAX) || -1);
                }
                names = self.getOwnAttributeNames(childrenNode);
                if (names.indexOf('min') !== -1) {
                    meta.children.min = self.getAttribute(childrenNode, CONSTANTS.SET_ITEMS_MIN);
                }
                if (names.indexOf('max') !== -1) {
                    meta.children.max = self.getAttribute(childrenNode, CONSTANTS.SET_ITEMS_MAX);
                }
            } else {
                delete meta.children;
            }
            //attributes
            names = self.getOwnAttributeNames(metaNode) || [];
            if (names.length > 0) {
                for (i = 0; i < names.length; i++) {
                    meta.attributes[names[i]] = self.getOwnAttribute(metaNode, names[i]);
                }
            } else {
                delete meta.attributes;
            }

            //pointers
            names = self.getOwnPointerNames(metaNode);
            if (names.length > 0) {
                for (i = 0; i < names.length; i++) {
                    tempNode = self.getChild(metaNode, CONSTANTS.META_POINTER_PREFIX + names[i]);
                    pointer = {};

                    pointer.items = self.getOwnMemberPaths(tempNode, CONSTANTS.SET_ITEMS);
                    pointer.min = self.getAttribute(tempNode, CONSTANTS.SET_ITEMS_MIN);
                    pointer.max = self.getAttribute(tempNode, CONSTANTS.SET_ITEMS_MAX);
                    pointer.minItems = [];
                    pointer.maxItems = [];

                    for (j = 0; j < pointer.items.length; j++) {
                        pointer.minItems.push(self.getMemberAttribute(tempNode, CONSTANTS.SET_ITEMS, pointer.items[j],
                                CONSTANTS.SET_ITEMS_MIN) || -1);
                        pointer.maxItems.push(self.getMemberAttribute(tempNode, CONSTANTS.SET_ITEMS, pointer.items[j],
                                CONSTANTS.SET_ITEMS_MAX) || -1);

                    }

                    meta.pointers[names[i]] = pointer;
                }
            } else {
                delete meta.pointers;
            }

            //aspects
            names = self.getOwnPointerNames(aspectsNode) || [];

            if (names.length > 0) {
                for (i = 0; i < names.length; i++) {
                    tempNode = self.getChild(aspectsNode, CONSTANTS.META_ASPECT_PREFIX + names[i]);
                    meta.aspects[names[i]] = self.getOwnMemberPaths(tempNode, CONSTANTS.SET_ITEMS) || [];
                }
            } else {
                delete meta.aspects;
            }

            //constraints
            names = self.getOwnConstraintNames(node);

            if (names.length > 0) {
                for (i = 0; i < names.length; i++) {
                    meta.constraints[names[i]] = self.getConstraint(node, names[i]);
                }
            } else {
                delete meta.constraints;
            }

            return meta;
        };

        this.clearMetaRules = function (node) {
            self.deleteNode(getMetaNode(node), true);
        };

        this.setAttributeMeta = function (node, name, value) {
            ASSERT(typeof value === 'object' && typeof name === 'string' && name);
            var defaultValue;

            if (value.hasOwnProperty('default')) {
                defaultValue = value.default;
                value = JSON.parse(JSON.stringify(value));
                delete value.default;
            }

            self.setAttribute(getMetaNode(node), name, value);

            if (typeof defaultValue !== 'undefined') {
                self.setAttribute(node, name, defaultValue);
            }
        };

        this.delAttributeMeta = function (node, name) {
            self.delAttribute(getMetaNode(node), name);
        };

        this.getAttributeMeta = function (node, name) {
            return self.getAttribute(getMetaNode(node), name);
        };

        this.getValidChildrenPaths = function (node) {
            return self.getMemberPaths(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS);
        };

        this.getOwnValidChildrenPaths = function (node) {
            return self.getOwnMemberPaths(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS);
        };

        this.getChildrenMeta = function (node) {
            var cMetaNode = getMetaChildrenNode(node),
                childrenMeta = {
                    min: self.getAttribute(cMetaNode, CONSTANTS.SET_ITEMS_MIN),
                    max: self.getAttribute(cMetaNode, CONSTANTS.SET_ITEMS_MAX)
                },
                paths = self.getMemberPaths(cMetaNode, CONSTANTS.SET_ITEMS),
                i;

            for (i = 0; i < paths.length; i += 1) {
                childrenMeta[paths[i]] = {
                    min: self.getMemberAttribute(cMetaNode, CONSTANTS.SET_ITEMS, paths[i], CONSTANTS.SET_ITEMS_MIN),
                    max: self.getMemberAttribute(cMetaNode, CONSTANTS.SET_ITEMS, paths[i], CONSTANTS.SET_ITEMS_MAX)
                };
            }

            if (paths.length > 0) {
                return childrenMeta;
            }

            return null;
        };

        this.setChildMeta = function (node, child, min, max) {
            self.addMember(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS, child);
            min = min || -1;
            max = max || -1;
            self.setMemberAttribute(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS, self.getPath(child),
                CONSTANTS.SET_ITEMS_MIN, min);
            self.setMemberAttribute(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS, self.getPath(child),
                CONSTANTS.SET_ITEMS_MAX, max);
        };

        this.delChildMeta = function (node, childPath) {
            self.delMember(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS, childPath);
        };

        this.setChildrenMetaLimits = function (node, min, max) {
            if (min) {
                self.setAttribute(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS_MIN, min);
            }
            if (max) {
                self.setAttribute(getMetaChildrenNode(node), CONSTANTS.SET_ITEMS_MAX, max);
            }
        };

        this.setPointerMetaTarget = function (node, name, target, min, max) {
            self.addMember(metaPointerNode(node, name), CONSTANTS.SET_ITEMS, target);
            min = min || -1;
            self.setMemberAttribute(metaPointerNode(node, name), CONSTANTS.SET_ITEMS, self.getPath(target),
                CONSTANTS.SET_ITEMS_MIN, min);
            max = max || -1;
            self.setMemberAttribute(metaPointerNode(node, name), CONSTANTS.SET_ITEMS, self.getPath(target),
                CONSTANTS.SET_ITEMS_MAX, max);
        };

        this.delPointerMetaTarget = function (node, name, targetPath) {
            var metaNode = getMetaPointerNode(node, name);
            if (metaNode) {
                self.delMember(metaNode, CONSTANTS.SET_ITEMS, targetPath);
            }
        };

        this.setPointerMetaLimits = function (node, name, min, max) {
            if (min) {
                self.setAttribute(metaPointerNode(node, name), CONSTANTS.SET_ITEMS_MIN, min);
            }
            if (max) {
                self.setAttribute(metaPointerNode(node, name), CONSTANTS.SET_ITEMS_MAX, max);
            }
        };

        this.delPointerMeta = function (node, name) {
            self.deleteNode(metaPointerNode(node, name), true);
            self.deletePointer(getMetaNode(node), name);
        };

        this.getPointerMeta = function (node, name) {
            var pointerMeta = {},
                members,
                member,
                i,
                pointerMetaNode = getMetaPointerNode(node, name);

            if (pointerMetaNode === null) {
                return null;
            }

            //min
            pointerMeta.min = self.getAttribute(pointerMetaNode, CONSTANTS.SET_ITEMS_MIN);
            if (pointerMeta.min === undefined) {
                pointerMeta.min = -1;
            }

            //max
            pointerMeta.max = self.getAttribute(pointerMetaNode, CONSTANTS.SET_ITEMS_MAX);
            if (pointerMeta.max === undefined) {
                pointerMeta.max = -1;
            }

            members = self.getMemberPaths(pointerMetaNode, CONSTANTS.SET_ITEMS);
            for (i = 0; i < members.length; i++) {
                member = {
                    min: self.getMemberAttribute(pointerMetaNode, CONSTANTS.SET_ITEMS, members[i],
                        CONSTANTS.SET_ITEMS_MIN),
                    max: self.getMemberAttribute(pointerMetaNode, CONSTANTS.SET_ITEMS, members[i],
                        CONSTANTS.SET_ITEMS_MAX)
                };
                if (member.min === undefined) {
                    member.min = -1;
                }
                if (member.max === undefined) {
                    member.max = -1;
                }

                pointerMeta[members[i]] = member;
            }

            return pointerMeta;
        };

        this.getValidTargetPaths = function (node, name) {
            var pointerNode = getMetaPointerNode(node, name);
            if (pointerNode === null) {
                return [];
            }
            return self.getMemberPaths(pointerNode, CONSTANTS.SET_ITEMS);
        };

        this.getOwnValidTargetPaths = function (node, name) {
            var pointerNode = getMetaPointerNode(node, name);
            if (pointerNode === null) {
                return [];
            }
            return self.getOwnMemberPaths(pointerNode, CONSTANTS.SET_ITEMS);
        };

        this.setAspectMetaTarget = function (node, name, target) {
            self.addMember(metaAspectNode(node, name), CONSTANTS.SET_ITEMS, target);
        };

        this.delAspectMetaTarget = function (node, name, targetPath) {
            var metaNode = getMetaAspectNode(node, name);
            if (metaNode) {
                self.delMember(metaNode, CONSTANTS.SET_ITEMS, targetPath);
            }
        };

        this.delAspectMeta = function (node, name) {
            self.deleteNode(metaAspectNode(node, name), true);
            self.deletePointer(getMetaAspectsNode(node), name);
        };

        this.getBaseType = function (node) {
            //TODO this functions now uses the fact that we think of META as the MetaSetContainer of the ROOT
            while (node) {
                if (isOnMetaSheet(node)) {
                    return node;
                }
                node = self.getBase(node);
            }
            return null;
        };

        this.isInstanceOf = function (node, name) {
            //TODO this is name based query - doesn't check the node's own name
            node = self.getBase(node);
            while (node) {
                if (self.getAttribute(node, 'name') === name) {
                    return true;
                }
                node = self.getBase(node);
            }

            return false;
        };
        //</editor-fold>
    };

    return MetaCore;
});
