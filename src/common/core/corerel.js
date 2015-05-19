/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define(['common/util/assert', 'common/core/coretree', 'common/core/tasync'], function (ASSERT, CoreTree, TASYNC) {

    'use strict';

    // ----------------- RELID -----------------

    var ATTRIBUTES = 'atr';
    var REGISTRY = 'reg';
    var OVERLAYS = 'ovr';
    var COLLSUFFIX = '-inv';

    function isPointerName(name) {
        ASSERT(typeof name === 'string');
        //TODO this is needed as now we work with modified data as well
        if (name === '_mutable') {
            return false;
        }
        return name.slice(-COLLSUFFIX.length) !== COLLSUFFIX;
    }

    function isValidRelid(relid) {
        return typeof relid === 'string' && parseInt(relid, 10).toString() === relid;
    }

    function __test(text, cond) {
        if (!cond) {
            throw new Error(text);
        }
    }

    // ----------------- Core -----------------

    function CoreRel(coretree, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        ASSERT(typeof coretree === 'object');

        var logger = options.logger.fork('corerel');

        logger.debug('initialized');

        function isValidNode(node) {
            try {
                __test('coretree', coretree.isValidNode(node));
                __test('isobject', coretree.isObject(node));

                return true;
            } catch (error) {
                console.log('Wrong node', error.stack);
                return false;
            }
        }

        function getAttributeNames(node) {
            ASSERT(isValidNode(node));

            node = (coretree.getProperty(node, ATTRIBUTES) || {});
            var keys = coretree.getRawKeys(node);
            var i = keys.length;
            while (--i >= 0) {
                if (keys[i].charAt(0) === '') {
                    console.log('***** This happens?');
                    keys.splice(i, 1);
                }
            }

            return keys;
        }

        function getRegistryNames(node) {
            ASSERT(isValidNode(node));

            node = (coretree.getProperty(node, REGISTRY) || {});
            var keys = coretree.getRawKeys(node);
            var i = keys.length;
            while (--i >= 0) {
                if (keys[i].charAt(0) === '') {
                    console.log('***** This happens?');
                    keys.splice(i, 1);
                }
            }

            return keys;
        }

        function getAttribute(node, name) {
            /*node = coretree.getChild(node, ATTRIBUTES);
             return coretree.getProperty(node, name);*/
            return (coretree.getProperty(node, ATTRIBUTES) || {})[name];
        }

        function delAttribute(node, name) {
            node = coretree.getChild(node, ATTRIBUTES);
            coretree.deleteProperty(node, name);
        }

        function setAttribute(node, name, value) {
            node = coretree.getChild(node, ATTRIBUTES);
            coretree.setProperty(node, name, value);
        }

        function getRegistry(node, name) {
            /*node = coretree.getChild(node, REGISTRY);
             return coretree.getProperty(node, name);*/
            return (coretree.getProperty(node, REGISTRY) || {})[name];
        }

        function delRegistry(node, name) {
            node = coretree.getChild(node, REGISTRY);
            coretree.deleteProperty(node, name);
        }

        function setRegistry(node, name, value) {
            node = coretree.getChild(node, REGISTRY);
            coretree.setProperty(node, name, value);
        }

        function overlayInsert(overlays, source, name, target) {
            ASSERT(isValidNode(overlays) && coretree.getRelid(overlays) === OVERLAYS);
            ASSERT(coretree.isValidPath(source) && coretree.isValidPath(target) && isPointerName(name));
            ASSERT(coretree.getCommonPathPrefixData(source, target).common === '');

            // console.log('insert', overlays.parent.data.atr.name, source, name, target);

            var node = coretree.getChild(overlays, source);

            ASSERT(coretree.getProperty(node, name) === undefined);
            coretree.setProperty(node, name, target);

            node = coretree.getChild(overlays, target);
            name = name + COLLSUFFIX;

            var array = coretree.getProperty(node, name);
            if (array) {
                ASSERT(array.indexOf(source) < 0);

                array = array.slice(0);
                array.push(source);
            } else {
                array = [source];
            }

            coretree.setProperty(node, name, array);
        }

        function overlayRemove(overlays, source, name, target) {
            ASSERT(isValidNode(overlays) && coretree.getRelid(overlays) === OVERLAYS);
            ASSERT(coretree.isValidPath(source) && coretree.isValidPath(target) && isPointerName(name));
            ASSERT(coretree.getCommonPathPrefixData(source, target).common === '');

            // console.log('remove', overlays.parent.data.atr.name, source, name, target);

            var node = coretree.getChild(overlays, source);
            ASSERT(node && coretree.getProperty(node, name) === target);
            coretree.deleteProperty(node, name);

            node = coretree.getChild(overlays, target);
            ASSERT(node);

            name = name + COLLSUFFIX;

            var array = coretree.getProperty(node, name);
            ASSERT(Array.isArray(array) && array.length >= 1);

            if (array.length === 1) {
                ASSERT(array[0] === source);

                coretree.deleteProperty(node, name);
            } else {
                var index = array.indexOf(source);
                ASSERT(index >= 0);

                array = array.slice(0);
                array.splice(index, 1);

                coretree.setProperty(node, name, array);
            }
        }

        function overlayQuery(overlays, prefix) {
            ASSERT(isValidNode(overlays) && coretree.isValidPath(prefix));

            var prefix2 = prefix + '/';
            var list = [];
            var paths = coretree.getKeys(overlays);

            for (var i = 0; i < paths.length; ++i) {
                var path = paths[i];
                if (path === prefix || path.substr(0, prefix2.length) === prefix2) {
                    var node = coretree.getChild(overlays, path);
                    var names = coretree.getKeys(node);
                    
                    for (var j = 0; j < names.length; ++j) {
                        var name = names[j];
                        if (isPointerName(name)) {
                            list.push({
                                s: path,
                                n: name,
                                t: coretree.getProperty(node, name),
                                p: true
                            });
                        } else {
                            var array = coretree.getProperty(node, name);
                            ASSERT(Array.isArray(array));
                            name = name.slice(0, -COLLSUFFIX.length);
                            for (var k = 0; k < array.length; ++k) {
                                list.push({
                                    s: array[k],
                                    n: name,
                                    t: path,
                                    p: false
                                });
                            }
                        }
                    }
                }
            }

            // console.log('query', overlays.parent.data.atr.name, prefix, list);

            return list;
        }

        function createNode(parameters) {
            parameters = parameters || {};
            var relid = parameters.relid,
                parent = parameters.parent;

            ASSERT(!parent || isValidNode(parent));
            ASSERT(!relid || typeof relid === 'string');

            var node;
            if (parent) {
                if (relid) {
                    node = coretree.getChild(parent, relid);
                } else {
                    node = coretree.createChild(parent);
                }
                coretree.setHashed(node, true);
            } else {
                node = coretree.createRoot();
            }

            return node;
        }

        function deleteNode(node) {
            ASSERT(isValidNode(node));

            var parent = coretree.getParent(node);
            var prefix = '/' + coretree.getRelid(node);
            ASSERT(parent !== null);

            coretree.deleteProperty(parent, coretree.getRelid(node));

            while (parent) {
                var overlays = coretree.getChild(parent, OVERLAYS);

                var list = overlayQuery(overlays, prefix);
                for (var i = 0; i < list.length; ++i) {
                    var entry = list[i];
                    overlayRemove(overlays, entry.s, entry.n, entry.t);
                }

                prefix = '/' + coretree.getRelid(parent) + prefix;
                parent = coretree.getParent(parent);
            }
        }

        function copyNode(node, parent) {
            ASSERT(isValidNode(node));
            ASSERT(!parent || isValidNode(parent));

            node = coretree.normalize(node);
            var newNode;

            if (parent) {
                var ancestor = coretree.getAncestor(node, parent);

                // cannot copy inside of itself
                if (ancestor === node) {
                    return null;
                }

                newNode = coretree.createChild(parent);
                coretree.setHashed(newNode, true);
                coretree.setData(newNode, coretree.copyData(node));

                var ancestorOverlays = coretree.getChild(ancestor, OVERLAYS);
                var ancestorNewPath = coretree.getPath(newNode, ancestor);

                var base = coretree.getParent(node);
                var baseOldPath = '/' + coretree.getRelid(node);
                var aboveAncestor = 1;

                while (base) {
                    var baseOverlays = coretree.getChild(base, OVERLAYS);
                    var list = overlayQuery(baseOverlays, baseOldPath);
                    var tempAncestor = coretree.getAncestor(base, ancestor);

                    aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

                    var relativePath = aboveAncestor < 0 ?
                        coretree.getPath(base, ancestor) : coretree.getPath(ancestor, base);

                    for (var i = 0; i < list.length; ++i) {
                        var entry = list[i];

                        if (entry.p) {
                            ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
                            ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === '/');

                            var source, target, overlays;

                            if (aboveAncestor < 0) {
                                //below ancestor node - further from root
                                source = ancestorNewPath + entry.s.substr(baseOldPath.length);
                                target = coretree.joinPaths(relativePath, entry.t);
                                overlays = ancestorOverlays;
                            } else if (aboveAncestor === 0) {
                                //at ancestor node
                                var data = coretree.getCommonPathPrefixData(ancestorNewPath, entry.t);

                                overlays = newNode;
                                while (data.firstLength-- > 0) {
                                    overlays = coretree.getParent(overlays);
                                }
                                overlays = coretree.getChild(overlays, OVERLAYS);

                                source = coretree.joinPaths(data.first, entry.s.substr(baseOldPath.length));
                                target = data.second;
                            } else {
                                //above ancestor node - closer to root
                                ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

                                source = relativePath + ancestorNewPath + entry.s.substr(baseOldPath.length);
                                target = entry.t;
                                overlays = baseOverlays;
                            }

                            overlayInsert(overlays, source, entry.n, target);
                        }
                    }

                    baseOldPath = '/' + coretree.getRelid(base) + baseOldPath;
                    base = coretree.getParent(base);
                }
            } else {
                newNode = coretree.createRoot();
                coretree.setData(newNode, coretree.copyData(node));
            }

            return newNode;
        }

        //kecso
        function copyNodes(nodes, parent) {
            //copying multiple nodes at once for keeping their internal relations
            var paths = [],
                i, j, index, names, pointer,
                copiedNodes = [],
                internalRelationPaths = []; // Every single element will be an object with the
                                            // internally pointing relations and the index of the target.

            for (i = 0; i < nodes.length; i++) {
                paths.push(coretree.getPath(nodes[i]));
            }

            for (i = 0; i < nodes.length; i++) {
                names = getPointerNames(nodes[i]);
                pointer = {};
                for (j = 0; j < names.length; j++) {
                    index = paths.indexOf(getPointerPath(nodes[i], names[j]));
                    if (index !== -1) {
                        pointer[names[j]] = index;
                    }
                }
                internalRelationPaths.push(pointer);
            }

            //now we use our simple copy
            for (i = 0; i < nodes.length; i++) {
                copiedNodes.push(copyNode(nodes[i], parent));
            }

            //and now back to the relations
            for (i = 0; i < internalRelationPaths.length; i++) {
                names = Object.keys(internalRelationPaths[i]);
                for (j = 0; j < names.length; j++) {
                    setPointer(copiedNodes[i], names[j], copiedNodes[internalRelationPaths[i][names[j]]]);
                }
            }

            return copiedNodes;
        }

        function moveNode(node, parent) {
            ASSERT(isValidNode(node) && isValidNode(parent));

            node = coretree.normalize(node);
            var ancestor = coretree.getAncestor(node, parent);

            // cannot move inside of itself
            if (ancestor === node) {
                return null;
            }

            var base = coretree.getParent(node);
            var baseOldPath = '/' + coretree.getRelid(node);
            var aboveAncestor = 1;

            var oldNode = node;
            node = coretree.getChild(parent, coretree.getRelid(oldNode));
            if (!coretree.isEmpty(node)) {
                // we have to change the relid of the node, to fit into its new
                // place...
                node = coretree.createChild(parent);
            }
            coretree.setHashed(node, true);
            coretree.setData(node, coretree.copyData(oldNode));

            var ancestorOverlays = coretree.getChild(ancestor, OVERLAYS);
            var ancestorNewPath = coretree.getPath(node, ancestor);

            while (base) {
                var baseOverlays = coretree.getChild(base, OVERLAYS);
                var list = overlayQuery(baseOverlays, baseOldPath);
                var tempAncestor = coretree.getAncestor(base, ancestor);

                aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

                var relativePath = aboveAncestor < 0 ?
                    coretree.getPath(base, ancestor) : coretree.getPath(ancestor, base);

                for (var i = 0; i < list.length; ++i) {
                    var entry = list[i];

                    overlayRemove(baseOverlays, entry.s, entry.n, entry.t);

                    var tmp;
                    if (!entry.p) {
                        tmp = entry.s;
                        entry.s = entry.t;
                        entry.t = tmp;
                    }

                    ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
                    ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === '/');

                    var source, target, overlays;

                    if (aboveAncestor < 0) {
                        //below ancestor node
                        source = ancestorNewPath + entry.s.substr(baseOldPath.length);
                        target = coretree.joinPaths(relativePath, entry.t);
                        overlays = ancestorOverlays;
                    } else if (aboveAncestor === 0) {
                        //at ancestor node
                        var data = coretree.getCommonPathPrefixData(ancestorNewPath, entry.t);

                        overlays = node;
                        while (data.firstLength-- > 0) {
                            overlays = coretree.getParent(overlays);
                        }
                        overlays = coretree.getChild(overlays, OVERLAYS);

                        source = coretree.joinPaths(data.first, entry.s.substr(baseOldPath.length));
                        target = data.second;
                    } else {
                        //above ancestor node
                        ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

                        source = relativePath + ancestorNewPath + entry.s.substr(baseOldPath.length);
                        target = entry.t;
                        overlays = baseOverlays;
                    }

                    if (!entry.p) {
                        tmp = entry.s;
                        entry.s = entry.t;
                        entry.t = tmp;

                        tmp = source;
                        source = target;
                        target = tmp;
                    }

                    //console.log(source, target);
                    overlayInsert(overlays, source, entry.n, target);
                }

                baseOldPath = '/' + coretree.getRelid(base) + baseOldPath;
                base = coretree.getParent(base);
            }

            deleteNode(oldNode);

            return node;
        }

        function getChildrenRelids(node) {
            ASSERT(isValidNode(node));

            return coretree.getKeys(node, isValidRelid);
        }

        function getChildrenPaths(node) {
            var path = coretree.getPath(node);

            var relids = getChildrenRelids(node);
            for (var i = 0; i < relids.length; ++i) {
                relids[i] = path + '/' + relids[i];
            }

            return relids;
        }

        function loadChildren(node) {
            ASSERT(isValidNode(node));

            var children = coretree.getKeys(node, isValidRelid);
            for (var i = 0; i < children.length; ++i) {
                children[i] = coretree.loadChild(node, children[i]);
            }

            return TASYNC.lift(children);
        }

        function getPointerNames(node) {
            ASSERT(isValidNode(node));

            var source = '';
            var names = [];

            do {
                var child = (coretree.getProperty(node, OVERLAYS) || {})[source];
                if (child) {
                    for (var name in child) {
                        ASSERT(names.indexOf(name) === -1);
                        if (isPointerName(name)) {
                            names.push(name);
                        }
                    }
                }

                source = '/' + coretree.getRelid(node) + source;
                node = coretree.getParent(node);
            } while (node);

            return names;
        }

        function getPointerPath(node, name) {
            ASSERT(isValidNode(node) && typeof name === 'string');

            var source = '';
            var target;

            do {
                var child = (coretree.getProperty(node, OVERLAYS) || {})[source];
                if (child) {
                    target = child[name];
                    if (target !== undefined) {
                        break;
                    }
                }

                source = '/' + coretree.getRelid(node) + source;
                node = coretree.getParent(node);
            } while (node);

            if (target !== undefined) {
                ASSERT(node);
                target = coretree.joinPaths(coretree.getPath(node), target);
            }

            return target;
        }

        function hasPointer(node, name) {
            ASSERT(isValidNode(node) && typeof name === 'string');

            var source = '';

            do {
                var child = (coretree.getProperty(node, OVERLAYS) || {})[source];
                if (child && child[name] !== undefined) {
                    return true;
                }

                source = '/' + coretree.getRelid(node) + source;
                node = coretree.getParent(node);
            } while (node);

            return false;
        }

        function getOutsidePointerPath(node, name, source) {
            ASSERT(isValidNode(node) && typeof name === 'string');
            ASSERT(typeof source === 'string');

            var target;

            do {
                var child = (coretree.getProperty(node, OVERLAYS) || {})[source];
                if (child) {
                    target = child[name];
                    if (target !== undefined) {
                        break;
                    }
                }

                source = '/' + coretree.getRelid(node) + source;
                node = coretree.getParent(node);
            } while (node);

            if (target !== undefined) {
                ASSERT(node);
                target = coretree.joinPaths(coretree.getPath(node), target);
            }

            return target;
        }

        function loadPointer(node, name) {
            ASSERT(isValidNode(node) && name);

            var source = '';
            var target;

            do {
                var child = (coretree.getProperty(node, OVERLAYS) || {})[source];
                if (child) {
                    target = child[name];
                    if (target !== undefined) {
                        break;
                    }
                }

                source = '/' + coretree.getRelid(node) + source;
                node = coretree.getParent(node);
            } while (node);

            if (target !== undefined) {
                ASSERT(typeof target === 'string' && node);
                return coretree.loadByPath(node, target);
            } else {
                return null;
            }
        }

        function getCollectionNames(node) {
            ASSERT(isValidNode(node));

            var target = '';
            var names = [];

            do {
                var child = coretree.getProperty(coretree.getChild(node, OVERLAYS), target);
                if (child) {
                    for (var name in child) {
                        if (!isPointerName(name) && name !== '_mutable') {
                            name = name.slice(0, -COLLSUFFIX.length);
                            if (isPointerName(name) && names.indexOf(name) < 0) {
                                names.push(name);
                            }
                        }
                    }
                }

                target = '/' + coretree.getRelid(node) + target;
                node = coretree.getParent(node);
            } while (node);

            return names;
        }

        function loadCollection(node, name) {
            ASSERT(isValidNode(node) && name);

            name += COLLSUFFIX;

            var collection = [];
            var target = '';

            do {
                var child = coretree.getChild(node, OVERLAYS);

                child = coretree.getChild(child, target);
                if (child) {
                    var sources = coretree.getProperty(child, name);
                    if (sources) {
                        ASSERT(Array.isArray(sources) && sources.length >= 1);

                        for (var i = 0; i < sources.length; ++i) {
                            collection.push(coretree.loadByPath(node, sources[i]));
                        }
                    }
                }

                target = '/' + coretree.getRelid(node) + target;
                node = coretree.getParent(node);
            } while (node);

            return TASYNC.lift(collection);
        }

        function getCollectionPaths(node, name) {
            ASSERT(isValidNode(node) && name);

            name += COLLSUFFIX;

            var result = [];
            var target = '';

            do {
                var child = coretree.getChild(node, OVERLAYS);

                child = coretree.getChild(child, target);
                if (child) {
                    var sources = coretree.getProperty(child, name);
                    if (sources) {
                        ASSERT(Array.isArray(sources) && sources.length >= 1);

                        var prefix = coretree.getPath(node);

                        for (var i = 0; i < sources.length; ++i) {
                            result.push(coretree.joinPaths(prefix, sources[i]));
                        }
                    }
                }

                target = '/' + coretree.getRelid(node) + target;
                node = coretree.getParent(node);
            } while (node);

            return result;
        }

        function deletePointer(node, name) {
            ASSERT(isValidNode(node) && typeof name === 'string');

            var source = '';

            do {
                var overlays = coretree.getChild(node, OVERLAYS);
                ASSERT(overlays);

                var target = coretree.getProperty(coretree.getChild(overlays, source), name);
                if (target !== undefined) {
                    overlayRemove(overlays, source, name, target);
                    return true;
                }

                source = '/' + coretree.getRelid(node) + source;
                node = coretree.getParent(node);
            } while (node);

            return false;
        }

        function setPointer(node, name, target) {
            ASSERT(isValidNode(node) && typeof name === 'string' && (!target || isValidNode(target)));

            deletePointer(node, name);

            if (target) {
                var ancestor = coretree.getAncestor(node, target);

                var overlays = coretree.getChild(ancestor, OVERLAYS);
                var sourcePath = coretree.getPath(node, ancestor);
                var targetPath = coretree.getPath(target, ancestor);

                overlayInsert(overlays, sourcePath, name, targetPath);
            }
        }

        function getChildrenHashes(node) {
            var keys = getChildrenRelids(node),
                i, hashes = {};

            for (i = 0; i < keys.length; i++) {
                hashes[keys[i]] = coretree.getChildHash(node, keys[i]);
            }

            return hashes;
        }

        // copy everything from coretree
        var corerel = {};
        for (var key in coretree) {
            corerel[key] = coretree[key];
        }

        corerel.isValidNode = isValidNode;
        corerel.isValidRelid = isValidRelid;

        corerel.getChildrenRelids = getChildrenRelids;
        corerel.getChildrenPaths = getChildrenPaths;

        corerel.loadChildren = loadChildren;
        corerel.createNode = createNode;
        corerel.deleteNode = deleteNode;
        corerel.copyNode = copyNode;
        corerel.copyNodes = copyNodes;
        corerel.moveNode = moveNode;

        corerel.getAttributeNames = getAttributeNames;
        corerel.getAttribute = getAttribute;
        corerel.setAttribute = setAttribute;
        corerel.delAttribute = delAttribute;

        corerel.getRegistryNames = getRegistryNames;
        corerel.getRegistry = getRegistry;
        corerel.setRegistry = setRegistry;
        corerel.delRegistry = delRegistry;

        corerel.getPointerNames = getPointerNames;
        corerel.getPointerPath = getPointerPath;
        corerel.hasPointer = hasPointer;
        corerel.getOutsidePointerPath = getOutsidePointerPath;
        corerel.loadPointer = loadPointer;
        corerel.deletePointer = deletePointer;
        corerel.setPointer = setPointer;
        corerel.getCollectionNames = getCollectionNames;
        corerel.getCollectionPaths = getCollectionPaths;
        corerel.loadCollection = loadCollection;

        corerel.getCoreTree = function () {
            return coretree;
        };

        corerel.getChildrenHashes = getChildrenHashes;

        corerel.overlayInsert = overlayInsert;

        return corerel;
    }

    return CoreRel;
});
