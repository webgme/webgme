/*globals define, console*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function gmeNodeSetter(logger, state, saveRoot, storeNode, printCoreError) {

        function _logDeprecated(oldFn, newFn, isGetter, comment) {
            var typeToUse = isGetter ? 'gmeNode.' : 'gmeClient.',
                commentStr = comment ? comment : '';

            console.warn('"gmeClient.' + oldFn + '" is deprecated and will eventually be removed, use "' +
                typeToUse + newFn + '" instead.' + commentStr);
        }

        function _getNode(path) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                return state.nodes[path].node;
            }
        }

        function _setAttrAndRegistry(node, desc) {
            var name;
            desc = desc || {};

            if (desc.attributes) {
                for (name in desc.attributes) {
                    if (desc.attributes.hasOwnProperty(name)) {
                        state.core.setAttribute(node, name, desc.attributes[name]);
                    }
                }
            }

            if (desc.registry) {
                for (name in desc.registry) {
                    if (desc.registry.hasOwnProperty(name)) {
                        state.core.setRegistry(node, name, desc.registry[name]);
                    }
                }
            }
        }

        function _copyMultipleNodes(paths, parentNode) {
            var i,
                tempContainer,
                tempFrom,
                tempTo,
                helpArray,
                subPathArray,
                result = {},
                childrenRelIds,
                childNode,
                newNode,
                checkPaths = function () {
                    var i,
                        result = true;

                    for (i = 0; i < paths.length; i += 1) {
                        result = result && (state.nodes[paths[i]] &&
                            typeof state.nodes[paths[i]].node === 'object');
                    }

                    return result;
                };

            // In order to preserve the relationships between the copied nodes. These steps are take:
            // 1) A temporary container tempFrom is created.
            // 2) The nodes are moved to tempFrom.
            // 3) tempFrom is copied (including the children) to tempTo
            // 4) The nodes from tempFrom are moved back to their parent(s).
            // 5) The nodes from tempTo are moved to the targeted parent.
            // 6) tempFrom and tempTo are removed.

            if (parentNode && checkPaths()) {
                helpArray = {};
                subPathArray = {};

                // 0) create a container for the tempNodes to preserve the relids of the original nodes
                tempContainer = state.core.createNode({
                    parent: state.core.getRoot(parentNode),
                    base: state.core.getTypeRoot(state.nodes[paths[0]].node)
                });

                // 1) creating the 'from' object
                tempFrom = state.core.createNode({
                    parent: tempContainer
                });

                // 2) and moving every node under it
                for (i = 0; i < paths.length; i += 1) {
                    helpArray[paths[i]] = {};
                    helpArray[paths[i]].origparent = state.core.getParent(state.nodes[paths[i]].node);
                    helpArray[paths[i]].tempnode = state.core.moveNode(state.nodes[paths[i]].node, tempFrom);
                    subPathArray[state.core.getRelid(helpArray[paths[i]].tempnode)] = paths[i];
                    delete state.nodes[paths[i]];
                }

                // 3) do the copy
                tempTo = state.core.copyNode(tempFrom, tempContainer);

                // 4) moving back the temporary source
                for (i = 0; i < paths.length; i += 1) {
                    helpArray[paths[i]].node = state.core.moveNode(helpArray[paths[i]].tempnode,
                        helpArray[paths[i]].origparent);
                    storeNode(helpArray[paths[i]].node);
                }

                // 5) gathering the destination nodes and move them to targeted parent
                childrenRelIds = state.core.getChildrenRelids(tempTo);

                for (i = 0; i < childrenRelIds.length; i += 1) {
                    if (subPathArray[childrenRelIds[i]]) {
                        childNode = state.core.getChild(tempTo, childrenRelIds[i]);
                        newNode = state.core.moveNode(childNode, parentNode);
                        storeNode(newNode);
                        result[subPathArray[state.core.getRelid(childNode)]] = newNode;
                    } else {
                        state.logger.error(new Error('Unexpected error when copying nodes!'));
                    }
                }

                // 6) clean up the temporary container nodes.
                state.core.deleteNode(tempContainer);
            }

            return result;
        }

        function setAttribute(path, name, value, msg) {
            var error,
                node = _getNode(path);

            if (node) {
                error = state.core.setAttribute(node, name, value);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setAttribute(' + path + ',' + name + ',' + JSON.stringify(value) + ')');
            }
        }

        function delAttribute(path, name, msg) {
            var error,
                node = _getNode(path);

            if (node) {
                error = state.core.delAttribute(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delAttribute(' + path + ',' + name + ')');
            }
        }

        function setRegistry(path, name, value, msg) {
            var error,
                node = _getNode(path);

            if (node) {
                error = state.core.setRegistry(node, name, value);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setRegistry(' + path + ',' + name + ',' + JSON.stringify(value) + ')');
            }
        }

        function delRegistry(path, name, msg) {
            var error,
                node = _getNode(path);

            if (node) {
                error = state.core.delRegistry(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delRegistry(' + path + ',' + name + ')');
            }
        }

        function copyNode(path, parentPath, desc, msg) {
            var node = _getNode(path),
                parentNode = _getNode(parentPath),
                newNode, newPath;

            if (node && parentNode) {
                newNode = state.core.copyNode(node, parentNode);

                if (newNode instanceof Error) {
                    printCoreError(newNode);
                    return;
                }

                _setAttrAndRegistry(newNode, desc);
                newPath = storeNode(newNode);

                saveRoot(msg || 'copyNode(' + path + ', ' + parentPath + ', ' + JSON.stringify(desc) + ')');
                return newPath;
            }
        }

        function copyMoreNodes(parameters, msg) {
            var pathsToCopy = [],
                parentNode = _getNode(parameters.parentId),
                nodePath,
                newNodes;

            if (parentNode) {
                for (nodePath in parameters) {
                    if (parameters.hasOwnProperty(nodePath) && nodePath !== 'parentId') {
                        pathsToCopy.push(nodePath);
                    }
                }

                msg = msg || 'copyMoreNodes(' + JSON.stringify(pathsToCopy) + ',' + parameters.parentId + ')';

                if (pathsToCopy.length < 1) {
                    // empty on purpose
                } else if (pathsToCopy.length === 1) {
                    copyNode(pathsToCopy[0], parameters.parentId, parameters[pathsToCopy[0]], msg);
                } else {
                    newNodes = _copyMultipleNodes(pathsToCopy, parentNode);

                    if (newNodes instanceof Error) {
                        printCoreError(newNodes);
                        return;
                    }

                    for (nodePath in newNodes) {
                        if (newNodes.hasOwnProperty(nodePath) && parameters[nodePath]) {
                            _setAttrAndRegistry(newNodes[nodePath], parameters[nodePath]);
                        }
                    }

                    saveRoot(msg);
                }
            } else {
                state.logger.error('wrong parameters for copy operation - denied -');
            }
        }

        function moveMoreNodes(parameters, msg) {
            var pathsToMove = [],
                returnParams = {},
                i,
                newNode;

            for (i in parameters) {
                if (parameters.hasOwnProperty(i)) {
                    if (i !== 'parentId') {
                        pathsToMove.push(i);
                    }
                }
            }

            if (pathsToMove.length > 0 &&
                typeof parameters.parentId === 'string' &&
                state.nodes[parameters.parentId] &&
                typeof state.nodes[parameters.parentId].node === 'object') {
                for (i = 0; i < pathsToMove.length; i += 1) {
                    if (state.nodes[pathsToMove[i]] &&
                        typeof state.nodes[pathsToMove[i]].node === 'object') {

                        newNode = state.core.moveNode(state.nodes[pathsToMove[i]].node,
                            state.nodes[parameters.parentId].node);
                        returnParams[pathsToMove[i]] = state.core.getPath(newNode);
                        _setAttrAndRegistry(newNode, parameters[pathsToMove[i]]);
                        delete state.nodes[pathsToMove[i]];
                        storeNode(newNode, true);
                    }
                }
            }

            saveRoot(msg || 'moveMoreNodes(' + JSON.stringify(returnParams) + ')');
            return returnParams;
        }

        function createChildren(parameters, msg) {
            //TODO we also have to check out what is happening with the sets!!!
            var result = {},
                paths = [],
                nodes = [],
                node,
                parent = state.nodes[parameters.parentId].node,
                names, i, j, index, pointer,
                newChildren = [],
                relations = [];

            //to allow 'meaningfull' instantiation of multiple objects
            // we have to recreate the internal relations - except the base
            paths = Object.keys(parameters);
            paths.splice(paths.indexOf('parentId'), 1);
            for (i = 0; i < paths.length; i++) {
                node = state.nodes[paths[i]].node;
                nodes.push(node);
                pointer = {};
                names = state.core.getPointerNames(node);
                index = names.indexOf('base');
                if (index !== -1) {
                    names.splice(index, 1);
                }

                for (j = 0; j < names.length; j++) {
                    index = paths.indexOf(state.core.getPointerPath(node, names[j]));
                    if (index !== -1) {
                        pointer[names[j]] = index;
                    }
                }
                relations.push(pointer);
            }

            //now the instantiation
            for (i = 0; i < nodes.length; i++) {
                newChildren.push(state.core.createNode({parent: parent, base: nodes[i]}));
            }

            //now for the storage and relation setting
            for (i = 0; i < paths.length; i++) {
                _setAttrAndRegistry(newChildren[i], parameters[paths[i]]);

                //relations
                names = Object.keys(relations[i]);
                for (j = 0; j < names.length; j++) {
                    state.core.setPointer(newChildren[i], names[j], newChildren[relations[i][names[j]]]);
                }

                //store
                result[paths[i]] = storeNode(newChildren[i]);

            }

            msg = msg || 'createChildren(' + JSON.stringify(result) + ')';
            saveRoot(msg);
            return result;
        }

        function deleteNode(path, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.deleteNode(node);
                saveRoot(msg || 'deleteNode(' + path + ')');
            }
        }

        function deleteNodes(paths, msg) {
            var didDelete = false,
                i,
                node;

            for (i = 0; i < paths.length; i++) {
                node = _getNode(paths[i]);
                if (node) {
                    state.core.deleteNode(node);
                    didDelete = true;
                }
            }

            if (didDelete) {
                saveRoot(msg || 'deleteNodes(' + paths + ')');
            }
        }

        function createNode(parameters, desc, msg) {
            var parentNode = _getNode(parameters.parentId),
                baseNode = _getNode(parameters.baseId),
                newNode,
                newID;

            if (parentNode) {
                newNode = state.core.createNode({
                    parent: parentNode,
                    base: baseNode,
                    guid: parameters.guid,
                    relid: parameters.relid
                });

                if (newNode instanceof Error) {
                    printCoreError(newNode);
                    return;
                }

                // By default the position will be {100, 100}
                desc = desc || {};
                desc.registry = desc.registry || {};
                desc.registry.position = desc.registry.position || {};
                desc.registry.position.x = desc.registry.position.x || 100;
                desc.registry.position.y = desc.registry.position.y || 100;

                _setAttrAndRegistry(newNode, desc);

                storeNode(newNode);
                newID = state.core.getPath(newNode);
                saveRoot(msg || 'createNode(' + parameters.parentId + ',' + parameters.baseId + ',' + newID + ')');
            }

            return newID;
        }

        function setPointer(path, name, target, msg) {
            var node = _getNode(path),
                targetNode;

            if (node) {
                if (target === null) {
                    state.core.setPointer(node, name, target);
                } else {
                    targetNode = _getNode(target);
                    state.core.setPointer(node, name, targetNode);
                }

                saveRoot(msg || 'setPointer(' + path + ',' + name + ',' + target + ')');
            }
        }

        function delPointer(path, name, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.delPointer(node, name);
                saveRoot(msg || 'delPointer(' + path + ',' + name + ')');
            }
        }

        // Mixed argument methods - START
        function addMember(path, memberPath, setId, msg) {
            // FIXME: This will have to break due to switched arguments
            var node = _getNode(path),
                memberNode = _getNode(memberPath);

            if (node && memberNode) {
                state.core.addMember(node, setId, memberNode);
                saveRoot(msg || 'addMember(' + path + ',' + memberPath + ',' + setId + ')');
            }
        }

        function removeMember(path, memberPath, setId, msg) {
            // FIXME: This will have to break due to switched arguments (sort of)
            var node = _getNode(path);

            if (node) {
                state.core.delMember(node, setId, memberPath);
                saveRoot(msg || 'removeMember(' + path + ',' + memberPath + ',' + setId + ')');
            }
        }

        function setMemberAttribute(path, memberPath, setId, name, value, msg) {
            // FIXME: This will have to break due to switched arguments
            var node = _getNode(path);

            if (node) {
                state.core.setMemberAttribute(node, setId, memberPath, name, value);
                saveRoot(msg || 'setMemberAttribute(' + path + ',' + memberPath + ',' + setId + ',' + name +
                    ',' + value + ')');
            }
        }

        function delMemberAttribute(path, memberPath, setId, name, msg) {
            // FIXME: This will have to break due to switched arguments
            var node = _getNode(path);

            if (node) {
                state.core.delMemberAttribute(node, setId, memberPath, name);
                saveRoot(msg || 'delMemberAttribute(' + path + ',' + memberPath + ',' + setId + ',' + name + ')');
            }
        }

        function setMemberRegistry(path, memberPath, setId, name, value, msg) {
            // FIXME: This will have to break due to switched arguments
            var node = _getNode(path);

            if (node) {
                state.core.setMemberRegistry(node, setId, memberPath, name, value);
                saveRoot(msg || 'setMemberRegistry(' + path + ',' + memberPath + ',' + setId + ',' + name + ',' +
                    JSON.stringify(value) + ')');
            }
        }

        function delMemberRegistry(path, memberPath, setId, name, msg) {
            // FIXME: This will have to break due to switched arguments
            var node = _getNode(path);

            if (node) {
                state.core.delMemberRegistry(node, setId, memberPath, name);
                saveRoot(msg || 'delMemberRegistry(' + path + ',' + memberPath + ',' + setId + ',' + name + ')');
            }
        }

        // Mixed argument methods - END

        function setSetAttribute(path, setName, attrName, attrValue, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.setSetAttribute(node, setName, attrName, attrValue);
                saveRoot(msg || 'setSetAttribute(' + path + ',' + setName + ',' + attrName + ',' +
                    JSON.stringify(attrValue) + ')');
            }
        }

        function delSetAttribute(path, setName, attrName, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.delSetAttribute(node, setName, attrName);
                saveRoot(msg || 'delSetAttribute(' + path + ',' + setName + ',' + attrName + ')');
            }
        }

        function setSetRegistry(path, setName, regName, regValue, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.setSetRegistry(node, setName, regName, regValue);
                saveRoot(msg || 'setSetRegistry(' + path + ',' + setName + ',' + regName + ',' +
                    JSON.stringify(regValue) + ')');
            }
        }

        function delSetRegistry(path, setName, regName, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.delSetRegistry(node, setName, regName);
                saveRoot(msg || 'delSetRegistry(' + path + ',' + setName + ',' + regName + ')');
            }
        }

        function createSet(path, setId, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.createSet(node, setId);
                saveRoot(msg || 'createSet(' + path + ',' + setId + ')');
            }
        }

        function delSet(path, setId, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delSet(node, setId);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delSet(' + path + ',' + setId + ')');
            }
        }

        function setBase(path, basePath, msg) {
            var node = _getNode(path),
                baseNode = _getNode(basePath),
                error;

            if (node && baseNode) {
                error = state.core.setBase(node, baseNode);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setBase(' + path + ',' + basePath + ')');
            }
        }

        function moveNode(path, parentPath, msg) {
            var node = _getNode(path),
                parentNode = _getNode(parentPath),
                movedPath;

            if (node && parentNode) {
                movedPath = storeNode(state.core.moveNode(node, parentNode));
                saveRoot(msg || 'moveNode(' + path + ',' + parentPath + ')');
            }

            return movedPath;
        }

        function delBase(path, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.setBase(node, null);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delBase(' + path + ')');
            }
        }

        // META functions
        function getMeta(path) {
            var node = _getNode(path),
                meta = {children: {}, attributes: {}, pointers: {}, aspects: {}};

            if (!node) {
                return null;
            }

            meta = state.core.getJsonMeta(node);

            return meta;
        }

        function setMeta(path, meta, msg) {
            var node = _getNode(path),
                otherNode,
                name,
                i,
                error;

            if (node) {
                state.core.clearMetaRules(node);

                //children
                if (meta.children && meta.children.items && meta.children.items.length > 0) {
                    error = state.core.setChildrenMetaLimits(node, meta.children.min, meta.children.max);
                    if (error instanceof Error) {
                        printCoreError(error);
                        return;
                    }

                    for (i = 0; i < meta.children.items.length; i += 1) {
                        otherNode = _getNode(meta.children.items[i]);
                        if (otherNode) {
                            error = state.core.setChildMeta(node,
                                otherNode,
                                meta.children.minItems[i],
                                meta.children.maxItems[i]);

                            if (error instanceof Error) {
                                printCoreError(error);
                                return;
                            }
                        }
                    }
                }

                //attributes
                if (meta.attributes) {
                    for (i in meta.attributes) {
                        error = state.core.setAttributeMeta(node, i, meta.attributes[i]);
                        if (error instanceof Error) {
                            printCoreError(error);
                            return;
                        }
                    }
                }

                //pointers and sets
                if (meta.pointers) {
                    for (name in meta.pointers) {
                        if (meta.pointers[name].items && meta.pointers[name].items.length > 0) {
                            error = state.core.setPointerMetaLimits(node,
                                name,
                                meta.pointers[name].min,
                                meta.pointers[name].max);

                            if (error instanceof Error) {
                                printCoreError(error);
                                return;
                            }

                            for (i = 0; i < meta.pointers[name].items.length; i += 1) {
                                otherNode = _getNode(meta.pointers[name].items[i]);
                                if (otherNode) {
                                    error = state.core.setPointerMetaTarget(node,
                                        name,
                                        otherNode,
                                        meta.pointers[name].minItems[i],
                                        meta.pointers[name].maxItems[i]);
                                    if (error instanceof Error) {
                                        printCoreError(error);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }

                //aspects
                if (meta.aspects) {
                    for (name in meta.aspects) {
                        for (i = 0; i < meta.aspects[name].length; i += 1) {
                            otherNode = _getNode(meta.aspects[name][i]);
                            if (otherNode) {
                                error = state.core.setAspectMetaTarget(node, name, otherNode);
                                if (error instanceof Error) {
                                    printCoreError(error);
                                    return;
                                }
                            }
                        }
                    }
                }

                //constraints
                if (meta.constraints) {
                    for (name in meta.constraints) {
                        if (typeof meta.constraints[name] === 'object') {
                            error = state.core.setConstraint(node, name, meta.constraints[name]);
                            if (error instanceof Error) {
                                printCoreError(error);
                                return;
                            }
                        }
                    }
                }

                saveRoot(msg || 'setMeta(' + path + ')');
            }
        }

        function addMixin(path, mixinPath, msg) {
            var error,
                node = _getNode(path);

            if (node) {
                error = state.core.addMixin(node, mixinPath);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'addMixin(' + path + ',' + mixinPath + ')');
            }
        }

        function delMixin(path, mixinPath, msg) {
            var error,
                node = _getNode(path);

            if (node) {
                error = state.core.delMixin(node, mixinPath);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg, 'delMixin(' + path + ',' + mixinPath + ')');
            }
        }

        function setChildrenMetaAttribute(path, attrName, value, msg) {
            if (attrName !== 'items') {
                var rawMeta = getMeta(path);
                rawMeta.children[attrName] = value;
                setMeta(path, rawMeta, msg);
            }
        }

        function setChildMeta(path, childPath, min, max, msg) {
            var node = _getNode(path),
                childNode = _getNode(childPath),
                error;

            if (childNode && node) {
                error = state.core.setChildMeta(node, childNode, min, max);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setChildMeta(' + path + ', ' + childPath + ',' + min || -1 + ',' + max || -1 + ')');
            }
        }

        function setChildrenMeta(path, meta, msg) {
            var node = _getNode(path),
                target,
                error,
                i;

            if (meta && meta.items && node) {
                for (i = 0; i < meta.items.length; i += 1) {
                    target = _getNode(meta.items[i].id);
                    if (target) {
                        error = state.core.setChildMeta(node, target, meta.items[i].min, meta.items[i].max);
                        if (error instanceof Error) {
                            printCoreError(error);
                            return;
                        }
                    }
                }

                error = state.core.setChildrenMetaLimits(node, meta.min, meta.max);

                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.setChildrenMeta(' + path + ')');
            }
        }

        function delChildMeta(path, typeId, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delChildMeta(node, typeId);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delChildMeta(' + path + ', ' + typeId + ')');
            }
        }

        function setAttributeMeta(path, name, schema, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.setAttributeMeta(node, name, schema);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setAttributeMeta(' + path + ', ' + name + ')');
            }
        }

        function delAttributeMeta(path, name, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delAttributeMeta(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delAttributeMeta(' + path + ', ' + name + ')');
            }
        }

        function setPointerMetaTarget(path, name, targetPath, min, max, msg) {
            var node = _getNode(path),
                targetNode = _getNode(targetPath),
                error;

            if (node && targetNode) {
                error = state.core.setPointerMetaTarget(node, name, targetNode, min, max);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setPointerMetaTarget(' + path + ', ' + name + ', ' + targetPath + ',' +
                    min || -1 + ',' + max || -1 + ')');
            }
        }

        function delPointerMetaTarget(path, name, targetPath, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delPointerMetaTarget(node, name, targetPath);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delPointerMetaTarget(' + path + ', ' + name + ', ' + targetPath + ')');
            }
        }

        function delPointerMeta(path, name, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delPointerMeta(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delPointerMeta(' + path + ', ' + name + ')');
            }
        }

        function setPointerMeta(path, name, meta, msg) {
            var node = _getNode(path),
                target,
                error,
                i;

            if (meta && meta.items && node) {
                for (i = 0; i < meta.items.length; i += 1) {
                    target = _getNode(meta.items[i].id);
                    if (target) {
                        error = state.core.setPointerMetaTarget(node,
                            name,
                            target,
                            meta.items[i].min,
                            meta.items[i].max);

                        if (error instanceof Error) {
                            printCoreError(error);
                            return;
                        }
                    }
                }

                error = state.core.setPointerMetaLimits(node, name, meta.min, meta.max);

                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setPointerMeta(' + path + ', ' + name + ')');
            }
        }

        function setAspectMetaTarget(path, name, targetPath, msg) {
            var node = _getNode(path),
                targetNode = _getNode(targetPath),
                error;

            if (node && targetNode) {
                error = state.core.setAspectMetaTarget(node, name, targetNode);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'setAspectMetaTarget(' + path + ', ' + name + ',' + targetPath + ')');
            }
        }

        function delAspectMetaTarget(path, name, targetPath, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delAspectMetaTarget(node, name, targetPath);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delAspectMeta(' + path + ', ' + name + ')');
            }
        }

        function setAspectMetaTargets(path, name, targetPaths, msg) {
            var node = _getNode(path),
                i,
                target,
                error;

            if (node) {
                error = state.core.delAspectMeta(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                for (i = 0; i < targetPaths.length; i += 1) {
                    target = _getNode(targetPaths[i]);
                    if (target) {
                        error = state.core.setAspectMetaTarget(node, name, target);
                        if (error instanceof Error) {
                            printCoreError(error);
                            return;
                        }
                    }
                }

                saveRoot(msg || 'setAspectMetaTargets(' + path + ', ' + name + ',' + JSON.stringify(targetPaths) + ')');
            }
        }

        function delAspectMeta(path, name, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delAspectMeta(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'delAspectMeta(' + path + ', ' + name + ')');
            }
        }

        // Deprecated meta-getters from core/users/meta
        // TODO: These should be removed at next version bump.

        function isTypeOf(path, typePath) {
            var node = _getNode(path),
                typeNode = _getNode(typePath);

            if (node && typeNode) {
                return state.core.isTypeOf(node, typeNode);
            }

            return false;
        }

        function isValidTarget(path, name, targetPath) {
            var node = _getNode(path),
                target = _getNode(targetPath);

            if (node && target) {
                return state.core.isValidTargetOf(target, node, name);
            }

            return false;
        }

        function filterValidTarget(path, name, paths) {
            var targets = [];

            for (var i = 0; i < paths.length; i++) {
                if (isValidTarget(path, name, paths[i])) {
                    targets.push(paths[i]);
                }
            }

            return targets;
        }

        function getValidTargetTypes(path, name) {
            var node = _getNode(path),
                meta, i,
                targets = [];

            if (node) {
                meta = state.core.getPointerMeta(node, name);

                for (i in meta) {
                    if (i !== 'min' && i !== 'max') {
                        targets.push(i);
                    }
                }
            }

            return targets;
        }

        function getOwnValidTargetTypes(path, name) {
            var node = _getNode(path),
                ownMeta;

            if (node) {
                ownMeta = state.core.getOwnJsonMeta(node);
                ownMeta.pointers = ownMeta.pointers || {};
                ownMeta.pointers[name] = ownMeta.pointers[name] || {};

                return ownMeta.pointers[name].items || [];
            }

            return [];
        }

        function _getValidTargetItems(path, name, ownOnly) {
            var node = _getNode(path),
                meta,
                paths,
                items = [],
                i;

            if (node) {
                meta = state.core.getPointerMeta(node, name);
                paths = ownOnly ? state.core.getOwnJsonMeta(node) : state.core.getJsonMeta(node);
                if (paths && paths.pointers && paths.pointers[name]) {
                    paths = paths.pointers[name].items || [];
                } else {
                    paths = [];
                }

                if (meta && paths.length > 0) {
                    delete meta.min;
                    delete meta.max;
                    for (i in meta) {
                        if (paths.indexOf(i) !== -1) {
                            items.push({
                                id: i,
                                min: meta[i].min === -1 ? undefined : meta[i].min,
                                max: meta[i].max === -1 ? undefined : meta[i].max
                            });
                        }
                    }

                    return items;
                }
            }

            return null;
        }

        function getValidTargetItems(path, name) {
            return _getValidTargetItems(path, name, false);
        }

        function getOwnValidTargetItems(path, name) {
            return _getValidTargetItems(path, name, true);
        }

        function isValidChild(parentPath, path) {
            var node = _getNode(path),
                parentNode = _getNode(parentPath);

            if (node && parentNode) {
                return state.core.isValidChildOf(node, parentNode);
            }

            return false;
        }

        function getValidChildrenTypes(path) {
            var node = _getNode(path);

            if (node) {
                return state.core.getValidChildrenPaths(node);
            }

            return [];
        }

        function getValidAttributeNames(path) {
            var node = _getNode(path);

            if (node) {
                return state.core.getValidAttributeNames(node);
            }

            return [];
        }

        function getOwnValidAttributeNames(path) {
            var node = _getNode(path);

            if (node) {
                return state.core.getOwnValidAttributeNames(node);
            }

            return [];
        }

        function getPointerMeta(path, name) {
            var node = _getNode(path),
                meta,
                i,
                pointerMeta;

            if (node) {
                meta = state.core.getPointerMeta(node, name);

                if (meta) {
                    pointerMeta = {min: meta.min, max: meta.max, items: []};

                    for (i in meta) {
                        if (i !== 'min' && i !== 'max') {
                            pointerMeta.items.push({
                                id: i,
                                min: meta[i].min === -1 ? undefined : meta[i].min,
                                max: meta[i].max === -1 ? undefined : meta[i].max
                            });
                        }
                    }

                    return pointerMeta;
                }
            }

            return null;
        }

        function getAttributeSchema(path, name) {
            var node = _getNode(path);

            if (node) {
                return state.core.getAttributeMeta(node, name);
            }

            return;
        }

        function getMetaAspectNames(path) {
            var node = _getNode(path);

            if (node) {
                return state.core.getValidAspectNames(node);
            }

            return [];
        }

        function getOwnMetaAspectNames(path) {
            var node = _getNode(path);

            if (node) {
                return state.core.getOwnValidAspectNames(node);
            }

            return [];
        }

        function getMetaAspect(path, name) {
            var node = _getNode(path),
                meta;

            if (node) {
                meta = state.core.getAspectMeta(node, name);

                if (meta) {
                    return {items: meta};
                }
            }

            return null;
        }

        function hasOwnMetaRules(path) {
            var node = _getNode(path),
                ownMeta, key;

            if (node) {
                ownMeta = state.core.getOwnJsonMeta(node);

                //children
                if (ownMeta.children && ownMeta.children.items && ownMeta.children.items.length > 0) {
                    return true;
                }

                //pointers
                for (key in ownMeta.pointers || {}) {
                    return true;
                }

                //attributes
                for (key in ownMeta.attributes || {}) {
                    return true;
                }
                //aspects
                for (key in ownMeta.aspects || {}) {
                    return true;
                }

                //mixins
                if (ownMeta.mixins && ownMeta.mixins.length > 0) {
                    return true;
                }
            }

            return false;
        }

        function getChildrenMeta(path) {
            //the returned object structure is : {'min':0,'max':0,'items':[{'id':path,'min':0,'max':0},...]}
            var node = _getNode(path),
                meta, i,
                childrenMeta = {items: []};

            if (node) {
                meta = state.core.getChildrenMeta(node);
                if (meta) {
                    childrenMeta = {min: meta.min, max: meta.max, items: []};
                    for (i in meta) {
                        if (i !== 'min' && i !== 'max') {
                            childrenMeta.items.push({
                                id: i,
                                min: meta[i].min === -1 ? undefined : meta[i].min,
                                max: meta[i].max === -1 ? undefined : meta[i].max
                            });
                        }
                    }
                }

                return childrenMeta;
            }

            return null;
        }

        function getChildrenMetaAttribute(path/*, attrName*/) {
            var childrenMeta = getChildrenMeta(path);
            if (childrenMeta) {
                return childrenMeta.attrName;
            }
            return null;
        }

        function getValidChildrenItems(path) {
            var childrenMeta = getChildrenMeta(path);
            if (childrenMeta) {
                return childrenMeta.items;
            }
            return null;
        }

        function getOwnValidChildrenTypes(path) {
            var node = _getNode(path),
                ownMeta;

            if (node) {
                ownMeta = state.core.getOwnJsonMeta(node);

                if (ownMeta && ownMeta.children && ownMeta.children.items) {
                    return ownMeta.children.items;
                }
            }

            return [];
        }

        function getAspectTerritoryPattern(path, name) {
            var aspect = getMetaAspect(path, name);

            if (aspect !== null) {
                aspect.children = 1; //TODO now it is fixed, maybe we can change that in the future
                return aspect;
            }
            return null;
        }

        return {
            setAttribute: setAttribute,
            setAttributes: function () {
                _logDeprecated('setAttributes', 'setAttribute');
                setAttribute.apply(null, arguments);
            },

            delAttribute: delAttribute,
            delAttributes: function () {
                _logDeprecated('delAttributes', 'delAttribute');
                delAttribute.apply(null, arguments);
            },
            setRegistry: setRegistry,
            delRegistry: delRegistry,

            copyNode: copyNode,
            copyMoreNodes: copyMoreNodes,
            moveNode: moveNode,
            moveMoreNodes: moveMoreNodes,
            deleteNode: deleteNode,
            deleteNodes: deleteNodes,
            delMoreNodes: function () {
                _logDeprecated('delMoreNodes', 'deleteNodes');
                deleteNodes.apply(null, arguments);
            },
            createNode: createNode,
            createChild: function (parameters, msg) {
                return createNode(parameters, {
                    registry: {
                        position: parameters.position
                    }
                }, msg);
            },
            createChildren: createChildren,

            setPointer: setPointer,
            makePointer: function () {
                _logDeprecated('makePointer', 'setPointer');
                setPointer.apply(null, arguments);
            },
            delPointer: delPointer,
            deletePointer: delPointer,

            addMember: addMember,
            removeMember: removeMember,
            setMemberAttribute: setMemberAttribute,
            delMemberAttribute: delMemberAttribute,
            setMemberRegistry: setMemberRegistry,
            delMemberRegistry: delMemberRegistry,
            setSetAttribute: setSetAttribute,
            delSetAttribute: delSetAttribute,
            setSetRegistry: setSetRegistry,
            delSetRegistry: delSetRegistry,
            createSet: createSet,
            delSet: delSet,
            deleteSet: delSet,

            setBase: setBase,
            delBase: delBase,

            // --- Meta ---
            setMeta: setMeta,

            // containment
            setChildrenMeta: setChildrenMeta,
            setChildrenMetaAttribute: setChildrenMetaAttribute,
            setChildMeta: setChildMeta,
            updateValidChildrenItem: function (path, newTypeObj, msg) {
                _logDeprecated('updateValidChildrenItem(path, newTypeObj, msg)',
                    'setChildMeta(path, childPath, min, max, msg)');
                newTypeObj = newTypeObj || {};
                setChildMeta(path, newTypeObj.id, newTypeObj.min, newTypeObj.max, msg);
            },

            delChildMeta: delChildMeta,
            removeValidChildrenItem: function () {
                _logDeprecated('removeValidChildrenItem', 'delChildMeta');
                delChildMeta.apply(null, arguments);
            },

            // attribute
            setAttributeMeta: setAttributeMeta,
            setAttributeSchema: function () {
                _logDeprecated('setAttributeSchema', 'setAttributeMeta');
                setAttributeMeta.apply(null, arguments);
            },
            delAttributeMeta: delAttributeMeta,
            removeAttributeSchema: function () {
                _logDeprecated('removeAttributeSchema', 'delAttributeMeta');
                delAttributeMeta.apply(null, arguments);
            },

            // pointer
            setPointerMeta: setPointerMeta,
            setPointerMetaTarget: setPointerMetaTarget,
            updateValidTargetItem: function (path, name, targetObj, msg) {
                _logDeprecated('updateValidTargetItem(path, name, targetObj, msg)',
                    'setPointerMetaTarget(path, name, targetPath, childPath, min, max, msg)');
                targetObj = targetObj || {};
                setPointerMetaTarget(path, name, targetObj.id, targetObj.min, targetObj.max, msg);
            },

            delPointerMetaTarget: delPointerMetaTarget,
            removeValidTargetItem: function () {
                _logDeprecated('removeValidTargetItem', 'delPointerMetaTarget');
                delPointerMetaTarget.apply(null, arguments);
            },
            delPointerMeta: delPointerMeta,
            deleteMetaPointer: function () {
                _logDeprecated('deleteMetaPointer', 'delPointerMeta');
                delPointerMeta.apply(null, arguments);
            },

            // aspect
            setAspectMetaTarget: setAspectMetaTarget,
            setAspectMetaTargets: setAspectMetaTargets,
            setMetaAspect: function () {
                _logDeprecated('setMetaAspect', 'setAspectMetaTargets');
                setAspectMetaTargets.apply(null, arguments);
            },
            delAspectMetaTarget: delAspectMetaTarget,
            delAspectMeta: delAspectMeta,
            deleteMetaAspect: function () {
                _logDeprecated('deleteMetaAspect', 'delAspectMeta');
                delAspectMeta.apply(null, arguments);
            },

            // mixin
            addMixin: addMixin,
            delMixin: delMixin,

            // Deprecated meta-getters
            // TODO: These should be moved to Util/GMEConcepts or removed.
            getMeta: function () {
                _logDeprecated('getMeta(path)', 'getJsonMeta()', true);
                return getMeta.apply(null, arguments);
            },
            isTypeOf: function () {
                //_logDeprecated('isTypeOf(path, typePath)', 'isTypeOf(typePath)', true);
                return isTypeOf.apply(null, arguments);
            },
            isValidTarget: function () {
                _logDeprecated('isValidTarget(path, name, targetPath)', 'isValidTargetOf(sourcePath, name)', true);
                return isValidTarget.apply(null, arguments);
            },
            filterValidTarget: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return filterValidTarget.apply(null, arguments);
            },
            getValidTargetTypes: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getValidTargetTypes.apply(null, arguments);
            },
            getOwnValidTargetTypes: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getOwnValidTargetTypes.apply(null, arguments);
            },
            getValidTargetItems: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getValidTargetItems.apply(null, arguments);
            },
            getOwnValidTargetItems: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getOwnValidTargetItems.apply(null, arguments);
            },
            getPointerMeta: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getPointerMeta.apply(null, arguments);
            },
            isValidChild: function () {
                _logDeprecated('isValidChild(path, childPath)', 'isValidChildOf(parentPath)', true);
                return isValidChild.apply(null, arguments);
            },
            getValidChildrenTypes: function () {
                _logDeprecated('getValidChildrenTypes(path)', 'getValidChildrenIds()', true);
                return getValidChildrenTypes.apply(null, arguments);
            },
            getValidAttributeNames: function () {
                _logDeprecated('getValidAttributeNames(path)', 'getValidAttributeNames()', true);
                return getValidAttributeNames.apply(null, arguments);
            },
            getOwnValidAttributeNames: function () {
                _logDeprecated('getOwnValidAttributeNames(path)', 'getOwnValidAttributeNames()', true);
                return getOwnValidAttributeNames.apply(null, arguments);
            },
            getAttributeSchema: function () {
                _logDeprecated('getAttributeSchema(path, name)', 'getAttributeMeta(name)', true);
                return getAttributeSchema.apply(null, arguments);
            },
            getMetaAspectNames: function () {
                _logDeprecated('getMetaAspectNames(path)', 'getValidAspectNames()', true);
                return getMetaAspectNames.apply(null, arguments);
            },
            getOwnMetaAspectNames: function () {
                _logDeprecated('getOwnMetaAspectNames(path)', 'getOwnValidAspectNames()', true);
                return getOwnMetaAspectNames.apply(null, arguments);
            },
            getMetaAspect: function () {
                _logDeprecated('getMetaAspect(path, name)', 'getAspectMeta(name)', true,
                    ' Returned value is of different structure! {items: meta} vs meta');
                return getMetaAspect.apply(null, arguments);
            },
            hasOwnMetaRules: function () {
                // TODO: Should we add a method on the core??
                return hasOwnMetaRules.apply(null, arguments);
            },
            getChildrenMeta: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getChildrenMeta.apply(null, arguments);
            },
            getChildrenMetaAttribute: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getChildrenMetaAttribute.apply(null, arguments);
            },
            getValidChildrenItems: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getValidChildrenItems.apply(null, arguments);
            },
            getOwnValidChildrenTypes: function () {
                // TODO: Should we add a method on the core similar to getValidChildrenTypes?
                return getOwnValidChildrenTypes.apply(null, arguments);
            },
            getAspectTerritoryPattern: function () {
                // TODO: Should we add a method in GMEConcepts or remove this guy?
                return getAspectTerritoryPattern.apply(null, arguments);
            }
        };
    }

    return gmeNodeSetter;
});
