/*globals define*/
/*jshint node:true, browser:true, newcap:false*/
/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q'], function (Q) {
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

    function checkNodeTypesAndCardinality(core, nodes, subMetaRules, checkTypeText) {
        var matches = [],
            i,
            j,
            result = {
                hasViolation: false,
                message: ''
            },
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
                result.message += checkTypeText + ' ' + core.getGuid(nodes[i]) +
                    ' is not an allowed ' + checkTypeText + ' type\n';
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
                result.message += 'node has fewer ' + checkTypeText + '(s) than needed ( ' +
                    matches[i] + ' < ' + subMetaRules.minItems[i] + ' )\n';
            } else if (subMetaRules.maxItems[i] > -1 && subMetaRules.maxItems[i] < matches[i]) {
                result.hasViolation = true;
                result.message += 'node has more ' + checkTypeText + '(s) than needed ( ' +
                    matches[i] + ' < ' + subMetaRules.maxItems[i] + ' )\n';
            }
        }

        return result;
    }

    // Checker functions for pointers, sets, containment and attributes.
    function checkPointerRules(meta, core, node, callback) {
        var result = {
                hasViolation: false,
                message: ''
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
                    // TODO: Do we need to check anythin on the base?
                    return {hasViolation: false};
                } else {
                    return Q({
                        hasViolation: true,
                        message: 'Invalid pointer "' + pointerName + '"\n'
                    });
                }
            } else {
                pointerPath = core.getPointerPath(node, pointerName);
                if (pointerPath !== null) {
                    pointerPaths.push(pointerPath);
                }
                return loadNodes(core, node, pointerPaths)
                    .then(function (nodes) {
                        return checkNodeTypesAndCardinality(core, nodes, metaPointer, pointerName + ' target');
                    });
            }
        });

        return Q.all(checkPromises)
            .then(function (results) {
                results.forEach(function (res) {
                    if (res.hasViolation) {
                        result.hasViolation = true;
                        result.message += res.message;
                    }
                });

                return result;
            }).nodeify(callback);
    }

    function checkSetRules(meta, core, node, callback) {
        var result = {
                hasViolation: false,
                message: ''
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
                            message: 'Invalid set "' + setName + '"\n'
                        });
                    }
                }
            } else {
                memberPaths = core.getMemberPaths(node, setName);
                return loadNodes(core, node, memberPaths)
                    .then(function (nodes) {
                        return checkNodeTypesAndCardinality(core, nodes, metaSet, setName + ' set member');
                    });
            }
        });

        return Q.all(checkPromises)
            .then(function (results) {
                results.forEach(function (res) {
                    if (res.hasViolation) {
                        result.hasViolation = true;
                        result.message += res.message;
                    }
                });

                return result;
            }).nodeify(callback);
    }

    function checkChildrenRules(meta, core, node, callback) {
        return loadNodes(core, node, core.getChildrenPaths(node))
            .then(function (nodes) {
                return checkNodeTypesAndCardinality(core, nodes, meta.children, 'child');
            })
            .nodeify(callback);
    }

    function checkAttributeRules(meta, core, node) {
        var result = {
                hasViolation: false,
                message: ''
            },
            names = core.getAttributeNames(node),
            validNames = core.getValidAttributeNames(node),
            i;

        for (i = 0; i < names.length; i++) {
            if (validNames.indexOf(names[i]) !== -1) {
                try {
                    if (!core.isValidAttributeValueOf(node, names[i], core.getAttribute(node, names[i]))) {
                        result.hasViolation = true;
                        result.message += 'attribute "' + names[i] + '" has invalid value (' +
                            core.getAttribute(node, names[i]) + ')\n';
                    }
                } catch (e) {
                    if (e.message.indexOf('Invalid regular expression') > -1) {
                        result.message = 'Invalid regular expression defined in the meta model for attribute "' +
                            names[i] + '"!';
                        result.hasViolation = true;
                    } else {
                        throw e;
                    }
                }
            } else {
                result.hasViolation = true;
                result.message += 'node has an attribute that is not part of any meta node "' + names[i] + '"\n';
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
    return function (core, node, callback) {
        var result = {
                hasViolation: false,
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
                        result.message += results[i].message;
                    }
                }
                return result;
            })
            .nodeify(callback);
    };
});