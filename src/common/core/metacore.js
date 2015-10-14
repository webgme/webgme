/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/util/assert',
    'common/core/core',
    'common/core/tasync',
    'common/util/canon'
], function (ASSERT, Core, TASYNC, CANON) {
    'use strict';

    // ----------------- CoreType -----------------

    var MetaCore = function (oldcore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        // copy all operations
        var core = {},
            logger = options.logger.fork('metacore');
        for (var key in oldcore) {
            core[key] = oldcore[key];
        }
        logger.debug('initialized');
        var sameNode = function (nodeA, nodeB) {
            if (core.getPath(nodeA) === core.getPath(nodeB)) {
                return true;
            }
            return false;
        };

        var realNode = function (node) { //TODO we have to make some more sophisticated distinction
            if (core.getPath(node).indexOf('_') !== -1) {
                return false;
            }
            return true;
        };

        var getMetaNode = function (node) {
            return core.getChild(node, '_meta');
        };
        var getMetaChildrenNode = function (node) {
            return core.getChild(getMetaNode(node), 'children');
        };
        var getMetaPointerNode = function (node, name) {
            var meta = getMetaNode(node),
                pointerNames = core.getPointerNames(meta) || [];
            if (pointerNames.indexOf(name) !== -1) {
                return core.getChild(meta, '_p_' + name);
            }
            return null;
        };
        var _MetaPointerNode = function (node, name) {
            //this function always gives back a node, use this if you just want to create the node as well
            core.setPointer(getMetaNode(node), name, null);
            return core.getChild(getMetaNode(node), '_p_' + name);
        };

        var getMetaAspectsNode = function (node) {
            return core.getChild(getMetaNode(node), 'aspects');
        };
        var getMetaAspectNode = function (node, name) {
            var aspectNode = getMetaAspectsNode(node),
                names = core.getPointerNames(aspectNode) || [];
            if (names.indexOf(name) !== -1) {
                return core.getChild(aspectNode, '_a_' + name);
            }
            return null;
        };

        var _MetaAspectNode = function (node, name) {
            //this function always gives back a node, use this if you just want to create the node as well
            var aspectNode = core.getChild(getMetaNode(node), 'aspects');

            core.setPointer(aspectNode, name, null);
            return core.getChild(aspectNode, '_a_' + name);
        };
        //now the additional functions
        core.isTypeOf = function (node, typeNode) {
            if (!realNode(node)) {
                return false;
            }
            while (node) {
                if (sameNode(node, typeNode)) {
                    return true;
                }
                node = core.getBase(node);
            }
            return false;
        };

        core.isValidChildOf = function (node, parentNode) {
            if (!realNode(node)) {
                return true;
            }
            var validChildTypePaths = core.getMemberPaths(getMetaChildrenNode(parentNode), 'items') || [];
            while (node) {
                if (validChildTypePaths.indexOf(core.getPath(node)) !== -1) {
                    return true;
                }
                node = core.getBase(node);
            }
            return false;
        };

        core.getValidPointerNames = function (node) {
            var validNames = core.getPointerNames(getMetaNode(node)) || [],
                i,
                validPointerNames = [],
                metaPointerNode, max;
            for (i = 0; i < validNames.length; i++) {
                metaPointerNode = getMetaPointerNode(node, validNames[i]);
                max = core.getAttribute(metaPointerNode, 'max');
                if (max === 1) {
                    //TODO specify what makes something a pointer and what a set??? - can you extend a pointer to a set????
                    validPointerNames.push(validNames[i]);
                }
            }

            return validPointerNames;
        };

        core.getValidSetNames = function (node) {
            var validNames = core.getPointerNames(getMetaNode(node)) || [],
                i,
                validSetNames = [],
                metaPointerNode, max;

            for (i = 0; i < validNames.length; i++) {
                metaPointerNode = getMetaPointerNode(node, validNames[i]);
                max = core.getAttribute(metaPointerNode, 'max');
                if (max === undefined || max === -1 || max > 1) {
                    //TODO specify what makes something a pointer and what a set??? - can you extend a pointer to a set????
                    validSetNames.push(validNames[i]);
                }
            }

            return validSetNames;
        };

        core.isValidTargetOf = function (node, source, name) {
            if (!realNode(source) || node === null) { //we position ourselves over the null-pointer layer
                return true;
            }
            var pointerMetaNode = getMetaPointerNode(source, name);
            if (pointerMetaNode) {
                var validTargetTypePaths = core.getMemberPaths(pointerMetaNode, 'items') || [];
                while (node) {
                    if (validTargetTypePaths.indexOf(core.getPath(node)) !== -1) {
                        return true;
                    }
                    node = core.getBase(node);
                }
            }
            return false;
        };

        core.getValidAttributeNames = function (node) {
            var names = [];
            if (realNode(node)) {
                names = core.getAttributeNames(getMetaNode(node)) || [];
            }
            return names;
        };

        core.isValidAttributeValueOf = function (node, name, value) {
            if (!realNode(node)) {
                return true;
            }
            if (core.getValidAttributeNames(node).indexOf(name) === -1) {
                return false;
            }
            var meta = core.getAttribute(getMetaNode(node), name);
            switch (meta.type) {
                case 'boolean':
                    if (value === true || value === false) {
                        return true;
                    }
                    break;
                case 'string':
                    if (typeof value === 'string') {
                        if (meta.regexp) {
                            return (new RegExp(meta.regexp).test(value));
                        }
                        return true;
                    }
                case 'asset':
                    if (typeof value === 'string') {
                        return true;
                    }
                    break;
                case 'integer':
                    if (!isNaN(parseInt(value)) && parseFloat(value) === parseInt(value)) {
                        if ((!meta.min || (meta.min && value >= meta.min)) &&
                            (!meta.max || (meta.max && value <= meta.max))) {
                            return true;
                        }
                        return false;
                    }
                    break;
                case 'float':
                    if (!isNaN(parseFloat(value))) {
                        if ((!meta.min || (meta.min && value >= meta.min)) &&
                            (!meta.max || (meta.max && value <= meta.max))) {
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


        core.getValidAspectNames = function (node) {
            return core.getPointerNames(getMetaAspectsNode(node)) || [];
        };

        core.getAspectMeta = function (node, name) {
            return core.getMemberPaths(getMetaAspectNode(node, name), 'items');
        };

        //additional meta functions for getting meta definitions
        core.getJsonMeta = function (node) {
            var meta = {children: {}, attributes: {}, pointers: {}, aspects: {}, constraints: {}},
                tempNode,
                names,
                pointer,
                i, j;

            //fill children part
            tempNode = getMetaChildrenNode(node);

            meta.children.minItems = [];
            meta.children.maxItems = [];
            meta.children.items = core.getMemberPaths(tempNode, 'items');
            for (i = 0; i < meta.children.items.length; i++) {
                meta.children.minItems.push(
                    core.getMemberAttribute(tempNode, 'items', meta.children.items[i], 'min') || -1);

                meta.children.maxItems.push(
                    core.getMemberAttribute(tempNode, 'items', meta.children.items[i], 'max') || -1);
            }
            meta.children.min = core.getAttribute(tempNode, 'min');
            meta.children.max = core.getAttribute(tempNode, 'max');

            //attributes
            names = core.getValidAttributeNames(node);
            for (i = 0; i < names.length; i++) {
                meta.attributes[names[i]] = core.getAttribute(getMetaNode(node), names[i]);
            }

            //pointers
            names = core.getPointerNames(getMetaNode(node));
            for (i = 0; i < names.length; i++) {
                tempNode = getMetaPointerNode(node, names[i]);
                pointer = {};

                pointer.items = core.getMemberPaths(tempNode, 'items');
                pointer.min = core.getAttribute(tempNode, 'min');
                pointer.max = core.getAttribute(tempNode, 'max');
                pointer.minItems = [];
                pointer.maxItems = [];

                for (j = 0; j < pointer.items.length; j++) {
                    pointer.minItems.push(core.getMemberAttribute(tempNode, 'items', pointer.items[j], 'min') || -1);
                    pointer.maxItems.push(core.getMemberAttribute(tempNode, 'items', pointer.items[j], 'max') || -1);

                }

                meta.pointers[names[i]] = pointer;
            }

            //aspects
            names = core.getValidAspectNames(node);

            for (i = 0; i < names.length; i++) {
                tempNode = getMetaAspectNode(node, names[i]);
                meta.aspects[names[i]] = core.getMemberPaths(tempNode, 'items') || [];
            }

            //constraints
            names = core.getConstraintNames(node);
            for (i = 0; i < names.length; i++) {
                meta.constraints[names[i]] = core.getConstraint(node, names[i]);
            }

            return meta;
        };

        var getMetaObjectDiff = function (bigger, smaller) {
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
        };

        core.getOwnJsonMeta = function (node) {
            var base = core.getBase(node),
                baseMeta = base ? core.getJsonMeta(base) : {},
                meta = core.getJsonMeta(node);

            return getMetaObjectDiff(meta, baseMeta);
        };

        core.clearMetaRules = function (node) {
            core.deleteNode(getMetaNode(node), true);
        };

        core.setAttributeMeta = function (node, name, value) {
            ASSERT(typeof value === 'object' && typeof name === 'string' && name);

            core.setAttribute(getMetaNode(node), name, value);
        };
        core.delAttributeMeta = function (node, name) {
            core.delAttribute(getMetaNode(node), name);
        };
        core.getAttributeMeta = function (node, name) {
            return core.getAttribute(getMetaNode(node), name);
        };

        core.getValidChildrenPaths = function (node) {
            return core.getMemberPaths(getMetaChildrenNode(node), 'items');
        };

        core.getChildrenMeta = function (node) {
            var cMetaNode = getMetaChildrenNode(node),
                childrenMeta = {
                    min: core.getAttribute(cMetaNode, 'min'),
                    max: core.getAttribute(cMetaNode, 'max')
                },
                paths = core.getMemberPaths(cMetaNode, 'items'),
                i;

            for (i = 0; i < paths.length; i += 1) {
                childrenMeta[paths[i]] = {
                    min: core.getMemberAttribute(cMetaNode, 'items', paths[i], 'min'),
                    max: core.getMemberAttribute(cMetaNode, 'items', paths[i], 'max')
                };
            }

            if (paths.length > 0) {
                return childrenMeta;
            }

            return null;
        };

        core.setChildMeta = function (node, child, min, max) {
            core.addMember(getMetaChildrenNode(node), 'items', child);
            min = min || -1;
            max = max || -1;
            core.setMemberAttribute(getMetaChildrenNode(node), 'items', core.getPath(child), 'min', min);
            core.setMemberAttribute(getMetaChildrenNode(node), 'items', core.getPath(child), 'max', max);
        };
        core.delChildMeta = function (node, childPath) {
            core.delMember(getMetaChildrenNode(node), 'items', childPath);
        };
        core.setChildrenMetaLimits = function (node, min, max) {
            if (min) {
                core.setAttribute(getMetaChildrenNode(node), 'min', min);
            }
            if (max) {
                core.setAttribute(getMetaChildrenNode(node), 'max', max);
            }
        };

        core.setPointerMetaTarget = function (node, name, target, min, max) {
            core.addMember(_MetaPointerNode(node, name), 'items', target);
            min = min || -1;
            core.setMemberAttribute(_MetaPointerNode(node, name), 'items', core.getPath(target), 'min', min);
            max = max || -1;
            core.setMemberAttribute(_MetaPointerNode(node, name), 'items', core.getPath(target), 'max', max);
        };
        core.delPointerMetaTarget = function (node, name, targetPath) {
            var metaNode = getMetaPointerNode(node, name);
            if (metaNode) {
                core.delMember(metaNode, 'items', targetPath);
            }
        };
        core.setPointerMetaLimits = function (node, name, min, max) {
            if (min) {
                core.setAttribute(_MetaPointerNode(node, name), 'min', min);
            }
            if (max) {
                core.setAttribute(_MetaPointerNode(node, name), 'max', max);
            }
        };
        core.delPointerMeta = function (node, name) {
            core.deleteNode(_MetaPointerNode(node, name), true);
            core.deletePointer(getMetaNode(node), name);
        };

        core.getPointerMeta = function (node, name) {
            var pointerMeta = {},
                members,
                member,
                i,
                pointerMetaNode = getMetaPointerNode(node, name);

            if (pointerMetaNode === null) {
                return null;
            }

            //min
            pointerMeta.min = core.getAttribute(pointerMetaNode, 'min');
            if (pointerMeta.min === undefined) {
                pointerMeta.min = -1;
            }

            //max
            pointerMeta.max = core.getAttribute(pointerMetaNode, 'max');
            if (pointerMeta.max === undefined) {
                pointerMeta.max = -1;
            }

            members = core.getMemberPaths(pointerMetaNode, 'items');
            for (i = 0; i < members.length; i++) {
                member = {
                    min: core.getMemberAttribute(pointerMetaNode, 'items', members[i], 'min'),
                    max: core.getMemberAttribute(pointerMetaNode, 'items', members[i], 'max')
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

        core.setAspectMetaTarget = function (node, name, target) {
            core.addMember(_MetaAspectNode(node, name), 'items', target);
        };
        core.delAspectMetaTarget = function (node, name, targetPath) {
            var metaNode = getMetaAspectNode(node, name);
            if (metaNode) {
                core.delMember(metaNode, 'items', targetPath);
            }
        };
        core.delAspectMeta = function (node, name) {
            core.deleteNode(_MetaAspectNode(node, name), true);
            core.deletePointer(getMetaAspectsNode(node), name);
        };

        //type related extra query functions
        var isOnMetaSheet = function (node) {
            //MetaAspectSet
            var sets = core.isMemberOf(node);

            if (sets && sets[''] && sets[''].indexOf('MetaAspectSet') !== -1) {
                //TODO this is all should be global constant values
                return true;
            }
            return false;
        };
        core.getBaseType = function (node) {
            //TODO this functions now uses the fact that we think of META as the MetaSetContainer of the ROOT
            while (node) {
                if (isOnMetaSheet(node)) {
                    return node;
                }
                node = core.getBase(node);
            }
            return null;
        };
        core.isInstanceOf = function (node, name) {
            //TODO this is name based query - doesn't check the node's own name
            node = core.getBase(node);
            while (node) {
                if (core.getAttribute(node, 'name') === name) {
                    return true;
                }
                node = core.getBase(node);
            }

            return false;
        };

        return core;
    };

    return MetaCore;
});
