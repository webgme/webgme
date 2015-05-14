/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function gmeNodeSetter(_clientGlobal) {

        function setAttributes(path, name, value, msg) {
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.setAttribute(_clientGlobal.nodes[path].node, name, value);
                msg = msg || 'setAttribute(' + path + ',' + name + ',' + value + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function delAttributes(path, name, msg) {
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.delAttribute(_clientGlobal.nodes[path].node, name);
                msg = msg || 'delAttribute(' + path + ',' + name + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function setRegistry(path, name, value, msg) {
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.setRegistry(_clientGlobal.nodes[path].node, name, value);
                msg = msg || 'setRegistry(' + path + ',' + ',' + name + ',' + value + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function delRegistry(path, name, msg) {
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.delRegistry(_clientGlobal.nodes[path].node, name);
                msg = msg || 'delRegistry(' + path + ',' + ',' + name + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function copyMoreNodes(parameters, msg) {
            var pathestocopy = [],
                i,
                j,
                newNode;

            if (typeof parameters.parentId === 'string' && _clientGlobal.nodes[parameters.parentId] &&
                typeof _clientGlobal.nodes[parameters.parentId].node === 'object') {
                for (i in parameters) {
                    if (i !== 'parentId') {
                        pathestocopy.push(i);
                    }
                }

                msg = msg || 'copyMoreNodes(' + pathestocopy + ',' + parameters.parentId + ')';
                if (pathestocopy.length < 1) {
                    // empty on purpose
                } else if (pathestocopy.length === 1) {
                    newNode = _clientGlobal.core.copyNode(_clientGlobal.nodes[pathestocopy[0]].node,
                        _clientGlobal.nodes[parameters.parentId].node);
                    _clientGlobal.functions.storeNode(newNode);
                    if (parameters[pathestocopy[0]]) {
                        for (j in parameters[pathestocopy[0]].attributes) {
                            if (parameters[pathestocopy[0]].attributes.hasOwnProperty(j)) {
                                _clientGlobal.core.setAttribute(newNode, j, parameters[pathestocopy[0]].attributes[j]);
                            }
                        }
                        for (j in parameters[pathestocopy[0]].registry) {
                            if (parameters[pathestocopy[0]].registry.hasOwnProperty(j)) {
                                _clientGlobal.core.setRegistry(newNode, j, parameters[pathestocopy[0]].registry[j]);
                            }
                        }
                    }
                    _clientGlobal.functions.saveRoot(msg);
                } else {
                    copyMoreNodesAsync(pathestocopy, parameters.parentId, function (err, copyarr) {
                        var i,
                            j;
                        if (err) {
                            //rollBackModification();
                            _clientGlobal.logger.error(err);
                        } else {
                            for (i in copyarr) {
                                if (copyarr.hasOwnProperty(i) && parameters[i]) {
                                    for (j in parameters[i].attributes) {
                                        if (parameters[i].attributes.hasOwnProperty(j)) {
                                            _clientGlobal.core.setAttribute(copyarr[i], j, parameters[i].attributes[j]);
                                        }
                                    }
                                    for (j in parameters[i].registry) {
                                        if (parameters[i].registry.hasOwnProperty(j)) {
                                            _clientGlobal.core.setRegistry(copyarr[i], j, parameters[i].registry[j]);
                                        }
                                    }
                                }
                            }
                            _clientGlobal.functions.saveRoot(msg);
                        }
                    });
                }
            } else {
                _clientGlobal.logger.error('wrong parameters for copy operation - denied -');
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
                        result = result && (_clientGlobal.nodes[nodePaths[i]] &&
                            typeof _clientGlobal.nodes[nodePaths[i]].node === 'object');
                    }
                    return result;
                };

            if (_clientGlobal.nodes[parentPath] &&
                typeof _clientGlobal.nodes[parentPath].node === 'object' && checkPaths()) {
                helpArray = {};
                subPathArray = {};
                parent = _clientGlobal.nodes[parentPath].node;
                returnArray = {};

                //creating the 'from' object
                tempFrom = _clientGlobal.core.createNode({
                    parent: parent,
                    base: _clientGlobal.core.getTypeRoot(_clientGlobal.nodes[nodePaths[0]].node)
                });
                //and moving every node under it
                for (i = 0; i < nodePaths.length; i += 1) {
                    helpArray[nodePaths[i]] = {};
                    helpArray[nodePaths[i]].origparent =
                        _clientGlobal.core.getParent(_clientGlobal.nodes[nodePaths[i]].node);
                    helpArray[nodePaths[i]].tempnode =
                        _clientGlobal.core.moveNode(_clientGlobal.nodes[nodePaths[i]].node, tempFrom);
                    subPathArray[_clientGlobal.core.getRelid(helpArray[nodePaths[i]].tempnode)] = nodePaths[i];
                    delete _clientGlobal.nodes[nodePaths[i]];
                }

                //do the copy
                tempTo = _clientGlobal.core.copyNode(tempFrom, parent);

                //moving back the temporary source
                for (i = 0; i < nodePaths.length; i += 1) {
                    helpArray[nodePaths[i]].node = _clientGlobal.core.moveNode(helpArray[nodePaths[i]].tempnode,
                        helpArray[nodePaths[i]].origparent);
                    _clientGlobal.functions.storeNode(helpArray[nodePaths[i]].node);
                }

                //gathering the destination nodes
                _clientGlobal.core.loadChildren(tempTo, function (err, children) {
                    var newNode;

                    if (!err && children && children.length > 0) {
                        for (i = 0; i < children.length; i += 1) {
                            if (subPathArray[_clientGlobal.core.getRelid(children[i])]) {
                                newNode = _clientGlobal.core.moveNode(children[i], parent);
                                _clientGlobal.functions.storeNode(newNode);
                                returnArray[subPathArray[_clientGlobal.core.getRelid(children[i])]] = newNode;
                            } else {
                                _clientGlobal.logger.error('635 - should never happen!!!');
                            }
                        }
                        _clientGlobal.core.deleteNode(tempFrom);
                        _clientGlobal.core.deleteNode(tempTo);
                        callback(null, returnArray);
                    } else {
                        //clean up the mess and return
                        _clientGlobal.core.deleteNode(tempFrom);
                        _clientGlobal.core.deleteNode(tempTo);
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
                _clientGlobal.nodes[parameters.parentId] &&
                typeof _clientGlobal.nodes[parameters.parentId].node === 'object') {
                for (i = 0; i < pathsToMove.length; i += 1) {
                    if (_clientGlobal.nodes[pathsToMove[i]] &&
                        typeof _clientGlobal.nodes[pathsToMove[i]].node === 'object') {
                        newNode = _clientGlobal.core.moveNode(_clientGlobal.nodes[pathsToMove[i]].node,
                            _clientGlobal.nodes[parameters.parentId].node);
                        returnParams[pathsToMove[i]] = _clientGlobal.core.getPath(newNode);
                        if (parameters[pathsToMove[i]].attributes) {
                            for (j in parameters[pathsToMove[i]].attributes) {
                                if (parameters[pathsToMove[i]].attributes.hasOwnProperty(j)) {
                                    _clientGlobal.core.setAttribute(newNode,
                                        j, parameters[pathsToMove[i]].attributes[j]);
                                }
                            }
                        }
                        if (parameters[pathsToMove[i]].registry) {
                            for (j in parameters[pathsToMove[i]].registry) {
                                if (parameters[pathsToMove[i]].registry.hasOwnProperty(j)) {
                                    _clientGlobal.core.setRegistry(newNode,
                                        j, parameters[pathsToMove[i]].registry[j]);
                                }
                            }
                        }

                        delete _clientGlobal.nodes[pathsToMove[i]];
                        _clientGlobal.functions.storeNode(newNode, true);
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
                parent = _clientGlobal.nodes[parameters.parentId].node,
                names, i, j, index, pointer,
                newChildren = [],
                relations = [];

            //to allow 'meaningfull' instantiation of multiple objects
            // we have to recreate the internal relations - except the base
            paths = Object.keys(parameters);
            paths.splice(paths.indexOf('parentId'), 1);
            for (i = 0; i < paths.length; i++) {
                node = _clientGlobal.nodes[paths[i]].node;
                nodes.push(node);
                pointer = {};
                names = _clientGlobal.core.getPointerNames(node);
                index = names.indexOf('base');
                if (index !== -1) {
                    names.splice(index, 1);
                }

                for (j = 0; j < names.length; j++) {
                    index = paths.indexOf(_clientGlobal.core.getPointerPath(node, names[j]));
                    if (index !== -1) {
                        pointer[names[j]] = index;
                    }
                }
                relations.push(pointer);
            }

            //now the instantiation
            for (i = 0; i < nodes.length; i++) {
                newChildren.push(_clientGlobal.core.createNode({parent: parent, base: nodes[i]}));
            }

            //now for the storage and relation setting
            for (i = 0; i < paths.length; i++) {
                //attributes
                names = Object.keys(parameters[paths[i]].attributes || {});
                for (j = 0; j < names.length; j++) {
                    _clientGlobal.core.setAttribute(newChildren[i],
                        names[j], parameters[paths[i]].attributes[names[j]]);
                }
                //registry
                names = Object.keys(parameters[paths[i]].registry || {});
                for (j = 0; j < names.length; j++) {
                    _clientGlobal.core.setRegistry(newChildren[i],
                        names[j], parameters[paths[i]].registry[names[j]]);
                }

                //relations
                names = Object.keys(relations[i]);
                for (j = 0; j < names.length; j++) {
                    _clientGlobal.core.setPointer(newChildren[i], names[j], newChildren[relations[i][names[j]]]);
                }

                //store
                result[paths[i]] = _clientGlobal.functions.storeNode(newChildren[i]);

            }

            msg = msg || 'createChildren(' + JSON.stringify(result) + ')';
            _clientGlobal.functions.saveRoot(msg);
            return result;
        }

        //TODO should be removed as there is no user or public API related to this function
        //function deleteNode(path, msg) {
        //  if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
        //    _clientGlobal.core.deleteNode(_clientGlobal.nodes[path].node);
        //    //delete _clientGlobal.nodes[path];
        //    msg = msg || 'deleteNode(' + path + ')';
        //    saveRoot(msg);
        //  }
        //}

        function delMoreNodes(paths, msg) {
            if (_clientGlobal.core) {
                for (var i = 0; i < paths.length; i++) {
                    if (_clientGlobal.nodes[paths[i]] && typeof _clientGlobal.nodes[paths[i]].node === 'object') {
                        _clientGlobal.core.deleteNode(_clientGlobal.nodes[paths[i]].node);
                        //delete _clientGlobal.nodes[paths[i]];
                    }
                }
                msg = msg || 'delMoreNodes(' + paths + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function createChild(parameters, msg) {
            var newID;

            if (_clientGlobal.core) {
                if (typeof parameters.parentId === 'string' && _clientGlobal.nodes[parameters.parentId] &&
                    typeof _clientGlobal.nodes[parameters.parentId].node === 'object') {
                    var baseNode = null;
                    if (_clientGlobal.nodes[parameters.baseId]) {
                        baseNode = _clientGlobal.nodes[parameters.baseId].node || baseNode;
                    }
                    var child = _clientGlobal.core.createNode({
                        parent: _clientGlobal.nodes[parameters.parentId].node,
                        base: baseNode,
                        guid: parameters.guid,
                        relid: parameters.relid
                    });
                    if (parameters.position) {
                        _clientGlobal.core.setRegistry(child,
                            'position',
                            {
                                x: parameters.position.x || 100,
                                y: parameters.position.y || 100
                            });
                    } else {
                        _clientGlobal.core.setRegistry(child, 'position', {x: 100, y: 100});
                    }
                    _clientGlobal.functions.storeNode(child);
                    newID = _clientGlobal.core.getPath(child);
                    msg = msg || 'createChild(' + parameters.parentId + ',' + parameters.baseId + ',' + newID + ')';
                    _clientGlobal.functions.saveRoot(msg);
                }
            }

            return newID;
        }

        function makePointer(id, name, to, msg) {
            if (to === null) {
                _clientGlobal.core.setPointer(_clientGlobal.nodes[id].node, name, to);
            } else {


                _clientGlobal.core.setPointer(_clientGlobal.nodes[id].node, name, _clientGlobal.nodes[to].node);
            }

            msg = msg || 'makePointer(' + id + ',' + name + ',' + to + ')';
            _clientGlobal.functions.saveRoot(msg);
        }

        function delPointer(path, name, msg) {
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.deletePointer(_clientGlobal.nodes[path].node, name);
                msg = msg || 'delPointer(' + path + ',' + name + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }


        //MGAlike - set functions
        function addMember(path, memberpath, setid, msg) {
            if (_clientGlobal.nodes[path] &&
                _clientGlobal.nodes[memberpath] &&
                typeof _clientGlobal.nodes[path].node === 'object' &&
                typeof _clientGlobal.nodes[memberpath].node === 'object') {
                _clientGlobal.core.addMember(_clientGlobal.nodes[path].node,
                    setid, _clientGlobal.nodes[memberpath].node);
                msg = msg || 'addMember(' + path + ',' + memberpath + ',' + setid + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function removeMember(path, memberpath, setid, msg) {
            if (_clientGlobal.nodes[path] &&
                typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.delMember(_clientGlobal.nodes[path].node, setid, memberpath);
                msg = msg || 'removeMember(' + path + ',' + memberpath + ',' + setid + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function setMemberAttribute(path, memberpath, setid, name, value, msg) {
            if (_clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.setMemberAttribute(_clientGlobal.nodes[path].node, setid, memberpath, name, value);
                msg = msg ||
                    'setMemberAttribute(' + path + ',' + memberpath + ',' + setid + ',' + name + ',' + value +
                    ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function delMemberAttribute(path, memberpath, setid, name, msg) {
            if (_clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.delMemberAttribute(_clientGlobal.nodes[path].node, setid, memberpath, name);
                msg = msg || 'delMemberAttribute(' + path + ',' + memberpath + ',' + setid + ',' + name + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function setMemberRegistry(path, memberpath, setid, name, value, msg) {
            if (_clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.setMemberRegistry(_clientGlobal.nodes[path].node, setid, memberpath, name, value);
                msg = msg ||
                    'setMemberRegistry(' + path + ',' + memberpath + ',' + setid + ',' + name + ',' + value + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function delMemberRegistry(path, memberpath, setid, name, msg) {
            if (_clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.delMemberRegistry(_clientGlobal.nodes[path].node, setid, memberpath, name);
                msg = msg || 'delMemberRegistry(' + path + ',' + memberpath + ',' + setid + ',' + name + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function createSet(path, setid, msg) {
            if (_clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.createSet(_clientGlobal.nodes[path].node, setid);
                msg = msg || 'createSet(' + path + ',' + setid + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function deleteSet(path, setid, msg) {
            if (_clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.deleteSet(_clientGlobal.nodes[path].node, setid);
                msg = msg || 'deleteSet(' + path + ',' + setid + ')';
                _clientGlobal.functions.saveRoot(msg);
            }
        }

        function setBase(path, basepath) {
            /*if (_clientGlobal.core &&
             _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
             _clientGlobal.core.setRegistry(_clientGlobal.nodes[path].node,'base',basepath);
             saveRoot('setBase('+path+','+basepath+')');
             }*/
            if (_clientGlobal.core &&
                _clientGlobal.nodes[path] &&
                typeof _clientGlobal.nodes[path].node === 'object' &&
                _clientGlobal.nodes[basepath] &&
                typeof _clientGlobal.nodes[basepath].node === 'object') {
                _clientGlobal.core.setBase(_clientGlobal.nodes[path].node, _clientGlobal.nodes[basepath].node);
                _clientGlobal.functions.saveRoot('setBase(' + path + ',' + basepath + ')');
            }
        }

        function delBase(path) {
            /*if (_clientGlobal.core &&
             _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
             _clientGlobal.core.delRegistry(_clientGlobal.nodes[path].node,'base');
             saveRoot('delBase('+path+')');
             }*/
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.setBase(_clientGlobal.nodes[path].node, null);
                _clientGlobal.functions.saveRoot('delBase(' + path + ')');
            }
        }


        _clientGlobal.nodeSetter = {
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