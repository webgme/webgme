/*globals define*/
/*jshint node:true, browser:true, newcap:false*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['q', 'common/core/constants'], function (Q, CONSTANTS) {
    'use strict';

    /**
     * Propagates a recent renaming in a meta definition of the given node. It traverses the
     * whole containment hierarchy and renames the corresponding property of every node that is
     * affected by the rename. It is important that the rename should always take place after the
     * actual definition was already changed among the meta definitions of the node.
     * @param core
     * @param node - any node in tree to be checked
     * @param parameters
     * @param [callback]
     * @returns {Q.Promise}
     */
    function propagateMetaDefinitionRename(core, node, parameters, callback) {
        function visitForAttribute(visited, next) {
            if (parameters.excludeOriginNode === true && core.getPath(visited) === core.getPath(node)) {
                next(null);
                return;
            }

            if (core.getValidAttributeNames(visited).indexOf(parameters.newName) === -1 ||
                core.getOwnAttributeNames(visited).indexOf(parameters.oldName) === -1) {
                next(null);
                return;
            }

            if (core.getPath(core.getAttributeDefinitionOwner(visited, parameters.newName)) === core.getPath(node)) {
                core.renameAttribute(visited, parameters.oldName, parameters.newName);
            }
            next(null);
        }

        function visitForPointer(visited, next) {
            var definitionInfo,
                deferred = Q.defer();

            if (parameters.excludeOriginNode === true && core.getPath(visited) === core.getPath(node)) {
                deferred.resolve(null);
                return;
            }

            if (core.getValidPointerNames(visited).indexOf(parameters.newName) === -1 ||
                core.getOwnPointerPath(visited, parameters.oldName) === undefined) {
                deferred.resolve(null);
                return;
            }

            core.loadPointer(visited, parameters.oldName)
                .then(function (target) {
                    definitionInfo = core.getPointerDefinitionInfo(visited, parameters.newName, target);
                    if (definitionInfo.sourcePath === core.getPath(node)
                        && definitionInfo.targetPath === parameters.targetPath) {
                        core.renamePointer(visited, parameters.oldName, parameters.newName);
                    }
                    deferred.resolve(null);
                    return;
                })
                .catch(function (err) {
                    deferred.resolve(null);
                });

            return deferred.promise.nodeify(next)
        }

        function visitForSet(visited, next) {
            var definitionInfo,
                deferred = Q.defer();

            if (parameters.excludeOriginNode === true && core.getPath(visited) === core.getPath(node)) {
                deferred.resolve(null);
                return;
            }

            if (core.getValidPointerNames(visited).indexOf(parameters.newName) === -1 ||
                core.getOwnPointerPath(visited, parameters.oldName) === undefined) {
                deferred.resolve(null);
                return;
            }

            core.loadMembers(visited, parameters.oldName)
                .then(function (target) {
                    definitionInfo = core.getPointerDefinitionInfo(visited, parameters.newName, target);
                    if (definitionInfo.sourcePath === core.getPath(node)
                        && definitionInfo.targetPath === parameters.targetPath) {
                        core.renamePointer(visited, parameters.oldName, parameters.newName);
                    }
                    deferred.resolve(null);
                    return;
                })
                .catch(function (err) {
                    deferred.resolve(null);
                });

            return deferred.promise.nodeify(next)
        }

        var deferred = Q.defer(),
            visitFn;

        switch (parameters.type) {
            case 'attribute':
                visitFn = visitForAttribute;
                break;
            case 'pointer':
                visitFn = visitForPointer;
                break;
            default:
                deferred.reject(new Error('Invalid parameter misses a correct type for renaming.'));
                return deferred.promise.nodeify(callback);
        }

        core.traverse(core.getRoot(node), {excludeRoot: true}, visitFn)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function _collectedBasicAffectedTypes(core, node, type, name) {
        var affectedTypes = [],
            allMetaNodes = core.getAllMetaNodes(node),
            checkerFunc,
            check = function (node) {
                return checkerFunc(node).indexOf(oldName) !== -1;
            },
            path;

        switch (type) {
            case 'attribute':
                checkerFunc = core.getValidAttributeNames;
                break;
            case 'pointer':
                checkerFunc = core.getValidPointerNames;
                break;
            case 'set':
                checkerFunc = core.getValidSetNames;
                break;
            case 'aspect':
                checkerFunc = core.getValidAspectNames;
                break;
            default:
                return null;
        }

        for (path in allMetaNodes) {
            if (core.isTypeOf(node, allMetaNodes[path]) && checkerFunc(allMetaNodes[path])) {
                affectedTypes.push(allMetaNodes[path]);
            }
        }

        return affectedTypes;
    }

    function _instanceOfAny(core, node, types) {
        var i;

        for (i = 0; i < types.length; i += 1) {
            if (core.isTypeOf(node, types[i])) {
                return true;
            }
        }

        return false;
    }

    function metaConceptRenameInMeta(core, node, type, oldName, newName) {
        var affectedTypes,
            toArrayFunc,
            allMetaNodes = core.getAllMetaNodes(node),
            checkerFunction = function (typeNode) {
                return toArrayFunc(typeNode).indexOf(oldName) !== -1;
            },
            i,
            targets,
            path;

        console.log('renaming: ', type);
        switch (type) {
            case 'attribute':
                toArrayFunc = core.getOwnValidAttributeNames;
                break;
            case 'pointer':
                console.log('we are here:', core.getOwnValidPointerNames(node));
                toArrayFunc = core.getOwnValidPointerNames;
                break;
            case 'set':
                toArrayFunc = core.getOwnValidSetNames;
                break;
            case 'aspect':
                toArrayFunc = core.getOwnValidAspectNames;
                break;
            default:
                return null;
        }

        affectedTypes = _collectedBasicAffectedTypes(core, node, type, oldName);
        if (affectedTypes === null) {
            return null;
        }

        for (path in allMetaNodes) {
            if (_instanceOfAny(core, allMetaNodes[path], affectedTypes) &&
                checkerFunction(allMetaNodes[path])) {
                switch (type) {
                    case 'attribute':
                        core.renameAttributeMeta(allMetaNodes[path], oldName, newName);
                        break;
                    case 'pointer':
                    case 'set':
                        targets = core.getOwnValidTargetPaths(allMetaNodes[path], oldName);
                        for (i = 0; i < targets.length; i += 1) {
                            core.movePointerMetaTarget(allMetaNodes[path], allMetaNodes[targets[i]], oldName, newName);
                        }
                        break;
                    case 'aspect':
                        targets = core.getOwnValidAspectTargetPaths(allMetaNodes[path], oldName);
                        for (i = 0; i < targets.length; i += 1) {
                            core.moveAspectMetaTarget(allMetaNodes[path], allMetaNodes[targets[i]], oldName, newName);
                        }
                }
            }
        }
    }

    function metaConceptRename(core, node, type, oldName, newName, callback) {
        var deferred = Q.defer(),
            affectedTypes,
            i,
            hasDataFn,
            hasData = function (node) {
                return hasDataFn(node).indexOf(oldName) !== -1;
            },
            renameFn,
            visitFn = function (visitedNode, next) {
                if (_instanceOfAny(core, visitedNode, affectedTypes) && hasData(visitedNode)) {
                    renameFn(visitedNode, oldName, newName);
                }
                next(null);
            };

        switch (type) {
            case 'attribute':
                renameFn = core.renameAttribute;
                hasDataFn = core.getOwnAttributeNames;
                break;
            case 'pointer':
                renameFn = core.renamePointer;
                hasDataFn = core.getOwnPointerNames;
                break;
            case 'set':
                renameFn = core.renameSet;
                hasDataFn = core.getOwnSetNames;
                break;
            case 'aspect':
                renameFn = core.renameAspect;
                hasDataFn = core.getOwnAspectNames;
                break;
            default:
                return Q.reject(new Error('Unkown rule type [' + type + ']')).nodeify(callback);
        }

        affectedTypes = _collectedBasicAffectedTypes(core, node, type, oldName);

        // check if the affected types are in some library as they cannot be changed...
        for (i = 0; i < affectedTypes.length; i += 1) {
            if (core.isLibraryElement(affectedTypes[i])) {
                return Q.reject(new Error('Concept originates in some library therefore cannot be renamed!'))
                    .nodeify(callback);
            }
        }
        core.traverse(core.getRoot(node), {excludeRoot: true}, visitFn)
            .then(function () {
                metaConceptRenameInMeta(core, node, type, oldName, newName);
                return deferred.resolve();
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    return {
        propagateMetaDefinitionRename: propagateMetaDefinitionRename,
        metaConceptRename: metaConceptRename
    };
});