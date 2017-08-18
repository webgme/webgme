/*globals define*/
/*jshint node:true, browser:true, newcap:false*/
/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q', 'common/core/constants'], function (Q, CONSTANTS) {
    'use strict';

    // Helper functions.
    function loadNode(core, rootNode, nodePath) {
        return core.loadByPath(rootNode, nodePath)
            .then(function (node) {
                if (node === null) {
                    throw new Error('Given nodePath does not exist "' + nodePath + '"!');
                } else {
                    return node;
                }
            });
    }

    function loadNodes(core, node, nodePaths) {
        var i,
            loadPromises = [],
            rootNode = core.getRoot(node);

        for (i = 0; i < nodePaths.length; i += 1) {
            loadPromises.push(loadNode(core, rootNode, nodePaths[i]));
        }

        return Q.all(loadPromises);
    }

    function filterPointerRules(meta) {
        var result = {
                pointers: {},
                sets: {}
            },
            pointerNames = Object.keys(meta.pointers),
            i;

        for (i = 0; i < pointerNames.length; i += 1) {
            if (meta.pointers[pointerNames[i]].max === 1) {
                // These are single target pointers (e.g. connections).
                result.pointers[pointerNames[i]] = meta.pointers[pointerNames[i]];
            } else {
                // These are multi target pointer, i.e. sets.
                result.sets[pointerNames[i]] = meta.pointers[pointerNames[i]];
            }
        }

        return result;
    }

    function getMatchedItemIndices(core, node, items) {
        var i,
            metaNodes = core.getAllMetaNodes(node),
            indices = [];

        for (i = 0; i < items.length; i += 1) {
            if (core.isTypeOf(node, metaNodes[items[i]])) {
                indices.push(i);
            }
        }

        return indices;
    }

    function metaNodePathToName(core, metaNodes, path) {
        var name = 'Unknown';
        if (metaNodes[path]) {
            name = core.getAttribute(metaNodes[path], 'name');
        }

        return name;
    }

    function checkNodeTypesAndCardinality(core, node, nodes, subMetaRules, checkTypeText, singular) {
        var matches = [],
            metaNodes = core.getAllMetaNodes(node),
            result = {
                hasViolation: false,
                messages: []
            },
            i,
            j,
            matchedIndices;
        /*
         * example subMetaRules
         *   {
         *       items: [ '/1', '/822429792/942380411' ],
         *       min: undefined,
         *       max: undefined,
         *       minItems: [ -1, -1 ],
         *       maxItems: [ -1, 4 ]
         *   }
         */

        // Initialize the number of matches for each valid type.
        matches = subMetaRules.items.map(function () {
            return 0;
        });

        // For each node
        for (i = 0; i < nodes.length; i += 1) {

            // check which types it matches and
            matchedIndices = getMatchedItemIndices(core, nodes[i], subMetaRules.items);

            if (matchedIndices.length === 0) {
                result.hasViolation = true;
                result.messages.push('Illegal node "' + core.getAttribute(nodes[i], 'name') + '" [' +
                    core.getPath(nodes[i]) + '] ' + (singular ? 'as ' : 'among ') + checkTypeText + '.');
            } else {
                // increase the counter for each type it matches.
                for (j = 0; j < matchedIndices.length; j += 1) {
                    matches[matchedIndices[j]] += 1;
                }
            }
        }

        for (i = 0; i < subMetaRules.items.length; i += 1) {
            if (subMetaRules.minItems[i] > -1 && subMetaRules.minItems[i] > matches[i]) {
                result.hasViolation = true;
                result.messages.push('Fewer ' + checkTypeText + ' (' +
                    metaNodePathToName(core, metaNodes, subMetaRules.items[i]) + ') than needed - there should be ' +
                    subMetaRules.minItems[i] + ' but only ' + matches[i] + ' found.');
            } else if (subMetaRules.maxItems[i] > -1 && subMetaRules.maxItems[i] < matches[i]) {
                result.hasViolation = true;
                result.messages.push('More ' + checkTypeText + '(' +
                    metaNodePathToName(core, metaNodes, subMetaRules.items[i]) + ') than allowed - there can only be ' +
                    subMetaRules.maxItems[i] + ' but ' + matches[i] + ' found.');
            }
        }

        return result;
    }

    // Checker functions for pointers, sets, containment and attributes.
    function checkPointerRules(meta, core, node, callback) {
        var result = {
                hasViolation: false,
                messages: []
            },
            metaPointers = filterPointerRules(meta).pointers,
            checkPromises = [],
            pointerNames = core.getPointerNames(node);

        checkPromises = pointerNames.map(function (pointerName) {
            var metaPointer = metaPointers[pointerName],
                pointerPath,
                pointerPaths = [];

            if (!metaPointer) {
                if (pointerName === 'base') {
                    return {hasViolation: false};
                } else {
                    return Q({
                        hasViolation: true,
                        messages: ['Illegal pointer "' + pointerName + '".']
                    });
                }
            } else {
                pointerPath = core.getPointerPath(node, pointerName);
                if (pointerPath !== null) {
                    pointerPaths.push(pointerPath);
                }
                return loadNodes(core, node, pointerPaths)
                    .then(function (nodes) {
                        return checkNodeTypesAndCardinality(core, node, nodes, metaPointer,
                            '"' + pointerName + '" target', true);
                    });
            }
        });

        return Q.all(checkPromises)
            .then(function (results) {
                results.forEach(function (res) {
                    if (res.hasViolation) {
                        result.hasViolation = true;
                        result.messages = result.messages.concat(res.messages);
                    }
                });

                return result;
            }).nodeify(callback);
    }

    function checkSetRules(meta, core, node, callback) {
        var result = {
                hasViolation: false,
                messages: []
            },
            metaSets = filterPointerRules(meta).sets,
            checkPromises = [],
            setNames = core.getSetNames(node);

        checkPromises = setNames.map(function (setName) {
            var metaSet = metaSets[setName],
                memberPaths;
            if (!metaSet) {
                if (core.getValidAspectNames(node).indexOf(setName) > -1) {

                    // TODO: Should the Aspects be checked too?
                    return Q({
                        hasViolation: false
                    });
                } else {
                    var crossCuts = core.getRegistry(node, 'CrossCuts') || [],
                        i;

                    // The 'CrossCuts' is a constant from client/js/RegistryKeys.js

                    for (i = 0; i < crossCuts.length; i += 1) {
                        if (crossCuts[i].SetID === setName) {
                            i = -1;
                            break;
                        }
                    }

                    if (i === -1) {
                        // TODO: Should the CrossCuts be checked too?
                        return Q({
                            hasViolation: false
                        });
                    } else {
                        return Q({
                            hasViolation: true,
                            messages: ['Illegal set "' + setName + '".']
                        });
                    }
                }
            } else {
                memberPaths = core.getMemberPaths(node, setName);
                return loadNodes(core, node, memberPaths)
                    .then(function (nodes) {
                        return checkNodeTypesAndCardinality(core, node, nodes, metaSet, '"' + setName + '"-members');
                    });
            }
        });

        return Q.all(checkPromises)
            .then(function (results) {
                results.forEach(function (res) {
                    if (res.hasViolation) {
                        result.hasViolation = true;
                        result.messages = result.messages.concat(res.messages);
                    }
                });

                return result;
            }).nodeify(callback);
    }

    function checkChildrenRules(meta, core, node, callback) {
        return core.loadChildren(node)
            .then(function (nodes) {
                return checkNodeTypesAndCardinality(core, node, nodes, meta.children, 'children');
            })
            .nodeify(callback);
    }

    function checkAttributeRules(meta, core, node) {
        var result = {
                hasViolation: false,
                messages: []
            },
            names = core.getAttributeNames(node),
            validNames = core.getValidAttributeNames(node),
            i;

        for (i = 0; i < names.length; i++) {
            if (validNames.indexOf(names[i]) !== -1) {
                if (meta.attributes[names[i]].readonly === true && core.getOwnAttribute(node, names[i]) !== undefined &&
                    core.isMetaNode(node) === false) {
                    result.messages.push('Read-only attribute "' + names[i] +
                        '" value has been set for a non-meta node!');
                    result.hasViolation = true;
                }

                try {
                    if (!core.isValidAttributeValueOf(node, names[i], core.getAttribute(node, names[i]))) {
                        result.hasViolation = true;
                        result.messages.push('Attribute "' + names[i] + '" has invalid value "' +
                            core.getAttribute(node, names[i]) + '".');
                    }
                } catch (e) {
                    if (e.message.indexOf('Invalid regular expression') > -1) {
                        result.messages.push('Invalid regular expression defined for attribute "' + names[i] + '"!');
                        result.hasViolation = true;
                    } else {
                        throw e;
                    }
                }
            } else {
                result.hasViolation = true;
                result.messages.push('Illegal attribute "' + names[i] + '".');
            }
        }

        return Q(result);
    }

    /**
     *
     * @param core
     * @param node
     * @param [callback]
     * @returns {Q.Promise}
     */
    function checkNode(core, node, callback) {
        var result = {
                hasViolation: false,
                messages: [],
                message: ''
            },
            meta;

        if (core.getPath(node) === '' || core.isLibraryRoot(node)) {
            // Do not check the meta-rules for the root-node or library-roots.
            return Q(result);
        }

        meta = core.getJsonMeta(node);

        return Q.all([
            checkPointerRules(meta, core, node),
            checkSetRules(meta, core, node),
            checkChildrenRules(meta, core, node),
            checkAttributeRules(meta, core, node)
        ])
            .then(function (results) {
                var i;
                for (i = 0; i < results.length; i += 1) {
                    if (results[i].hasViolation === true) {
                        result.hasViolation = true;
                        result.messages = result.messages.concat(results[i].messages);
                    }
                }

                result.message = result.messages.join(' ');
                return result;
            })
            .nodeify(callback);
    }

    /**
     * Checks that the meta-nodes and their definitions are consistent w.r.t.
     * - Meta name collisions.
     * - Referencing nodes outside of the meta.
     * - Duplicate definitions from mixins.
     * - Collisions between set names and pointers/aspects
     * - Invalid regular expression for attributes
     * - Invalid min/max for attributes
     * - Invalid set/pointer/attribute/aspect/constraint names
     * @param core
     * @param node - any node in tree to be checked
     */
    function checkMetaConsistency(core, node) {
        var metaNodes = core.getAllMetaNodes(node),
            names = {},
            result = [],
            isPointer,
            i,
            key,
            path,
            metaNode,
            metaName,
            setNames,
            pointerNames,
            aspectNames,
            childPaths,
            ownMetaJson;

        function isTypeOfAny(node, paths) {
            var i,
                metaNode;

            for (i = 0; i < paths.length; i += 1) {
                metaNode = metaNodes[paths[i]];
                if (metaNode && core.isTypeOf(node, metaNode)) {
                    return true;
                }
            }

            return false;
        }

        function getUnderScoreError(metaName, path, key, type) {
            return {
                severity: 'error',
                message: metaName + ' defines ' + type + ' [' + key + '] starting with an underscore ("_").',
                description: 'Such relations/properties in the models are considered private and can ' +
                'collied with reserved properties.',
                hint: 'Remove/rename it.',
                path: path,
                relatedPaths: []
            };
        }

        function getReservedNameError(metaName, path, key, type) {
            return {
                severity: 'error',
                message: metaName + ' defines ' + type + ' [' + key + '] which is a reserved name.',
                description: 'Such relations/properties in the models can lead to collisions resulting in unexpected' +
                ' behavior.',
                hint: 'Remove/rename it.',
                path: path,
                relatedPaths: []
            };
        }

        function getMixinError(mixinError) {
            return {
                severity: mixinError.severity,
                message: mixinError.message,
                description: 'Mixin violations makes it hard to see which definition is used.',
                hint: mixinError.hint,
                path: path,
                relatedPaths: mixinError.collisionPaths || []
            };
        }

        for (path in metaNodes) {
            metaNode = metaNodes[path];
            metaName = core.getFullyQualifiedName(metaNode);
            ownMetaJson = core.getOwnJsonMeta(metaNode);
            setNames = core.getValidSetNames(metaNode);
            pointerNames = core.getValidPointerNames(metaNode);
            aspectNames = core.getValidAspectNames(metaNode);
            childPaths = core.getValidChildrenPaths(metaNode);

            //Patch the ownMetaJson
            ownMetaJson.attributes = ownMetaJson.attributes || {};
            ownMetaJson.children = ownMetaJson.children || {};
            ownMetaJson.pointers = ownMetaJson.pointers || {};
            ownMetaJson.aspects = ownMetaJson.aspects || {};
            ownMetaJson.constraints = ownMetaJson.constraints || {};

            // Check for name duplication.
            if (typeof names[metaName] === 'string') {
                result.push({
                    severity: 'error',
                    message: 'Duplicate name among meta-nodes [' + metaName + ']',
                    description: 'Non-unique meta names makes it hard to reason about the meta-model',
                    hint: 'Rename one of the objects',
                    path: path,
                    relatedPaths: [names[metaName]]
                });
            } else {
                names[metaName] = path;
            }

            // Get the mixin errors.
            result = result.concat(core.getMixinErrors(metaNode).map(getMixinError));

            if (ownMetaJson.children.items) {
                for (i = 0; i < ownMetaJson.children.items.length; i += 1) {
                    if (!metaNodes[ownMetaJson.children.items[i]]) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines containment of a node that is not part of the meta.',
                            description: 'All defined meta-relations should be between meta-nodes.',
                            hint: 'Locate the related node, add it to the meta and remove the containment definition.',
                            path: path,
                            relatedPaths: [ownMetaJson.children.items[i]]
                        });
                    }
                }
            }

            for (key in ownMetaJson.pointers) {
                isPointer = ownMetaJson.pointers[key].max === 1;

                for (i = 0; i < ownMetaJson.pointers[key].items.length; i += 1) {
                    if (!metaNodes[ownMetaJson.pointers[key].items[i]]) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines a ' + (isPointer ? 'pointer' : 'set') + ' [' + key + '] ' +
                            'where the ' + (isPointer ? 'target' : 'member') + ' is not part of the meta.',
                            description: 'All defined meta-relations should be between meta-nodes.',
                            hint: 'Locate the related node, add it to the meta and remove the ' +
                            (isPointer ? 'pointer' : 'set') + ' definition.',
                            path: path,
                            relatedPaths: [ownMetaJson.pointers[key].items[i]]
                        });
                    }
                }

                if (isPointer) {
                    if (setNames.indexOf(key) > -1) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines a pointer [' + key + '] colliding with a set definition.',
                            description: 'Pointer and set definitions share the same namespace.',
                            hint: 'Remove/rename one of them.',
                            path: path,
                            relatedPaths: ownMetaJson.pointers[key].items
                        });
                    }

                    if (key === CONSTANTS.BASE_POINTER || key === CONSTANTS.MEMBER_RELATION) {
                        result.push(getReservedNameError(metaName, path, key, 'a pointer'));
                    }
                } else {
                    if (pointerNames.indexOf(key) > -1) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines a set [' + key + '] colliding with a pointer definition.',
                            description: 'Pointer and set definitions share the same namespace.',
                            hint: 'Remove/rename one of them.',
                            path: path,
                            relatedPaths: ownMetaJson.pointers[key].items
                        });
                    }

                    if (aspectNames.indexOf(key) > -1) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines a set [' + key + '] colliding with an aspect definition.',
                            description: 'Sets and aspects share the same name-space.',
                            hint: 'Remove/rename one of them.',
                            path: path,
                            relatedPaths: ownMetaJson.pointers[key].items
                        });
                    }

                    if (key === CONSTANTS.OVERLAYS_PROPERTY) {
                        result.push(getReservedNameError(metaName, path, key, 'a set'));
                    }
                }

                if (key[0] === '_') {
                    result.push(getUnderScoreError(metaName, path, key, isPointer ? 'a pointer' : 'a set'));
                }
            }

            for (key in ownMetaJson.aspects) {
                for (i = 0; i < ownMetaJson.aspects[key].length; i += 1) {
                    if (!metaNodes[ownMetaJson.aspects[key][i]]) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines an aspect [' + key + '] where a member is not part of' +
                            ' the meta.',
                            description: 'All defined meta-relations should be between meta-nodes.',
                            hint: 'Remove the item from the aspect.',
                            path: path,
                            relatedPaths: [ownMetaJson.aspects[key][i]]
                        });
                    } else if (isTypeOfAny(metaNodes[ownMetaJson.aspects[key][i]], childPaths) === false) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines an aspect [' + key + '] where a member does not have a ' +
                            'containment definition.',
                            description: 'All defined meta-relations should be between meta-nodes.',
                            hint: 'Remove the item from the aspect or add a containment definition.',
                            path: path,
                            relatedPaths: [ownMetaJson.aspects[key][i]]
                        });
                    }
                }

                if (setNames.indexOf(key) > -1) {
                    result.push({
                        severity: 'error',
                        message: metaName + ' defines an aspect [' + key + '] colliding with a set definition.',
                        description: 'Sets and aspects share the same name-space.',
                        hint: 'Remove the aspect and create a new one.',
                        path: path,
                        relatedPaths: []
                    });
                }

                if (key === CONSTANTS.OVERLAYS_PROPERTY) {
                    result.push(getReservedNameError(metaName, path, key, 'an aspect'));
                }

                if (key[0] === '_') {
                    result.push(getUnderScoreError(metaName, path, key, 'an aspect'));
                }
            }

            for (key in ownMetaJson.attributes) {
                if (ownMetaJson.attributes[key].hasOwnProperty('regexp')) {
                    try {
                        new RegExp(ownMetaJson.attributes[key].regexp);
                    } catch (err) {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines an invalid regular expression for the attribute [' + key +
                            '], "' + ownMetaJson.attributes[key].regexp + '".',
                            description: 'Invalid properties can lead to unexpected results in the models.',
                            hint: 'Edit the regular expression for the attribute.',
                            path: path,
                            relatedPaths: []
                        });
                    }
                }

                if (ownMetaJson.attributes[key].type === CONSTANTS.ATTRIBUTE_TYPES.INTEGER ||
                    ownMetaJson.attributes[key].type === CONSTANTS.ATTRIBUTE_TYPES.FLOAT) {

                    if (ownMetaJson.attributes[key].hasOwnProperty('min') &&
                        typeof ownMetaJson.attributes[key].min !== 'number') {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines an invalid min value for the attribute [' + key +
                            ']. The type is not a number but "' + typeof ownMetaJson.attributes[key].min + '".',
                            description: 'Invalid properties can lead to unexpected results in the models.',
                            hint: 'Edit the min value for the attribute.',
                            path: path,
                            relatedPaths: []
                        });
                    }

                    if (ownMetaJson.attributes[key].hasOwnProperty('max') &&
                        typeof ownMetaJson.attributes[key].max !== 'number') {
                        result.push({
                            severity: 'error',
                            message: metaName + ' defines an invalid max value for the attribute [' + key +
                            ']. The type is not a number but "' + typeof ownMetaJson.attributes[key].max + '".',
                            description: 'Invalid properties can lead to unexpected results in the models.',
                            hint: 'Edit the max value for the attribute.',
                            path: path,
                            relatedPaths: []
                        });
                    }
                }

                // This cannot happen since _s are filtered out.
                if (key[0] === '_') {
                    result.push(getUnderScoreError(metaName, path, key, 'an attribute'));
                }
            }

            // for (key in ownMetaJson.constraints) {
            //     // Any checking on constraints?
            // }
        }

        return result;
    }

    return {
        checkNode: checkNode,
        checkMetaConsistency: checkMetaConsistency
    };
});