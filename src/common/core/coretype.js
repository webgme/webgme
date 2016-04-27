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
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        //isPointerName should be removed from API at this level
        delete self.isPointerName;

        logger.debug('initialized CoreType');

        //<editor-fold=Helper Functions>
        function test(text, cond) {
            if (!cond) {
                throw new Error(text);
            }
        }

        function isFalseNode(node) {
            //TODO this hack should be removed, but now it seems just fine :)
            return innerCore.getPointerPath(node, CONSTANTS.BASE_POINTER) === undefined;
        }

        function loadRoot2(node) {
            ASSERT(node.base === undefined || node.base === null);
            //kecso - TODO it should be undefined, but maybe because of the cache it can be null

            node.base = null;
            return node;
        }

        function loadChild(node, relid) {
            var child = null,
                base = self.getBase(node),
                basechild = null;
            if (base) {
                //the parent is inherited
                if (self.getChildrenRelids(base).indexOf(relid) !== -1) {
                    //inherited child
                    if (innerCore.getChildrenRelids(node).indexOf(relid) !== -1) {
                        //but it is overwritten so we should load it
                        child = innerCore.loadChild(node, relid);
                    }
                    basechild = self.loadChild(base, relid);
                    return TASYNC.call(function (b, c, n, r) {
                        if (c) {
                            child = c;
                            child.base = b;
                            return child;
                        } else {
                            child = innerCore.getChild(n, r);
                            self.setHashed(child, true, true);
                            child.base = b;

                            return child;
                        }
                    }, basechild, child, node, relid);
                }
            }
            //normal child - as every node should have a base, it is normally mean a direct child of the ROOT
            if (self.getChildrenRelids(node).indexOf(relid) === -1) {
                return null;
            }

            return TASYNC.call(loadBase, innerCore.loadChild(node, relid));
        }

        function loadBase(node) {
            var path = innerCore.getPath(node);
            ASSERT(node === null || node.base === undefined || typeof node.base === 'object');

            if (node.base === undefined) {
                if (self.isEmpty(node)) {
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
                    } else if (self.isContainerPath(basePath, path)) {
                        //contained base error
                        logger.error('node [' + path + '] contains its own base!');
                        innerCore.deleteNode(node);
                        //core.persist(core.getRoot(node));
                        return null;
                    } else {
                        return TASYNC.call(loadBase2, node, self.loadByPath(self.getRoot(node), basePath));
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
                ASSERT(node.base === undefined || node.base === null); //kecso

                if (target === null) {
                    // At this point the base node should be a valid node
                    logger.warn('node [' + innerCore.getPath(node) +
                        '] removed due to missing base in inheritance chain');
                    innerCore.deleteNode(node);
                    //core.persist(core.getRoot(node));
                    return null;
                }

                node.base = target;
                return node;
            }
        }

        function loadDescendantByPath(node, pathArray, index) {
            if (node === null || index === pathArray.length) {
                return node;
            }

            var child = self.loadChild(node, pathArray[index]);
            return TASYNC.call(loadDescendantByPath, child, pathArray, index + 1);
        }

        function isInheritedChild(node) {
            var parent = self.getParent(node),
                base = self.getBase(node),
                parentBase = parent ? self.getBase(parent) : null,
                baseParent = base ? self.getParent(base) : null;

            if (baseParent && parentBase && self.getPath(baseParent) === self.getPath(parentBase)) {
                return true;
            }
            return false;
        }

        function getInstanceRoot(node) {

            while (isInheritedChild(node)) {
                node = self.getParent(node);
            }

            return node;
        }

        function getInheritedCollectionNames(node) {
            var names = [],
                extendCollectionNames = function (overlay, target) {
                    var child = overlay[target],
                        name;

                    if (child) {
                        for (name in child) {
                            if (!innerCore.isPointerName(name) && name !== CONSTANTS.MUTABLE_PROPERTY) {
                                name = name.slice(0, -CONSTANTS.COLLECTION_NAME_SUFFIX.length);
                                if (names.indexOf(name) < 0) {
                                    names.push(name);
                                }
                            }
                        }
                    }
                },
                actualNode = node,
                startNode = node,
                endNode,
                target;

            while (startNode) {
                actualNode = self.getBase(startNode);
                endNode = self.getBase(getInstanceRoot(startNode));
                target = '';
                if (actualNode && endNode) {
                    while (actualNode && self.getPath(actualNode).indexOf(self.getPath(endNode)) === 0) {
                        extendCollectionNames(
                            self.getProperty(actualNode, CONSTANTS.OVERLAYS_PROPERTY) || {},
                            target);
                        target = '/' + self.getRelid(actualNode) + target;
                        actualNode = self.getParent(actualNode);
                    }
                }
                startNode = self.getBase(startNode);
            }

            return names;
        }

        // function notOverwritten(sNode, eNode, source, name) {
        //     var result = true,
        //         tNode = sNode,
        //         child, target;
        //
        //     while (self.getPath(tNode) !== self.getPath(eNode)) {
        //         child = innerCore.getChild(tNode, CONSTANTS.OVERLAYS_PROPERTY);
        //         child = innerCore.getChild(child, source);
        //         if (child) {
        //             target = innerCore.getProperty(child, name);
        //             if (target) {
        //                 return false;
        //             }
        //         }
        //         tNode = self.getBase(tNode);
        //     }
        //
        //     return result;
        // }

        function getInheritedCollectionPaths(node, name) {
            var sources = [],
                extendSources = function (overlay, prefixPath, target) {
                    var items = (overlay[target] || {})[name + CONSTANTS.COLLECTION_NAME_SUFFIX],
                        i;
                    if (items) {
                        ASSERT(Array.isArray(items) && items.length >= 1);
                        for (i = 0; i < items.length; i += 1) {
                            sources.push(innerCore.joinPaths(prefixPath, items[i]));
                        }
                    }
                },
                prefixNode,
                actualNode = node,
                startNode = node,
                endNode,
                target;

            while (startNode) {
                actualNode = self.getBase(startNode);
                endNode = self.getBase(getInstanceRoot(startNode));
                prefixNode = node;
                target = '';
                if (actualNode && endNode) {
                    while (actualNode && self.getPath(actualNode).indexOf(self.getPath(endNode)) === 0) {
                        extendSources(self.getProperty(actualNode, CONSTANTS.OVERLAYS_PROPERTY) || {},
                            self.getPath(prefixNode),
                            target);
                        target = '/' + self.getRelid(actualNode) + target;
                        actualNode = self.getParent(actualNode);
                        prefixNode = self.getParent(prefixNode);
                    }
                }
                startNode = self.getBase(startNode);
            }

            return sources;
        }

        function inheritedPointerNames(node) {
            var allNames = self.getPointerNames(node),
                ownNames = self.getOwnPointerNames(node),
                names = [],
                i;

            for (i = 0; i < allNames.length; i++) {
                if (ownNames.indexOf(allNames[i]) === -1) {
                    names.push(allNames[i]);
                }
            }

            return names;
        }

        function isValidNodeThrow(node) {
            test('core', innerCore.isValidNode(node));
            test('base', typeof node.base === 'object');
        }

        function getProperty(node, name) {
            var property;
            while (property === undefined && node !== null) {
                property = innerCore.getProperty(node, name);
                node = self.getBase(node);
            }
            return property;
        }

        function getSimpleBasePath(node, source, name) {
            var path = innerCore.getPointerPathFrom(node, source, name);
            if (path === undefined) {
                if (node.base !== null && node.base !== undefined) {
                    return getSimpleBasePath(node.base, source, name);
                } else {
                    return undefined;
                }
            } else {
                return path;
            }
        }

        function getParentOfBasePath(node) {
            var parent;
            if (node.base) {
                parent = self.getParent(node.base);
                if (parent) {
                    return self.getPath(parent);
                } else {
                    return undefined;
                }
            } else {
                return undefined;
            }
        }

        function getBaseOfParentPath(node) {
            var parent = self.getParent(node);
            if (parent) {
                if (parent.base) {
                    return self.getPath(parent.base);
                } else {
                    return undefined;
                }
            } else {
                return undefined;
            }
        }

        function getTargetRelPath(node, relSource, name) {
            var ovr = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY),
                source = self.getChild(ovr, relSource);
            return getProperty(source, name);
        }

        // function checkCollNames(node, draft) {
        //     var filtered = [],
        //         i, sources;
        //     for (i = 0; i < draft.length; i++) {
        //         sources = self.getCollectionPaths(node, draft[i]);
        //         if (sources.length > 0) {
        //             filtered.push(draft[i]);
        //         }
        //     }
        //     return filtered;
        // }

        //</editor-fold>

        //<editor-fold=Modified Methods>
        this.isValidNode = function (node) {
            try {
                isValidNodeThrow(node);
                return true;
            } catch (error) {
                logger.error(error.message, {stack: error.stack, node: node});
                return false;
            }
        };

        this.loadRoot = function (hash) {
            return TASYNC.call(loadRoot2, innerCore.loadRoot(hash));
        };

        this.loadChild = function (node, relid) {
            return TASYNC.call(function (child) {
                if (child && self.isInheritanceContainmentCollision(child, self.getParent(child))) {
                    logger.error('node[' + self.getPath(child) +
                        '] was deleted due to inheritance-containment collision');
                    self.deleteNode(child);
                    //core.persist(core.getRoot(child));
                    return null;
                } else {
                    return child;
                }
            }, loadChild(node, relid));
        };

        this.loadByPath = function (node, path) {
            ASSERT(self.isValidNode(node));
            ASSERT(path === '' || path.charAt(0) === '/');
            path = path.split('/');
            return loadDescendantByPath(node, path, 1);
        };

        this.loadPointer = function (node, name) {
            //TODO the pointer loading is totally based upon the loadByPath...
            var pointerPath = self.getPointerPath(node, name),
                root = self.getRoot(node);

            if (pointerPath === undefined) {
                return undefined;
            }
            if (pointerPath === null) {
                return null;
            }
            return TASYNC.call(function () {
                return self.loadByPath(root, pointerPath);
            }, self.loadPaths(self.getHash(root), [pointerPath]));
        };

        this.getChild = function (node, relid) {
            ASSERT(self.isValidNode(node) && (node.base === undefined || typeof node.base === 'object'));
            var child = innerCore.getChild(node, relid);
            if (node.base !== null && node.base !== undefined) {
                if (child.base === null || child.base === undefined) {
                    child.base = self.getChild(node.base, relid);
                }
            } else {
                child.base = null;
            }
            return child;
        };

        this.getChildrenRelids = function (node) {
            var inheritRelIds = node.base === null ? [] : self.getChildrenRelids(self.getBase(node));
            var ownRelIds = innerCore.getChildrenRelids(node);
            for (var i = 0; i < inheritRelIds.length; i++) {
                if (ownRelIds.indexOf(inheritRelIds[i]) === -1) {
                    ownRelIds.push(inheritRelIds[i]);
                }
            }
            return ownRelIds;
        };

        this.loadChildren = function (node) {
            ASSERT(self.isValidNode(node));
            var relids = self.getChildrenRelids(node);
            relids = relids.sort(); //TODO this should be temporary
            var children = [];
            for (var i = 0; i < relids.length; i++) {
                children[i] = self.loadChild(node, relids[i]);
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

        this.getCollectionNames = function (node) {
            ASSERT(self.isValidNode(node));
            var ownNames = innerCore.getCollectionNames(node),
                inhNames = getInheritedCollectionNames(node),
                i;
            for (i = 0; i < ownNames.length; i++) {
                if (inhNames.indexOf(ownNames[i]) < 0) {
                    inhNames.push(ownNames[i]);
                }
            }

            return inhNames;
        };

        this.getCollectionPaths = function (node, name) {
            ASSERT(self.isValidNode(node) && name);
            var ownPaths = innerCore.getCollectionPaths(node, name),
                inhPaths = getInheritedCollectionPaths(node, name);

            inhPaths = inhPaths.concat(ownPaths);

            return inhPaths;
        };

        this.loadCollection = function (node, name) {
            var root = self.getRoot(node),
                paths = self.getCollectionPaths(node, name),
                nodes = [],
                i,
                rootHash = self.getHash(root);

            return TASYNC.call(function () {
                for (i = 0; i < paths.length; i += 1) {
                    nodes[i] = self.loadByPath(root, paths[i]);
                }
                return TASYNC.lift(nodes);
            }, self.loadPaths(rootHash, paths));
        };

        this.createNode = function (parameters) {
            parameters = parameters || {};
            var base = parameters.base || null,
                parent = parameters.parent;

            ASSERT(!parent || self.isValidNode(parent));
            ASSERT(!base || self.isValidNode(base));
            ASSERT(!base || self.getPath(base) !== self.getPath(parent));

            var node = innerCore.createNode(parameters);
            node.base = base;
            innerCore.setPointer(node, CONSTANTS.BASE_POINTER, base);

            return node;
        };

        this.moveNode = function (node, parent) {
            //TODO we have to check if the move is really allowed!!!
            ASSERT(self.isValidNode(node) && self.isValidNode(parent));
            var base = node.base,
                parentBase = parent.base;
            ASSERT(!base || self.getPath(base) !== self.getPath(parent));
            ASSERT(!parentBase || self.getPath(parentBase) !== self.getPath(node));

            var moved = innerCore.moveNode(node, parent);
            moved.base = base;
            return moved;
        };

        this.copyNode = function (node, parent) {
            var base = node.base;
            ASSERT(!base || self.getPath(base) !== self.getPath(parent));

            var newnode = innerCore.copyNode(node, parent);
            newnode.base = base;
            innerCore.setPointer(newnode, CONSTANTS.BASE_POINTER, base);
            return newnode;
        };

        this.copyNodes = function (nodes, parent) {
            var copiedNodes,
                i, j, index, base,
                relations = [],
                names, pointer,
                paths = [];

            //here we also have to copy the inherited relations which points inside the copy area
            for (i = 0; i < nodes.length; i++) {
                paths.push(self.getPath(nodes[i]));
            }

            for (i = 0; i < nodes.length; i++) {
                names = inheritedPointerNames(nodes[i]);
                pointer = {};
                for (j = 0; j < names.length; j++) {
                    index = paths.indexOf(self.getPointerPath(nodes[i], names[j]));
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
                    self.setPointer(copiedNodes[i], names[j], copiedNodes[relations[i][names[j]]]);
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

        this.deleteNode = function (node, technical) {
            //currently we only check if the node is inherited from its parents children
            if (node && (node.base !== null || technical === true)) {
                var parent = self.getParent(node),
                    parentsBase = parent ? self.getBase(node) : null,
                    base = self.getBase(node),
                    basesParent = base ? self.getParent(node) : null;

                if (parent && parentsBase && base && basesParent) {
                    if (self.getPath(parentsBase) !== self.getPath(basesParent)) {
                        innerCore.deleteNode(node);
                    }
                } else {
                    innerCore.deleteNode(node);
                }
            }
        };

        this.getAttributeNames = function (node) {
            ASSERT(self.isValidNode(node));

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

        this.getRegistryNames = function (node) {
            ASSERT(self.isValidNode(node));

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

        this.getAttribute = function (node, name) {
            ASSERT(self.isValidNode(node));
            var value;
            do {
                value = innerCore.getAttribute(node, name);
                node = node.base;
            } while (value === undefined && node !== null);

            return value;
        };

        this.getRegistry = function (node, name) {
            ASSERT(self.isValidNode(node));
            var value;
            do {
                value = innerCore.getRegistry(node, name);
                node = node.base;
            } while (value === undefined && node !== null);

            return value;
        };

        this.getPointerNames = function (node) {
            ASSERT(self.isValidNode(node));

            return self.getPointerNamesFrom(node, '');
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

        this.getPointerNamesFrom = function (node, source) {
            ASSERT(self.isValidNode(node));

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

        this.getPointerPathFrom = function (node, source, name) {
            ASSERT(self.isValidNode(node) && typeof name === 'string');

            var ownPointerPath = innerCore.getPointerPathFrom(node, source, name);
            if (ownPointerPath !== undefined) {
                return ownPointerPath;
            }
            var target,
                basePath,
                hasNullTarget = false;

            basePath = node.base ? getSimpleBasePath(node.base, source, name) : undefined;

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

                source = '/' + self.getRelid(node) + source;
                if (getParentOfBasePath(node) === getBaseOfParentPath(node)) {
                    node = self.getParent(node);
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

        this.getPointerPath = function (node, name) {
            return self.getPointerPathFrom(node, '', name);
        };

        this.getChildrenPaths = function (node) {
            var path = self.getPath(node);

            var relids = self.getChildrenRelids(node);
            for (var i = 0; i < relids.length; ++i) {
                relids[i] = path + '/' + relids[i];
            }

            return relids;
        };
        //</editor-fold>

        //<editor-fold=Added Methods>

        //check of inheritance chain and containment hierarchy collision
        this.isInheritanceContainmentCollision = function (node, parent) {
            var bases = [];

            while (node) {
                bases.push(self.getPath(node));
                node = self.getBase(node);
            }

            while (parent) {
                if (bases.indexOf(self.getPath(parent)) !== -1) {
                    return true;
                }
                parent = self.getParent(parent);
            }
            return false;
        };

        this.getBase = function (node) {
            ASSERT(self.isValidNode(node));

            // TODO: check if base has moved
            return node.base;
        };

        this.setBase = function (node, base) {
            ASSERT(self.isValidNode(node) && (base === undefined || base === null || self.isValidNode(base)));
            ASSERT(!base || self.getPath(self.getParent(node)) !== self.getPath(base));
            ASSERT(!base || self.getPath(node) !== self.getPath(base));

            var oldBase = self.getBase(node);

            //TODO this restriction should be removed after clarification of the different scenarios and outcomes
            //changing base from or to a node which has children is not allowed currently
            ASSERT((base === null || oldBase === null) ||
                (self.getChildrenRelids(base).length === 0 && self.getChildrenRelids(oldBase).length === 0));

            if (!!base) {
                //TODO maybe this is not the best way, needs to be double checked
                node.base = base;
                var parent = self.getParent(node),
                    parentBase, baseParent;
                if (parent) {
                    parentBase = self.getBase(parent);
                    baseParent = self.getParent(base);
                    if (self.getPath(parentBase) !== self.getPath(baseParent)) {
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

        this.getBaseRoot = function (node) {
            ASSERT(self.isValidNode(node));
            while (node.base !== null) {
                node = node.base;
            }

            return node;
        };

        this.getTypeRoot = function (node) {
            if (node.base) {
                while (node.base !== null) {
                    node = self.getBase(node);
                }
                return node;
            } else {
                return null;
            }
        };

        this.getOwnChildrenRelids = function (node) {
            return innerCore.getChildrenRelids(node);
        };

        this.loadOwnChildren = function (node) {
            ASSERT(self.isValidNode(node));
            var relids = self.getOwnChildrenRelids(node);
            relids = relids.sort(); //TODO this should be temporary
            var children = [];
            for (var i = 0; i < relids.length; i++) {
                children[i] = self.loadChild(node, relids[i]);
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

        this.getOwnAttributeNames = function (node) {
            return innerCore.getAttributeNames(node);
        };

        this.getOwnRegistryNames = function (node) {
            return innerCore.getRegistryNames(node);
        };

        this.getOwnAttribute = function (node, name) {
            return innerCore.getAttribute(node, name);
        };

        this.getOwnRegistry = function (node, name) {
            return innerCore.getRegistry(node, name);
        };

        this.getOwnPointerNames = function (node) {
            ASSERT(self.isValidNode(node));
            return innerCore.getPointerNames(node);
        };

        this.getOwnPointerNamesFrom = function (node, source) {
            return innerCore.getPointerNamesFrom(node, source);
        };

        this.getOwnPointerPath = function (node, name) {
            innerCore.getPointerPath(node, name);
        };

        this.getOwnPointerPathFrom = function (node, source, name) {
            innerCore.getPointerPathFrom(node, source, name);
        };

        this.getOwnChildrenPaths = function (node) {
            return innerCore.getChildrenPaths(node);
        };
        //</editor-fold>
    };

    return CoreType;
});
