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
        var deferred = Q.defer(),
            nodePath = core.getPath(node),
            visitFn;

        function visitForAttribute(visited, next) {
            if (parameters.excludeOriginNode === true && core.getPath(visited) === nodePath) {
                next(null);
                return;
            }

            if (core.getValidAttributeNames(visited).indexOf(parameters.newName) === -1 ||
                core.getOwnAttributeNames(visited).indexOf(parameters.oldName) === -1) {
                next(null);
                return;
            }

            if (core.getPath(core.getAttributeDefinitionOwner(visited, parameters.newName)) === nodePath) {
                core.renameAttribute(visited, parameters.oldName, parameters.newName);
            }
            next(null);
        }

        function visitForPointer(visited, next) {
            var definitionInfo,
                deferred = Q.defer();

            if (parameters.excludeOriginNode === true && core.getPath(visited) === nodePath) {
                return Q.resolve(null).nodeify(next);
            }

            if (core.getValidPointerNames(visited).indexOf(parameters.newName) === -1 ||
                core.getOwnPointerPath(visited, parameters.oldName) === undefined) {
                return Q.resolve(null).nodeify(next);
            }

            core.loadPointer(visited, parameters.oldName)
                .then(function (target) {
                    if (target !== null) {
                        definitionInfo = core.getPointerDefinitionInfo(visited, parameters.newName, target);

                        if (definitionInfo.ownerPath === nodePath &&
                            definitionInfo.targetPath === parameters.targetPath) {
                            core.renamePointer(visited, parameters.oldName, parameters.newName);
                        }
                    } else if (core.getPath(visited) === nodePath) {
                        core.renamePointer(visited, parameters.oldName, parameters.newName);
                    }
                    deferred.resolve(null);
                })
                .catch(deferred.reject);

            return deferred.promise.nodeify(next);
        }

        function visitForSet(visited, next) {
            var definitionInfo,
                deferred = Q.defer();

            if (parameters.excludeOriginNode === true && core.getPath(visited) === nodePath) {
                return Q.resolve(null).nodeify(next);
            }

            if (core.getValidSetNames(visited).indexOf(parameters.newName) === -1 ||
                core.getOwnSetNames(visited, parameters.oldName).indexOf(parameters.oldName) === -1) {
                return Q.resolve(null).nodeify(next);
            }

            core.loadOwnMembers(visited, parameters.oldName)
                .then(function (members) {
                    var i,
                        ownMemberPaths = core.getOwnMemberPaths(visited, parameters.oldName);

                    for (i = 0; i < members.length; i += 1) {
                        if (ownMemberPaths.indexOf(core.getPath(members[i])) !== -1) {
                            definitionInfo = core.getSetDefinitionInfo(visited, parameters.newName, members[i]);
                            if (definitionInfo.ownerPath === nodePath &&
                                definitionInfo.targetPath === parameters.targetPath) {
                                core.moveMember(visited, core.getPath(members[i]), parameters.oldName, parameters.newName);
                            }
                        }
                    }

                    if (members.length === 0) {
                        core.renameSet(visited, parameters.oldName, parameters.newName);
                    }

                    deferred.resolve(null);
                    return;
                })
                .catch(deferred.reject);

            return deferred.promise.nodeify(next);
        }

        function visitForAspect(visited, next) {
            var definitionInfo,
                deferred = Q.defer();

            if (parameters.excludeOriginNode === true && core.getPath(visited) === nodePath) {
                next(null);
                return;
            }

            if (core.getValidAspectNames(visited).indexOf(parameters.newName) === -1 ||
                core.getOwnSetNames(visited).indexOf(parameters.oldName) === -1) {
                next(null);
                return;
            }

            core.loadMembers(visited, parameters.oldName)
                .then(function (members) {
                    var i;

                    for (i = 0; i < members.length; i += 1) {
                        definitionInfo = core.getAspectDefinitionInfo(visited, parameters.newName, members[i]);
                        if (definitionInfo.ownerPath === nodePath &&
                            definitionInfo.targetPath === parameters.targetPath) {
                            core.moveMember(visited, core.getPath(members[i]), parameters.oldName, parameters.newName);
                        }
                    }
                    deferred.resolve(null);
                    return;
                })
                .catch(deferred.reject);

            return deferred.promise.nodeify(next);
        }

        switch (parameters.type) {
            case 'attribute':
                visitFn = visitForAttribute;
                break;
            case 'pointer':
                visitFn = visitForPointer;
                break;
            case 'set':
                visitFn = visitForSet;
                break;
            case 'aspect':
                visitFn = visitForAspect;
                break;
            default:
                return Q.reject(new Error('Invalid parameter misses a correct type for renaming.')).nodeify(callback);
        }

        core.traverse(core.getRoot(node), {excludeRoot: true, stopOnError: true}, visitFn)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function _areTheTwoConceptsConnected(core, conceptOne, conceptTwo) {
        var allMetaNodes,
            path;

        if (core.isTypeOf(conceptOne, conceptTwo)) {
            return true;
        }

        if (core.isTypeOf(conceptTwo, conceptOne)) {
            return true;
        }

        allMetaNodes = core.getAllMetaNodes(conceptOne);
        for (path in allMetaNodes) {
            if (core.isTypeOf(allMetaNodes[path], conceptOne) && core.isTypeOf(allMetaNodes[path], conceptTwo)) {
                return true;
            }
        }
        return false;
    }

    function _collectedBasicAffectedTypes(core, node, type, name) {
        var affectedTypes = [],
            allMetaNodes = core.getAllMetaNodes(node),
            checkerFunc,
            check = function (node) {
                return checkerFunc(node).indexOf(name) !== -1;
            },
            path;

        switch (type) {
            case 'attribute':
                checkerFunc = core.getOwnValidAttributeNames;
                break;
            case 'pointer':
                checkerFunc = core.getOwnValidPointerNames;
                break;
            case 'set':
                checkerFunc = core.getOwnValidSetNames;
                break;
            case 'aspect':
                checkerFunc = core.getOwnValidAspectNames;
                break;
            default:
                return null;
        }

        for (path in allMetaNodes) {
            if (_areTheTwoConceptsConnected(core, node, allMetaNodes[path]) && check(allMetaNodes[path])) {
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

        switch (type) {
            case 'attribute':
                toArrayFunc = core.getOwnValidAttributeNames;
                break;
            case 'pointer':
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

    function propagateMetaConceptRename(core, typeNodes, type, oldName, newName, callback) {
        var deferred = Q.defer(),
            hasDataFn,
            hasData = function (node) {
                return hasDataFn(node).indexOf(oldName) !== -1;
            },
            renameFn,
            visitFn = function (visitedNode, next) {
                if (_instanceOfAny(core, visitedNode, typeNodes) && hasData(visitedNode)) {
                    renameFn(visitedNode, oldName, newName);
                }
                next(null);
            },
            i;

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
            case 'aspect':
                renameFn = core.renameSet;
                hasDataFn = core.getOwnSetNames;
                break;
            default:
                return Q.reject(new Error('Unkown rule type [' + type + ']')).nodeify(callback);
        }

        // check if the affected types are in some library as they cannot be changed...
        for (i = 0; i < typeNodes.length; i += 1) {
            if (core.isLibraryElement(typeNodes[i])) {
                return Q.reject(new Error('Concept originates in some library therefore cannot be renamed!'))
                    .nodeify(callback);
            }
        }
        core.traverse(core.getRoot(typeNodes[0]), {excludeRoot: true, stopOnError: true}, visitFn)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function metaConceptRename(core, node, type, oldName, newName, callback) {
        var deferred = Q.defer(),
            affectedTypes = _collectedBasicAffectedTypes(core, node, type, oldName),
            i;

        if (affectedTypes === null) {
            return Q.reject(new Error('Unkown rule type [' + type + ']')).nodeify(callback);
        }

        // check if the affected types are in some library as they cannot be changed...
        for (i = 0; i < affectedTypes.length; i += 1) {
            if (core.isLibraryElement(affectedTypes[i])) {
                return Q.reject(new Error('Concept originates in some library therefore cannot be renamed!'))
                    .nodeify(callback);
            }
        }

        propagateMetaConceptRename(core, affectedTypes, type, oldName, newName)
            .then(function () {
                metaConceptRenameInMeta(core, node, type, oldName, newName);
                return deferred.resolve();
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    return {
        propagateMetaDefinitionRename: propagateMetaDefinitionRename,
        metaConceptRename: metaConceptRename,
        metaConceptRenameInMeta: metaConceptRenameInMeta,
        propagateMetaConceptRename: propagateMetaConceptRename
    };
});