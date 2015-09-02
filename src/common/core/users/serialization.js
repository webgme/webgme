/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert', 'q'], function (ASSERT, Q) {

    'use strict';
    var _nodes = {},
        _core = null,
        _pathToGuidMap = {},
        _guidKeys = [], //ordered list of GUIDs
        _extraBasePaths = {},
        _export = {},
        _import = {},
        _newNodeGuids = [],
        _removedNodeGuids = [],
        _updatedNodeGuids = [],
        _log = '';

    function log(txt) {
        if (_log) {
            _log += '\n' + txt;
        } else {
            _log = '' + txt;
        }
    }

    function exportLibrary(core, libraryRoot, callback) {
        var deferred = Q.defer();
        //initialization
        _core = core;
        _nodes = {};
        _pathToGuidMap = {};
        _guidKeys = [];
        _extraBasePaths = {};
        _export = {};

        //loading all library element
        gatherNodesSlowly(libraryRoot, function (err) {
            if (err) {
                deferred.reject(err);
                return;
            }

            _guidKeys = _guidKeys.sort();
            gatherAncestors(); //collecting the 'external' base classes - probably we should avoid these

            var keys = Object.keys(_extraBasePaths),
                i;
            _export.bases = {};
            for (i = 0; i < keys.length; i++) {
                _export.bases[_extraBasePaths[keys[i]]] = keys[i];
            }

            //_export.bases = _extraBasePaths;
            // we save this info alongside with the library export, to be on the safe side

            _export.root = getLibraryRootInfo(libraryRoot);
            _export.relids = getRelIdInfo();
            _export.containment = {};
            fillContainmentTree(libraryRoot, _export.containment);
            _export.nodes = getNodesData();

            //we export MetaSheet info only if not the whole project is exported!!!
            _export.metaSheets = core.getParent(libraryRoot) ? getMetaSheetInfo(_core.getRoot(libraryRoot)) : {};

            deferred.resolve(_export);
        });

        return deferred.promise.nodeify(callback);
    }

    function getMetaSheetInfo(root) {
        var getMemberRegistry = function (setname, memberpath) {
                var names = _core.getMemberRegistryNames(root, setname, memberpath),
                    i,
                    registry = {};
                for (i = 0; i < names.length; i++) {
                    registry[names[i]] = _core.getMemberRegistry(root, setname, memberpath, names[i]);
                }
                return registry;
            },
            getMemberAttributes = function (setname, memberpath) {
                var names = _core.getMemberAttributeNames(root, setname, memberpath),
                    i,
                    attributes = {};
                for (i = 0; i < names.length; i++) {
                    attributes[names[i]] = _core.getMemberAttribute(root, setname, memberpath, names[i]);
                }
                return attributes;
            },
            getRegistryEntry = function (setname) {
                var index = registry.length;

                while (--index >= 0) {
                    if (registry[index].SetID === setname) {
                        return registry[index];
                    }
                }
                return {};
            },
            sheets = {},
            registry = _core.getRegistry(root, 'MetaSheets'),
            keys = _core.getSetNames(root),
            elements, guid,
            i,
            j;

        for (i = 0; i < keys.length; i++) {
            if (keys[i].indexOf('MetaAspectSet') === 0) {
                elements = _core.getMemberPaths(root, keys[i]);
                for (j = 0; j < elements.length; j++) {
                    guid = _pathToGuidMap[elements[j]] || _extraBasePaths[elements[j]];
                    if (guid) {
                        sheets[keys[i]] = sheets[keys[i]] || {};
                        sheets[keys[i]][guid] = {
                            registry: getMemberRegistry(keys[i], elements[j]),
                            attributes: getMemberAttributes(keys[i], elements[j])
                        };
                    }
                }

                if (sheets[keys[i]] && keys[i] !== 'MetaAspectSet') {
                    //we add the global registry values as well
                    sheets[keys[i]].global = getRegistryEntry(keys[i]);
                }
            }
        }
        return sheets;
    }

    function importMetaSheetInfo(root) {
        var setMemberAttributesAndRegistry = function (setname, memberguid) {
                var attributes = oldSheets[setname][memberguid].attributes || {},
                    registry = oldSheets[setname][memberguid].registry || {},
                    keys = Object.keys(attributes),
                    i;

                for (i = 0; i < keys.length; i++) {
                    _core.setMemberAttribute(root, setname, _core.getPath(_nodes[memberguid]), keys[i],
                        attributes[keys[i]]);
                }
                keys = Object.keys(registry);
                for (i = 0; i < keys.length; i++) {
                    _core.setMemberRegistry(root, setname, _core.getPath(_nodes[memberguid]), keys[i],
                        registry[keys[i]]);
                }
            },
            updateSheet = function (name) {
                //the removed object should be already removed...
                //if some element is extra in the place of import, then it stays untouched
                var oldMemberGuids = Object.keys(oldSheets[name]),
                    i;
                oldMemberGuids.splice(oldMemberGuids.indexOf('global'), 1);
                for (i = 0; i < oldMemberGuids.length; i++) {
                    _core.addMember(root, name, _nodes[oldMemberGuids[i]]);
                    setMemberAttributesAndRegistry(name, oldMemberGuids[i]);
                }
            },
            addSheet = function (name) {
                var registry = JSON.parse(JSON.stringify(_core.getRegistry(root, 'MetaSheets')) || {}),
                    i,
                    memberpath,
                    memberguids = Object.keys(oldSheets[name]);

                memberguids.splice(memberguids.indexOf('global'), 1);

                if (name !== 'MetaAspectSet') {
                    registry.push(oldSheets[name].global);
                    _core.setRegistry(root, 'MetaSheets', registry);
                }

                _core.createSet(root, name);
                for (i = 0; i < memberguids.length; i++) {
                    memberpath = _core.getPath(_nodes[memberguids[i]]);
                    _core.addMember(root, name, _nodes[memberguids[i]]);
                    setMemberAttributesAndRegistry(name, memberguids[i]);
                }
            },
            oldSheets = _import.metaSheets || {},
            newSheets = _export.metaSheets || {},
            oldSheetNames = Object.keys(oldSheets),
            newSheetNames = Object.keys(newSheets),
            i;

        for (i = 0; i < oldSheetNames.length; i++) {
            if (newSheetNames.indexOf(oldSheetNames[i]) !== -1) {
                updateSheet(oldSheetNames[i]);
            } else {
                addSheet(oldSheetNames[i]);
            }
        }
    }

    function getLibraryRootInfo(node) {
        return {
            path: _core.getPath(node),
            guid: _core.getGuid(node)
        };
    }

    function gatherNodesSlowly(node, callback) {
        _core.loadSubTree(node, function (err, nodes) {
            var guid, i;
            if (!err && nodes) {
                for (i = 0; i < nodes.length; i++) {
                    guid = _core.getGuid(nodes[i]);
                    _nodes[guid] = nodes[i];
                    _guidKeys.push(guid);
                    _pathToGuidMap[_core.getPath(nodes[i])] = guid;
                }
                callback(null);
            } else {
                callback(err);
            }
        });
    }

    function gatherAncestors() {
        //this function inserts the needed base classes which were not included in the library
        var i, base, guid;
        for (i = 0; i < _guidKeys.length; i++) {
            base = _nodes[_guidKeys[i]];
            while (base !== null) {
                guid = _core.getGuid(base);
                if (!_nodes[guid]) {
                    _nodes[guid] = base;
                    _extraBasePaths[_core.getPath(base)] = guid;
                } else if (_guidKeys.indexOf(guid) === -1) {
                    _extraBasePaths[_core.getPath(base)] = guid;
                }
                base = _core.getBase(base);
            }
        }
    }

    function pathsToSortedGuidList(pathsList) { //it will also filter out not wanted elements
        var i, guids = [];
        for (i = 0; i < pathsList.length; i++) {
            if (_pathToGuidMap[pathsList[i]]) {
                guids.push(_pathToGuidMap[pathsList[i]]);
            }
        }
        return guids.sort();
    }

    function fillContainmentTree(node, myTreeObject) {
        var childrenGuids = pathsToSortedGuidList(_core.getChildrenPaths(node)),
            i;
        for (i = 0; i < childrenGuids.length; i++) {
            myTreeObject[childrenGuids[i]] = {};
            fillContainmentTree(_nodes[childrenGuids[i]], myTreeObject[childrenGuids[i]]);
        }
    }

    function getRelIdInfo() {
        var i,
            relIdInfo = {};
        for (i = 0; i < _guidKeys.length; i++) {
            relIdInfo[_guidKeys[i]] = _core.getRelid(_nodes[_guidKeys[i]]);
        }
        return relIdInfo;
    }

    function getNodesData() {
        var data = {},
            i;
        for (i = 0; i < _guidKeys.length; i++) {
            data[_guidKeys[i]] = getNodeData(_nodes[_guidKeys[i]]);
        }
        return data;
    }

    function getNodeData(node) {
        /*{
         //only the ones defined on this level
         attributes:{name:value},
         base:GUID,
         registry:{name:value},
         parent:GUID,
         pointers:{name:targetGuid},
         sets:{name:[{guid:GUID,attributes:{name:value},registy:{name:value}}]}
         meta:{}
         }*/
        return {
            attributes: getAttributesOfNode(node),
            base: _core.getBase(node) ? _core.getGuid(_core.getBase(node)) : null,
            meta: pathsToGuids(JSON.parse(JSON.stringify(_core.getOwnJsonMeta(node)) || {})),
            parent: _core.getParent(node) ? _core.getGuid(_core.getParent(node)) : null,
            pointers: getPointersOfNode(node),
            registry: getRegistryOfNode(node),
            sets: getSetsOfNode(node),
            constraints: getConstraintsOfNode(node)
        };
    }

    function baseGuid(path) {
        /*var keys = Object.keys(_extraBasePaths),
         i;
         for(i=0;i<keys.length;i++){
         if(_extraBasePaths[keys[i]] === path){
         return keys[i];
         }
         }
         return null;*/
        return _extraBasePaths[path];
    }

    var sortMultipleArrays = function () {
        var index = getSortedIndex(arguments[0]);
        for (var j = 0; j < arguments.length; j++) {
            var _arr = arguments[j].slice();
            for (var i = 0; i < _arr.length; i++) {
                arguments[j][i] = _arr[index[i]];
            }
        }
    };

    var getSortedIndex = function (arr) {
        var index = [];
        for (var i = 0; i < arr.length; i++) {
            index.push(i);
        }
        index = index.sort((function (arr) {
            return function (a, b) {
                return ((arr[a] > arr[b]) ? 1 : ((arr[a] < arr[b]) ? -1 : 0));
            };
        })(arr));
        return index;
    };

    function pathsToGuids(jsonObject) {
        if (jsonObject && typeof jsonObject === 'object') {
            var keys = Object.keys(jsonObject),
                i, j, k, toDelete, tArray;

            for (i = 0; i < keys.length; i++) {
                if (keys[i] === 'items') {
                    //here comes the transformation itself
                    toDelete = [];
                    for (j = 0; j < jsonObject.items.length; j++) {
                        if (_pathToGuidMap[jsonObject.items[j]]) {
                            jsonObject.items[j] = _pathToGuidMap[jsonObject.items[j]];
                        } else if (baseGuid(jsonObject.items[j])) {
                            jsonObject.items[j] = baseGuid(jsonObject.items[j]);
                        } else {
                            toDelete.push(j);
                        }
                    }

                    if (toDelete.length > 0) {
                        toDelete = toDelete.sort();
                        toDelete = toDelete.reverse();
                        for (j = 0; j < toDelete.length; j++) {
                            jsonObject.items.splice(toDelete[j], 1);
                            jsonObject.minItems.splice(toDelete[j], 1);
                            jsonObject.maxItems.splice(toDelete[j], 1);
                        }
                    }
                    sortMultipleArrays(jsonObject.items, jsonObject.minItems, jsonObject.maxItems);
                } else if (keys[i] === 'aspects') {
                    //aspects are a bunch of named path list, so we have to handle them separately
                    tArray = Object.keys(jsonObject[keys[i]]);
                    for (j = 0; j < tArray.length; j++) {
                        //here comes the transformation itself
                        toDelete = [];
                        for (k = 0; k < jsonObject.aspects[tArray[j]].length; k++) {
                            if (_pathToGuidMap[jsonObject.aspects[tArray[j]][k]]) {
                                jsonObject.aspects[tArray[j]][k] = _pathToGuidMap[jsonObject.aspects[tArray[j]][k]];
                            } else if (baseGuid(jsonObject.aspects[tArray[j]][k])) {
                                jsonObject.aspects[tArray[j]][k] = baseGuid(jsonObject.aspects[tArray[j]][k]);
                            } else {
                                toDelete.push(k);
                            }
                        }

                        if (toDelete.length > 0) {
                            toDelete = toDelete.sort();
                            toDelete = toDelete.reverse();
                            for (k = 0; k < toDelete.length; k++) {
                                jsonObject.aspects[tArray[j]].splice(toDelete[k], 1);
                            }
                        }

                        jsonObject.aspects[tArray[j]] = jsonObject.aspects[tArray[j]].sort();

                    }
                } else {
                    if (typeof jsonObject[keys[i]] === 'object') {
                        jsonObject[keys[i]] = pathsToGuids(jsonObject[keys[i]]);
                    }
                }
            }

        }
        return jsonObject;
    }

    function getAttributesOfNode(node) {
        var names = _core.getOwnAttributeNames(node).sort(),
            i,
            result = {};
        for (i = 0; i < names.length; i++) {
            result[names[i]] = _core.getAttribute(node, names[i]);
        }
        return result;
    }

    function getRegistryOfNode(node) {
        var names = _core.getOwnRegistryNames(node).sort(),
            i,
            result = {};
        for (i = 0; i < names.length; i++) {
            result[names[i]] = _core.getRegistry(node, names[i]);
        }
        return result;
    }

    function getConstraintsOfNode(node) {
        var names = _core.getOwnConstraintNames(node).sort(),
            i,
            result = {};
        for (i = 0; i < names.length; i++) {
            result[names[i]] = _core.getConstraint(node, names[i]);
        }
        return result;
    }

    function getPointersOfNode(node) {
        var names = _core.getOwnPointerNames(node).sort(),
            i,
            result = {},
            target;
        for (i = 0; i < names.length; i++) {
            target = _core.getPointerPath(node, names[i]);
            if (_pathToGuidMap[target] || baseGuid(target) || target === null) {
                result[names[i]] = _pathToGuidMap[target] || baseGuid(target) || null;
            }
        }
        return result;
    }

    function getOwnMemberPaths(node, setName) {
        var base = _core.getBase(node),
            baseMembers = base === null ? [] : _core.getMemberPaths(base, setName),
            members = _core.getMemberPaths(node, setName),
            ownMembers = [],
            i;
        for (i = 0; i < members.length; i++) {
            if (baseMembers.indexOf(members[i]) === -1) {
                ownMembers.push(members[i]);
            }
        }
        return ownMembers;
    }

    function getSetsOfNode(node) {
        var names = _core.getSetNames(node).sort(),
            i, j, k,
            result = {},
            targetGuids,
            attributeNames,
            registryNames,
            memberInfo,
            path;
        for (i = 0; i < names.length; i++) {
            targetGuids = pathsToSortedGuidList(getOwnMemberPaths(node, names[i]));
            result[names[i]] = [];
            for (j = 0; j < targetGuids.length; j++) {
                path = _core.getPath(_nodes[targetGuids[j]]);
                memberInfo = {
                    attributes: {},
                    guid: targetGuids[j],
                    registry: {}
                };

                //attributes
                attributeNames = _core.getMemberAttributeNames(node, names[i], path).sort();
                for (k = 0; k < attributeNames.length; k++) {
                    memberInfo.attributes[attributeNames[k]] =
                        _core.getMemberAttribute(node, names[i], path, attributeNames[k]);
                }

                //registry
                registryNames = _core.getMemberRegistryNames(node, names[i], path).sort();
                for (k = 0; k < registryNames.length; k++) {
                    memberInfo.registry[registryNames[k]] =
                        _core.getMemberRegistry(node, names[i], path, registryNames[k]);
                }

                result[names[i]].push(memberInfo);
            }
        }
        return result;
    }

    function logId(nodes, id) {
        var txtId = id + '';
        if (nodes[id] && nodes[id].attributes && nodes[id].attributes.name) {
            txtId = nodes[id].attributes.name + '(' + id + ')';
        }

        return txtId;
    }

    function loadImportBases(guids, root, callback) {
        var needed = [],
            error = null,
            stillToGo = 0,
            i,
            guidList = Object.keys(guids),
            baseLoaded = function (err) {
                error = error || err;
                if (--stillToGo === 0) {
                    callback(error);
                }
            },
            loadBase = function (guid, path) {
                _core.loadByPath(root, path, function (err, node) {
                    if (err) {
                        return baseLoaded(err);
                    }
                    if (_core.getGuid(node) !== guid) {
                        return baseLoaded('GUID mismatch');
                    }

                    _nodes[guid] = node;
                    baseLoaded(null);
                });
            };

        for (i = 0; i < guidList.length; i++) {
            if (_nodes[guidList[i]] === undefined) {
                needed.push(guidList[i]);
            }
        }

        if (needed.length > 0) {
            stillToGo = needed.length;
            for (i = 0; i < needed.length; i++) {
                loadBase(needed[i], guids[needed[i]]);
            }
        } else {
            return callback(null);
        }

    }

    function importLibrary(core, originLibraryRoot, updatedLibraryJson, callback) {
        var deferred = Q.defer();
        _core = core;
        _import = updatedLibraryJson;
        _newNodeGuids = [];
        _updatedNodeGuids = [];
        _removedNodeGuids = [];
        _log = '';

        synchronizeRoots(originLibraryRoot, _import.root.guid);
        exportLibrary(core, originLibraryRoot, function (err) {
            //we do not need the returned json object as that is stored in our global _export variable
            if (err) {
                deferred.reject(err);
                return;
            }

            //now we will search for the bases of the import and load them
            loadImportBases(_import.bases, _core.getRoot(originLibraryRoot), function (err) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                //now we fill the insert/update/remove lists of GUIDs
                var oldkeys = Object.keys(_export.nodes),
                    newkeys = Object.keys(_import.nodes),
                    i;

                //TODO now we make three rounds although one would be sufficient on ordered lists
                for (i = 0; i < oldkeys.length; i++) {
                    if (newkeys.indexOf(oldkeys[i]) === -1) {
                        log('node ' + logId(_export.nodes, oldkeys[i]) +
                            ', all of its sub-types and its children will be removed');

                        _removedNodeGuids.push(oldkeys[i]);
                    }
                }

                for (i = 0; i < oldkeys.length; i++) {
                    if (newkeys.indexOf(oldkeys[i]) !== -1) {
                        log('node ' + logId(_export.nodes, oldkeys[i]) + ' will be updated');
                        _updatedNodeGuids.push(oldkeys[i]);
                    }
                }

                for (i = 0; i < newkeys.length; i++) {
                    if (oldkeys.indexOf(newkeys[i]) === -1) {
                        log('node ' + logId(_import.nodes, newkeys[i]) + ' will be added');
                        _newNodeGuids.push(newkeys[i]);
                    }
                }

                //Now we normalize the removedGUIDs by containment and remove them
                var toDelete = [],
                    parent;
                for (i = 0; i < _removedNodeGuids.length; i++) {
                    parent = _core.getParent(_nodes[_removedNodeGuids[i]]);
                    if (parent && _removedNodeGuids.indexOf(_core.getGuid(parent)) === -1) {
                        toDelete.push(_removedNodeGuids[i]);
                    }
                }
                //and as a final step we remove all that is needed
                for (i = 0; i < toDelete.length; i++) {
                    _core.deleteNode(_nodes[toDelete[i]]);
                }

                //as a second step we should deal with the updated nodes
                //we should go among containment hierarchy
                updateNodes(_import.root.guid, null, _import.containment);

                //now update inheritance chain
                //we assume that our inheritance chain comes from the FCO and that it is identical everywhere
                updateInheritance();

                //now we can add or modify the relations of the nodes - we go along the hierarchy chain
                updateRelations();

                //finally we need to update the meta rules of each node - again along the containment hierarchy
                updateMetaRules(_import.root.guid, _import.containment);

                //after everything is done we try to synchronize the metaSheet info
                importMetaSheetInfo(_core.getRoot(originLibraryRoot));

                deferred.resolve(_log);
            });
        });

        return deferred.promise.nodeify(callback);
    }

    function synchronizeRoots(oldRoot, newGuid) {
        _core.setGuid(oldRoot, newGuid);
    }

    //it will update the modified nodes and create the new ones regarding their place in the hierarchy chain
    function updateNodes(guid, parent, containmentTreeObject) {
        if (_updatedNodeGuids.indexOf(guid) !== -1) {
            updateNode(guid, parent);
        }

        var keys = Object.keys(containmentTreeObject),
            i,
            node = _nodes[guid],
            relid;

        for (i = 0; i < keys.length; i++) {
            if (_updatedNodeGuids.indexOf(keys[i]) === -1) {
                relid = _import.relids[keys[i]];
                if (_core.getChildrenRelids(node).indexOf(relid) !== -1) {
                    relid = undefined;
                }
                //this child is a new one so we should create
                _nodes[keys[i]] = _core.createNode({parent: node, guid: keys[i], relid: relid});
                addNode(keys[i]);
            }
            updateNodes(keys[i], node, containmentTreeObject[keys[i]]);
        }
    }

    function updateRegistry(guid) {
        var keys, i,
            node = _nodes[guid],
            jsonNode = _import.nodes[guid];

        keys = _core.getOwnRegistryNames(node);
        for (i = 0; i < keys.length; i++) {
            _core.delRegistry(node, keys[i]);
        }
        keys = Object.keys(jsonNode.registry);
        for (i = 0; i < keys.length; i++) {
            _core.setRegistry(node, keys[i], jsonNode.registry[keys[i]]);
        }
    }

    function updateAttributes(guid) {
        var keys, i,
            node = _nodes[guid],
            jsonNode = _import.nodes[guid];

        keys = _core.getOwnAttributeNames(node);
        for (i = 0; i < keys.length; i++) {
            _core.delAttribute(node, keys[i]);
        }
        keys = Object.keys(jsonNode.attributes);
        for (i = 0; i < keys.length; i++) {
            _core.setAttribute(node, keys[i], jsonNode.attributes[keys[i]]);
        }
    }

    function updateConstraints(guid) {
        var keys, i,
            node = _nodes[guid],
            jsonNode = _import.nodes[guid];
        keys = _core.getOwnConstraintNames(node);
        for (i = 0; i < keys.length; i++) {
            _core.delConstraint(node, keys[i]);
        }

        keys = Object.keys(jsonNode.constraints || {});
        for (i = 0; i < keys.length; i++) {
            _core.setConstraint(node, keys[i], jsonNode.constraints[keys[i]]);
        }
    }

    //this function does not cover relations - it means only attributes and registry have been updated here
    function updateNode(guid, parent) {
        //first we check if the node have to be moved
        var node = _nodes[guid];

        if (parent && _core.getParent(node) && _core.getGuid(parent) !== _core.getGuid(_core.getParent(node))) {
            //parent changed so it has to be moved...
            _nodes[guid] = _core.moveNode(node, parent);
        }

        updateAttributes(guid);
        updateRegistry(guid);
        updateConstraints(guid);
    }

    //this function doesn't not cover relations - so only attributes and registry have been taken care of here
    function addNode(guid) {
        //at this point we assume that an empty vessel has been already created and part of the _nodes
        updateAttributes(guid);
        updateRegistry(guid);
        updateConstraints(guid);
    }

    function getInheritanceBasedGuidOrder() {
        var inheritanceOrdered = Object.keys(_import.nodes).sort(),
            i = 0,
            baseGuid,
            baseIndex;

        while (i < inheritanceOrdered.length) {
            baseGuid = _import.nodes[inheritanceOrdered[i]].base;
            if (baseGuid) {
                baseIndex = inheritanceOrdered.indexOf(baseGuid);
                if (baseIndex > i) {
                    inheritanceOrdered.splice(baseIndex, 1);
                    inheritanceOrdered.splice(i, 0, baseGuid);
                } else {
                    ++i;
                }
            } else {
                ++i;
            }
        }
        return inheritanceOrdered;
    }

    function updateRelations() {
        var guids = getInheritanceBasedGuidOrder(),
            i;
        for (i = 0; i < guids.length; i++) {
            updateNodeRelations(guids[i]);
        }
    }

    function updateNodeRelations(guid) {
        // Although it is possible that we set the base pointer at this point
        // we should go through inheritance just to be sure.
        var node = _nodes[guid],
            jsonNode = _import.nodes[guid],
            keys, i, j, k, target, memberGuid;

        //pointers
        keys = _core.getOwnPointerNames(node);
        for (i = 0; i < keys.length; i++) {
            _core.deletePointer(node, keys[i]);
        }
        keys = Object.keys(jsonNode.pointers);
        for (i = 0; i < keys.length; i++) {
            target = jsonNode.pointers[keys[i]];
            if (target === null) {
                _core.setPointer(node, keys[i], null);
            } else if (_nodes[target] && _removedNodeGuids.indexOf(target) === -1) {
                _core.setPointer(node, keys[i], _nodes[target]);
            } else {
                console.log('error handling needed???!!!???');
            }
        }

        //sets
        keys = _core.getSetNames(node);
        for (i = 0; i < keys.length; i++) {
            _core.deleteSet(node, keys[i]);
        }
        keys = Object.keys(jsonNode.sets);
        for (i = 0; i < keys.length; i++) {
            //for every set we create it, go through its members...
            _core.createSet(node, keys[i]);
            for (j = 0; j < jsonNode.sets[keys[i]].length; j++) {
                memberGuid = jsonNode.sets[keys[i]][j].guid;
                if (_nodes[memberGuid]) {
                    _core.addMember(node, keys[i], _nodes[memberGuid]);
                    for (k in jsonNode.sets[keys[i]][j].attributes) {
                        _core.setMemberAttribute(node, keys[i], _core.getPath(_nodes[memberGuid]), k,
                            jsonNode.sets[keys[i]][j].attributes[k]);
                    }
                    for (k in jsonNode.sets[keys[i]][j].registry) {
                        _core.setMemberRegistry(node, keys[i], _core.getPath(_nodes[memberGuid]), k,
                            jsonNode.sets[keys[i]][j].registry[k]);
                    }
                }
            }
        }
    }

    function updateInheritance() {
        var i,
            guidList = Object.keys(_import.nodes),
            base;
        for (i = 0; i < guidList.length; i++) {
            base = _core.getBase(_nodes[guidList[i]]);
            if ((base && _core.getGuid(base) !== _import.nodes[guidList[i]].base) ||
                (base === null && _import.nodes[guidList[i]].base !== null)) {

                updateNodeInheritance(guidList[i]);
            }
        }
    }

    function updateNodeInheritance(guid) {
        _core.setBase(_nodes[guid], _nodes[_import.nodes[guid].base]);
    }

    function updateMetaRules(guid, containmentTreeObject) {

        var keys, i;

        updateMeta(guid);

        keys = Object.keys(containmentTreeObject);
        for (i = 0; i < keys.length; i++) {
            updateMetaRules(keys[i], containmentTreeObject[keys[i]]);
        }
    }

    function updateMeta(guid) {
        _core.clearMetaRules(_nodes[guid]);

        updateAttributeMeta(guid);
        updateChildrenMeta(guid);
        updatePointerMeta(guid);
        updateAspectMeta(guid);
        updateConstraintMeta(guid);
    }

    function updateAttributeMeta(guid) {
        var jsonMeta = _import.nodes[guid].meta.attributes || {},
            node = _nodes[guid],
            keys, i;

        keys = Object.keys(jsonMeta);
        for (i = 0; i < keys.length; i++) {
            _core.setAttributeMeta(node, keys[i], jsonMeta[keys[i]]);
        }
    }

    function updateChildrenMeta(guid) {
        var jsonMeta = _import.nodes[guid].meta.children || {items: [], minItems: [], maxItems: []},
            i;
        ASSERT(jsonMeta.items.length === jsonMeta.minItems.length &&
            jsonMeta.minItems.length === jsonMeta.maxItems.length);

        _core.setChildrenMetaLimits(_nodes[guid], jsonMeta.min, jsonMeta.max);
        for (i = 0; i < jsonMeta.items.length; i++) {
            _core.setChildMeta(_nodes[guid], _nodes[jsonMeta.items[i]], jsonMeta.minItems[i], jsonMeta.maxItems[i]);
        }
    }

    function updatePointerMeta(guid) {
        var jsonMeta = _import.nodes[guid].meta.pointers || {},
            keys = Object.keys(jsonMeta),
            i, j;

        for (i = 0; i < keys.length; i++) {
            ASSERT(jsonMeta[keys[i]].items.length === jsonMeta[keys[i]].minItems.length &&
                jsonMeta[keys[i]].maxItems.length === jsonMeta[keys[i]].minItems.length);

            for (j = 0; j < jsonMeta[keys[i]].items.length; j++) {
                _core.setPointerMetaTarget(_nodes[guid], keys[i], _nodes[jsonMeta[keys[i]].items[j]],
                    jsonMeta[keys[i]].minItems[j], jsonMeta[keys[i]].maxItems[j]);
            }
            _core.setPointerMetaLimits(_nodes[guid], keys[i], jsonMeta[keys[i]].min, jsonMeta[keys[i]].max);
        }
    }

    function updateAspectMeta(guid) {
        var jsonMeta = _import.nodes[guid].meta.aspects || {},
            keys = Object.keys(jsonMeta),
            i, j;

        for (i = 0; i < keys.length; i++) {
            for (j = 0; j < jsonMeta[keys[i]].length; j++) {
                _core.setAspectMetaTarget(_nodes[guid], keys[i], _nodes[jsonMeta[keys[i]][j]]);
            }
        }
    }

    function updateConstraintMeta(guid) {
        var jsonMeta = _import.nodes[guid].meta.constraints || {},
            keys = Object.keys(jsonMeta),
            i;

        for (i = 0; i < keys.length; i++) {
            _core.setConstraint(_nodes[guid], keys[i], jsonMeta[keys[i]]);
        }
    }

    return {
        export: exportLibrary,
        import: importLibrary
    };
});
