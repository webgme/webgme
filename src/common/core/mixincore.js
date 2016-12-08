/*globals define*/
/*jshint node: true, browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/core/CoreAssert',
    'common/core/tasync',
    'common/util/canon',
    'common/core/constants'
], function (ASSERT, TASYNC, CANON, CONSTANTS) {
    'use strict';

    var MixinCore = function (innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            key,
            self = this;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        logger.debug('initialized MixinCore');

        //<editor-fold=Helper Functions>

        function realNode(node) { //TODO we have to make some more sophisticated distinction
            if (self.getPath(node).indexOf('_') !== -1) {
                return false;
            }
            return true;
        }

        function getOrderedMixinList(node) {
            var paths = self.getMixinPaths(node),
                metaNodes,
                helper = {},
                orderedList = [],
                guid,
                i;

            if (paths.length === 0) {
                return orderedList;
            }

            metaNodes = self.getAllMetaNodes(node);

            for (i = 0; i < paths.length; i += 1) {
                if (metaNodes[paths[i]]) {
                    guid = self.getGuid(metaNodes[paths[i]]);
                    helper[guid] = paths[i];
                    orderedList.push(guid);
                }

            }

            orderedList.sort();

            for (i = 0; i < orderedList.length; i += 1) {
                orderedList[i] = metaNodes[helper[orderedList[i]]];
            }

            return orderedList;
        }

        function getNodeDictionary(node, paths) {
            var allMetaNodes = self.getAllMetaNodes(node),
                dictionary = {},
                i;

            for (i = 0; i < paths.length; i += 1) {
                if (allMetaNodes[paths[i]]) {
                    dictionary[paths[i]] = allMetaNodes[paths[i]];
                }
            }

            return dictionary;
        }

        function extendUniqueArray(base, extension) {
            var i;

            for (i = 0; i < extension.length; i += 1) {
                if (base.indexOf(extension[i]) === -1) {
                    base.push(extension[i]);
                }
            }
        }

        function getExtendedUniqueKeyedObject(base, extension) {
            var extended = {},
                key;
            for (key in base) {
                extended[key] = base[key];
            }

            for (key in extension) {
                if (!base[key]) {
                    extended[key] = extension[key];
                }
            }

            return extended;
        }

        function getValidNames(node, getter, alreadyVisited) {
            var base = self.getBase(node),
                path = self.getPath(node),
                names,
                mixins = getOrderedMixinList(node),
                i;

            if (alreadyVisited[path]) {
                return [];
            }

            if (base) {
                names = getValidNames(base, getter, alreadyVisited);
            } else {
                names = [];
            }

            extendUniqueArray(names, getter(node));
            alreadyVisited[path] = true;

            for (i = 0; i < mixins.length; i += 1) {
                extendUniqueArray(names, getValidNames(mixins[i], getter, alreadyVisited));
            }

            return names;
        }

        function getFirstMatchingRuleHolder(node, name, getter, alreadyVisited) {
            var base = self.getBase(node),
                path = self.getPath(node),
                mixins = getOrderedMixinList(node),
                ruleHolder = null,
                i;

            if (alreadyVisited[path]) {
                return null;
            }

            //when it comes to rule holder, always the given node's own rule-set is the first
            alreadyVisited[path] = true;
            if (getter(node).indexOf(name) !== -1) {
                return node;
            }

            if (base) {
                ruleHolder = getFirstMatchingRuleHolder(base, name, getter, alreadyVisited);

                if (ruleHolder) {
                    return ruleHolder;
                }
            }

            for (i = 0; i < mixins.length; i += 1) {
                ruleHolder = getFirstMatchingRuleHolder(mixins[i], name, getter, alreadyVisited);
                if (ruleHolder) {
                    return ruleHolder;
                }
            }

            return null;
        }

        function getAllMatchingRuleHolders(node, name, getter, alreadyVisited) {
            var base = self.getBase(node),
                path = self.getPath(node),
                mixins = getOrderedMixinList(node),
                ruleHolders = [],
                i;

            if (alreadyVisited[path]) {
                return [];
            }

            //when it comes to rule holder, always the given node's own rule-set is the first
            alreadyVisited[path] = true;
            if (getter(node).indexOf(name) !== -1) {
                ruleHolders.push(node);
            }

            if (base) {
                ruleHolders = ruleHolders.concat(getAllMatchingRuleHolders(base, name, getter, alreadyVisited));
            }

            for (i = 0; i < mixins.length; i += 1) {
                ruleHolders = ruleHolders.concat(getAllMatchingRuleHolders(mixins[i], name, getter, alreadyVisited));

            }

            return ruleHolders;
        }

        function getFirstMatchingMeta(node, name, matchFuction, getFunction) {
            var metaRuleHolder = getFirstMatchingRuleHolder(node, name, matchFuction, {});

            if (metaRuleHolder) {
                return getFunction(metaRuleHolder, name);
            }

            return undefined;
        }

        function allValidRelationsNameGetter(node) {
            return innerCore.getOwnValidPointerNames(node).concat(innerCore.getOwnValidSetNames(node));
        }

        function containmentGetter(node) {
            return ['containment'];
        }

        function isTypeOf(node, typeNode, alreadyVisited) {
            var base, mixins, i,
                path = self.getPath(node);

            if (alreadyVisited[path]) {
                return false;
            }

            alreadyVisited[path] = true;

            if (innerCore.isTypeOf(node, typeNode)) {
                return true;
            }

            base = self.getBase(node);
            if (base && isTypeOf(base, typeNode, alreadyVisited)) {
                return true;
            }

            mixins = getOrderedMixinList(node);
            for (i = 0; i < mixins.length; i += 1) {
                if (isTypeOf(mixins[i], typeNode, alreadyVisited)) {
                    return true;
                }
            }

            return false;
        }

        function convertRuleToItemizedArraySet(rule) {
            var items = [],
                minItems = [],
                maxItems = [],
                i;

            for (i in rule) {
                if (i !== 'min' && i !== 'max') {
                    items.push(i);
                    minItems.push(rule[i].min || -1);
                    maxItems.push(rule[i].max || -1);
                    delete rule[i];
                }
            }

            rule.items = items;
            rule.minItems = minItems;
            rule.maxItems = maxItems;
        }

        //</editor-fold>

        //<editor-fold=Modified Methods>

        this.isTypeOf = function (node, typeNode) {
            //TODO implement
            if (!realNode(node)) {
                return false;
            }

            return isTypeOf(node, typeNode, {});
        };

        this.isValidChildOf = function (node, parentNode) {
            if (!realNode(node)) {
                return true;
            }
            var childrenPaths,
                metaNodes,
                i;

            if (innerCore.isValidChildOf(node, parentNode)) {
                return true;
            }

            // Now we have to look deeper as containment rule may come from a mixin
            childrenPaths = self.getValidChildrenPaths(parentNode);
            metaNodes = self.getAllMetaNodes(node);

            for (i = 0; i < childrenPaths.length; i += 1) {
                if (metaNodes[childrenPaths[i]] && self.isTypeOf(node, metaNodes[childrenPaths[i]])) {
                    return true;
                }
            }
            return false;
        };

        this.isValidTargetOf = function (node, source, name) {
            if (!realNode(source) || node === null) {
                return true;
            }

            var targetPaths,
                metaNodes,
                i;

            if (innerCore.isValidTargetOf(node, source, name)) {
                return true;
            }

            // Now we have to look deeper as pointer rule may come from a mixin
            targetPaths = self.getValidTargetPaths(source, name);
            metaNodes = self.getAllMetaNodes(node);

            for (i = 0; i < targetPaths.length; i += 1) {
                if (metaNodes[targetPaths[i]] && self.isTypeOf(node, metaNodes[targetPaths[i]])) {
                    return true;
                }
            }

            return false;
        };

        this.isValidAttributeValueOf = function (node, name, value) {
            if (!realNode(node)) {
                return true;
            }

            var ruleHolder = getFirstMatchingRuleHolder(node, name, innerCore.getOwnValidAttributeNames, {});

            if (ruleHolder) {
                return innerCore.isValidAttributeValueOf(ruleHolder, name, value);
            }

            return false;
        };

        this.getValidPointerNames = function (node) {
            return getValidNames(node, innerCore.getOwnValidPointerNames, {});
        };

        this.getValidSetNames = function (node) {
            return getValidNames(node, innerCore.getOwnValidSetNames, {});
        };

        this.getValidAttributeNames = function (node) {
            if (!realNode(node)) {
                return [];
            }

            return getValidNames(node, innerCore.getOwnValidAttributeNames, {});
        };

        this.getValidAspectNames = function (node) {
            return getValidNames(node, innerCore.getOwnValidAspectNames, {});
        };

        this.getConstraintNames = function (node) {
            return getValidNames(node, innerCore.getConstraintNames, {});
        };

        this.getJsonMeta = function (node) {
            var meta = {children: {}, attributes: {}, pointers: {}, aspects: {}, constraints: {}},
                nullRule = {items: [], minItems: [], maxItems: []},
                tempNode,
                names,
                pointer,
                i, j;

            meta.children = self.getChildrenMeta(node);
            if (meta.children) {
                convertRuleToItemizedArraySet(meta.children);
            } else {
                meta.children = nullRule;
            }

            //attributes
            names = self.getValidAttributeNames(node);
            for (i = 0; i < names.length; i += 1) {
                meta.attributes[names[i]] = self.getAttributeMeta(node, names[i]);
            }

            //pointers
            names = self.getValidPointerNames(node);
            for (i = 0; i < names.length; i += 1) {
                meta.pointers[names[i]] = self.getPointerMeta(node, names[i]);
                convertRuleToItemizedArraySet(meta.pointers[names[i]]);
            }

            //sets
            names = self.getValidSetNames(node);
            for (i = 0; i < names.length; i += 1) {
                meta.pointers[names[i]] = self.getPointerMeta(node, names[i]);
                convertRuleToItemizedArraySet(meta.pointers[names[i]]);
            }

            //aspects
            names = self.getValidAspectNames(node);

            for (i = 0; i < names.length; i += 1) {
                meta.aspects[names[i]] = self.getAspectMeta(node, names[i]);
            }

            //constraints
            names = self.getConstraintNames(node);
            for (i = 0; i < names.length; i += 1) {
                meta.constraints[names[i]] = self.getConstraint(node, names[i]);
            }

            return meta;
        };

        this.getOwnJsonMeta = function (node) {
            // We have to extend the meta definition by the mixins, but only if we talk about the own rule-set.
            var jsonMeta = innerCore.getOwnJsonMeta(node),
                mixins = this.getMixinPaths(node);

            if (mixins.length > 0) {
                jsonMeta.mixins = mixins;
            }

            return jsonMeta;
        };

        this.getValidChildrenPaths = function (node) {
            return getValidNames(node, innerCore.getValidChildrenPaths, {});
        };

        this.getChildrenMeta = function (node) {
            var ruleHolders = getAllMatchingRuleHolders(node, 'containment', containmentGetter, {}),
                childrenMeta = {},
                i;

            for (i = 0; i < ruleHolders.length; i += 1) {
                childrenMeta = getExtendedUniqueKeyedObject(childrenMeta, innerCore.getChildrenMeta(ruleHolders[i]));
            }

            if (Object.keys(childrenMeta).length === 0) {
                return null;
            }

            return childrenMeta;
        };

        this.getPointerMeta = function (node, name) {
            var ruleHolders = getAllMatchingRuleHolders(node, name, allValidRelationsNameGetter, {}),
                i,
                pointerMeta = {};

            if (ruleHolders.length === 0) {
                return undefined;
            }

            for (i = 0; i < ruleHolders.length; i += 1) {
                pointerMeta = getExtendedUniqueKeyedObject(pointerMeta, innerCore.getPointerMeta(ruleHolders[i], name));
            }
            return pointerMeta;
        };

        this.getValidTargetPaths = function (node, name) {
            var getTargetPaths = function (getNode) {
                return innerCore.getValidTargetPaths(getNode, name);
            };

            return getValidNames(node, getTargetPaths, {});
        };

        this.getAttributeMeta = function (node, name) {
            return getFirstMatchingMeta(node, name, innerCore.getOwnValidAttributeNames, innerCore.getAttributeMeta);
        };

        this.getAspectMeta = function (node, name) {
            return getFirstMatchingMeta(node, name, innerCore.getOwnValidAspectNames, innerCore.getAspectMeta);
        };

        this.getSetNames = function (node) {
            var rawNames = innerCore.getSetNames(node),
                index = rawNames.indexOf(CONSTANTS.MIXINS_SET);

            if (index !== -1) {
                rawNames.splice(index, 1);
            }

            return rawNames;
        };

        //</editor-fold>

        //<editor-fold=Added Methods>

        this.getMixinErrors = function (node) {
            var errors = [],
                mixinPaths = self.getMixinPaths(node),
                allMetaNodes = self.getAllMetaNodes(node),
                mixinNodes = getOrderedMixinList(node),
                targetNode,
                targetInfoTxt,
                definitions,
                ownName = self.getAttribute(node, 'name'),
                names,
                base = self.getBase(node),
                ownKeys,
                keys,
                name,
                path,
                i, j, k;

            logger.debug('getMixinErrors(' + ownName + ')');

            //mixin is missing from meta
            for (i = 0; i < mixinPaths.length; i += 1) {
                if (!allMetaNodes[mixinPaths[i]]) {
                    logger.error('mixin node is missing from Meta [' + mixinPaths[i] + ']');
                    errors.push({
                        severity: 'error',
                        nodeName: ownName,
                        type: CONSTANTS.MIXIN_ERROR_TYPE.MISSING,
                        targetInfo: mixinPaths[i],
                        message: '[' + ownName + ']: mixin node \'' + mixinPaths[i] + '\' is missing from the Meta',
                        hint: 'Remove mixin or add to the Meta'
                    });
                }
            }

            //attribute definition collisions
            definitions = {};
            ownKeys = [];
            if (base) {
                ownKeys = self.getValidAttributeNames(base);
            }
            extendUniqueArray(ownKeys, self.getOwnValidAttributeNames(node));

            for (i = 0; i < mixinNodes.length; i += 1) {
                name = self.getAttribute(mixinNodes[i], 'name');
                path = self.getPath(mixinNodes[i]);
                keys = self.getValidAttributeNames(mixinNodes[i]);

                for (j = 0; j < keys.length; j += 1) {
                    if (ownKeys.indexOf(keys[j]) === -1) {
                        if (definitions[keys[j]]) {
                            logger.warn('colliding attribute (' + keys[j] + ') definition [' +
                                definitions[keys[j]].name + ']vs[' + name + ']');
                            errors.push({
                                severity: 'warning',
                                type: CONSTANTS.MIXIN_ERROR_TYPE.ATTRIBUTE_COLLISION,
                                nodeName: ownName,
                                ruleName: keys[j],
                                collisionPaths: [definitions[keys[j]].path, path],
                                collisionNodes: [mixinNodes[definitions[keys[j]].index], mixinNodes[i]],
                                message: '[' + ownName + ']: inherits attribute definition \'' +
                                keys[j] + '\' from [' + definitions[keys[j]].name + '] and [' + name + ']',
                                hint: 'Remove one of the mixin relations'
                            });
                        } else {
                            definitions[keys[j]] = {name: name, path: path, index: i};
                        }
                    }
                }
            }

            //containment collisions
            definitions = {};
            ownKeys = [];
            if (base) {
                ownKeys = self.getValidChildrenPaths(base);
            }
            extendUniqueArray(ownKeys, self.getOwnValidChildrenPaths(node));

            for (i = 0; i < mixinNodes.length; i += 1) {
                name = self.getAttribute(mixinNodes[i], 'name');
                keys = self.getValidChildrenPaths(mixinNodes[i]);
                path = self.getPath(mixinNodes[i]);

                for (j = 0; j < keys.length; j += 1) {
                    if (ownKeys.indexOf(keys[j]) === -1) {
                        if (definitions[keys[j]]) {
                            targetNode = allMetaNodes[keys[j]];
                            if (targetNode) {
                                targetInfoTxt = '[' + self.getAttribute(targetNode, 'name') + ']';
                            } else {
                                targetInfoTxt = '\'' + keys[j] + '\'';
                            }
                            logger.warn('colliding child (' + keys[j] + ') definition [' +
                                definitions[keys[j]].name + ']vs[' + name + ']');
                            errors.push({
                                severity: 'warning',
                                type: CONSTANTS.MIXIN_ERROR_TYPE.CONTAINMENT_COLLISION,
                                nodeName: ownName,
                                targetInfo: keys[j],
                                targetNode: targetNode,
                                collisionPaths: [definitions[keys[j]].path, path],
                                collisionNodes: [mixinNodes[definitions[keys[j]].index], mixinNodes[i]],
                                message: '[' + ownName + ']: inherits child definition for ' +
                                targetInfoTxt + ' from [' + definitions[keys[j]].name + '] and [' + name + ']',
                                hint: 'Remove one of the mixin relations'
                            });
                        } else {
                            definitions[keys[j]] = {name: name, path: path, index: i};
                        }
                    }
                }
            }

            //pointer target collisions
            names = this.getValidPointerNames(node);
            for (i = 0; i < names.length; i += 1) {
                definitions = {};
                ownKeys = [];
                if (base) {
                    ownKeys = self.getValidTargetPaths(base, names[i]);
                }
                extendUniqueArray(ownKeys, self.getOwnValidTargetPaths(node, names[i]));
                for (j = 0; j < mixinNodes.length; j += 1) {
                    keys = self.getValidTargetPaths(mixinNodes[j], names[i]);
                    name = self.getAttribute(mixinNodes[j], 'name');
                    path = self.getPath(mixinNodes[j]);
                    for (k = 0; k < keys.length; k += 1) {
                        if (ownKeys.indexOf(keys[k]) === -1 && keys[k] !== 'min' && keys[k] !== 'max') {
                            if (definitions[keys[k]]) {
                                targetNode = allMetaNodes[keys[k]];
                                if (targetNode) {
                                    targetInfoTxt = '[' + self.getAttribute(targetNode, 'name') + ']';
                                } else {
                                    targetInfoTxt = '\'' + keys[k] + '\'';
                                }
                                logger.warn('colliding pointer (' + names[i] + ') target (' + keys[k] +
                                    ') definition [' + definitions[keys[k]].name + ']vs[' + name + ']');
                                errors.push({
                                    severity: 'warning',
                                    type: CONSTANTS.MIXIN_ERROR_TYPE.POINTER_COLLISION,
                                    nodeName: ownName,
                                    ruleName: names[i],
                                    targetInfo: keys[k],
                                    targetNode: targetNode,
                                    collisionPaths: [definitions[keys[k]].path, path],
                                    collisionNodes: [mixinNodes[definitions[keys[k]].index], mixinNodes[j]],
                                    message: '[' + ownName + ']: inherits pointer (' + names[i]
                                    + ') target definition of ' + targetInfoTxt +
                                    ' from [' + definitions[keys[k]].name + '] and [' + name + ']',
                                    hint: 'Remove one of the mixin relations'
                                });
                            } else {
                                definitions[keys[k]] = {name: name, path: path, index: i};
                            }
                        }
                    }
                }
            }

            //set member collisions
            names = this.getValidSetNames(node);
            for (i = 0; i < names.length; i += 1) {
                definitions = {};
                ownKeys = [];
                if (base) {
                    ownKeys = self.getValidTargetPaths(base, names[i]);
                }
                extendUniqueArray(ownKeys, self.getOwnValidTargetPaths(node, names[i]));
                for (j = 0; j < mixinNodes.length; j += 1) {
                    keys = self.getValidTargetPaths(mixinNodes[j], names[i]);
                    name = self.getAttribute(mixinNodes[j], 'name');
                    path = self.getPath(mixinNodes[j]);
                    for (k = 0; k < keys.length; k += 1) {
                        if (ownKeys.indexOf(keys[k]) === -1 && keys[k] !== 'min' && keys[k] !== 'max') {
                            if (definitions[keys[k]]) {
                                targetNode = allMetaNodes[keys[k]];
                                if (targetNode) {
                                    targetInfoTxt = '[' + self.getAttribute(targetNode, 'name') + ']';
                                } else {
                                    targetInfoTxt = '\'' + keys[k] + '\'';
                                }
                                logger.warn('colliding set (' + names[i] + ') member (' + keys[k] +
                                    ') definition [' + definitions[keys[k]].name + ']vs[' + name + ']');
                                errors.push({
                                    severity: 'warning',
                                    type: CONSTANTS.MIXIN_ERROR_TYPE.SET_COLLISION,
                                    nodeName: ownName,
                                    ruleName: names[i],
                                    targetInfo: keys[k],
                                    targetNode: targetNode,
                                    collisionPaths: [definitions[keys[k]].path, path],
                                    collisionNodes: [mixinNodes[definitions[keys[k]].index], mixinNodes[j]],
                                    message: '[' + ownName + ']: inherits set (' + names[i]
                                    + ') member definition of ' + targetInfoTxt +
                                    ' from [' + definitions[keys[k]].name + '] and [' + name + ']',
                                    hint: 'Remove one of the mixin relations'
                                });
                            } else {
                                definitions[keys[k]] = {name: name, path: path, index: i};
                            }
                        }
                    }
                }
            }

            //aspect collisions
            definitions = {};
            ownKeys = [];
            if (base) {
                ownKeys = self.getValidAspectNames(base);
            }
            extendUniqueArray(ownKeys, self.getOwnValidAspectNames(node));
            for (i = 0; i < mixinNodes.length; i += 1) {
                keys = self.getValidAspectNames(mixinNodes[i]);
                name = self.getAttribute(mixinNodes[i], 'name');
                path = self.getPath(mixinNodes[i]);
                for (j = 0; j < keys.length; j += 1) {
                    if (ownKeys.indexOf(keys[j]) === -1) {
                        if (definitions[keys[j]]) {
                            logger.warn('colliding aspect (' + keys[j] + ') definition [' +
                                definitions[keys[j]].name + ']vs[' + name + ']');
                            errors.push({
                                severity: 'warning',
                                type: CONSTANTS.MIXIN_ERROR_TYPE.ASPECT_COLLISION,
                                nodeName: ownName,
                                ruleName: keys[j],
                                collisionPaths: [definitions[keys[j]].path, path],
                                collisionNodes: [mixinNodes[definitions[keys[j]].index], mixinNodes[i]],
                                message: '[' + ownName + ']: inherits aspect definition \'' + keys[j] +
                                '\' from [' + definitions[keys[j]].name + '] and [' + name + ']',
                                hint: 'Remove one of the mixin relations'
                            });
                        } else {
                            definitions[keys[j]] = {name: name, path: path, index: i};
                        }
                    }
                }
            }

            //constraint collision
            definitions = {};
            ownKeys = [];
            if (base) {
                ownKeys = self.getConstraintNames(base);
            }
            extendUniqueArray(ownKeys, self.getOwnConstraintNames(node));
            for (i = 0; i < mixinNodes.length; i += 1) {
                keys = self.getConstraintNames(mixinNodes[i]);
                name = self.getAttribute(mixinNodes[i], 'name');
                for (j = 0; j < keys.length; j += 1) {
                    if (ownKeys.indexOf(keys[j]) === -1) {
                        if (definitions[keys[j]]) {
                            logger.warn('colliding constraint (' + keys[j] + ') definition [' +
                                definitions[keys[j]].name + ']vs[' + name + ']');
                            errors.push({
                                severity: 'warning',
                                type: CONSTANTS.MIXIN_ERROR_TYPE.CONSTRAINT_COLLISION,
                                nodeName: ownName,
                                ruleName: keys[j],
                                collisionPaths: [definitions[keys[j]].path, path],
                                collisionNodes: [mixinNodes[definitions[keys[j]].index], mixinNodes[i]],
                                message: '[' + ownName + ']: inherits constraint definition \'' + keys[j] +
                                '\' from [' + definitions[keys[j]].name + '] and [' + name + ']',
                                hint: 'Remove one of the mixin relations'
                            });
                        } else {
                            definitions[keys[j]] = {name: name, path: path, index: i};
                        }
                    }
                }
            }

            logger.debug('getMixinErrors(' + ownName + ') finished');
            return errors;
        };

        this.getMixinPaths = function (node) {
            return innerCore.getOwnMemberPaths(node, CONSTANTS.MIXINS_SET);
        };

        this.getMixinNodes = function (node) {
            var paths = self.getMixinPaths(node);
            return getNodeDictionary(node, paths);
        };

        this.delMixin = function (node, mixinPath) {
            var metaNodes = innerCore.getAllMetaNodes(node);

            innerCore.delMember(node, CONSTANTS.MIXINS_SET, mixinPath);
        };

        this.addMixin = function (node, mixinPath) {
            var metaNodes = innerCore.getAllMetaNodes(node);

            if (metaNodes[mixinPath]) {
                innerCore.addMember(node, CONSTANTS.MIXINS_SET, metaNodes[mixinPath]);
            }
        };

        this.clearMixins = function (node) {
            self.deleteSet(node, CONSTANTS.MIXINS_SET);
        };

        this.getBaseTypes = function (node) {
            var metaType = innerCore.getBaseType(node),
                metaTypes = [];

            if (metaType) {
                metaTypes = getOrderedMixinList(metaType);
                metaTypes.unshift(metaType);
            }

            return metaTypes;
        };

        this.canSetAsMixin = function (node, mixinPath) {
            var result = {
                    isOk: true,
                    reason: ''
                },
                mixinNode = self.getAllMetaNodes(node)[mixinPath];

            if (self.getPath(node) === mixinPath) {
                result.isOk = false;
                result.reason = 'Node cannot be mixin of itself!';
            } else if (!mixinNode) {
                result.isOk = false;
                result.reason = 'Mixin must be on the Meta!';
            } else if (innerCore.isTypeOf(node, mixinNode)) {
                result.isOk = false;
                result.reason = 'Base of node cannot be its mixin as well!';
            }

            return result;
        };
        //</editor-fold>
    };

    return MixinCore;
});