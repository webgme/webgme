/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/util/assert',
    'common/core/tasync',
    'common/core/constants',
], function (ASSERT, TASYNC, CONSTANTS) {
    'use strict';

    var CoreType = function (innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            core = {},
            key;

        for (key in innerCore) {
            core[key] = innerCore[key];
        }

        //isPointerName should be removed from API at this level
        delete core.isPointerName;

        logger.debug('initialized CoreType');

        //<editor-fold=Helper Functions>
        function test(text, cond) {
            if (!cond) {
                throw new Error(text);
            }
        }

        function isFalseNode(node) {
            //TODO this hack should be removed, but now it seems just fine :)
            if (typeof innerCore.getPointerPath(node, CONSTANTS.BASE_POINTER) === 'undefined') {
                return true;
            }
            return false;
        }

        function loadRoot2(node) {
            ASSERT(typeof node.base === 'undefined' || node.base === null);
            //kecso - TODO it should be undefined, but maybe because of the cache it can be null

            node.base = null;
            return node;
        }

        function loadChild(node, relid) {
            var child = null,
                base = core.getBase(node),
                basechild = null;
            if (base) {
                //the parent is inherited
                if (core.getChildrenRelids(base).indexOf(relid) !== -1) {
                    //inherited child
                    if (innerCore.getChildrenRelids(node).indexOf(relid) !== -1) {
                        //but it is overwritten so we should load it
                        child = innerCore.loadChild(node, relid);
                    }
                    basechild = core.loadChild(base, relid);
                    return TASYNC.call(function (b, c, n, r) {
                        if (c) {
                            child = c;
                            child.base = b;
                            return child;
                        } else {
                            child = innerCore.getChild(n, r);
                            core.setHashed(child, true, true);
                            child.base = b;

                            return child;
                        }
                    }, basechild, child, node, relid);
                }
            }
            //normal child
            return TASYNC.call(loadBase, innerCore.loadChild(node, relid));
        }

        function loadBase(node) {
            var path = innerCore.getPath(node);
            ASSERT(node === null || typeof node.base === 'undefined' || typeof node.base === 'object');

            if (typeof node.base === 'undefined') {
                if (core.isEmpty(node)) {
                    //empty nodes do not have a base
                    node.base = null;
                    return node;
                } else if (isFalseNode(node)) {
                    innerCore.deleteNode(node);
                    //core.persist(core.getRoot(node));
                    //TODO a notification should be generated towards the user
                    logger.warn('node [' + path + '] removed due to missing base');

                    //TODO check if some identification can be passed
                    return null;
                } else {
                    var basePath = innerCore.getPointerPath(node, CONSTANTS.BASE_POINTER);
                    ASSERT(basePath !== undefined);
                    if (basePath === null) {
                        node.base = null;
                        return node;
                    } else if (core.isContainerPath(basePath, path)) {
                        //contained base error
                        logger.error('node [' + path + '] contains its own base!');
                        innerCore.deleteNode(node);
                        //core.persist(core.getRoot(node));
                        return null;
                    } else {
                        return TASYNC.call(loadBase2, node, core.loadByPath(core.getRoot(node), basePath));
                    }
                }
            } else {
                //TODO can the base change at this point???
                return node;
            }
        }

        function loadBase2(node, target) {
            if (typeof node.base !== null && typeof node.base === 'object' &&
                (innerCore.getPath(node.base) === innerCore.getPath(target))) {
                //TODO somehow the object already loaded properly and we do no know about it!!!
                return node;
            } else {
                ASSERT(typeof node.base === 'undefined' || node.base === null); //kecso

                if (target === null) {
                    node.base = null;
                    return node;
                } else {
                    return TASYNC.call(function (n, b) {
                        n.base = b;
                        return n;
                    }, node, loadBase(target));
                }
            }
        }

        function loadDescendantByPath(node, pathArray, index) {
            if (node === null || index === pathArray.length) {
                return node;
            }

            var child = core.loadChild(node, pathArray[index]);
            return TASYNC.call(loadDescendantByPath, child, pathArray, index + 1);
        }

        function isInheritedChild(node) {
            var parent = core.getParent(node),
                base = core.getBase(node),
                parentBase = parent ? core.getBase(parent) : null,
                baseParent = base ? core.getParent(base) : null;

            if (baseParent && parentBase && core.getPath(baseParent) === core.getPath(parentBase)) {
                return true;
            }
            return false;
        }

        function getInstanceRoot(node) {

            while (isInheritedChild(node)) {
                node = core.getParent(node);
            }

            return node;
        }

        function getInheritedCollectionNames(node) {
            var target = '',
                names = [],
                startNode = node,
                endNode = getInstanceRoot(node),
                exit;

            if (core.getPath(startNode) === core.getPath(endNode)) {
                return names;
            }

            do {
                startNode = core.getBase(startNode);
                endNode = core.getBase(endNode);
                node = startNode;
                exit = false;
                target = '';
                do {
                    if (core.getPath(node) === core.getPath(endNode)) {
                        exit = true;
                    }
                    var child = innerCore.getProperty(innerCore.getChild(node, CONSTANTS.OVERLAYS_PROPERTY),
                        target);
                    if (child) {
                        for (var name in child) {
                            if (!innerCore.isPointerName(name)) {
                                name = name.slice(0, -CONSTANTS.COLLECTION_NAME_SUFFIX.length);
                                if (names.indexOf(name) < 0) {
                                    names.push(name);
                                }
                            }
                        }
                    }

                    target = '/' + innerCore.getRelid(node) + target;
                    node = innerCore.getParent(node);
                } while (!exit);
            } while (isInheritedChild(startNode));

            return names;
        }

        function getInheritedCollectionPaths(node, name) {
            var target = '',
                result = [],
                startNode = node,
                endNode = getInstanceRoot(node),
                prefixStart = startNode,
                prefixNode = prefixStart,
                exit,
                collName = name + CONSTANTS.COLLECTION_NAME_SUFFIX,
                notOverwritten = function (sNode, eNode, source) {
                    var result = true,
                        tNode = sNode,
                        child, target;

                    while (core.getPath(tNode) !== core.getPath(eNode)) {
                        child = innerCore.getChild(tNode, CONSTANTS.OVERLAYS_PROPERTY);
                        child = innerCore.getChild(child, source);
                        if (child) {
                            target = innerCore.getProperty(child, name);
                            if (target) {
                                return false;
                            }
                        }
                        tNode = core.getBase(tNode);
                    }

                    return result;
                };

            if (core.getPath(startNode) === core.getPath(endNode)) {
                return result;
            }

            do {
                startNode = core.getBase(startNode);
                endNode = core.getBase(endNode);
                node = startNode;
                prefixNode = prefixStart;
                exit = false;
                target = '';
                do {
                    if (core.getPath(node) === core.getPath(endNode)) {
                        exit = true;
                    }
                    var child = innerCore.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);
                    child = innerCore.getChild(child, target);
                    if (child) {
                        var sources = innerCore.getProperty(child, collName);
                        if (sources) {
                            ASSERT(Array.isArray(sources) && sources.length >= 1);

                            var prefix = innerCore.getPath(prefixNode);

                            for (var i = 0; i < sources.length; ++i) {
                                if (notOverwritten(prefixNode, node, sources[i])) {
                                    result.push(innerCore.joinPaths(prefix, sources[i]));
                                }
                            }
                        }
                    }

                    target = '/' + innerCore.getRelid(node) + target;
                    node = innerCore.getParent(node);
                    prefixNode = core.getParent(prefixNode);
                } while (!exit);
            } while (isInheritedChild(startNode));

            return result;
        }

        function inheritedPointerNames(node) {
            var allNames = core.getPointerNames(node),
                ownNames = core.getOwnPointerNames(node),
                names = [],
                i;

            for (i = 0; i < allNames.length; i++) {
                if (ownNames.indexOf(allNames[i]) === -1) {
                    names.push(allNames[i]);
                }
            }

            return names;
        }
        //</editor-fold>

        //<editor-fold=Modified Methods>
        core.isValidNode = function (node) {
            try {
                test('core', innerCore.isValidNode(node));
                test('base', typeof node.base === 'object');
                return true;
            } catch (error) {
                logger.error(error.message, {stack: error.stack, node: node});
                return false;
            }
        };

        core.loadRoot = function (hash) {
            return TASYNC.call(loadRoot2, innerCore.loadRoot(hash));
        };

        core.loadChild = function (node, relid) {
            return TASYNC.call(function (child) {
                if (child && core.isInheritanceContainmentCollision(child, core.getParent(child))) {
                    logger.error('node[' + core.getPath(child) +
                        '] was deleted due to inheritance-containment collision');
                    core.deleteNode(child);
                    //core.persist(core.getRoot(child));
                    return null;
                } else {
                    return child;
                }
            }, loadChild(node, relid));
        };

        core.loadByPath = function (node, path) {
            ASSERT(core.isValidNode(node));
            ASSERT(path === '' || path.charAt(0) === '/');
            path = path.split('/');
            return loadDescendantByPath(node, path, 1);
        };

        core.loadPointer = function (node, name) {
            //TODO the pointer loading is totally based upon the loadByPath...
            var pointerPath = core.getPointerPath(node, name),
                root = core.getRoot(node);

            if (pointerPath === undefined) {
                return undefined;
            }
            if (pointerPath === null) {
                return null;
            }
            return TASYNC.call(function () {
                return core.loadByPath(root, pointerPath);
            }, core.loadPaths(core.getHash(root), [pointerPath]));
        };

        core.getChild = function (node, relid) {
            ASSERT(core.isValidNode(node) && (typeof node.base === 'undefined' || typeof node.base === 'object'));
            var child = innerCore.getChild(node, relid);
            if (node.base !== null && node.base !== undefined) {
                if (child.base === null || child.base === undefined) {
                    child.base = core.getChild(node.base, relid);
                }
            } else {
                child.base = null;
            }
            return child;
        };

        core.getChildrenRelids = function (node) {
            var inheritRelIds = node.base === null ? [] : core.getChildrenRelids(core.getBase(node));
            var ownRelIds = innerCore.getChildrenRelids(node);
            for (var i = 0; i < inheritRelIds.length; i++) {
                if (ownRelIds.indexOf(inheritRelIds[i]) === -1) {
                    ownRelIds.push(inheritRelIds[i]);
                }
            }
            return ownRelIds;
        };

        core.loadChildren = function (node) {
            ASSERT(core.isValidNode(node));
            var relids = core.getChildrenRelids(node);
            relids = relids.sort(); //TODO this should be temporary
            var children = [];
            for (var i = 0; i < relids.length; i++) {
                children[i] = core.loadChild(node, relids[i]);
            }
            return TASYNC.call(function (n) {
                var newn = [];
                for (var i = 0; i < n.length; i++) {
                    if (n[i] !== null) {
                        newn.push(n[i]);
                    }
                }
                return newn;
            }, TASYNC.lift(children));
        };

        core.getCollectionNames = function (node) {
            ASSERT(core.isValidNode(node));
            var checkCollNames = function (draft) {
                    var filtered = [],
                        i, sources;
                    for (i = 0; i < draft.length; i++) {
                        sources = core.getCollectionPaths(node, draft[i]);
                        if (sources.length > 0) {
                            filtered.push(draft[i]);
                        }
                    }
                    return filtered;
                },
                ownNames = innerCore.getCollectionNames(node),
                inhNames = checkCollNames(getInheritedCollectionNames(node)),
                i;
            for (i = 0; i < ownNames.length; i++) {
                if (inhNames.indexOf(ownNames[i]) < 0) {
                    inhNames.push(ownNames[i]);
                }
            }

            return inhNames;
        };

        core.getCollectionPaths = function (node, name) {
            ASSERT(core.isValidNode(node) && name);
            var ownPaths = innerCore.getCollectionPaths(node, name),
                inhPaths = getInheritedCollectionPaths(node, name);

            inhPaths = inhPaths.concat(ownPaths);

            return inhPaths;
        };

        core.loadCollection = function (node, name) {
            var root = core.getRoot(node),
                paths = core.getCollectionPaths(node, name),
                nodes = [],
                i,
                rootHash = core.getHash(root);

            return TASYNC.call(function () {
                for (i = 0; i < paths.length; i += 1) {
                    nodes[i] = core.loadByPath(root, paths[i]);
                }
                return TASYNC.lift(nodes);
            }, core.loadPaths(rootHash, paths));
        };

        core.createNode = function (parameters) {
            parameters = parameters || {};
            var base = parameters.base || null,
                parent = parameters.parent;

            ASSERT(!parent || core.isValidNode(parent));
            ASSERT(!base || core.isValidNode(base));
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));

            var node = innerCore.createNode(parameters);
            node.base = base;
            innerCore.setPointer(node, CONSTANTS.BASE_POINTER, base);

            return node;
        };

        core.moveNode = function (node, parent) {
            //TODO we have to check if the move is really allowed!!!
            ASSERT(core.isValidNode(node) && core.isValidNode(parent));
            var base = node.base,
                parentBase = parent.base;
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));
            ASSERT(!parentBase || core.getPath(parentBase) !== core.getPath(node));

            var moved = innerCore.moveNode(node, parent);
            moved.base = base;
            return moved;
        };

        core.copyNode = function (node, parent) {
            var base = node.base;
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));

            var newnode = innerCore.copyNode(node, parent);
            newnode.base = base;
            innerCore.setPointer(newnode, CONSTANTS.BASE_POINTER, base);
            return newnode;
        };

        core.copyNodes = function (nodes, parent) {
            var copiedNodes,
                i, j, index, base,
                relations = [],
                names, pointer,
                paths = [];

            //here we also have to copy the inherited relations which points inside the copy area
            for (i = 0; i < nodes.length; i++) {
                paths.push(core.getPath(nodes[i]));
            }

            for (i = 0; i < nodes.length; i++) {
                names = inheritedPointerNames(nodes[i]);
                pointer = {};
                for (j = 0; j < names.length; j++) {
                    index = paths.indexOf(core.getPointerPath(nodes[i], names[j]));
                    if (index !== -1) {
                        pointer[names[j]] = index;
                    }
                }
                relations.push(pointer);
            }

            //making the actual copy
            copiedNodes = innerCore.copyNodes(nodes, parent);

            //setting internal-inherited relations
            for (i = 0; i < nodes.length; i++) {
                names = Object.keys(relations[i]);
                for (j = 0; j < names.length; j++) {
                    core.setPointer(copiedNodes[i], names[j], copiedNodes[relations[i][names[j]]]);
                }
            }

            //setting base relation
            for (i = 0; i < nodes.length; i++) {
                base = nodes[i].base;
                copiedNodes[i].base = base;
                innerCore.setPointer(copiedNodes[i], CONSTANTS.BASE_POINTER, base);
            }

            return copiedNodes;
        };

        core.deleteNode = function (node, technical) {
            //currently we only check if the node is inherited from its parents children
            if (node && (node.base !== null || technical === true)) {
                var parent = core.getParent(node),
                    parentsBase = parent ? core.getBase(node) : null,
                    base = core.getBase(node),
                    basesParent = base ? core.getParent(node) : null;

                if (parent && parentsBase && base && basesParent) {
                    if (core.getPath(parentsBase) !== core.getPath(basesParent)) {
                        innerCore.deleteNode(node);
                    }
                } else {
                    innerCore.deleteNode(node);
                }
            }
        };

        core.getAttributeNames = function (node) {
            ASSERT(core.isValidNode(node));

            var merged = {};
            do {
                var names = innerCore.getAttributeNames(node);
                for (var i = 0; i < names.length; ++i) {
                    if (!(names[i] in merged)) {
                        merged[names[i]] = true;
                    }
                }

                node = node.base;
            } while (node);

            return Object.keys(merged);
        };

        core.getRegistryNames = function (node) {
            ASSERT(core.isValidNode(node));

            var merged = {};
            do {
                var names = innerCore.getRegistryNames(node);
                for (var i = 0; i < names.length; ++i) {
                    if (!(names[i] in merged)) {
                        merged[names[i]] = true;
                    }
                }

                node = node.base;
            } while (node);

            return Object.keys(merged);
        };

        core.getAttribute = function (node, name) {
            ASSERT(core.isValidNode(node));
            var value;
            do {
                value = innerCore.getAttribute(node, name);
                node = node.base;
            } while (typeof value === 'undefined' && node !== null);

            return value;
        };

        core.getRegistry = function (node, name) {
            ASSERT(core.isValidNode(node));
            var value;
            do {
                value = innerCore.getRegistry(node, name);
                node = node.base;
            } while (typeof value === 'undefined' && node !== null);

            return value;
        };

        core.getPointerNames = function (node) {
            ASSERT(core.isValidNode(node));

            return core.getPointerNamesFrom(node, '');
            //var merged = {};
            //do {
            //    var names = oldcore.getPointerNames(node);
            //    for (var i = 0; i < names.length; ++i) {
            //        if (!(names[i] in merged)) {
            //            merged[names[i]] = true;
            //        }
            //    }
            //
            //    node = node.base;
            //} while (node);
            //
            //return Object.keys(merged);
        };

        core.getPointerNamesFrom = function (node, source) {
            ASSERT(core.isValidNode(node));

            var merged = {};
            do {
                var names = innerCore.getPointerNamesFrom(node, source);
                for (var i = 0; i < names.length; ++i) {
                    if (!(names[i] in merged)) {
                        merged[names[i]] = true;
                    }
                }

                node = node.base;
            } while (node);

            return Object.keys(merged);
        };

        core.getPointerPathFrom = function (node, source, name) {
            ASSERT(core.isValidNode(node) && typeof name === 'string');

            var ownPointerPath = innerCore.getPointerPathFrom(node, source, name);
            if (ownPointerPath !== undefined) {
                return ownPointerPath;
            }
            var target,
                basePath,
                hasNullTarget = false,
                getProperty = function (node, name) {
                    var property;
                    while (property === undefined && node !== null) {
                        property = innerCore.getProperty(node, name);
                        node = core.getBase(node);
                    }
                    return property;
                },
                getSimpleBasePath = function (node) {
                    var path = innerCore.getPointerPathFrom(node, source, name);
                    if (path === undefined) {
                        if (node.base !== null && node.base !== undefined) {
                            return getSimpleBasePath(node.base);
                        } else {
                            return undefined;
                        }
                    } else {
                        return path;
                    }
                },
                getParentOfBasePath = function (node) {
                    if (node.base) {
                        var parent = core.getParent(node.base);
                        if (parent) {
                            return core.getPath(parent);
                        } else {
                            return undefined;
                        }
                    } else {
                        return undefined;
                    }
                },
                getBaseOfParentPath = function (node) {
                    var parent = core.getParent(node);
                    if (parent) {
                        if (parent.base) {
                            return core.getPath(parent.base);
                        } else {
                            return undefined;
                        }
                    } else {
                        return undefined;
                    }
                },
                getTargetRelPath = function (node, relSource, name) {
                    var ovr = core.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);
                    var source = core.getChild(ovr, relSource);
                    return getProperty(source, name);
                };

            basePath = node.base ? getSimpleBasePath(node.base) : undefined;

            while (node) {
                target = getTargetRelPath(node, source, name);
                if (target !== undefined) {
                    if (target.indexOf('_nullptr') !== -1) {
                        hasNullTarget = true;
                        target = undefined;
                    } else {
                        break;
                    }
                }

                source = '/' + core.getRelid(node) + source;
                if (getParentOfBasePath(node) === getBaseOfParentPath(node)) {
                    node = core.getParent(node);
                } else {
                    node = null;
                }
            }

            if (target !== undefined) {
                ASSERT(node);
                target = innerCore.joinPaths(innerCore.getPath(node), target);
            }

            if (typeof target === 'string') {
                return target;
            }
            if (typeof basePath === 'string') {
                return basePath;
            }
            if (hasNullTarget === true) {
                return null;
            }
            return undefined;

        };

        core.getPointerPath = function (node, name) {

            return core.getPointerPathFrom(node, '', name);
            //ASSERT(core.isValidNode(node) && typeof name === 'string');
            //
            //var ownPointerPath = oldcore.getPointerPath(node, name);
            //if (ownPointerPath !== undefined) {
            //    return ownPointerPath;
            //}
            //var source = '',
            //    target,
            //    coretree = core.getCoreTree(),
            //    basePath,
            //    hasNullTarget = false,
            //    getProperty = function (node, name) {
            //        var property;
            //        while (property === undefined && node !== null) {
            //            property = coretree.getProperty(node, name);
            //            node = core.getBase(node);
            //        }
            //        return property;
            //    },
            //    getSimpleBasePath = function (node) {
            //        var path = oldcore.getPointerPath(node, name);
            //        if (path === undefined) {
            //            if (node.base !== null && node.base !== undefined) {
            //                return getSimpleBasePath(node.base);
            //            } else {
            //                return undefined;
            //            }
            //        } else {
            //            return path;
            //        }
            //    },
            //    getParentOfBasePath = function (node) {
            //        if (node.base) {
            //            var parent = core.getParent(node.base);
            //            if (parent) {
            //                return core.getPath(parent);
            //            } else {
            //                return undefined;
            //            }
            //        } else {
            //            return undefined;
            //        }
            //    },
            //    getBaseOfParentPath = function (node) {
            //        var parent = core.getParent(node);
            //        if (parent) {
            //            if (parent.base) {
            //                return core.getPath(parent.base);
            //            } else {
            //                return undefined;
            //            }
            //        } else {
            //            return undefined;
            //        }
            //    },
            //    getTargetRelPath = function (node, relSource, name) {
            //        var ovr = core.getChild(node, 'ovr');
            //        var source = core.getChild(ovr, relSource);
            //        return getProperty(source, name);
            //    };
            //
            //basePath = node.base ? getSimpleBasePath(node.base) : undefined;
            //
            //while (node) {
            //    target = getTargetRelPath(node, source, name);
            //    if (target !== undefined) {
            //        if (target.indexOf('_nullptr') !== -1) {
            //            hasNullTarget = true;
            //            target = undefined;
            //        } else {
            //            break;
            //        }
            //    }
            //
            //    source = '/' + core.getRelid(node) + source;
            //    if (getParentOfBasePath(node) === getBaseOfParentPath(node)) {
            //        node = core.getParent(node);
            //    } else {
            //        node = null;
            //    }
            //}
            //
            //
            //if (target !== undefined) {
            //    ASSERT(node);
            //    target = coretree.joinPaths(oldcore.getPath(node), target);
            //}
            //
            //if (typeof target === 'string') {
            //    return target;
            //}
            //if (typeof basePath === 'string') {
            //    return basePath;
            //}
            //if (hasNullTarget === true) {
            //    return null;
            //}
            //return undefined;

        };

        core.getChildrenPaths = function (node) {
            var path = core.getPath(node);

            var relids = core.getChildrenRelids(node);
            for (var i = 0; i < relids.length; ++i) {
                relids[i] = path + '/' + relids[i];
            }

            return relids;
        };
        //</editor-fold>

        //<editor-fold=Added Methods>

        //check of inheritance chain and containment hierarchy collision
        core.isInheritanceContainmentCollision = function (node, parent) {
            var bases = [];

            while (node) {
                bases.push(core.getPath(node));
                node = core.getBase(node);
            }

            while (parent) {
                if (bases.indexOf(core.getPath(parent)) !== -1) {
                    return true;
                }
                parent = core.getParent(parent);
            }
            return false;
        };

        core.getBase = function (node) {
            ASSERT((node));

            // TODO: check if base has moved
            return node.base;
        };

        core.setBase = function (node, base) {
            ASSERT(core.isValidNode(node) && (base === undefined || base === null || core.isValidNode(base)));
            ASSERT(!base || core.getPath(core.getParent(node)) !== core.getPath(base));
            ASSERT(!base || core.getPath(node) !== core.getPath(base));

            var oldBase = core.getBase(node);

            //TODO this restriction should be removed after clarification of the different scenarios and outcomes
            //changing base from or to a node which has children is not allowed currently
            ASSERT((base === null || oldBase === null) ||
                (core.getChildrenRelids(base).length === 0 && core.getChildrenRelids(oldBase).length === 0));

            if (!!base) {
                //TODO maybe this is not the best way, needs to be double checked
                node.base = base;
                var parent = core.getParent(node),
                    parentBase, baseParent;
                if (parent) {
                    parentBase = core.getBase(parent);
                    baseParent = core.getParent(base);
                    if (core.getPath(parentBase) !== core.getPath(baseParent)) {
                        //we have to set an exact pointer only if it is not inherited child
                        innerCore.setPointer(node, CONSTANTS.BASE_POINTER, base);
                    } else {
                        innerCore.deletePointer(node, CONSTANTS.BASE_POINTER); //we remove the pointer just in case
                    }
                } else {
                    //if for some reason the node doesn't have a parent it is surely not an inherited child
                    innerCore.setPointer(node, CONSTANTS.BASE_POINTER, base);
                }
            } else {
                innerCore.setPointer(node, CONSTANTS.BASE_POINTER, null);
                node.base = null;
            }
        };

        core.getBaseRoot = function (node) {
            ASSERT(core.isValidNode(node));
            while (node.base !== null) {
                node = node.base;
            }

            return node;
        };

        core.getTypeRoot = function (node) {
            if (node.base) {
                while (node.base !== null) {
                    node = core.getBase(node);
                }
                return node;
            } else {
                return null;
            }
        };

        core.getOwnChildrenRelids = function (node) {
            return innerCore.getChildrenRelids(node);
        };

        core.loadOwnChildren = function (node) {
            ASSERT(core.isValidNode(node));
            var relids = core.getOwnChildrenRelids(node);
            relids = relids.sort(); //TODO this should be temporary
            var children = [];
            for (var i = 0; i < relids.length; i++) {
                children[i] = core.loadChild(node, relids[i]);
            }
            return TASYNC.call(function (n) {
                var newn = [];
                for (var i = 0; i < n.length; i++) {
                    if (n[i] !== null) {
                        newn.push(n[i]);
                    }
                }
                return newn;
            }, TASYNC.lift(children));
        };

        core.getOwnAttributeNames = function (node) {
            return innerCore.getAttributeNames(node);
        };

        core.getOwnRegistryNames = function (node) {
            return innerCore.getRegistryNames(node);
        };

        core.getOwnAttribute = function (node, name) {
            return innerCore.getAttribute(node, name);
        };

        core.getOwnRegistry = function (node, name) {
            return innerCore.getRegistry(node, name);
        };

        core.getOwnPointerNames = function (node) {
            ASSERT(core.isValidNode(node));
            return innerCore.getPointerNames(node);
        };

        core.getOwnPointerNamesFrom = function (node, source) {
            return innerCore.getPointerNamesFrom(node, source);
        };

        core.getOwnPointerPath = function (node, name) {
            innerCore.getPointerPath(node, name);
        };

        core.getOwnPointerPathFrom = function (node, source, name) {
            innerCore.getPointerPathFrom(node, source, name);
        };

        core.getOwnChildrenPaths = function (node) {
            return innerCore.getChildrenPaths(node);
        };
        //</editor-fold>

        return core;
    };

    return CoreType;
});
