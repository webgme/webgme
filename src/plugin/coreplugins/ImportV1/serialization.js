/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert', 'common/core/constants', 'blob/BlobConfig'], function (ASSERT, CONSTANTS, BlobConfig) {
    'use strict';

    function exportLibraryWithAssets(core, libraryRoot, callback) {
        exportLibraryNodeByNode(core, libraryRoot, {withAssets: true}, callback);
    }

    function exportLibrary(core, libraryRoot, callback) {
        exportLibraryNodeByNode(core, libraryRoot, {withAssets: false}, callback);
    }

    function getMetaDataOfExport(core, libraryRoot, options) {
        var result = {},
            root = core.getRoot(libraryRoot);

        if (root === libraryRoot) {
            result.type = CONSTANTS.EXPORT_TYPE_PROJECT;
        } else {
            result.type = CONSTANTS.EXPORT_TYPE_LIBRARY;
        }

        //FIXME check why does it changes with each import
        // result.rootHash = core.getHash(root);
        result.rootGuid = core.getGuid(root);

        if (options && options.withAssets) {
            result.hasAssets = true;
        } else {
            result.hasAssets = false;
        }

        return result;
    }

    function exportLibraryNodeByNode(core, libraryRoot, options, callback) {
        var exportProject = {
                _metadata: getMetaDataOfExport(core, libraryRoot, options),
                root: {
                    path: core.getPath(libraryRoot),
                    guid: core.getGuid(libraryRoot)
                },
                containment: {},
                bases: {},
                relids: {},
                nodes: {}
            },
            assetInfos = [],
            pathToGuid = {},
            ancestorPathToGuid = {},
            taskQueue = [{path: core.getPath(libraryRoot), containment: exportProject.containment}],
            maxParalelTasks = 100,
            ongoingTaskCounter = 0,
            timerId,
            errorTxt = '',
            root = core.getRoot(libraryRoot);

        function getAttributes(node) {
            var names = core.getOwnAttributeNames(node).sort(),
                i,
                result = {};
            for (i = 0; i < names.length; i++) {
                result[names[i]] = core.getAttribute(node, names[i]);
                if (BlobConfig.hashRegex.test(result[names[i]])) {
                    assetInfos.push({
                        hash: result[names[i]],
                        attrName: names[i],
                        nodePath: core.getPath(node)
                    });
                }
            }
            return result;
        }

        function getRegistry(node) {
            var names = core.getOwnRegistryNames(node).sort(),
                i,
                result = {};
            for (i = 0; i < names.length; i++) {
                result[names[i]] = core.getRegistry(node, names[i]);
            }
            return result;
        }

        function getPointers(node) {
            var names = core.getOwnPointerNames(node).sort(),
                i,
                result = {};

            for (i = 0; i < names.length; i++) {
                result[names[i]] = core.getPointerPath(node, names[i]);
            }
            return result;
        }

        function getSets(node) {
            var setsInfo = {},
                setNames = core.getSetNames(node).sort(),
                i, j, k,
                keys,
                members,
                memberInfo;
            for (i = 0; i < setNames.length; i += 1) {
                members = core.getOwnMemberPaths(node, setNames[i]);
                setsInfo[setNames[i]] = [];

                for (j = 0; j < members.length; j += 1) {
                    memberInfo = {
                        attributes: {},
                        guid: members[j],
                        registry: {}
                    };

                    //attributes
                    keys = core.getMemberAttributeNames(node, setNames[i], members[j]).sort();
                    for (k = 0; k < keys.length; k += 1) {
                        memberInfo.attributes[keys[k]] =
                            core.getMemberAttribute(node, setNames[i], members[j], keys[k]);
                    }

                    //registry
                    keys = core.getMemberRegistryNames(node, setNames[i], members[j]).sort();
                    for (k = 0; k < keys.length; k += 1) {
                        memberInfo.registry[keys[k]] =
                            core.getMemberRegistry(node, setNames[i], members[j], keys[k]);
                    }

                    //overridden flag
                    if (core.isFullyOverriddenMember(node, setNames[i], members[j])) {
                        memberInfo.overridden = true;
                    }

                    setsInfo[setNames[i]].push(memberInfo);
                }
            }
            return setsInfo;
        }

        // TODO: remove if not used..
        function getConstraints(node) {
            var names = core.getOwnConstraintNames(node).sort(),
                i,
                result = {};
            for (i = 0; i < names.length; i++) {
                result[names[i]] = core.getConstraint(node, names[i]);
            }
            return result;
        }

        function fillAncestorHashes(node) {
            var base = core.getBase(node);
            while (base) {
                ancestorPathToGuid[core.getPath(base)] = core.getGuid(base);
                base = core.getBase(base);
            }
        }

        function addChildrenTasks(node, containment) {
            var childrenPaths = core.getOwnChildrenPaths(node),
                i;

            for (i = 0; i < childrenPaths.length; i += 1) {
                taskQueue.push({path: childrenPaths[i], containment: containment});
            }
        }

        function expNode(node, containment) {
            var guid = core.getGuid(node);

            if (exportProject.relids[guid] || exportProject.nodes[guid]) {
                errorTxt += '[' + core.getPath(node) + '] has a colliding guid {' + guid + '} and will be skipped!\n';
                return;
            }

            containment[guid] = {};
            addChildrenTasks(node, containment[guid]);

            pathToGuid[core.getPath(node)] = guid;
            fillAncestorHashes(node);

            exportProject.relids[guid] = core.getRelid(node);
            exportProject.nodes[guid] = {
                attributes: getAttributes(node),
                base: core.getBase(node) ? core.getGuid(core.getBase(node)) : null,
                meta: JSON.parse(JSON.stringify(core.getOwnJsonMeta(node))) || {},
                parent: core.getParent(node) ? core.getGuid(core.getParent(node)) : null,
                pointers: getPointers(node),
                registry: getRegistry(node),
                sets: getSets(node)/*,
                 constraints: getConstraints(node) this is now part of the meta */
            };
        }

        function pathToGuidInObject(object) {
            var keys = Object.keys(object),
                i,
                pathToCompositeId = function (path) {
                    var relPath = '',
                        guid = undefined,
                        pathArray = path.split('/');

                    do {
                        guid = ancestorPathToGuid[path] || pathToGuid[path];
                        if (!guid) {
                            relPath = '/' + pathArray.pop() + relPath;
                            path = pathArray.join('/');
                        }
                    } while (!guid && pathArray.length > 0);

                    return relPath === '' ? guid : guid + '@' + relPath;
                };

            for (i = 0; i < keys.length; i += 1) {
                if (typeof object[keys[i]] === 'string' && object[keys[i]].indexOf('/') === 0) {
                    object[keys[i]] = pathToCompositeId(object[keys[i]]);
                } else if (typeof object[keys[i]] === 'object' && object[keys[i]] !== null) {
                    pathToGuidInObject(object[keys[i]]);
                }
            }
        }

        function replacePathsWithGuid() {
            var keys = Object.keys(exportProject.nodes || {}),
                i,
                node;

            for (i = 0; i < keys.length; i += 1) {
                node = exportProject.nodes[keys[i]];
                pathToGuidInObject(node.pointers || {});
                pathToGuidInObject(node.sets || {});
                pathToGuidInObject(node.meta || {});
            }
        }

        function gatherAncestorInfo() {
            var i,
                keys = Object.keys(ancestorPathToGuid),
                bases = {};

            for (i = 0; i < keys.length; i += 1) {
                if (pathToGuid[keys[i]] === undefined && keys[i].indexOf(exportProject.root.path) !== 0) {
                    bases[ancestorPathToGuid[keys[i]]] = keys[i];
                }
            }

            exportProject.bases = bases;
        }

        function orderNodesByGuid() {
            //TODO this function can be removed if we stop counting on the stringify implicit ordering of keys
            var orderedNodes = {},
                guids = Object.keys(exportProject.nodes).sort(),
                i;
            for (i = 0; i < guids.length; i += 1) {
                orderedNodes[guids[i]] = exportProject.nodes[guids[i]];
            }

            delete exportProject.nodes;
            exportProject.nodes = orderedNodes;
        }

        function orderSetMembersByGuid() {
            var guids = Object.keys(exportProject.nodes),
                i, setNames, j,
                node,
                sorting = function (aObj, bObj) {
                    if (aObj.guid === bObj.guid) {
                        return 0;
                    }

                    if (aObj.guid < bObj.guid) {
                        return -1;
                    }

                    return 1;
                };

            for (i = 0; i < guids.length; i += 1) {
                node = exportProject.nodes[guids[i]];
                setNames = Object.keys(node.sets || {});
                for (j = 0; j < setNames.length; j += 1) {
                    node.sets[setNames[j]] = node.sets[setNames[j]].sort(sorting);
                }
            }
        }

        function orderMetaInformationByGuid() {
            var guids = Object.keys(exportProject.nodes),
                i, names, j,
                sortItemedObjects = function (input) {
                    var output = {
                            items: [],
                            minItems: [],
                            maxItems: []
                        },
                        itemGuids = JSON.parse(JSON.stringify(input.items || [])).sort(),
                        i;

                    if (input.max !== undefined) {
                        output.max = input.max;
                    }
                    if (input.min !== undefined) {
                        output.min = input.min;
                    }
                    for (i = 0; i < itemGuids.length; i += 1) {
                        output.items.push(itemGuids[i]);
                        output.minItems.push(input.minItems[input.items.indexOf(itemGuids[i])]);
                        output.maxItems.push(input.maxItems[input.items.indexOf(itemGuids[i])]);
                    }
                    return output;
                },
                node;

            for (i = 0; i < guids.length; i += 1) {
                node = exportProject.nodes[guids[i]];
                if (node.meta) {
                    if (node.meta.children) {
                        node.meta.children = sortItemedObjects(node.meta.children);
                    }
                    if (node.meta.pointers) {
                        names = Object.keys(node.meta.pointers);
                        for (j = 0; j < names.length; j += 1) {
                            node.meta.pointers[names[j]] = sortItemedObjects(node.meta.pointers[names[j]]);
                        }
                    }

                    if (node.meta.aspects) {
                        names = Object.keys(node.meta.aspects);
                        for (j = 0; j < names.length; j += 1) {
                            node.meta.aspects[names[j]] = node.meta.aspects[names[j]].sort();
                        }
                    }
                }
            }
        }

        function orderRelidHashByGuids() {
            //TODO this function can be removed if we stop counting on the stringify implicit ordering of keys
            var orderedNodes = {},
                guids = Object.keys(exportProject.relids).sort(),
                i;
            for (i = 0; i < guids.length; i += 1) {
                orderedNodes[guids[i]] = exportProject.relids[guids[i]];
            }

            delete exportProject.relids;
            exportProject.relids = orderedNodes;
        }

        function removeRootLevelFromContainmentInfo() {
            exportProject.containment = exportProject.containment[exportProject.root.guid];
        }

        function orderContainmentByGuidRecursively(containment) {
            var keys = Object.keys(containment).sort(),
                i,
                orderedContainment = {};
            for (i = 0; i < keys.length; i += 1) {
                orderedContainment[keys[i]] = orderContainmentByGuidRecursively(containment[keys[i]]);
            }

            return orderedContainment;
        }

        function orderContainment() {
            //TODO this function can be removed if we stop counting on the stringify implicit ordering of keys
            exportProject.containment = orderContainmentByGuidRecursively(exportProject.containment);
        }

        function getMetaSheetsInformation() {
            var getMemberRegistry = function (setname, memberpath) {
                    var names = core.getMemberRegistryNames(root, setname, memberpath),
                        i,
                        registry = {};
                    for (i = 0; i < names.length; i++) {
                        registry[names[i]] = core.getMemberRegistry(root, setname, memberpath, names[i]);
                    }
                    return registry;
                },
                getMemberAttributes = function (setname, memberpath) {
                    var names = core.getMemberAttributeNames(root, setname, memberpath),
                        i,
                        attributes = {};
                    for (i = 0; i < names.length; i++) {
                        attributes[names[i]] = core.getMemberAttribute(root, setname, memberpath, names[i]);
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
                registry = core.getRegistry(root, 'MetaSheets'),
                keys = core.getSetNames(root),
                elements, guid,
                i,
                j;

            if (core.getParent(libraryRoot) === null) {
                exportProject.metaSheets = {};
                return;
            }

            for (i = 0; i < keys.length; i++) {
                if (keys[i].indexOf('MetaAspectSet') === 0) {
                    elements = core.getMemberPaths(root, keys[i]);
                    sheets[keys[i]] = sheets[keys[i]] || {};
                    for (j = 0; j < elements.length; j++) {
                        guid = {guid: elements[j]};
                        pathToGuidInObject(guid);
                        guid = guid.guid;
                        if (guid.indexOf('/') === -1) {
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
            exportProject.metaSheets = sheets;
        }

        function finalProcesses() {
            replacePathsWithGuid();
            gatherAncestorInfo();
            orderNodesByGuid();
            orderRelidHashByGuids();
            orderSetMembersByGuid();
            orderMetaInformationByGuid();
            removeRootLevelFromContainmentInfo();
            orderContainment();
            getMetaSheetsInformation();

            if (options.withAssets) {
                exportProject = {projectJson: exportProject, assets: assetInfos};
            }

            callback(errorTxt, exportProject);
        }

        //here starts the export function
        timerId = setInterval(function () {
            var task;
            if (ongoingTaskCounter < maxParalelTasks) {
                task = taskQueue.shift();

                if (!task && ongoingTaskCounter === 0) {
                    //we are done
                    clearInterval(timerId);
                    finalProcesses();
                    return;
                }

                if (task) {
                    ongoingTaskCounter += 1;
                    core.loadByPath(root, task.path, function (err, node) {
                        if (!err && node) {
                            expNode(node, task.containment);
                        } else {
                            errorTxt += '[' + task.path + '] cannot be loaded and will be missing from the export! \n';
                        }
                        ongoingTaskCounter -= 1;
                    });
                }
            }
        }, 1);
    }

    function exportLibraryCached(core, libraryRoot, options, callback) {
        //setting placeholder for cached values
        options.cache = {nodes: {}, path2Guid: {}, guids: [], assets: [], extraBasePaths: {}, export: {}};

        function gatherAncestors() {
            //this function inserts the needed base classes which were not included in the library
            var i, base, guid;
            for (i = 0; i < options.cache.guids.length; i += 1) {
                base = options.cache.nodes[options.cache.guids[i]];
                while (base !== null) {
                    guid = core.getGuid(base);
                    if (!options.cache.nodes[guid]) {
                        options.cache.nodes[guid] = base;
                        options.cache.extraBasePaths[core.getPath(base)] = guid;
                    } else if (options.cache.guids.indexOf(guid) === -1) {
                        options.cache.extraBasePaths[core.getPath(base)] = guid;
                    }
                    base = core.getBase(base);
                }
            }
        }

        function pathsToSortedGuidList(pathsList) { //it will also filter out not wanted elements
            var i, guids = [];
            for (i = 0; i < pathsList.length; i++) {
                if (options.cache.path2Guid[pathsList[i]]) {
                    guids.push(options.cache.path2Guid[pathsList[i]]);
                }
            }
            return guids.sort();
        }

        function fillContainmentTree(node, jsonContainment) {
            var childrenGuids = pathsToSortedGuidList(core.getChildrenPaths(node)),
                i;
            for (i = 0; i < childrenGuids.length; i++) {
                jsonContainment[childrenGuids[i]] = {};
                fillContainmentTree(options.cache.nodes[childrenGuids[i]], jsonContainment[childrenGuids[i]]);
            }
        }

        function getNodeData(node) {
            function getAttributesOfNode() {
                var names = core.getOwnAttributeNames(node).sort(),
                    i,
                    value,
                    result = {};
                for (i = 0; i < names.length; i += 1) {
                    value = core.getAttribute(node, names[i]);
                    result[names[i]] = value;
                    // Just make a simple regex test here
                    if (BlobConfig.hashRegex.test(value)) {
                        options.cache.assets.push({
                            hash: value,
                            attrName: names[i],
                            nodePath: core.getPath(node)
                        });
                    }
                }
                return result;
            }

            function getRegistryOfNode() {
                var names = core.getOwnRegistryNames(node).sort(),
                    i,
                    result = {};
                for (i = 0; i < names.length; i++) {
                    result[names[i]] = core.getRegistry(node, names[i]);
                }
                return result;
            }

            // TODO: remove if not used..
            function getConstraintsOfNode() {
                var names = core.getOwnConstraintNames(node).sort(),
                    i,
                    result = {};
                for (i = 0; i < names.length; i++) {
                    result[names[i]] = core.getConstraint(node, names[i]);
                }
                return result;
            }

            function getPointersOfNode() {
                var names = core.getOwnPointerNames(node).sort(),
                    i,
                    result = {},
                    target;
                for (i = 0; i < names.length; i++) {
                    target = core.getPointerPath(node, names[i]);
                    if (options.cache.path2Guid[target] || options.cache.extraBasePaths[target] || target === null) {
                        result[names[i]] =
                            options.cache.path2Guid[target] || options.cache.extraBasePaths[target] || null;
                    }
                }
                return result;
            }

            function getSetsOfNode() {
                var names = core.getSetNames(node).sort(),
                    i, j, k,
                    result = {},
                    targetGuids,
                    attributeNames,
                    registryNames,
                    memberInfo,
                    path;
                for (i = 0; i < names.length; i++) {
                    targetGuids = pathsToSortedGuidList(core.getOwnMemberPaths(node, names[i]));
                    result[names[i]] = [];
                    for (j = 0; j < targetGuids.length; j++) {
                        path = core.getPath(options.cache.nodes[targetGuids[j]]);
                        memberInfo = {
                            attributes: {},
                            guid: targetGuids[j],
                            registry: {}
                        };

                        //attributes
                        attributeNames = core.getMemberAttributeNames(node, names[i], path).sort();
                        for (k = 0; k < attributeNames.length; k++) {
                            memberInfo.attributes[attributeNames[k]] =
                                core.getMemberAttribute(node, names[i], path, attributeNames[k]);
                        }

                        //registry
                        registryNames = core.getMemberRegistryNames(node, names[i], path).sort();
                        for (k = 0; k < registryNames.length; k++) {
                            memberInfo.registry[registryNames[k]] =
                                core.getMemberRegistry(node, names[i], path, registryNames[k]);
                        }

                        //overridden flag
                        if (core.isFullyOverriddenMember(node, names[i], path)) {
                            memberInfo.overridden = true;
                        }

                        result[names[i]].push(memberInfo);
                    }
                }
                return result;
            }

            return {
                attributes: getAttributesOfNode(node),
                base: core.getBase(node) ? core.getGuid(core.getBase(node)) : null,
                meta: pathsToGuids(JSON.parse(JSON.stringify(core.getOwnJsonMeta(node)) || {})),
                parent: core.getParent(node) ? core.getGuid(core.getParent(node)) : null,
                pointers: getPointersOfNode(node),
                registry: getRegistryOfNode(node),
                sets: getSetsOfNode(node)/*,
                 constraints: getConstraintsOfNode(node) the constraints now part of the meta definition */
            };
        }

        function getMetaSheetInfo(root) {
            var getMemberRegistry = function (setname, memberpath) {
                    var names = core.getMemberRegistryNames(root, setname, memberpath),
                        i,
                        registry = {};
                    for (i = 0; i < names.length; i++) {
                        registry[names[i]] = core.getMemberRegistry(root, setname, memberpath, names[i]);
                    }
                    return registry;
                },
                getMemberAttributes = function (setname, memberpath) {
                    var names = core.getMemberAttributeNames(root, setname, memberpath),
                        i,
                        attributes = {};
                    for (i = 0; i < names.length; i++) {
                        attributes[names[i]] = core.getMemberAttribute(root, setname, memberpath, names[i]);
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
                registry = core.getRegistry(root, 'MetaSheets'),
                keys = core.getSetNames(root),
                elements, guid,
                i,
                j;

            for (i = 0; i < keys.length; i++) {
                if (keys[i].indexOf('MetaAspectSet') === 0) {
                    elements = core.getMemberPaths(root, keys[i]);
                    for (j = 0; j < elements.length; j++) {
                        guid = options.cache.path2Guid[elements[j]] || options.cache.extraBasePaths[elements[j]];
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

        function getSortedIndex(arr) {
            var index = [],
                i;
            for (i = 0; i < arr.length; i++) {
                index.push(i);
            }
            index = index.sort((function (arr) {
                return function (a, b) {
                    return ((arr[a] > arr[b]) ? 1 : ((arr[a] < arr[b]) ? -1 : 0));
                };
            })(arr));
            return index;
        }

        function sortMultipleArrays() {
            var index = getSortedIndex(arguments[0]),
                i, j, arr;
            for (j = 0; j < arguments.length; j++) {
                arr = arguments[j].slice();
                for (i = 0; i < arr.length; i++) {
                    arguments[j][i] = arr[index[i]];
                }
            }
        }

        function pathsToGuids(jsonObject) {
            if (jsonObject && typeof jsonObject === 'object') {
                var keys = Object.keys(jsonObject),
                    i, j, k, toDelete, tArray;

                for (i = 0; i < keys.length; i++) {
                    if (keys[i] === 'items') {
                        //here comes the transformation itself
                        toDelete = [];
                        for (j = 0; j < jsonObject.items.length; j++) {
                            if (options.cache.path2Guid[jsonObject.items[j]]) {
                                jsonObject.items[j] = options.cache.path2Guid[jsonObject.items[j]];
                            } else if (options.cache.extraBasePaths[jsonObject.items[j]]) {
                                jsonObject.items[j] = options.cache.extraBasePaths[jsonObject.items[j]];
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
                                if (options.cache.path2Guid[jsonObject.aspects[tArray[j]][k]]) {
                                    jsonObject.aspects[tArray[j]][k] =
                                        options.cache.path2Guid[jsonObject.aspects[tArray[j]][k]];
                                } else if (options.cache.extraBasePaths[jsonObject.aspects[tArray[j]][k]]) {
                                    jsonObject.aspects[tArray[j]][k] =
                                        options.cache.extraBasePaths[jsonObject.aspects[tArray[j]][k]];
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

        //--- here starts the function ---

        //loading the complete sub-tree
        core.loadSubTree(libraryRoot, function (err, loadedNodes) {
            var guid, i, keys,
                guids = options.cache.guids,
                nodes = options.cache.nodes,
                jsonExport = options.cache.export,
                extraBasePaths = options.cache.extraBasePaths,
                path2Guid = options.cache.path2Guid;
            if (err) {
                callback(err);
                return;
            }
            loadedNodes = loadedNodes || [];
            for (i = 0; i < loadedNodes.length; i += 1) {
                guid = core.getGuid(loadedNodes[i]);
                nodes[guid] = loadedNodes[i];
                guids.push(guid);
                path2Guid[core.getPath(loadedNodes[i])] = guid;
            }
            guids.sort();

            //filling up extraBasePaths dictionary
            gatherAncestors();

            //saving extra base information into the export format
            keys = Object.keys(extraBasePaths);
            jsonExport.bases = {};
            for (i = 0; i < keys.length; i++) {
                jsonExport.bases[extraBasePaths[keys[i]]] = keys[i];
            }

            //export root info
            jsonExport.root = {
                path: core.getPath(libraryRoot),
                guid: core.getGuid(libraryRoot)
            };

            //export relid dictionary
            jsonExport.relids = {};
            for (i = 0; i < guids.length; i += 1) {
                jsonExport.relids[guids[i]] = core.getRelid(nodes[guids[i]]);
            }

            //export containment
            jsonExport.containment = {};
            fillContainmentTree(libraryRoot, jsonExport.containment);

            //export node data
            jsonExport.nodes = {};
            for (i = 0; i < guids.length; i += 1) {
                jsonExport.nodes[guids[i]] = getNodeData(nodes[guids[i]]);
            }

            //we export MetaSheet info only if not the whole project is exported!!!
            jsonExport.metaSheets = core.getParent(libraryRoot) ? getMetaSheetInfo(core.getRoot(libraryRoot)) : {};

            if (options.withAssets) {
                jsonExport = {projectJson: jsonExport, assets: options.cache.assets};
            }
            callback(null, jsonExport);
        });
    }

    function importLibrary(core, originLibraryRoot, updatedLibraryJson, callback) {
        var exportOptions = {},
            jsonExport,
            nodes,
            logTxt = '',
            guids = {};

        //function log(txt) {
        //    logTxt += '\n' + txt;
        //}

        //function logId(nodes, id) {
        //    var txtId = id + '';
        //    if (nodes[id] && nodes[id].attributes && nodes[id].attributes.name) {
        //        txtId = nodes[id].attributes.name + '(' + id + ')';
        //    }
        //
        //    return txtId;
        //}

        function loadImportBases(callback) {
            var needed = [],
                error = null,
                stillToGo = 0,
                i,
                guids = updatedLibraryJson.bases || {},
                root = core.getRoot(originLibraryRoot),
                guidList = Object.keys(guids),
                baseLoaded = function (err) {
                    error = error || err;
                    if (--stillToGo === 0) {
                        callback(error);
                    }
                },
                loadBase = function (guid, path) {
                    core.loadByPath(root, path, function (err, node) {
                        if (err) {
                            return baseLoaded(err);
                        }
                        if (core.getGuid(node) !== guid) {
                            return baseLoaded('GUID mismatch');
                        }

                        nodes[guid] = node;
                        baseLoaded(null);
                    });
                };

            for (i = 0; i < guidList.length; i++) {
                if (nodes[guidList[i]] === undefined) {
                    needed.push(guidList[i]);
                }
            }

            if (needed.length > 0) {
                stillToGo = needed.length;
                for (i = 0; i < needed.length; i++) {
                    loadBase(needed[i], guids[needed[i]]);
                }
            } else {
                callback(null);
            }

        }

        function updateRegistry(guid) {
            var keys, i, key,
                node = nodes[guid],
                jsonNode = updatedLibraryJson.nodes[guid];

            keys = core.getOwnRegistryNames(node);
            for (i = 0; i < keys.length; i++) {
                core.delRegistry(node, keys[i]);
            }
            //keys = Object.keys(jsonNode.registry);
            //for (i = 0; i < keys.length; i++) {
            for (key in jsonNode.registry) {
                core.setRegistry(node, key, jsonNode.registry[key]);
            }
        }

        function updateAttributes(guid) {
            var keys, i, key,
                node = nodes[guid],
                jsonNode = updatedLibraryJson.nodes[guid];

            keys = core.getOwnAttributeNames(node);
            for (i = 0; i < keys.length; i++) {
                core.delAttribute(node, keys[i]);
            }
            // keys = Object.keys(jsonNode.attributes);
            // for (i = 0; i < keys.length; i++) {
            for (key in jsonNode.attributes) {
                core.setAttribute(node, key, jsonNode.attributes[key]);
            }
        }

        function updateConstraints(guid) {
            var keys, i, key,
                node = nodes[guid],
                jsonNode = updatedLibraryJson.nodes[guid];
            keys = core.getOwnConstraintNames(node);
            for (i = 0; i < keys.length; i++) {
                core.delConstraint(node, keys[i]);
            }

            // keys = Object.keys(jsonNode.constraints || {});
            // for (i = 0; i < keys.length; i++) {
            for (key in jsonNode.constraints) {
                core.setConstraint(node, key, jsonNode.constraints[key]);
            }
        }

        function updateNode(guid, parent) {
            //first we check if the node have to be moved
            var node = nodes[guid];

            if (parent && core.getParent(node) && core.getGuid(parent) !== core.getGuid(core.getParent(node))) {
                //parent changed so it has to be moved...
                nodes[guid] = core.moveNode(node, parent);
            }

            updateAttributes(guid);
            updateRegistry(guid);
            updateConstraints(guid);
        }

        function addNode(guid) {
            //at this point we assume that an empty vessel has been already created and part of the _nodes
            updateAttributes(guid);
            updateRegistry(guid);
            updateConstraints(guid);
        }

        function updateNodes(guid, parent, containmentTreeObject) {
            if (guids[guid] === 'update') {
                updateNode(guid, parent);
            }

            var keys = Object.keys(containmentTreeObject),
                i,
                node = nodes[guid],
                relid;

            for (i = 0; i < keys.length; i++) {
                if (guids[keys[i]] !== 'update') {
                    relid = updatedLibraryJson.relids[keys[i]];
                    if (core.getChildrenRelids(node).indexOf(relid) !== -1) {
                        relid = undefined;
                    }
                    //this child is a new one so we should create
                    nodes[keys[i]] = core.createNode({parent: node, guid: keys[i], relid: relid});
                    addNode(keys[i]);
                }
                updateNodes(keys[i], node, containmentTreeObject[keys[i]]);
            }
        }

        function updateNodeInheritance(guid) {
            core.setBase(nodes[guid], nodes[updatedLibraryJson.nodes[guid].base]);
        }

        function updateInheritance() {
            var i,
                guidList = Object.keys(updatedLibraryJson.nodes),
                base;
            for (i = 0; i < guidList.length; i++) {
                base = core.getBase(nodes[guidList[i]]);
                if ((base && core.getGuid(base) !== updatedLibraryJson.nodes[guidList[i]].base) ||
                    (base === null && updatedLibraryJson.nodes[guidList[i]].base !== null)) {
                    updateNodeInheritance(guidList[i]);
                }
            }
        }

        function getInheritanceBasedGuidOrder() {
            var inheritanceOrdered = Object.keys(updatedLibraryJson.nodes).sort(),
                i = 0,
                baseGuid,
                baseIndex;

            while (i < inheritanceOrdered.length) {
                baseGuid = updatedLibraryJson.nodes[inheritanceOrdered[i]].base;
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

        function getCombinedTarget(combinedId) {
            var idArray = combinedId.split('@'),
                node = nodes[idArray[0]],
                pathArray = (idArray[1] || '').split('/'),
                i;

            pathArray.shift();

            for (i = 0; i < pathArray.length; i += 1) {
                node = core.createNode({parent: node, relid: pathArray[i]});
            }

            return node;
        }

        function isCombinedId(id) {
            var idArray = id.split('@');
            return idArray.length === 2 && nodes[idArray[0]] && idArray[1][0] === '/';
        }

        function updateNodeRelations(guid) {
            // Although it is possible that we set the base pointer at this point
            // we should go through inheritance just to be sure.
            var node = nodes[guid],
                jsonNode = updatedLibraryJson.nodes[guid],
                keys, i, j, k, target, memberGuid, member,
                baseMemberPaths, base, key, set, setj;

            //pointers
            //The base pointer should be always removed, as at this point it could be already set falsly.
            core.deletePointer(node, 'base');
            if (guids[guid] === 'update') {
                keys = core.getOwnPointerNames(node);
                for (i = 0; i < keys.length; i++) {
                    core.deletePointer(node, keys[i]);
                }
            }

            // keys = Object.keys(jsonNode.pointers);
            // for (i = 0; i < keys.length; i++) {
            for (key in jsonNode.pointers) {
                target = jsonNode.pointers[key];
                if (target === null) {
                    core.setPointer(node, key, null);
                } else if (nodes[target] && guids[target] !== 'remove') {
                    core.setPointer(node, key, nodes[target]);
                } else if (isCombinedId(target)) {
                    core.setPointer(node, key, getCombinedTarget(target));
                } else {
                    throw new Error('invalid pointer target found [' + target +
                        '] for pointer [' + key + '] of node [' + guid + ']');
                }
            }

            //sets
            if (guids[guid] === 'update') {
                keys = core.getSetNames(node);
                for (i = 0; i < keys.length; i += 1) {
                    core.deleteSet(node, keys[i]);
                }
            }

            // keys = Object.keys(jsonNode.sets);
            // for (i = 0; i < keys.length; i++) {
            for (key in jsonNode.sets) {
                set = jsonNode.sets[key];
                //for every set we create it, go through its members...
                base = core.getBase(node);
                baseMemberPaths = base !== null ? core.getMemberPaths(base, key) : [];
                core.createSet(node, key);
                for (j = 0; j < set.length; j++) {
                    setj = set[j];
                    memberGuid = setj.guid;
                    if (nodes[memberGuid] || isCombinedId(memberGuid)) {
                        member = getCombinedTarget(memberGuid);
                        var memberPath = core.getPath(member);
                        if (baseMemberPaths.indexOf(memberPath) === -1 ||
                            setj.overridden === true) {
                            core.addMember(node, key, member);
                        }
                        for (k in setj.attributes) {
                            core.setMemberAttribute(node, key, memberPath, k,
                                setj.attributes[k]);
                        }
                        for (k in setj.registry) {
                            core.setMemberRegistry(node, key, memberPath, k,
                                setj.registry[k]);
                        }
                    }
                }
            }
        }

        function updateRelations() {
            var guids = getInheritanceBasedGuidOrder(),
                i;
            for (i = 0; i < guids.length; i++) {
                updateNodeRelations(guids[i]);
            }
        }

        function updateAttributeMeta(guid, meta) {
            var jsonMeta = meta.attributes || {},
                node = nodes[guid],
                keys, i;

            keys = Object.keys(jsonMeta);
            for (i = 0; i < keys.length; i++) {
                core.setAttributeMeta(node, keys[i], jsonMeta[keys[i]]);
            }
        }

        function updateChildrenMeta(guid, meta) {
            var jsonMeta = meta.children || {items: [], minItems: [], maxItems: []},
                i;
            ASSERT(jsonMeta.items.length === jsonMeta.minItems.length &&
                jsonMeta.minItems.length === jsonMeta.maxItems.length);

            core.setChildrenMetaLimits(nodes[guid], jsonMeta.min, jsonMeta.max);
            for (i = 0; i < jsonMeta.items.length; i++) {
                core.setChildMeta(nodes[guid], nodes[jsonMeta.items[i]], jsonMeta.minItems[i], jsonMeta.maxItems[i]);
            }
        }

        function updatePointerMeta(guid, meta) {
            var jsonMeta = meta.pointers || {},
                keys = Object.keys(jsonMeta),
                i, j;

            for (i = 0; i < keys.length; i++) {
                ASSERT(jsonMeta[keys[i]].items.length === jsonMeta[keys[i]].minItems.length &&
                    jsonMeta[keys[i]].maxItems.length === jsonMeta[keys[i]].minItems.length);

                for (j = 0; j < jsonMeta[keys[i]].items.length; j++) {
                    core.setPointerMetaTarget(nodes[guid], keys[i], nodes[jsonMeta[keys[i]].items[j]],
                        jsonMeta[keys[i]].minItems[j], jsonMeta[keys[i]].maxItems[j]);
                }
                core.setPointerMetaLimits(nodes[guid], keys[i], jsonMeta[keys[i]].min, jsonMeta[keys[i]].max);
            }
        }

        function updateAspectMeta(guid, meta) {
            var jsonMeta = meta.aspects || {},
                keys = Object.keys(jsonMeta),
                i, j;

            for (i = 0; i < keys.length; i++) {
                for (j = 0; j < jsonMeta[keys[i]].length; j++) {
                    core.setAspectMetaTarget(nodes[guid], keys[i], nodes[jsonMeta[keys[i]][j]]);
                }
            }
        }

        function updateConstraintMeta(guid, meta) {
            var jsonMeta = meta.constraints || {},
                keys = Object.keys(jsonMeta),
                i;

            for (i = 0; i < keys.length; i++) {
                core.setConstraint(nodes[guid], keys[i], jsonMeta[keys[i]]);
            }
        }

        function updateMixinMeta(guid) {
            var mixinGuids = updatedLibraryJson.nodes[guid].meta.mixins || [],
                i;

            for (i = 0; i < mixinGuids.length; i += 1) {
                if (nodes[mixinGuids[i]]) {
                    core.addMixin(nodes[guid], core.getPath(nodes[mixinGuids[i]]));
                }
            }
        }

        function updateMeta(guid) {
            if (guids[guid] === 'update') {
                core.clearMetaRules(nodes[guid]);
            }
            var meta = updatedLibraryJson.nodes[guid].meta;
            updateAttributeMeta(guid, meta);
            updateChildrenMeta(guid, meta);
            updatePointerMeta(guid, meta);
            updateAspectMeta(guid, meta);
            updateConstraintMeta(guid, meta);
            updateMixinMeta(guid);
        }

        function updateMetaRules(guid, containmentTreeObject) {

            var keys, i;

            updateMeta(guid);

            keys = Object.keys(containmentTreeObject);
            for (i = 0; i < keys.length; i++) {
                updateMetaRules(keys[i], containmentTreeObject[keys[i]]);
            }
        }

        function importMetaSheetInfo(root) {
            var setMemberAttributesAndRegistry = function (setname, memberguid) {
                    var attributes = oldSheets[setname][memberguid].attributes || {},
                        registry = oldSheets[setname][memberguid].registry || {},
                        keys = Object.keys(attributes),
                        i;

                    for (i = 0; i < keys.length; i++) {
                        core.setMemberAttribute(root, setname, core.getPath(nodes[memberguid]), keys[i],
                            attributes[keys[i]]);
                    }
                    keys = Object.keys(registry);
                    for (i = 0; i < keys.length; i++) {
                        core.setMemberRegistry(root, setname, core.getPath(nodes[memberguid]), keys[i],
                            registry[keys[i]]);
                    }
                },
                getCurrentShortSheetInfo = function () {
                    //we collect all the current sheet info, as they are more appropriate to being updated
                    var metaNodes = core.getAllMetaNodes(root),
                        sheets = {},
                        i,
                        keys = core.getSetNames(root),
                        j,
                        members;

                    for (i = 0; i < keys.length; i += 1) {
                        if (keys[i].indexOf('MetaAspectSet') === 0) {
                            members = core.getMemberPaths(root, keys[i]);
                            for (j = 0; j < members.length; j += 1) {
                                sheets[keys[i]] = sheets[keys[i]] || {};
                                sheets[keys[i]][core.getGuid(metaNodes[members[j]])] = {};
                            }
                        }
                    }

                    return sheets;
                },
                updateSheet = function (name) {
                    //if some element is extra in the place of import, then it stays untouched
                    var oldMemberGuids = Object.keys(oldSheets[name]),
                        newMemberGuids = Object.keys(newSheets[name]),
                        i;

                    for (i = 0; i < newMemberGuids.length; i += 1) {
                        if (oldMemberGuids.indexOf(newMemberGuids[i]) === -1 && nodes[newMemberGuids[i]]) {
                            //it was only removed from the sheet
                            core.delMember(root, name, newMemberGuids[i]);
                        }
                    }

                    if (oldMemberGuids.indexOf('global') !== -1) {
                        oldMemberGuids.splice(oldMemberGuids.indexOf('global'), 1);
                    }

                    for (i = 0; i < oldMemberGuids.length; i++) {
                        core.addMember(root, name, nodes[oldMemberGuids[i]]);
                        setMemberAttributesAndRegistry(name, oldMemberGuids[i]);
                    }
                },
                addSheet = function (name) {
                    var registry = JSON.parse(JSON.stringify(core.getRegistry(root, 'MetaSheets')) || {}),
                        i,
                        memberpath,
                        memberguids = Object.keys(oldSheets[name]);

                    if (memberguids.indexOf('global') !== -1) {
                        memberguids.splice(memberguids.indexOf('global'), 1);
                    }

                    if (name !== 'MetaAspectSet') {
                        registry.push(oldSheets[name].global);
                        core.setRegistry(root, 'MetaSheets', registry);
                    }

                    core.createSet(root, name);
                    for (i = 0; i < memberguids.length; i++) {
                        memberpath = core.getPath(nodes[memberguids[i]]);
                        core.addMember(root, name, nodes[memberguids[i]]);
                        setMemberAttributesAndRegistry(name, memberguids[i]);
                    }
                },
                oldSheets = updatedLibraryJson.metaSheets || {},
                newSheets = getCurrentShortSheetInfo(),
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

        //--- here starts the function ---
        //synchronize roots
        core.setGuid(originLibraryRoot, updatedLibraryJson.root.guid, function () {
            //create export and build up initial cache
            exportLibraryCached(core, originLibraryRoot, exportOptions, function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                //set the functionwise available variables
                nodes = exportOptions.cache.nodes;
                jsonExport = exportOptions.cache.export;

                //now we will search for the bases of the import and load them
                loadImportBases(function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    //now we fill the insert/update/remove lists of GUIDs
                    var oldkeys = Object.keys(jsonExport.nodes),
                        newkeys = Object.keys(updatedLibraryJson.nodes),
                        delkeys = [],
                        parent,
                        i;

                    //TODO now we make three rounds although one would be sufficient on ordered lists
                    for (i = 0; i < oldkeys.length; i++) {
                        if (!updatedLibraryJson.nodes[oldkeys[i]]) {
                            //log('node ' + logId(jsonExport.nodes, oldkeys[i]) +
                            //    ', all of its sub-types and its children will be removed');
                            guids[oldkeys[i]] = 'remove';
                            delkeys.push(oldkeys[i]);
                        }
                    }

                    for (i = 0; i < oldkeys.length; i++) {
                        if (updatedLibraryJson.nodes[oldkeys[i]]) {
                            //log('node ' + logId(jsonExport.nodes, oldkeys[i]) + ' will be updated');
                            guids[oldkeys[i]] = 'update';
                        }
                    }

                    for (i = 0; i < newkeys.length; i++) {
                        if (!jsonExport.nodes[newkeys[i]]) {
                            //log('node ' + logId(jsonExport.nodes, newkeys[i]) + ' will be added');
                            guids[newkeys[i]] = 'insert';
                        }
                    }

                    // Now we consolidate node list based on containment to minimize the number of deletion.
                    i = delkeys.length;
                    while (--i > 0) {
                        parent = core.getParent(nodes[delkeys[i]]);
                        if (!parent || guids[core.getGuid(parent)] === 'remove') {
                            delkeys.splice(i, 1);
                        }
                    }
                    // Finally we remove the necessary nodes.
                    for (i = 0; i < delkeys.length; i += 1) {
                        core.deleteNode(nodes[delkeys[i]]);
                    }

                    //as a second step we should deal with the updated nodes
                    //we should go among containment hierarchy
                    updateNodes(updatedLibraryJson.root.guid, null, updatedLibraryJson.containment);

                    //now update inheritance chain
                    //we assume that our inheritance chain comes from the FCO and that it is identical everywhere
                    updateInheritance();

                    //now we can add or modify the relations of the nodes - we go along the hierarchy chain
                    updateRelations();

                    //finally we need to update the meta rules of each node - again along the containment hierarchy
                    updateMetaRules(updatedLibraryJson.root.guid, updatedLibraryJson.containment);

                    //after everything is done we try to synchronize the metaSheet info
                    importMetaSheetInfo(core.getRoot(originLibraryRoot));

                    callback(null, logTxt || 'No information is available.');
                });
            });
        });
    }

    //TODO extra checkings can be done here - now everything is planned to be synchronous
    function checkImport(jsonImport, importType) {
        if (!jsonImport) {
            return 'Import should always be a valid JSON object!';
        }

        switch (importType) {
            case CONSTANTS.EXPORT_TYPE_PROJECT:
                if (jsonImport._metadata && jsonImport._metadata.type) {
                    if (jsonImport._metadata.type !== CONSTANTS.EXPORT_TYPE_PROJECT) {
                        return 'Import is of type \'' + CONSTANTS.EXPORT_TYPE_LIBRARY + '\' and not of \'' +
                            CONSTANTS.EXPORT_TYPE_PROJECT + '\'!';
                    }
                } else if (jsonImport.root && typeof jsonImport.root.path === 'string') {
                    if (jsonImport.root.path !== '') {
                        return 'Import is of type \'' + CONSTANTS.EXPORT_TYPE_LIBRARY + '\' and not of \'' +
                            CONSTANTS.EXPORT_TYPE_PROJECT + '\'!';
                    }
                } else {
                    return 'Import data is probably incomplete and should not be used!';
                }
                break;
            case CONSTANTS.EXPORT_TYPE_LIBRARY:
                if (jsonImport._metadata && jsonImport._metadata.type) {
                    if (jsonImport._metadata.type !== CONSTANTS.EXPORT_TYPE_LIBRARY) {
                        return 'Import is of type \'' + CONSTANTS.EXPORT_TYPE_PROJECT + '\' and not of \'' +
                            CONSTANTS.EXPORT_TYPE_LIBRARY + '\'!';
                    }
                } else if (jsonImport.root && typeof jsonImport.root.path === 'string') {
                    if (jsonImport.root.path === '') {
                        return 'Import is of type \'' + CONSTANTS.EXPORT_TYPE_PROJECT + '\' and not of \'' +
                            CONSTANTS.EXPORT_TYPE_LIBRARY + '\'!';
                    }
                } else {
                    return 'Import data is probably incomplete and should not be used!';
                }
                break;
            default:
                return 'Invalid type, cannot checked!';
        }

        return null;
    }

    return {
        export: exportLibrary,
        import: importLibrary,
        exportLibraryWithAssets: exportLibraryWithAssets,
        checkImport: checkImport
    };
});
