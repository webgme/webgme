/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define(['common/util/assert', 'common/core_/core', 'common/core_/tasync'], function (ASSERT, Core, TASYNC) {
    'use strict';

    // ----------------- CoreType -----------------

    //FIXME TODO these stuff have been simply copied from lower layer, probably it should be put to some constant place
    var OVERLAYS = 'ovr';
    var COLLSUFFIX = '-inv';

    var CoreType = function (oldcore, options) {
        // copy all operations
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        var core = {},
            logger = options.logger.fork('coretype');
        for (var key in oldcore) {
            core[key] = oldcore[key];
        }
        logger.debug('initialized');
        // ----- validity

        function __test(text, cond) {
            if (!cond) {
                throw new Error(text);
            }
        }

        function isValidNode(node) {
            try {
                __test('core', oldcore.isValidNode(node));
                __test('base', typeof node.base === 'object');
                return true;
            } catch (error) {
                console.log('Wrong node', error.stack);
                return false;
            }
        }

        function isFalseNode(node) {
            //TODO this hack should be removed, but now it seems just fine :)
            if (typeof oldcore.getPointerPath(node, 'base') === 'undefined') {
                return true;
            }
            return false;
        }

        core.isValidNode = isValidNode;

        // ----- navigation

        core.getBase = function (node) {
            ASSERT(isValidNode(node));

            // TODO: check if base has moved
            return node.base;
        };

        core.getBaseRoot = function (node) {
            ASSERT(isValidNode(node));
            while (node.base !== null) {
                node = node.base;
            }

            return node;
        };

        core.loadRoot = function (hash) {
            return TASYNC.call(__loadRoot2, oldcore.loadRoot(hash));
        };

        function __loadRoot2(node) {
            ASSERT(typeof node.base === 'undefined' || node.base === null);
            //kecso - TODO it should be undefined, but maybe because of the cache it can be null

            node.base = null;
            return node;
        }

        core.loadChild = function (node, relid) {
            var child = null,
                base = core.getBase(node),
                basechild = null;
            if (base) {
                //the parent is inherited
                if (oldcore.getChildrenRelids(base).indexOf(relid) !== -1) {
                    //inherited child
                    if (oldcore.getChildrenRelids(node).indexOf(relid) !== -1) {
                        //but it is overwritten so we should load it
                        child = oldcore.loadChild(node, relid);
                    }
                    basechild = core.loadChild(base, relid);
                    return TASYNC.call(function (b, c, n, r) {
                        if (c) {
                            child = c;
                            child.base = b;
                            return child;
                        } else {
                            child = core.getChild(n, r);
                            core.setHashed(child, true, true);
                            child.base = b;
                            n.children.push(child);
                            n.data[r] = child.data; //FIXME there should be a proper way to do this
                            return child;
                        }
                    }, basechild, child, node, relid);
                }
            }
            //normal child
            return TASYNC.call(__loadBase, oldcore.loadChild(node, relid));
        };

        core.loadByPath = function (node, path) {
            ASSERT(isValidNode(node));
            ASSERT(path === '' || path.charAt(0) === '/');
            path = path.split('/');
            return loadDescendantByPath(node, path, 1);
        };
        var loadDescendantByPath = function (node, pathArray, index) {
            if (node === null || index === pathArray.length) {
                return node;
            }

            var child = core.loadChild(node, pathArray[index]);
            return TASYNC.call(loadDescendantByPath, child, pathArray, index + 1);
        };

        //TODO the pointer loading is totally based upon the loadByPath...
        core.loadPointer = function (node, name) {
            var pointerPath = core.getPointerPath(node, name);
            return TASYNC.call(core.loadByPath, core.getRoot(node), pointerPath);
        };

        function __loadBase(node) {
            ASSERT(node === null || typeof node.base === 'undefined' || typeof node.base === 'object');

            if (typeof node.base === 'undefined') {
                if (core.isEmpty(node)) {
                    //empty nodes do not have a base
                    node.base = null;
                    return node;
                } else if (isFalseNode(node)) {
                    var root = core.getRoot(node);
                    oldcore.deleteNode(node);
                    core.persist(root);
                    return null;
                } else {
                    var basepath = oldcore.getPointerPath(node, 'base');
                    ASSERT(basepath !== undefined);
                    if (basepath === null) {
                        node.base = null;
                        return node;
                    } else {
                        return TASYNC.call(__loadBase2, node, core.loadByPath(core.getRoot(node), basepath));
                    }
                }
            } else {
                //TODO can the base change at this point???
                return node;
            }
        }

        function __loadBase2(node, target) {
            if (typeof node.base !== null && typeof node.base === 'object' &&
                (oldcore.getPath(node.base) === oldcore.getPath(target))) {
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
                    }, node, __loadBase(target));
                }
            }
        }

        core.getChildrenRelids = function (node) {
            var inheritRelIds = node.base === null ? [] : core.getChildrenRelids(core.getBase(node));
            var ownRelIds = oldcore.getChildrenRelids(node);
            for (var i = 0; i < inheritRelIds.length; i++) {
                if (ownRelIds.indexOf(inheritRelIds[i]) === -1) {
                    ownRelIds.push(inheritRelIds[i]);
                }
            }
            return ownRelIds;
        };

        core.loadChildren = function (node) {
            ASSERT(isValidNode(node));
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

        //collection handling and needed functions
        function _isInheritedChild(node) {
            var parent = core.getParent(node),
                base = core.getBase(node),
                parentBase = parent ? core.getBase(parent) : null,
                baseParent = base ? core.getParent(base) : null;

            if (baseParent && parentBase && core.getPath(baseParent) === core.getPath(parentBase)) {
                return true;
            }
            return false;
        }

        function _getInstanceRoot(node) {

            while (_isInheritedChild(node)) {
                node = core.getParent(node);
            }

            return node;
        }

        //TODO copied function from corerel
        function isPointerName(name) {
            ASSERT(typeof name === 'string');

            return name.slice(-COLLSUFFIX.length) !== COLLSUFFIX;
        }

        function _getInheritedCollectionNames(node) {
            var target = '',
                names = [],
                coretree = core.getCoreTree(),
                startNode = node,
                endNode = _getInstanceRoot(node),
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
                    var child = coretree.getProperty(coretree.getChild(node, OVERLAYS), target);
                    if (child) {
                        for (var name in child) {
                            if (!isPointerName(name)) {
                                name = name.slice(0, -COLLSUFFIX.length);
                                if (names.indexOf(name) < 0) {
                                    names.push(name);
                                }
                            }
                        }
                    }

                    target = '/' + coretree.getRelid(node) + target;
                    node = coretree.getParent(node);
                } while (!exit);
            } while (_isInheritedChild(startNode));

            return names;
        }

        function _getInheritedCollectionPaths(node, name) {
            var target = '',
                result = [],
                coretree = core.getCoreTree(),
                startNode = node,
                endNode = _getInstanceRoot(node),
                prefixStart = startNode,
                prefixNode = prefixStart,
                exit,
                collName = name + COLLSUFFIX,
                notOverwritten = function (sNode, eNode, source) {
                    var result = true,
                        tNode = sNode,
                        child, target;

                    while (core.getPath(tNode) !== core.getPath(eNode)) {
                        child = coretree.getChild(tNode, OVERLAYS);
                        child = coretree.getChild(child, source);
                        if (child) {
                            target = coretree.getProperty(child, name);
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
                    var child = coretree.getChild(node, OVERLAYS);
                    child = coretree.getChild(child, target);
                    if (child) {
                        var sources = coretree.getProperty(child, collName);
                        if (sources) {
                            ASSERT(Array.isArray(sources) && sources.length >= 1);

                            var prefix = coretree.getPath(prefixNode);

                            for (var i = 0; i < sources.length; ++i) {
                                if (notOverwritten(prefixNode, node, sources[i])) {
                                    result.push(coretree.joinPaths(prefix, sources[i]));
                                }
                            }
                        }
                    }

                    target = '/' + coretree.getRelid(node) + target;
                    node = coretree.getParent(node);
                    prefixNode = core.getParent(prefixNode);
                } while (!exit);
            } while (_isInheritedChild(startNode));

            return result;
        }

        core.getCollectionNames = function (node) {
            ASSERT(isValidNode(node));
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
                ownNames = oldcore.getCollectionNames(node),
                inhNames = checkCollNames(_getInheritedCollectionNames(node)),
                i;
            for (i = 0; i < ownNames.length; i++) {
                if (inhNames.indexOf(ownNames[i]) < 0) {
                    inhNames.push(ownNames[i]);
                }
            }

            return inhNames;
        };

        core.getCollectionPaths = function (node, name) {
            ASSERT(isValidNode(node) && name);
            var ownPaths = oldcore.getCollectionPaths(node, name),
                inhPaths = _getInheritedCollectionPaths(node, name);

            inhPaths = inhPaths.concat(ownPaths);

            return inhPaths;
        };

        core.loadCollection = function (node, name) {
            var root = core.getRoot(node);
            var paths = core.getCollectionPaths(node, name);

            var nodes = [];
            for (var i = 0; i < paths.length; i++) {
                nodes[i] = core.loadByPath(root, paths[i]);
            }

            return TASYNC.lift(nodes);
        };

        // ----- creation

        core.createNode = function (parameters) {
            parameters = parameters || {};
            var base = parameters.base || null,
                parent = parameters.parent;


            ASSERT(!parent || isValidNode(parent));
            ASSERT(!base || isValidNode(base));
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));

            var node = oldcore.createNode(parameters);
            node.base = base;
            oldcore.setPointer(node, 'base', base);

            return node;
        };

        // ----- properties

        core.getAttributeNames = function (node) {
            ASSERT(isValidNode(node));

            var merged = {};
            do {
                var names = oldcore.getAttributeNames(node);
                for (var i = 0; i < names.length; ++i) {
                    if (!(names[i] in merged)) {
                        merged[names[i]] = true;
                    }
                }

                node = node.base;
            } while (node);

            return Object.keys(merged);
        };
        core.getOwnAttributeNames = function (node) {
            return oldcore.getAttributeNames(node);
        };

        core.getRegistryNames = function (node) {
            ASSERT(isValidNode(node));

            var merged = {};
            do {
                var names = oldcore.getRegistryNames(node);
                for (var i = 0; i < names.length; ++i) {
                    if (!(names[i] in merged)) {
                        merged[names[i]] = true;
                    }
                }

                node = node.base;
            } while (node);

            return Object.keys(merged);
        };
        core.getOwnRegistryNames = function (node) {
            return oldcore.getRegistryNames(node);
        };

        core.getAttribute = function (node, name) {
            ASSERT(isValidNode(node));
            var value;
            do {
                value = oldcore.getAttribute(node, name);
                node = node.base;
            } while (typeof value === 'undefined' && node !== null);

            return value;
        };
        core.getOwnAttribute = function (node, name) {
            return oldcore.getAttribute(node, name);
        };

        core.getRegistry = function (node, name) {
            ASSERT(isValidNode(node));
            var value;
            do {
                value = oldcore.getRegistry(node, name);
                node = node.base;
            } while (typeof value === 'undefined' && node !== null);

            return value;
        };
        core.getOwnRegistry = function (node, name) {
            return oldcore.getRegistry(node, name);
        };


        // ----- pointers

        core.getPointerNames = function (node) {
            ASSERT(isValidNode(node));

            var merged = {};
            do {
                var names = oldcore.getPointerNames(node);
                for (var i = 0; i < names.length; ++i) {
                    if (!(names[i] in merged)) {
                        merged[names[i]] = true;
                    }
                }

                node = node.base;
            } while (node);

            return Object.keys(merged);
        };
        core.getOwnPointerNames = function (node) {
            ASSERT(isValidNode(node));
            return oldcore.getPointerNames(node);
        };

        core.getPointerPath = function (node, name) {
            ASSERT(isValidNode(node) && typeof name === 'string');

            var ownPointerPath = oldcore.getPointerPath(node, name);
            if (ownPointerPath !== undefined) {
                return ownPointerPath;
            }
            var source = '',
                target,
                coretree = core.getCoreTree(),
                basePath,
                hasNullTarget = false,
                getProperty = function (node, name) {
                    var property;
                    while (property === undefined && node !== null) {
                        property = coretree.getProperty(node, name);
                        node = core.getBase(node);
                    }
                    return property;
                },
                getSimpleBasePath = function (node) {
                    var path = oldcore.getPointerPath(node, name);
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
                    var ovr = core.getChild(node, 'ovr');
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
                target = coretree.joinPaths(oldcore.getPath(node), target);
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
        core.getOwnPointerPath = function (node, name) {
            oldcore.getPointerPath(node, name);
        };

        core.setBase = function (node, base) {
            ASSERT(isValidNode(node) && (base === undefined || base === null || isValidNode(base)));
            ASSERT(!base || core.getPath(core.getParent(node)) !== core.getPath(base));
            ASSERT(!base || core.getPath(node) !== core.getPath(base));
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
                        oldcore.setPointer(node, 'base', base);
                    } else {
                        oldcore.deletePointer(node, 'base'); //we remove the pointer just in case
                    }
                } else {
                    //if for some reason the node doesn't have a parent it is surely not an inherited child
                    oldcore.setPointer(node, 'base', base);
                }
            } else {
                oldcore.setPointer(node, 'base', null);
                node.base = null;
            }
        };

        core.getChild = function (node, relid) {
            ASSERT(isValidNode(node) && (typeof node.base === 'undefined' || typeof node.base === 'object'));
            var child = oldcore.getChild(node, relid);
            if (node.base !== null && node.base !== undefined) {
                if (child.base === null || child.base === undefined) {
                    child.base = core.getChild(node.base, relid);
                }
            } else {
                child.base = null;
            }
            return child;
        };
        core.moveNode = function (node, parent) {
            //TODO we have to check if the move is really allowed!!!
            ASSERT(isValidNode(node) && isValidNode(parent));
            var base = node.base,
                parentBase = parent.base;
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));
            ASSERT(!parentBase || core.getPath(parentBase) !== core.getPath(node));

            var moved = oldcore.moveNode(node, parent);
            moved.base = base;
            return moved;
        };
        core.copyNode = function (node, parent) {
            var base = node.base;
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));

            var newnode = oldcore.copyNode(node, parent);
            newnode.base = base;
            oldcore.setPointer(newnode, 'base', base);
            return newnode;
        };
        function _inheritedPointerNames(node) {
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
                names = _inheritedPointerNames(nodes[i]);
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
            copiedNodes = oldcore.copyNodes(nodes, parent);

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
                oldcore.setPointer(copiedNodes[i], 'base', base);
            }


            return copiedNodes;
        };

        core.getChildrenPaths = function (node) {
            var path = core.getPath(node);

            var relids = core.getChildrenRelids(node);
            for (var i = 0; i < relids.length; ++i) {
                relids[i] = path + '/' + relids[i];
            }

            return relids;
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
                        oldcore.deleteNode(node);
                    }
                } else {
                    oldcore.deleteNode(node);
                }
            }
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

        // -------- kecso

        return core;
    };

    return CoreType;
});
