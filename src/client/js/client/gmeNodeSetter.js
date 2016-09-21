/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function gmeNodeSetter(logger, state, saveRoot, storeNode, printCoreError) {

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
            var error;

            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                error = state.core.setAttribute(state.nodes[path].node, name, value);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                msg = msg || 'setAttribute(' + path + ',' + name + ',' + JSON.stringify(value) + ')';
                saveRoot(msg);
            }
        }

        function delAttributes(path, name, msg) {
            var error;

            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                error = state.core.delAttribute(state.nodes[path].node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                msg = msg || 'delAttribute(' + path + ',' + name + ')';
                saveRoot(msg);
            }
        }

        function setRegistry(path, name, value, msg) {
            var error;

            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                error = state.core.setRegistry(state.nodes[path].node, name, value);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                msg = msg || 'setRegistry(' + path + ',' + name + ',' + JSON.stringify(value) + ')';
                saveRoot(msg);
            }
        }

        function delRegistry(path, name, msg) {
            var error;

            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                error = state.core.delRegistry(state.nodes[path].node, name);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                msg = msg || 'delRegistry(' + path + ',' + name + ')';
                saveRoot(msg);
            }
        }

        function copyMoreNodes(parameters, msg) {
            var pathsToCopy = [],
                nodePath,
                newNodes,
                newNode,
                error;

            if (typeof parameters.parentId === 'string' && state.nodes[parameters.parentId] &&
                typeof state.nodes[parameters.parentId].node === 'object') {

                for (nodePath in parameters) {
                    if (parameters.hasOwnProperty(nodePath) && nodePath !== 'parentId') {
                        pathsToCopy.push(nodePath);
                    }
                }

                msg = msg || 'copyMoreNodes(' + JSON.stringify(pathsToCopy) + ',' + parameters.parentId + ')';
                if (pathsToCopy.length < 1) {
                    // empty on purpose
                } else if (pathsToCopy.length === 1) {
                    newNode = state.core.copyNode(state.nodes[pathsToCopy[0]].node,
                        state.nodes[parameters.parentId].node);
                    if (newNode instanceof Error) {
                        printCoreError(newNode);
                        return;
                    }
                    storeNode(newNode);
                    _setAttrAndRegistry(newNode, parameters[pathsToCopy[0]]);
                    saveRoot(msg);
                } else {
                    newNodes = _copyMultipleNodes(pathsToCopy, parameters.parentId);
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

        function _copyMultipleNodes(nodePaths, parentPath) {
            var i,
                tempContainer,
                tempFrom,
                tempTo,
                helpArray,
                subPathArray,
                parent,
                result = {},
                childrenRelIds,
                childNode,
                newNode,
                checkPaths = function () {
                    var i,
                        result = true;

                    for (i = 0; i < nodePaths.length; i += 1) {
                        result = result && (state.nodes[nodePaths[i]] &&
                            typeof state.nodes[nodePaths[i]].node === 'object');
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

            if (state.nodes[parentPath] && typeof state.nodes[parentPath].node === 'object' && checkPaths()) {
                helpArray = {};
                subPathArray = {};
                parent = state.nodes[parentPath].node;

                // 0) create a container for the tempNodes to preserve the relids of the original nodes
                tempContainer = state.core.createNode({
                    parent: state.core.getRoot(parent),
                    base: state.core.getTypeRoot(state.nodes[nodePaths[0]].node)
                });

                // 1) creating the 'from' object
                tempFrom = state.core.createNode({
                    parent: tempContainer
                });

                // 2) and moving every node under it
                for (i = 0; i < nodePaths.length; i += 1) {
                    helpArray[nodePaths[i]] = {};
                    helpArray[nodePaths[i]].origparent = state.core.getParent(state.nodes[nodePaths[i]].node);
                    helpArray[nodePaths[i]].tempnode = state.core.moveNode(state.nodes[nodePaths[i]].node, tempFrom);
                    subPathArray[state.core.getRelid(helpArray[nodePaths[i]].tempnode)] = nodePaths[i];
                    delete state.nodes[nodePaths[i]];
                }

                // 3) do the copy
                tempTo = state.core.copyNode(tempFrom, tempContainer);

                // 4) moving back the temporary source
                for (i = 0; i < nodePaths.length; i += 1) {
                    helpArray[nodePaths[i]].node = state.core.moveNode(helpArray[nodePaths[i]].tempnode,
                        helpArray[nodePaths[i]].origparent);
                    storeNode(helpArray[nodePaths[i]].node);
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

            msg = msg || 'moveMoreNodes(' + JSON.stringify(returnParams) + ')';
            saveRoot(msg);
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

        //TODO should be removed as there is no user or public API related to this function
        //function deleteNode(path, msg) {
        //  if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
        //    state.core.deleteNode(state.nodes[path].node);
        //    //delete state.nodes[path];
        //    msg = msg || 'deleteNode(' + path + ')';
        //    saveRoot(msg);
        //  }
        //}

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
            var newID,
                error;

            if (state.core) {
                if (typeof parameters.parentId === 'string' && state.nodes[parameters.parentId] &&
                    typeof state.nodes[parameters.parentId].node === 'object') {
                    var baseNode = null;
                    if (state.nodes[parameters.baseId]) {
                        baseNode = state.nodes[parameters.baseId].node || baseNode;
                    }
                    var child = state.core.createNode({
                        parent: state.nodes[parameters.parentId].node,
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
                    msg = msg || 'createChild(' + parameters.parentId + ',' + parameters.baseId + ',' + newID + ')';
                    saveRoot(msg);
                }
            }

            return newID;
        }

        function makePointer(id, name, to, msg) {
            if (to === null) {
                state.core.setPointer(state.nodes[id].node, name, to);
            } else {

                state.core.setPointer(state.nodes[id].node, name, state.nodes[to].node);
            }

            msg = msg || 'makePointer(' + id + ',' + name + ',' + to + ')';
            saveRoot(msg);
        }

        function delPointer(path, name, msg) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.deletePointer(state.nodes[path].node, name);
                msg = msg || 'delPointer(' + path + ',' + name + ')';
                saveRoot(msg);
            }
        }

        //MGAlike - set functions
        function addMember(path, memberpath, setid, msg) {
            if (state.nodes[path] &&
                state.nodes[memberpath] &&
                typeof state.nodes[path].node === 'object' &&
                typeof state.nodes[memberpath].node === 'object') {
                state.core.addMember(state.nodes[path].node,
                    setid, state.nodes[memberpath].node);
                msg = msg || 'addMember(' + path + ',' + memberpath + ',' + setid + ')';
                saveRoot(msg);
            }
        }

        function removeMember(path, memberpath, setid, msg) {
            if (state.nodes[path] &&
                typeof state.nodes[path].node === 'object') {
                state.core.delMember(state.nodes[path].node, setid, memberpath);
                msg = msg || 'removeMember(' + path + ',' + memberpath + ',' + setid + ')';
                saveRoot(msg);
            }
        }

        function setMemberAttribute(path, memberpath, setid, name, value, msg) {
            if (state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.setMemberAttribute(state.nodes[path].node, setid, memberpath, name, value);
                msg = msg ||
                    'setMemberAttribute(' + path + ',' + memberpath + ',' + setid + ',' + name + ',' + value +
                    ')';
                saveRoot(msg);
            }
        }

        function delMemberAttribute(path, memberpath, setid, name, msg) {
            if (state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.delMemberAttribute(state.nodes[path].node, setid, memberpath, name);
                msg = msg || 'delMemberAttribute(' + path + ',' + memberpath + ',' + setid + ',' + name + ')';
                saveRoot(msg);
            }
        }

        function setMemberRegistry(path, memberpath, setid, name, value, msg) {
            if (state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.setMemberRegistry(state.nodes[path].node, setid, memberpath, name, value);
                msg = msg ||
                    'setMemberRegistry(' + path + ',' + memberpath + ',' + setid + ',' + name + ',' +
                    JSON.stringify(value) + ')';
                saveRoot(msg);
            }
        }

        function delMemberRegistry(path, memberpath, setid, name, msg) {
            if (state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.delMemberRegistry(state.nodes[path].node, setid, memberpath, name);
                msg = msg || 'delMemberRegistry(' + path + ',' + memberpath + ',' + setid + ',' + name + ')';
                saveRoot(msg);
            }
        }

        function createSet(path, setid, msg) {
            if (state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.createSet(state.nodes[path].node, setid);
                msg = msg || 'createSet(' + path + ',' + setid + ')';
                saveRoot(msg);
            }
        }

        function deleteSet(path, setid, msg) {
            var error;
            if (state.nodes[path] && typeof state.nodes[path].node === 'object') {
                error = state.core.deleteSet(state.nodes[path].node, setid);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                msg = msg || 'deleteSet(' + path + ',' + setid + ')';
                saveRoot(msg);
            }
        }

        function setBase(path, basePath) {
            var error;
            if (state.core &&
                state.nodes[path] &&
                typeof state.nodes[path].node === 'object' &&
                state.nodes[basePath] &&
                typeof state.nodes[basePath].node === 'object') {
                error = state.core.setBase(state.nodes[path].node, state.nodes[basePath].node);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                saveRoot('setBase(' + path + ',' + basePath + ')');
            }
        }

        function moveNode(path, parentPath) {
            var error;
            if (state.core &&
                state.nodes[path] &&
                typeof state.nodes[path].node === 'object' &&
                state.nodes[parentPath] &&
                typeof state.nodes[parentPath].node === 'object') {
                error = state.core.moveNode(state.nodes[path].node, state.nodes[parentPath].node);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot('moveNode(' + path + ',' + parentPath + ')');
            }
        }

        function delBase(path) {
            var error;
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                error = state.core.setBase(state.nodes[path].node, null);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                saveRoot('delBase(' + path + ')');
            }
        }

        function addMixin(nodePath, mixinPath) {
            var error;
            if (state.core && state.nodes[nodePath] && typeof state.nodes[nodePath].node === 'object') {
                error = state.core.addMixin(state.nodes[nodePath].node, mixinPath);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }
                saveRoot('addMixin(' + nodePath + ',' + mixinPath + ')');
            }
        }

        function delMixin(nodePath, mixinPath) {
            var error;
            if (state.core && state.nodes[nodePath] && typeof state.nodes[nodePath].node === 'object') {
                error = state.core.delMixin(state.nodes[nodePath].node, mixinPath);
                if (error instanceof Error) {
                    printCoreError(error);
                    return;
                }

                saveRoot('delMixin(' + nodePath + ',' + mixinPath + ')');
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
            delPointer: delPointer,
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
            addMixin: addMixin,
            delMixin: delMixin
        };
    }

    return gmeNodeSetter;
});