/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function gmeNodeSetter(logger, state, saveRoot, storeNode, printCoreError) {

        function _getNode(path) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                return state.nodes[path];
            }
        }

        function _setAttrAndRegistry(node, desc) {
            var name;

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

        function setAttributes(path, name, value, msg) {
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

        function delAttributes(path, name, msg) {
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
                        newNode = state.core.moveNode(childNode, parent);
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

        function copyMoreNodes(parameters, msg) {
            var pathsToCopy = [],
                parentNode = _getNode(parameters.parentId),
                orgNode,
                nodePath,
                newNodes,
                newNode;

            if (parentNode) {
                for (nodePath in parameters) {
                    if (parameters.hasOwnProperty(nodePath) && nodePath !== 'parentId') {
                        pathsToCopy.push(nodePath);
                    }
                }

                msg || 'copyMoreNodes(' + JSON.stringify(pathsToCopy) + ',' + parameters.parentId + ')'

                if (pathsToCopy.length < 1) {
                    // empty on purpose
                } else if (pathsToCopy.length === 1) {
                    orgNode = _getNode(pathsToCopy[0]);

                    if (orgNode) {
                        newNode = state.core.copyNode(orgNode, parentNode);

                        if (newNode instanceof Error) {
                            printCoreError(newNode);
                            return;
                        }

                        storeNode(newNode);
                        _setAttrAndRegistry(newNode, parameters[pathsToCopy[0]]);
                        saveRoot(msg);
                    }
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

        function delMoreNodes(paths, msg) {
            if (state.core) {
                for (var i = 0; i < paths.length; i++) {
                    if (state.nodes[paths[i]] && typeof state.nodes[paths[i]].node === 'object') {
                        state.core.deleteNode(state.nodes[paths[i]].node);
                        //delete state.nodes[paths[i]];
                    }
                }
                msg = msg || 'delMoreNodes(' + paths + ')';
                saveRoot(msg);
            }
        }

        function createChild(parameters, msg) {
            var parentNode = _getNode(parameters.parentId),
                baseNode = _getNode(parameters.baseId),
                child,
                newID,
                error;

            if (parentNode) {
                child = state.core.createNode({
                    parent: parentNode,
                    base: baseNode,
                    guid: parameters.guid,
                    relid: parameters.relid
                });

                if (child instanceof Error) {
                    printCoreError(child);
                    return;
                }

                if (parameters.position) {
                    error = state.core.setRegistry(child,
                        'position',
                        {
                            x: parameters.position.x || 100,
                            y: parameters.position.y || 100
                        });

                    if (error instanceof Error) {
                        printCoreError(error);
                        return;
                    }
                } else {
                    error = state.core.setRegistry(child, 'position', {x: 100, y: 100});
                    if (error instanceof Error) {
                        printCoreError(error);
                        return;
                    }
                }

                storeNode(child);
                newID = state.core.getPath(child);
                saveRoot(msg || 'createChild(' + parameters.parentId + ',' + parameters.baseId + ',' + newID + ')');
            }

            return newID;
        }

        function makePointer(path, name, to, msg) {
            var node = _getNode(path),
                target;

            if (node) {
                if (to === null) {
                    state.core.setPointer(node, name, to);
                } else {
                    target = _getNode(to);
                    state.core.setPointer(node, name, target);
                }

                saveRoot(msg || 'setPointer(' + path + ',' + name + ',' + to + ')');
            }
        }

        function delPointer(path, name, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.deletePointer(node, name);
                saveRoot(msg || 'delPointer(' + path + ',' + name + ')');
            }
        }

        //MGAlike - set functions
        function addMember(path, memberPath, setId, msg) {
            var node = _getNode(path),
                memberNode = _getNode(memberPath);

            if (node && memberNode) {
                state.core.addMember(node, setId, memberNode);
                saveRoot(msg || 'addMember(' + path + ',' + memberPath + ',' + setId + ')');
            }
        }

        function removeMember(path, memberPath, setId, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.delMember(node, setId, memberPath);
                saveRoot(msg || 'removeMember(' + path + ',' + memberPath + ',' + setId + ')');
            }
        }

        function setMemberAttribute(path, memberPath, setId, name, value, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.setMemberAttribute(node, setId, memberPath, name, value);
                saveRoot(msg || 'setMemberAttribute(' + path + ',' + memberPath + ',' + setId + ',' + name +
                    ',' + value + ')');
            }
        }

        function delMemberAttribute(path, memberPath, setId, name, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.delMemberAttribute(node, setId, memberPath, name);
                saveRoot(msg || 'delMemberAttribute(' + path + ',' + memberPath + ',' + setId + ',' + name + ')');
            }
        }

        function setMemberRegistry(path, memberPath, setId, name, value, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.setMemberRegistry(node, setId, memberPath, name, value);
                saveRoot(msg || 'setMemberRegistry(' + path + ',' + memberPath + ',' + setId + ',' + name + ',' +
                    JSON.stringify(value) + ')');
            }
        }

        function delMemberRegistry(path, memberPath, setId, name, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.delMemberRegistry(node, setId, memberPath, name);
                saveRoot(msg || 'delMemberRegistry(' + path + ',' + memberPath + ',' + setId + ',' + name + ')');
            }
        }

        function createSet(path, setId, msg) {
            var node = _getNode(path);

            if (node) {
                state.core.createSet(node, setId);
                saveRoot(msg || 'createSet(' + path + ',' + setId + ')');
            }
        }

        function deleteSet(path, setId, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.deleteSet(node, setId);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'deleteSet(' + path + ',' + setId + ')');
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
                error;

            if (node && parentNode) {
                error = state.core.moveNode(node, parentNode);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'moveBase(' + path + ',' + parentPath + ')');
            }
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

        // Meta setters
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

        function updateValidChildrenItem(path, newTypeObj, msg) {
            var node = _getNode(path),
                childNode = _getNode(newTypeObj && newTypeObj.id),
                error;

            if (childNode && node) {
                error = state.core.setChildMeta(node, childNode, newTypeObj.min, newTypeObj.max);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg ||'Meta.updateValidChildrenItem(' + path + ', ' + newTypeObj.id + ')');
            }
        }

        function removeValidChildrenItem(path, typeId, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delChildMeta(node, typeId);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.removeValidChildrenItem(' + path + ', ' + typeId + ')');
            }
        }

        function setAttributeSchema(path, name, schema, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.setAttributeMeta(node, name, schema);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.setAttributeSchema(' + path + ', ' + name + ')');
            }
        }

        function removeAttributeSchema(path, name, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delAttributeMeta(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.removeAttributeSchema(' + path + ', ' + name + ')');
            }
        }

        function updateValidTargetItem(path, name, targetObj, msg) {
            var node = _getNode(path),
                targetNode = _getNode(targetObj && targetObj.id),
                error;

            if (node && targetNode) {
                error = state.core.setPointerMetaTarget(node, name, targetNode, targetObj.min, targetObj.max);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.updateValidTargetItem(' + path + ', ' + name + ', ' + targetObj.id + ')');
            }
        }

        function removeValidTargetItem(path, name, targetId, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delPointerMetaTarget(node, name, targetId);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.removeValidTargetItem(' + path + ', ' + name + ', ' + targetId + ')');
            }
        }

        function deleteMetaPointer(path, name, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delPointerMeta(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.deleteMetaPointer(' + path + ', ' + name + ')');
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

                saveRoot(msg || 'Meta.setPointerMeta(' + path + ', ' + name + ')');
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

        function setMetaAspect(path, name, aspect, msg) {
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

                for (i = 0; i < aspect.length; i += 1) {
                    target = _getNode(aspect[i]);
                    if (target) {
                        error = state.core.setAspectMetaTarget(node, name, target);
                        if (error instanceof Error) {
                            printCoreError(error);
                            return;
                        }
                    }
                }

                saveRoot(msg || 'Meta.setMetaAspect(' + path + ', ' + name + ')');
            }
        }

        function deleteMetaAspect(path, name, msg) {
            var node = _getNode(path),
                error;

            if (node) {
                error = state.core.delAspectMeta(node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot(msg || 'Meta.deleteMetaAspect(' + path + ', ' + name + ')');
            }
        }

        return {
            setAttributes: setAttributes,
            delAttributes: delAttributes,
            setRegistry: setRegistry,
            delRegistry: delRegistry,

            copyMoreNodes: copyMoreNodes,
            moveNode: moveNode,
            moveMoreNodes: moveMoreNodes,
            delMoreNodes: delMoreNodes,
            createChild: createChild,
            createChildren: createChildren,

            makePointer: makePointer,
            setPointer: makePointer,
            delPointer: delPointer,
            deletePointer: delPointer,

            addMember: addMember,
            removeMember: removeMember,
            setMemberAttribute: setMemberAttribute,
            delMemberAttribute: delMemberAttribute,
            setMemberRegistry: setMemberRegistry,
            delMemberRegistry: delMemberRegistry,
            createSet: createSet,
            deleteSet: deleteSet,

            setBase: setBase,
            delBase: delBase,

            // --- Meta ---
            setMeta: setMeta,

            // containment
            setChildrenMeta: setChildrenMeta,
            setChildrenMetaAttribute: setChildrenMetaAttribute,
            updateValidChildrenItem: updateValidChildrenItem,
            removeValidChildrenItem: removeValidChildrenItem,

            // attribute
            setAttributeSchema: setAttributeSchema,
            removeAttributeSchema: removeAttributeSchema,

            // pointer
            setPointerMeta: setPointerMeta,
            updateValidTargetItem: updateValidTargetItem,
            removeValidTargetItem: removeValidTargetItem,
            deleteMetaPointer: deleteMetaPointer,

            // aspect
            setMetaAspect: setMetaAspect,
            deleteMetaAspect: deleteMetaAspect,

            // mixin
            addMixin: addMixin,
            delMixin: delMixin
        };
    }

    return gmeNodeSetter;
});