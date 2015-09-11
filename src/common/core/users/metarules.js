/*globals define*/

/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q'], function (Q) {
    'use strict';

    function loadNode(core, nodePath) {
        var deferred = new Q.defer(),
            rootNode = core.getRoot();

        core.loadByPath(rootNode, nodePath, function (err, node) {
            if (err) {
                deferred.reject(new Error(err));
            } else if (core.isEmpty(node)) {
                deferred.reject(new Error('Given nodePath does not exist "' + nodePath + '"!'));
            } else {
                deferred.resolve(node);
            }
        });

        return deferred.promise;
    }

    function loadNodes(core, nodePaths) {
        var i,
            loadPromises = [];

        for (i = 0; i < nodePaths.length; i += 1) {
            loadPromises.push(loadNode(core, nodePaths[i]));
        }

        return Q.all(loadPromises);
    }

    function filterPointerRules(meta) {
        var result = {
                pointers: {},
                sets: {}
            },
            pointerNames = Object.keys(meta.pointers);

        pointerNames.map(function (name) {
            if (meta.pointers[name].min !== undefined) {
                // These are single pointers (e.g. connection pointers)
                result.pointers[name] = meta.pointers[name];
            } else {
                // These are actual sets
                result.sets[name] = meta.pointers[name];
            }
        });

        return result;
    }

    function getMatchedItemIndices(core, node, items) {
        var i,
            indices = [];

        function isInstanceOf(basePath, node) {
            var result = false,
                baseNode;
            baseNode = node;

            while (baseNode) {
                if (core.getPath(baseNode) === basePath) {
                    result = true;
                    break;
                }
                baseNode = core.getBase(baseNode);
            }

            return result;
        }

        for (i = 0; i < items.length; i += 1) {
            if (isInstanceOf(items[i], node)) {
                indices.push(i);
            }
        }

        return indices;
    }

    function checkPointerRules(meta, core, node, callback) {
        //TODO currently there is no quantity check
        var result = {
                hasViolation: false,
                message: ''
            },
            pointerNames = core.getPointerNames(node),
            validNames = core.getValidPointerNames(node);

        function checkPointer(name) {
            var deferred = Q.defer();

            if (validNames.indexOf(name) === -1) {
                result.hasViolation = true;
                result.message += 'Invalid pointer "' + name + '"\n';
                deferred.resolve();
            } else {
                core.loadPointer(node, name, function (err, target) {
                    if (err || !target) {
                        result.hasViolation = true;
                        result.message += 'error during pointer ' + name + ' load\n';
                    } else if (!core.isValidTargetOf(target, node, name)) {
                        result.hasViolation = true;
                        result.message += 'Target [' + core.getPath(target) + '] of pointer "' + name +
                            '" is invalid\n';
                    }
                    deferred.resolve();
                });
            }

            return deferred.promise;
        }

        if (validNames.indexOf('base') === -1) {
            validNames.push('base'); // Base pointer is always a valid pointer.
        }

        return Q.all(pointerNames.map(checkPointer))
            .nodeify(callback);
    }

    function checkSetRules(meta, core, node, callback) {
        var result = {
                hasViolation: false,
                message: ''
            },
            metaSets = filterPointerRules(meta).sets,
            members = [],
            setNames = core.getSetNames(node);

        console.log('\n###### ' + core.getAttribute(node, 'name') + ' ######\n');
        console.log(filterPointerRules(meta));
        console.log(setNames);

        function checkSet(setName, metaSet) {
            var memberPaths = core.getMemberPaths(node, setName, metaSet);

            return loadNodes(core, memberPaths)
                .then(function (members) {

                });
        }

        setNames.map(function (setName) {
            var metaSet = metaSets[setName],
                memberPaths;
            if (!metaSet) {
                result.hasViolation = true;
                result.message += 'Invalid set "' + setName + '"\n';
            } else {
                members.push(checkSet(setName, metaSet));
            }
        });

        return Q(result).nodeify(callback);
    }

    function checkChildrenRules(meta, core, node, callback) {
        var result = {
                hasViolation: false,
                message: ''
            },
            deferred = Q.defer(),
            childCount = [],
            index;

        function typeIndexOfChild(typePathsArray, childNode) {
            var index = -1;

            while (childNode && index === -1) {
                index = typePathsArray.indexOf(core.getPath(childNode));
                childNode = core.getBase(childNode);
            }
            //TODO: This is not correct!!
            return index;
        }

        core.loadChildren(node, function (err, children) {
            var i;
            if (err) {
                result.message += 'error during loading of node\'s children: ' + err + '\n';
                result.hasViolation = true;
                deferred.resolve(result);
                return;
            }

            //global count check
            //min
            if (meta.children.min && meta.children.min !== -1) {
                if (children.length < meta.children.min) {
                    result.hasViolation = true;
                    result.message += 'node has fewer children than needed ( ' + children.length +
                        ' < ' + meta.children.min + ' )\n';
                }
            }
            //max
            if (meta.children.max && meta.children.max !== -1) {
                if (children.length > meta.children.max) {
                    result.hasViolation = true;
                    result.message += 'Node has more children than allowed ( ' + children.length +
                        ' > ' + meta.children.max + ' )\n';
                }
            }

            //typedCounts
            for (i = 0; i < meta.children.items.length; i += 1) {
                childCount.push(0);
            }
            for (i = 0; i < children.length; i++) {
                index = typeIndexOfChild(meta.children.items, children[i]);
                if (index === -1) {
                    result.hasViolation = true;
                    result.message += 'child ' + core.getGuid(children[i]) + ' is from prohibited type\n';
                } else {
                    childCount[index]++;
                }
            }
            for (i = 0; i < meta.children.items.length; i++) {
                //min
                if (meta.children.minItems[i] !== -1) {
                    if (meta.children.minItems[i] > childCount[i]) {
                        result.hasViolation = true;
                        result.message += 'Too few type ' + meta.children.items[i] + ' children ( ' + childCount[i] +
                            ' < ' + meta.children.minItems[i] + ' )\n';
                    }
                }
                //max
                if (meta.children.maxItems[i] !== -1) {
                    if (meta.children.maxItems[i] < childCount[i]) {
                        result.hasViolation = true;
                        result.message += 'Too many type ' + meta.children.items[i] + ' children ( ' + childCount[i] +
                            ' > ' + meta.children.maxItems[i] + ' )\n';
                    }
                }
            }

            deferred.resolve(result);
        });

        return deferred.promise.nodeify(callback);
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
                if (!core.isValidAttributeValueOf(node, names[i], core.getAttribute(node, names[i]))) {
                    result.hasViolation = true;
                    result.message += 'attribute ' + names[i] + ' has invalid value\n';
                }
            } else {
                result.hasViolation = true;
                result.message += 'node has an undefined attribute: ' + names[i];
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
    function checkMetaRules(core, node, callback) {
        var result = {
                hasViolation: false,
                message: ''
            },
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
    }

    return checkMetaRules;
});