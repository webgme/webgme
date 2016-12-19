/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/core/CoreAssert',
    'common/core/tasync',
    'common/core/constants'
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

        // //isPointerName should be removed from API at this level
        // delete self.isPointerName;

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
                if (self.getChildrenRelids(base, true)[relid]) {
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
            if (self.getChildrenRelids(node, true)[relid] !== true) {
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

        /**
         * This function collects the inherited collection names.
         * Although there is no collection inheritance, we know that if a model is instantiated its internal structure
         * is not duplicated or no new data will be created. This means that in a sense, to keep the prototypical
         * inheritance correct, we need to build the internal relations on the fly. This means that whenever the user
         * has a question about the inverse relations of an internal part of the instance, we have to check the
         * prototype for such 'internal' relations and provide them - like in case of inherited attributes.
         * The function goes up on the inheritance chain of the questioned node.
         * At every step, it searches the root of instantiation (the node that is the instance) and collect inverse
         * relation names that exist in the prototype structure and has purely internal endpoints.
         *
         * @param node - the node in question
         * @returns {Array} - the list of names of relations that has the node as target
         */
        function getInheritedCollectionNames(node) {
            var names = [],
                startNode = node,
                actualNode = node,
                endNode,
                inverseOverlays,
                name,
                target;

            while (startNode) {
                actualNode = self.getBase(startNode);
                endNode = self.getBase(getInstanceRoot(startNode));
                target = '';
                if (actualNode && endNode) {
                    while (actualNode && actualNode !== self.getParent(endNode)) {
                        inverseOverlays = innerCore.getInverseOverlayOfNode(actualNode);
                        if (inverseOverlays[target]) {
                            for (name in inverseOverlays[target]) {
                                if (names.indexOf(name) === -1) {
                                    names.push(name);
                                }
                            }
                        }
                        target = CONSTANTS.PATH_SEP + self.getRelid(actualNode) + target;
                        actualNode = self.getParent(actualNode);
                    }
                }
                startNode = self.getBase(startNode);
            }

            return names;
        }

        /**
         * This function gathers the paths of the nodes that are pointing to the questioned node. The set of relations
         * that are checked is the 'inherited' inverse relations.
         *
         * The method of this function is identical to getInheritedCollectionNames, except this function collects the
         * sources of the given relations and not just the name of all such relation. To return a correct path (as
         * the data exists in some bases of the actual nodes) the function always convert it back to the place of
         * inquiry.
         * @param node - the node in question
         * @param name - name of the relation that we are interested in
         * @returns {Array} - list of paths of sources of inherited relations by the given name
         */
        function getInheritedCollectionPaths(node, name) {
            var paths = [],
                startNode = node,
                actualNode = node,
                endNode,
                prefixNode,
                i,
                inverseOverlays,
                target;

            while (startNode) {
                actualNode = self.getBase(startNode);
                endNode = self.getBase(getInstanceRoot(startNode));
                target = '';
                if (actualNode && endNode) {
                    prefixNode = node;
                    while (actualNode && actualNode !== self.getParent(endNode)) {
                        inverseOverlays = innerCore.getInverseOverlayOfNode(actualNode);
                        if (inverseOverlays[target] && inverseOverlays[target][name]) {
                            for (i = 0; i < inverseOverlays[target][name].length; i += 1) {
                                paths.push(self.joinPaths(self.getPath(prefixNode), inverseOverlays[target][name][i]));
                            }
                        }
                        target = CONSTANTS.PATH_SEP + self.getRelid(actualNode) + target;
                        actualNode = self.getParent(actualNode);
                        prefixNode = self.getParent(prefixNode);
                    }
                }
                startNode = self.getBase(startNode);
            }

            return paths;
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

        function isBase(node, compareNode) {
            while (compareNode) {
                if (compareNode === node) {
                    return true;
                }

                compareNode = self.getBase(compareNode);
            }

            return false;
        }

        function isParent(node, compareNode) {
            while (compareNode) {
                if (compareNode === node) {
                    return true;
                }

                compareNode = self.getParent(compareNode);
            }

            return false;
        }

        function isParentOrBaseRec(node, compareNode, visited, traverseContainment) {
            var comparePath = self.getPath(compareNode);

            if (traverseContainment) {
                if (visited.containment[comparePath]) {
                    //console.log('breaking recursion', traverseContainment, basePath);
                    return false;
                }

                visited.containment[comparePath] = true;
                compareNode = self.getParent(compareNode);
            } else {
                if (visited.inheritance[comparePath]) {
                    //console.log('breaking recursion', traverseContainment, basePath);
                    return false;
                }

                visited.inheritance[comparePath] = true;
                compareNode = self.getBase(compareNode);
            }

            while (compareNode) {
                //console.log('comparing with node', traverseContainment, basePath);
                if (node === compareNode || isParentOrBaseRec(node, compareNode, visited, !traverseContainment)) {
                    //console.log('Found one!');
                    return true;
                }

                if (traverseContainment) {
                    compareNode = self.getParent(compareNode);
                } else {
                    compareNode = self.getBase(compareNode);
                }
            }

            return false;
        }

        function getBaseAncestor(node, otherNode) {
            var bases = [],
                base;

            base = node;
            while (base) {
                bases.push(base);
                base = self.getBase(base);
            }

            base = otherNode;
            while (base) {
                if (bases.indexOf(base) > -1) {
                    return base;
                }

                base = self.getBase(base);
            }

            return null;
        }

        function childHasSameOrigin(node, otherNode, childRelid) {
            var ancestor = getBaseAncestor(node, otherNode),
                result = false;

            if (ancestor) {
                result = self.getChildrenRelids(ancestor, true).hasOwnProperty(childRelid);
            }

            return result;
        }

        function processNewRelidLength(node, newMinLength) {
            var currMinLength;

            if (newMinLength > CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH + 1) {
                logger.debug('Minimum relid length surpassed threshold, not propagating at all', newMinLength);
                return;
            } else if (newMinLength > CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH) {
                newMinLength = CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH;
                logger.debug('Minimum relid length reached threshold, only propagating threshold', newMinLength);
            }

            node = node.base;
            while (node) {
                currMinLength = innerCore.getProperty(node, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY) || 0;
                if (currMinLength >= newMinLength) {
                    return;
                }

                // TODO: Check for library element here??
                innerCore.setProperty(node, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY, newMinLength);
                node = node.base;
            }
        }

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

        this.getChildrenRelids = function (node, asObject) {
            ASSERT(self.isValidNode(node));
            var base = node,
                relids,
                i;

            function basesHaveSameRelids() {
                var b = node,
                    cnt = 0,
                    len = node.allChildrenRelids.bases.length;

                while (b) {
                    if (cnt === len || b.childrenRelids !== node.allChildrenRelids.bases[cnt]) {
                        return false;
                    }

                    b = b.base;
                    cnt += 1;
                }

                return true;
            }

            if (!node.allChildrenRelids || basesHaveSameRelids() === false) {
                // If there is no cache or the childrenRelids caches are outdated,
                // rebuild the cache.
                node.allChildrenRelids = {
                    cached: {},
                    bases: []
                };

                while (base) {
                    relids = innerCore.getChildrenRelids(base);
                    node.allChildrenRelids.bases.push(relids);

                    for (i = 0; i < relids.length; i += 1) {
                        node.allChildrenRelids.cached[relids[i]] = true;
                    }

                    base = base.base;
                }
            }

            return asObject ? node.allChildrenRelids.cached : Object.keys(node.allChildrenRelids.cached);
        };

        this.loadChildren = function (node) {
            ASSERT(self.isValidNode(node));
            var relids = self.getChildrenRelids(node);
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

        this.setPointer = function (node, name, target) {
            innerCore.setPointer(node, name, target);

            if (isInheritedChild(node)) {
                self.setProperty(node, CONSTANTS.INHERITED_CHILD_HAS_OWN_RELATION_PROPERTY, true);
                // #1232

                self.processRelidReservation(self.getParent(node), self.getRelid(node));
            }

            if (isInheritedChild(target)) {
                self.setProperty(target, CONSTANTS.INHERITED_CHILD_HAS_OWN_RELATION_PROPERTY, true);
                // #1232
                self.processRelidReservation(self.getParent(target), self.getRelid(target));
            }
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

        this.createChild = function (parent, relidLength) {
            var node = innerCore.createChild(parent, self.getChildrenRelids(parent, true), relidLength);

            this.processRelidReservation(parent, this.getRelid(node));

            return self.getChild(parent, this.getRelid(node));
        };

        this.createNode = function (parameters, relidLength) {
            parameters = parameters || {};
            var base = parameters.base || null,
                parent = parameters.parent,
                node,
                takenRelids;

            ASSERT(!parent || self.isValidNode(parent));
            ASSERT(!base || self.isValidNode(base));
            ASSERT(!base || self.getPath(base) !== self.getPath(parent));

            if (parent) {
                takenRelids = self.getChildrenRelids(parent, true);
                relidLength = relidLength || innerCore.getProperty(parent, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY);
            }

            node = innerCore.createNode(parameters, takenRelids, relidLength);
            node.base = base;
            innerCore.setPointer(node, CONSTANTS.BASE_POINTER, base);

            if (parent) {
                this.processRelidReservation(parent, this.getRelid(node));

                // Addition to #1232
                if (isInheritedChild(parent)) {
                    self.processRelidReservation(self.getParent(parent), self.getRelid(parent));
                }
            }

            return node;
        };

        this.isValidNewParent = function (node, parent) {
            ASSERT(self.isValidNode(node) && self.isValidNode(parent));
            var visited = {
                    containment: {},
                    inheritance: {}
                },
                result = true;

            if (isBase(parent, node)) {
                result = false;
            } else if (isParentOrBaseRec(node, parent, visited, true)) {
                result = false;
            } else if (isParentOrBaseRec(node, parent, visited, false)) {
                result = false;
            }

            return result;
        };

        this.moveNode = function (node, parent, relidLength) {
            ASSERT(self.isValidNewParent(node, parent),
                'New parent would create loop in containment/inheritance tree.');
            var minRelidLength = innerCore.getProperty(parent, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY),
                takenRelids = self.getChildrenRelids(parent, true),
                currRelid = this.getRelid(node),
                base = node.base,
                moved;

            if (typeof minRelidLength === 'number' && currRelid.length < minRelidLength) {
                takenRelids[currRelid] = true;
            } else if (typeof relidLength === 'number' && currRelid.length < relidLength) {
                takenRelids[currRelid] = true;
            }

            moved = innerCore.moveNode(node, parent, takenRelids, relidLength || minRelidLength);
            moved.base = base;

            this.processRelidReservation(parent, this.getRelid(moved));

            // Addition to #1232
            if (isInheritedChild(parent)) {
                self.processRelidReservation(self.getParent(parent), self.getRelid(parent));
            }

            return moved;
        };

        this.copyNode = function (node, parent, relidLength) {
            ASSERT(!node.base || self.getPath(node.base) !== self.getPath(parent));
            var base = node.base,
                newnode;

            relidLength = relidLength || innerCore.getProperty(parent, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY);
            newnode = innerCore.copyNode(node, parent, self.getChildrenRelids(parent, true), relidLength);
            newnode.base = base;
            innerCore.setPointer(newnode, CONSTANTS.BASE_POINTER, base);

            // The copy does not have any instances at this point -> reset the property.
            innerCore.deleteProperty(newnode, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY);

            this.processRelidReservation(parent, this.getRelid(newnode));

            // Addition to #1232
            if (isInheritedChild(parent)) {
                self.processRelidReservation(self.getParent(parent), self.getRelid(parent));
            }

            return newnode;
        };

        this.copyNodes = function (nodes, parent, relidLength) {
            var copiedNodes,
                i, j, index, base,
                relations = [],
                names, pointer,
                longestNewRelid = '',
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

            relidLength = relidLength || innerCore.getProperty(parent, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY);
            //making the actual copy
            copiedNodes = innerCore.copyNodes(nodes, parent, self.getChildrenRelids(parent, true), relidLength);

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
                innerCore.deleteProperty(copiedNodes[i], CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY);
            }

            //searching for the longest new relid and then process it towards the bases of the parent
            for (i = 0; i < copiedNodes.length; i += 1) {
                j = this.getRelid(copiedNodes[i]);
                if (j.length > longestNewRelid) {
                    longestNewRelid = j;
                }
            }

            this.processRelidReservation(parent, longestNewRelid);

            // Addition to #1232
            if (isInheritedChild(parent)) {
                self.processRelidReservation(self.getParent(parent), self.getRelid(parent));
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
            // Remark: It's fine to mutate this array since we're using Object.keys on the cached object..
            for (var i = 0; i < relids.length; ++i) {
                relids[i] = path + '/' + relids[i];
            }

            return relids;
        };

        this.setAttribute = function (node, name, value) {
            innerCore.setAttribute(node, name, value);

            // #1232
            if (isInheritedChild(node)) {
                self.processRelidReservation(self.getParent(node), self.getRelid(node));
            }
        };

        this.setRegistry = function (node, name, value) {
            innerCore.setRegistry(node, name, value);

            // #1232
            if (isInheritedChild(node)) {
                self.processRelidReservation(self.getParent(node), self.getRelid(node));
            }
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

        this.isValidNewBase = function (node, base) {
            ASSERT(self.isValidNode(node) && (base === undefined || base === null || self.isValidNode(base)));
            var visited = {
                    containment: {},
                    inheritance: {}
                },
                result = true;

            if (!base) {
                result = true;
            } else if (isParent(base, node)) {
                result = false;
            } else if (isParentOrBaseRec(node, base, visited, true)) {
                result = false;
            } else if (isParentOrBaseRec(node, base, visited, false)) {
                result = false;
            }

            return result;
        };

        this.setBase = function (node, base) {
            ASSERT(self.isValidNewBase(node, base),
                'New base would create loop in containment/inheritance tree.');

            if (base) {
                //TODO maybe this is not the best way, needs to be double checked
                var parent = self.getParent(node),
                    nodeChildren = self.getOwnChildrenRelids(node), // We're only interested in the children with data.
                    minRelidLength = innerCore.getProperty(node, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY) || 0,
                    baseChildren = self.getChildrenRelids(base, true),
                    parentBase,
                    baseParent,
                    i;

                if (parent) {
                    parentBase = self.getBase(parent);
                    baseParent = self.getParent(base);
                    if (self.getPath(parentBase) !== self.getPath(baseParent)) {
                        //we have to set an exact pointer only if it is not inherited child
                        innerCore.setPointer(node, CONSTANTS.BASE_POINTER, base);

                        for (i = 0; i < nodeChildren.length; i += 1) {
                            if (baseChildren[nodeChildren[i]] && childHasSameOrigin(node, base, nodeChildren[i])) {
                                // Currently we only keep the children data for children with same origin.
                                // Meaning we delete all other children (including those that were created in node).
                            } else {
                                innerCore.deleteChild(node, nodeChildren[i]);
                            }
                        }
                    } else {
                        innerCore.deletePointer(node, CONSTANTS.BASE_POINTER); //we remove the pointer just in case
                    }
                } else {
                    //if for some reason the node doesn't have a parent it is surely not an inherited child
                    innerCore.setPointer(node, CONSTANTS.BASE_POINTER, base);
                }

                node.base = base;

                // Handle the minimal new length propagation to the new base chain.
                for (i = 0; i < nodeChildren.length; i += 1) {
                    // Do not account for old relids..
                    if (nodeChildren[i].length <= CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH) {
                        minRelidLength = nodeChildren[i].length + 1 > minRelidLength ?
                        nodeChildren[i].length + 1 : minRelidLength;
                    }
                }

                if (minRelidLength >= 2) {
                    processNewRelidLength(node, minRelidLength);
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
            return innerCore.getPointerPath(node, name);
        };

        this.getOwnPointerPathFrom = function (node, source, name) {
            return innerCore.getPointerPathFrom(node, source, name);
        };

        this.getOwnChildrenPaths = function (node) {
            return innerCore.getChildrenPaths(node);
        };

        this.processRelidReservation = function (node, relid) {
            if (!CONSTANTS.DOES_NOT_HAVE_RELID_CHILDREN[self.getRelid(node)] && innerCore.isValidRelid(relid)) {
                // We do not process relids for e.g. _sets and _meta.
                processNewRelidLength(node, relid.length + 1);
            }
        };

        this.getInstancePaths = function (node) {
            var instances = [],
                directCollectionPaths,
                relPath = '',
                i;

            while (node) {
                directCollectionPaths = innerCore.getCollectionPaths(node, CONSTANTS.BASE_POINTER);
                for (i = 0; i < directCollectionPaths.length; i += 1) {
                    instances.push(directCollectionPaths[i] + relPath);
                }
                relPath = CONSTANTS.PATH_SEP + innerCore.getRelid(node) + relPath;
                node = innerCore.getParent(node);
            }

            return instances;
        };

        this.loadInstances = function (node) {
            ASSERT(self.isValidNode(node));

            var instancePaths = self.getInstancePaths(node),
                instances = [],
                root = self.getRoot(node),
                i;

            for (i = 0; i < instancePaths.length; i += 1) {
                instances[i] = self.loadByPath(root, instancePaths[i]);
            }

            return TASYNC.lift(instances);
        };
        //</editor-fold>
    };

    return CoreType;
})
;
