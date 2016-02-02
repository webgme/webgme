/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/util/assert',
    'common/core/tasync',
    'common/util/random',
    'common/core/constants',
], function (ASSERT, TASYNC, RANDOM, CONSTANTS) {

    'use strict';

    function CoreRel(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof innerCore === 'object');

        var logger = innerCore.logger,
            core = {},
            key;

        for (key in innerCore) {
            core[key] = innerCore[key];
        }

        logger.debug('initialized CoreRel');

        //<editor-fold=Helper Functions>
        function test(text, cond) {
            if (!cond) {
                throw new Error(text);
            }
        }

        function overlayRemove(overlays, source, name, target) {
            ASSERT(core.isValidNode(overlays));
            ASSERT(innerCore.getRelid(overlays) === CONSTANTS.OVERLAYS_PROPERTY);
            ASSERT(innerCore.isValidPath(source) && innerCore.isValidPath(target) && core.isPointerName(name));
            ASSERT(innerCore.getCommonPathPrefixData(source, target).common === '');

            // console.log('remove', overlays.parent.data.atr.name, source, name, target);

            var node = innerCore.getChild(overlays, source);
            ASSERT(node && innerCore.getProperty(node, name) === target);
            innerCore.deleteProperty(node, name);

            if (innerCore.getKeys(node).length === 0) {
                innerCore.deleteProperty(overlays, source);
            }

            node = innerCore.getChild(overlays, target);
            ASSERT(node);

            name = name + CONSTANTS.COLLECTION_NAME_SUFFIX;

            var array = innerCore.getProperty(node, name);
            ASSERT(Array.isArray(array) && array.length >= 1);

            if (array.length === 1) {
                ASSERT(array[0] === source);

                innerCore.deleteProperty(node, name);
            } else {
                var index = array.indexOf(source);
                ASSERT(index >= 0);

                array = array.slice(0);
                array.splice(index, 1);

                innerCore.setProperty(node, name, array);
            }

            if (innerCore.getKeys(node).length === 0) {
                innerCore.deleteProperty(overlays, target);
            }
        }

        function overlayQuery(overlays, prefix) {
            ASSERT(core.isValidNode(overlays) && innerCore.isValidPath(prefix));

            var prefix2 = prefix + '/';
            var list = [];
            var paths = innerCore.getKeys(overlays);

            for (var i = 0; i < paths.length; ++i) {
                var path = paths[i];
                if (path === prefix || path.substr(0, prefix2.length) === prefix2) {
                    var node = innerCore.getChild(overlays, path);
                    var names = innerCore.getKeys(node);

                    for (var j = 0; j < names.length; ++j) {
                        var name = names[j];
                        if (core.isPointerName(name)) {
                            list.push({
                                s: path,
                                n: name,
                                t: innerCore.getProperty(node, name),
                                p: true
                            });
                        } else {
                            var array = innerCore.getProperty(node, name);
                            ASSERT(Array.isArray(array));
                            name = name.slice(0, -CONSTANTS.COLLECTION_NAME_SUFFIX.length);
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

        //</editor-fold>

        //<editor-fold=Modified Methods>
        core.isValidNode = function (node) {
            try {
                test('coretree', innerCore.isValidNode(node));
                test('isobject', innerCore.isObject(node));

                return true;
            } catch (error) {
                logger.error(error.message, {metadata: {stack: error.stack, node: node}});
                return false;
            }
        };
        //</editor-fold>

        //<editor-fold=Added Methods>
        core.isPointerName = function (name) {
            ASSERT(typeof name === 'string');
            //TODO this is needed as now we work with modified data as well
            if (name === '_mutable') {
                return false;
            }
            return name.slice(-CONSTANTS.COLLECTION_NAME_SUFFIX.length) !==
                CONSTANTS.COLLECTION_NAME_SUFFIX;
        };

        core.getAttributeNames = function (node) {
            ASSERT(core.isValidNode(node));

            var data,
                keys,
                i;

            data = (innerCore.getProperty(node, CONSTANTS.ATTRIBUTES_PROPERTY) || {});
            keys = Object.keys(data);
            i = keys.length;
            while (--i >= 0) {
                if (keys[i].charAt(0) === '') {
                    logger.error('empty named attribute found in node [' + innerCore.getPath(node) + ']');
                    keys.splice(i, 1);
                } else if (keys[i].charAt(0) === '_') {
                    keys.splice(i, 1);
                }
            }

            return keys;
        };

        core.getRegistryNames = function (node) {
            ASSERT(core.isValidNode(node));

            var data,
                keys,
                i;

            data = (innerCore.getProperty(node, CONSTANTS.REGISTRY_PROPERTY) || {});
            keys = Object.keys(data);
            i = keys.length;
            while (--i >= 0) {
                if (keys[i].charAt(0) === '') {
                    logger.error('empty named attribute found in node [' + innerCore.getPath(node) + ']');
                    keys.splice(i, 1);
                } else if (keys[i].charAt(0) === '_') {
                    keys.splice(i, 1);
                }
            }

            return keys;
        };

        core.getAttribute = function (node, name) {
            /*node = coretree.getChild(node, coretree.constants.ATTRIBUTES_PROPERTY);
             return coretree.getProperty(node, name);*/
            return (innerCore.getProperty(node, CONSTANTS.ATTRIBUTES_PROPERTY) || {})[name];
        };

        core.delAttribute = function (node, name) {
            node = innerCore.getChild(node, CONSTANTS.ATTRIBUTES_PROPERTY);
            innerCore.deleteProperty(node, name);
        };

        core.setAttribute = function (node, name, value) {
            node = innerCore.getChild(node, CONSTANTS.ATTRIBUTES_PROPERTY);
            innerCore.setProperty(node, name, value);
        };

        core.getRegistry = function (node, name) {
            /*node = coretree.getChild(node, coretree.constants.REGISTRY_PROPERTY);
             return coretree.getProperty(node, name);*/
            return (innerCore.getProperty(node, CONSTANTS.REGISTRY_PROPERTY) || {})[name];
        };

        core.delRegistry = function (node, name) {
            node = innerCore.getChild(node, CONSTANTS.REGISTRY_PROPERTY);
            innerCore.deleteProperty(node, name);
        };

        core.setRegistry = function (node, name, value) {
            node = innerCore.getChild(node, CONSTANTS.REGISTRY_PROPERTY);
            innerCore.setProperty(node, name, value);
        };

        core.overlayInsert = function (overlays, source, name, target) {
            ASSERT(core.isValidNode(overlays));
            ASSERT(innerCore.getRelid(overlays) === CONSTANTS.OVERLAYS_PROPERTY);
            ASSERT(innerCore.isValidPath(source) && innerCore.isValidPath(target) && core.isPointerName(name));
            ASSERT(innerCore.getCommonPathPrefixData(source, target).common === '');

            // console.log('insert', overlays.parent.data.atr.name, source, name, target);

            var node = innerCore.getChild(overlays, source);

            ASSERT(innerCore.getProperty(node, name) === undefined);
            innerCore.setProperty(node, name, target);

            node = innerCore.getChild(overlays, target);
            name = name + CONSTANTS.COLLECTION_NAME_SUFFIX;

            var array = innerCore.getProperty(node, name);
            if (array) {
                ASSERT(array.indexOf(source) < 0);

                array = array.slice(0);
                array.push(source);
            } else {
                array = [source];
            }

            innerCore.setProperty(node, name, array);
        };

        core.createNode = function (parameters) {
            parameters = parameters || {};
            var relid = parameters.relid,
                parent = parameters.parent;

            ASSERT(!parent || core.isValidNode(parent));
            ASSERT(!relid || typeof relid === 'string');

            var node;
            if (parent) {
                if (relid) {
                    node = innerCore.getChild(parent, relid);
                } else {
                    node = innerCore.createChild(parent);
                }
                innerCore.setHashed(node, true);
            } else {
                node = innerCore.createRoot();
            }

            return node;
        };

        core.deleteNode = function (node) {
            ASSERT(core.isValidNode(node));

            var parent = innerCore.getParent(node);
            var prefix = '/' + innerCore.getRelid(node);
            ASSERT(parent !== null);

            innerCore.deleteProperty(parent, innerCore.getRelid(node));

            while (parent) {
                var overlays = innerCore.getChild(parent, CONSTANTS.OVERLAYS_PROPERTY);

                var list = overlayQuery(overlays, prefix);
                for (var i = 0; i < list.length; ++i) {
                    var entry = list[i];
                    overlayRemove(overlays, entry.s, entry.n, entry.t);
                }

                prefix = '/' + innerCore.getRelid(parent) + prefix;
                parent = innerCore.getParent(parent);
            }
        };

        core.copyNode = function (node, parent) {
            ASSERT(core.isValidNode(node));
            ASSERT(!parent || core.isValidNode(parent));

            node = innerCore.normalize(node);
            var newNode;

            if (parent) {
                var ancestor = innerCore.getAncestor(node, parent);

                // cannot copy inside of itself
                if (ancestor === node) {
                    return null;
                }

                newNode = innerCore.createChild(parent);
                innerCore.setHashed(newNode, true);
                innerCore.setData(newNode, innerCore.copyData(node));

                var ancestorOverlays = innerCore.getChild(ancestor, CONSTANTS.OVERLAYS_PROPERTY);
                var ancestorNewPath = innerCore.getPath(newNode, ancestor);

                var base = innerCore.getParent(node);
                var baseOldPath = '/' + innerCore.getRelid(node);
                var aboveAncestor = 1;

                while (base) {
                    var baseOverlays = innerCore.getChild(base, CONSTANTS.OVERLAYS_PROPERTY);
                    var list = overlayQuery(baseOverlays, baseOldPath);
                    var tempAncestor = innerCore.getAncestor(base, ancestor);

                    aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

                    var relativePath = aboveAncestor < 0 ?
                        innerCore.getPath(base, ancestor) : innerCore.getPath(ancestor, base);

                    for (var i = 0; i < list.length; ++i) {
                        var entry = list[i];

                        if (entry.p) {
                            ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
                            ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === '/');

                            var source, target, overlays;

                            if (aboveAncestor < 0) {
                                //below ancestor node - further from root
                                source = ancestorNewPath + entry.s.substr(baseOldPath.length);
                                target = innerCore.joinPaths(relativePath, entry.t);
                                overlays = ancestorOverlays;
                            } else if (aboveAncestor === 0) {
                                //at ancestor node
                                var data = innerCore.getCommonPathPrefixData(ancestorNewPath, entry.t);

                                overlays = newNode;
                                while (data.firstLength-- > 0) {
                                    overlays = innerCore.getParent(overlays);
                                }
                                overlays = innerCore.getChild(overlays, CONSTANTS.OVERLAYS_PROPERTY);

                                source = innerCore.joinPaths(data.first, entry.s.substr(baseOldPath.length));
                                target = data.second;
                            } else {
                                //above ancestor node - closer to root
                                ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

                                source = relativePath + ancestorNewPath + entry.s.substr(baseOldPath.length);
                                target = entry.t;
                                overlays = baseOverlays;
                            }

                            core.overlayInsert(overlays, source, entry.n, target);
                        }
                    }

                    baseOldPath = '/' + innerCore.getRelid(base) + baseOldPath;
                    base = innerCore.getParent(base);
                }
            } else {
                newNode = innerCore.createRoot();
                innerCore.setData(newNode, innerCore.copyData(node));
            }

            return newNode;
        };

        core.copyNodes = function (nodes, parent) {
            //copying multiple nodes at once for keeping their internal relations
            var paths = [],
                i, j, index, names, pointer,
                copiedNodes = [],
            // Every single element will be an object with the
            // internally pointing relations and the index of the target.
                internalRelationPaths = [];

            for (i = 0; i < nodes.length; i++) {
                paths.push(innerCore.getPath(nodes[i]));
            }

            for (i = 0; i < nodes.length; i++) {
                names = core.getPointerNames(nodes[i]);
                pointer = {};
                for (j = 0; j < names.length; j++) {
                    index = paths.indexOf(core.getPointerPath(nodes[i], names[j]));
                    if (index !== -1) {
                        pointer[names[j]] = index;
                    }
                }
                internalRelationPaths.push(pointer);
            }

            //now we use our simple copy
            for (i = 0; i < nodes.length; i++) {
                copiedNodes.push(core.copyNode(nodes[i], parent));
            }

            //and now back to the relations
            for (i = 0; i < internalRelationPaths.length; i++) {
                names = Object.keys(internalRelationPaths[i]);
                for (j = 0; j < names.length; j++) {
                    core.setPointer(copiedNodes[i], names[j], copiedNodes[internalRelationPaths[i][names[j]]]);
                }
            }

            return copiedNodes;
        };

        core.moveNode = function (node, parent) {
            ASSERT(core.isValidNode(node) && core.isValidNode(parent));

            node = innerCore.normalize(node);
            var ancestor = innerCore.getAncestor(node, parent);

            // cannot move inside of itself
            if (ancestor === node) {
                return null;
            }

            var base = innerCore.getParent(node);
            var baseOldPath = '/' + innerCore.getRelid(node);
            var aboveAncestor = 1;

            var oldNode = node;
            node = innerCore.getChild(parent, innerCore.getRelid(oldNode));
            if (!innerCore.isEmpty(node)) {
                // we have to change the relid of the node, to fit into its new
                // place...
                node = innerCore.createChild(parent);
            }
            innerCore.setHashed(node, true);
            innerCore.setData(node, innerCore.copyData(oldNode));

            var ancestorOverlays = innerCore.getChild(ancestor, CONSTANTS.OVERLAYS_PROPERTY);
            var ancestorNewPath = innerCore.getPath(node, ancestor);

            while (base) {
                var baseOverlays = innerCore.getChild(base, CONSTANTS.OVERLAYS_PROPERTY);
                var list = overlayQuery(baseOverlays, baseOldPath);
                var tempAncestor = innerCore.getAncestor(base, ancestor);

                aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

                var relativePath = aboveAncestor < 0 ?
                    innerCore.getPath(base, ancestor) : innerCore.getPath(ancestor, base);

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
                        target = innerCore.joinPaths(relativePath, entry.t);
                        overlays = ancestorOverlays;
                    } else if (aboveAncestor === 0) {
                        //at ancestor node
                        var data = innerCore.getCommonPathPrefixData(ancestorNewPath, entry.t);

                        overlays = node;
                        while (data.firstLength-- > 0) {
                            overlays = innerCore.getParent(overlays);
                        }
                        overlays = innerCore.getChild(overlays, CONSTANTS.OVERLAYS_PROPERTY);

                        source = innerCore.joinPaths(data.first, entry.s.substr(baseOldPath.length));
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
                    core.overlayInsert(overlays, source, entry.n, target);
                }

                baseOldPath = '/' + innerCore.getRelid(base) + baseOldPath;
                base = innerCore.getParent(base);
            }

            core.deleteNode(oldNode);

            return node;
        };

        core.getChildrenRelids = function (node) {
            ASSERT(core.isValidNode(node));

            return innerCore.getKeys(node, core.isValidRelid);
        };

        core.getChildrenPaths = function (node) {
            var path = innerCore.getPath(node);

            var relids = core.getChildrenRelids(node);
            for (var i = 0; i < relids.length; ++i) {
                relids[i] = path + '/' + relids[i];
            }

            return relids;
        };

        core.loadChildren = function (node) {
            ASSERT(core.isValidNode(node));

            var children = innerCore.getKeys(node, core.isValidRelid);
            for (var i = 0; i < children.length; ++i) {
                children[i] = innerCore.loadChild(node, children[i]);
            }

            return TASYNC.lift(children);
        };

        core.getPointerNames = function (node) {
            ASSERT(core.isValidNode(node));

            //var source = '';
            //var names = [];
            //
            //do {
            //    var child = (coretree.getProperty(node, coretree.constants.OVERLAYS_PROPERTY) || {})[source];
            //    if (child) {
            //        for (var name in child) {
            //            ASSERT(names.indexOf(name) === -1);
            //            if (isPointerName(name)) {
            //                names.push(name);
            //            }
            //        }
            //    }
            //
            //    source = '/' + coretree.getRelid(node) + source;
            //    node = coretree.getParent(node);
            //} while (node);
            //
            //return names;

            return core.getPointerNamesFrom(node, '');
        };

        core.getPointerNamesFrom = function (node, source) {
            var names = [];

            do {
                var child = (innerCore.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {})[source];
                if (child) {
                    for (var name in child) {
                        ASSERT(names.indexOf(name) === -1);
                        if (core.isPointerName(name)) {
                            names.push(name);
                        }
                    }
                }

                source = '/' + innerCore.getRelid(node) + source;
                node = innerCore.getParent(node);
            } while (node);

            return names;
        };

        core.getPointerPath = function (node, name) {
            ASSERT(core.isValidNode(node) && typeof name === 'string');

            //var source = '';
            //var target;
            //
            //do {
            //    var child = (coretree.getProperty(node, coretree.constants.OVERLAYS_PROPERTY) || {})[source];
            //    if (child) {
            //        target = child[name];
            //        if (target !== undefined) {
            //            break;
            //        }
            //    }
            //
            //    source = '/' + coretree.getRelid(node) + source;
            //    node = coretree.getParent(node);
            //} while (node);
            //
            //if (target !== undefined) {
            //    ASSERT(node);
            //    target = coretree.joinPaths(coretree.getPath(node), target);
            //}
            //
            //return target;
            return core.getPointerPathFrom(node, '', name);
        };

        core.getPointerPathFrom = function (node, source, name) {
            ASSERT(core.isValidNode(node) && typeof source === 'string' && typeof name === 'string');
            var target,
                ovrInfo;

            do {
                ovrInfo = (innerCore.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {})[source];
                if (ovrInfo) {
                    target = ovrInfo[name];
                    if (target !== undefined) {
                        break;
                    }
                }

                source = '/' + innerCore.getRelid(node) + source;
                node = innerCore.getParent(node);

            } while (node);

            if (target !== undefined) {
                ASSERT(node);
                target = innerCore.joinPaths(innerCore.getPath(node), target);
            }

            return target;
        };

        core.loadPointer = function (node, name) {
            ASSERT(core.isValidNode(node) && name);

            var source = '';
            var target;

            do {
                var child = (innerCore.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {})[source];
                if (child) {
                    target = child[name];
                    if (target !== undefined) {
                        break;
                    }
                }

                source = '/' + innerCore.getRelid(node) + source;
                node = innerCore.getParent(node);
            } while (node);

            if (target !== undefined) {
                ASSERT(typeof target === 'string' && node);
                return innerCore.loadByPath(node, target);
            } else {
                return null;
            }
        };

        core.getCollectionNames = function (node) {
            ASSERT(core.isValidNode(node));

            var target = '';
            var names = [];

            do {
                var child = innerCore.getProperty(innerCore.getChild(node, CONSTANTS.OVERLAYS_PROPERTY),
                    target);
                if (child) {
                    for (var name in child) {
                        if (!core.isPointerName(name) && name !== '_mutable') {
                            name = name.slice(0, -CONSTANTS.COLLECTION_NAME_SUFFIX.length);
                            if (core.isPointerName(name) && names.indexOf(name) < 0) {
                                names.push(name);
                            }
                        }
                    }
                }

                target = '/' + innerCore.getRelid(node) + target;
                node = innerCore.getParent(node);
            } while (node);

            return names;
        };

        core.loadCollection = function (node, name) {
            ASSERT(core.isValidNode(node) && name);

            name += CONSTANTS.COLLECTION_NAME_SUFFIX;

            var collection = [];
            var target = '';

            do {
                var child = innerCore.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);

                child = innerCore.getChild(child, target);
                if (child) {
                    var sources = innerCore.getProperty(child, name);
                    if (sources) {
                        ASSERT(Array.isArray(sources) && sources.length >= 1);

                        for (var i = 0; i < sources.length; ++i) {
                            collection.push(innerCore.loadByPath(node, sources[i]));
                        }
                    }
                }

                target = '/' + innerCore.getRelid(node) + target;
                node = innerCore.getParent(node);
            } while (node);

            return TASYNC.lift(collection);
        };

        core.getCollectionPaths = function (node, name) {
            ASSERT(core.isValidNode(node) && name);

            name += CONSTANTS.COLLECTION_NAME_SUFFIX;

            var result = [];
            var target = '';

            do {
                var child = innerCore.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);

                child = innerCore.getChild(child, target);
                if (child) {
                    var sources = innerCore.getProperty(child, name);
                    if (sources) {
                        ASSERT(Array.isArray(sources) && sources.length >= 1);

                        var prefix = innerCore.getPath(node);

                        for (var i = 0; i < sources.length; ++i) {
                            result.push(innerCore.joinPaths(prefix, sources[i]));
                        }
                    }
                }

                target = '/' + innerCore.getRelid(node) + target;
                node = innerCore.getParent(node);
            } while (node);

            return result;
        };

        core.deletePointer = function (node, name) {
            ASSERT(core.isValidNode(node) && typeof name === 'string');

            var source = '';

            do {
                var overlays = innerCore.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);
                ASSERT(overlays);

                var target = innerCore.getProperty(innerCore.getChild(overlays, source), name);
                if (target !== undefined) {
                    overlayRemove(overlays, source, name, target);
                    return true;
                }

                source = '/' + innerCore.getRelid(node) + source;
                node = innerCore.getParent(node);
            } while (node);

            return false;
        };

        core.setPointer = function (node, name, target) {
            ASSERT(core.isValidNode(node) && typeof name === 'string' && (!target || core.isValidNode(target)));

            core.deletePointer(node, name);

            if (target) {
                var ancestor = innerCore.getAncestor(node, target);

                var overlays = innerCore.getChild(ancestor, CONSTANTS.OVERLAYS_PROPERTY);
                var sourcePath = innerCore.getPath(node, ancestor);
                var targetPath = innerCore.getPath(target, ancestor);

                core.overlayInsert(overlays, sourcePath, name, targetPath);
            }
        };

        core.getChildrenHashes = function (node) {
            var keys = core.getChildrenRelids(node),
                i, hashes = {};

            for (i = 0; i < keys.length; i++) {
                hashes[keys[i]] = innerCore.getChildHash(node, keys[i]);
            }

            return hashes;
        };

        core.isValidRelid = RANDOM.isValidRelid;

        core.isContainerPath = function (path, parentPath) {
            var pathArray = (path || '').split('/'),
                parentArray = (parentPath || '').split('/'),
                i;

            for (i = 0; i < parentArray.length; i += 1) {
                if (parentArray[i] !== pathArray[i]) {
                    return false;
                }
            }

            return true;
        };
        //</editor-fold>

        return core;
    }

    return CoreRel;
});
