/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function gmeNodeSetter(logger, state, saveRoot, storeNode) {

        function setAttributes(path, name, value, msg) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.setAttribute(state.nodes[path].node, name, value);
                msg = msg || 'setAttribute(' + path + ',' + name + ',' + value + ')';
                saveRoot(msg);
            }
        }

        function delAttributes(path, name, msg) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.delAttribute(state.nodes[path].node, name);
                msg = msg || 'delAttribute(' + path + ',' + name + ')';
                saveRoot(msg);
            }
        }

        function setRegistry(path, name, value, msg) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.setRegistry(state.nodes[path].node, name, value);
                msg = msg || 'setRegistry(' + path + ',' + ',' + name + ',' + value + ')';
                saveRoot(msg);
            }
        }

        function delRegistry(path, name, msg) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.delRegistry(state.nodes[path].node, name);
                msg = msg || 'delRegistry(' + path + ',' + ',' + name + ')';
                saveRoot(msg);
            }
        }

        function copyMoreNodes(parameters, msg) {
            var pathestocopy = [],
                i,
                j,
                newNode;

            if (typeof parameters.parentId === 'string' && state.nodes[parameters.parentId] &&
                typeof state.nodes[parameters.parentId].node === 'object') {
                for (i in parameters) {
                    if (i !== 'parentId') {
                        pathestocopy.push(i);
                    }
                }

                msg = msg || 'copyMoreNodes(' + pathestocopy + ',' + parameters.parentId + ')';
                if (pathestocopy.length < 1) {
                    // empty on purpose
                } else if (pathestocopy.length === 1) {
                    newNode = state.core.copyNode(state.nodes[pathestocopy[0]].node,
                        state.nodes[parameters.parentId].node);
                    storeNode(newNode);
                    if (parameters[pathestocopy[0]]) {
                        for (j in parameters[pathestocopy[0]].attributes) {
                            if (parameters[pathestocopy[0]].attributes.hasOwnProperty(j)) {
                                state.core.setAttribute(newNode, j, parameters[pathestocopy[0]].attributes[j]);
                            }
                        }
                        for (j in parameters[pathestocopy[0]].registry) {
                            if (parameters[pathestocopy[0]].registry.hasOwnProperty(j)) {
                                state.core.setRegistry(newNode, j, parameters[pathestocopy[0]].registry[j]);
                            }
                        }
                    }
                    saveRoot(msg);
                } else {
                    copyMoreNodesAsync(pathestocopy, parameters.parentId, function (err, copyarr) {
                        var i,
                            j;
                        if (err) {
                            //rollBackModification();
                            state.logger.error(err);
                        } else {
                            for (i in copyarr) {
                                if (copyarr.hasOwnProperty(i) && parameters[i]) {
                                    for (j in parameters[i].attributes) {
                                        if (parameters[i].attributes.hasOwnProperty(j)) {
                                            state.core.setAttribute(copyarr[i], j, parameters[i].attributes[j]);
                                        }
                                    }
                                    for (j in parameters[i].registry) {
                                        if (parameters[i].registry.hasOwnProperty(j)) {
                                            state.core.setRegistry(copyarr[i], j, parameters[i].registry[j]);
                                        }
                                    }
                                }
                            }
                            saveRoot(msg);
                        }
                    });
                }
            } else {
                state.logger.error('wrong parameters for copy operation - denied -');
            }
        }

        function copyMoreNodesAsync(nodePaths, parentPath, callback) {
            var i,
                tempFrom,
                tempTo,
                helpArray,
                subPathArray,
                parent,
                returnArray,
                checkPaths = function () {
                    var i,
                        result = true;

                    for (i = 0; i < nodePaths.length; i += 1) {
                        result = result && (state.nodes[nodePaths[i]] &&
                            typeof state.nodes[nodePaths[i]].node === 'object');
                    }
                    return result;
                };

            if (state.nodes[parentPath] &&
                typeof state.nodes[parentPath].node === 'object' && checkPaths()) {
                helpArray = {};
                subPathArray = {};
                parent = state.nodes[parentPath].node;
                returnArray = {};

                //creating the 'from' object
                tempFrom = state.core.createNode({
                    parent: parent,
                    base: state.core.getTypeRoot(state.nodes[nodePaths[0]].node)
                });
                //and moving every node under it
                for (i = 0; i < nodePaths.length; i += 1) {
                    helpArray[nodePaths[i]] = {};
                    helpArray[nodePaths[i]].origparent =
                        state.core.getParent(state.nodes[nodePaths[i]].node);
                    helpArray[nodePaths[i]].tempnode =
                        state.core.moveNode(state.nodes[nodePaths[i]].node, tempFrom);
                    subPathArray[state.core.getRelid(helpArray[nodePaths[i]].tempnode)] = nodePaths[i];
                    delete state.nodes[nodePaths[i]];
                }

                //do the copy
                tempTo = state.core.copyNode(tempFrom, parent);

                //moving back the temporary source
                for (i = 0; i < nodePaths.length; i += 1) {
                    helpArray[nodePaths[i]].node = state.core.moveNode(helpArray[nodePaths[i]].tempnode,
                        helpArray[nodePaths[i]].origparent);
                    storeNode(helpArray[nodePaths[i]].node);
                }

                //gathering the destination nodes
                state.core.loadChildren(tempTo, function (err, children) {
                    var newNode;

                    if (!err && children && children.length > 0) {
                        for (i = 0; i < children.length; i += 1) {
                            if (subPathArray[state.core.getRelid(children[i])]) {
                                newNode = state.core.moveNode(children[i], parent);
                                storeNode(newNode);
                                returnArray[subPathArray[state.core.getRelid(children[i])]] = newNode;
                            } else {
                                state.logger.error('635 - should never happen!!!');
                            }
                        }
                        state.core.deleteNode(tempFrom);
                        state.core.deleteNode(tempTo);
                        callback(null, returnArray);
                    } else {
                        //clean up the mess and return
                        state.core.deleteNode(tempFrom);
                        state.core.deleteNode(tempTo);
                        callback(err, {});
                    }
                });
            }
        }

        function moveMoreNodes(parameters) {
            var pathsToMove = [],
                returnParams = {},
                i,
                j,
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
                        if (parameters[pathsToMove[i]].attributes) {
                            for (j in parameters[pathsToMove[i]].attributes) {
                                if (parameters[pathsToMove[i]].attributes.hasOwnProperty(j)) {
                                    state.core.setAttribute(newNode,
                                        j, parameters[pathsToMove[i]].attributes[j]);
                                }
                            }
                        }
                        if (parameters[pathsToMove[i]].registry) {
                            for (j in parameters[pathsToMove[i]].registry) {
                                if (parameters[pathsToMove[i]].registry.hasOwnProperty(j)) {
                                    state.core.setRegistry(newNode,
                                        j, parameters[pathsToMove[i]].registry[j]);
                                }
                            }
                        }

                        delete state.nodes[pathsToMove[i]];
                        storeNode(newNode, true);
                    }
                }
            }

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
                //attributes
                names = Object.keys(parameters[paths[i]].attributes || {});
                for (j = 0; j < names.length; j++) {
                    state.core.setAttribute(newChildren[i],
                        names[j], parameters[paths[i]].attributes[names[j]]);
                }
                //registry
                names = Object.keys(parameters[paths[i]].registry || {});
                for (j = 0; j < names.length; j++) {
                    state.core.setRegistry(newChildren[i],
                        names[j], parameters[paths[i]].registry[names[j]]);
                }

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
            var newID;

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
                    if (parameters.position) {
                        state.core.setRegistry(child,
                            'position',
                            {
                                x: parameters.position.x || 100,
                                y: parameters.position.y || 100
                            });
                    } else {
                        state.core.setRegistry(child, 'position', {x: 100, y: 100});
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
                    'setMemberRegistry(' + path + ',' + memberpath + ',' + setid + ',' + name + ',' + value + ')';
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
            if (state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.deleteSet(state.nodes[path].node, setid);
                msg = msg || 'deleteSet(' + path + ',' + setid + ')';
                saveRoot(msg);
            }
        }

        function setBase(path, basepath) {
            /*if (state.core &&
             state.nodes[path] && typeof state.nodes[path].node === 'object') {
             state.core.setRegistry(state.nodes[path].node,'base',basepath);
             saveRoot('setBase('+path+','+basepath+')');
             }*/
            if (state.core &&
                state.nodes[path] &&
                typeof state.nodes[path].node === 'object' &&
                state.nodes[basepath] &&
                typeof state.nodes[basepath].node === 'object') {
                state.core.setBase(state.nodes[path].node, state.nodes[basepath].node);
                saveRoot('setBase(' + path + ',' + basepath + ')');
            }
        }

        function delBase(path) {
            /*if (state.core &&
             state.nodes[path] && typeof state.nodes[path].node === 'object') {
             state.core.delRegistry(state.nodes[path].node,'base');
             saveRoot('delBase('+path+')');
             }*/
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.setBase(state.nodes[path].node, null);
                saveRoot('delBase(' + path + ')');
            }
        }

        return {
            setAttributes: setAttributes,
            delAttributes: delAttributes,
            setRegistry: setRegistry,
            delRegistry: delRegistry,
            copyMoreNodes: copyMoreNodes,
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
        };
    }

    return gmeNodeSetter;
});