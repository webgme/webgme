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

    function InverseOverlaysCache(maxSize, logger) {
        var self = this;

        maxSize = maxSize || 10000;
        this._backup = {};
        this._cache = {};
        this._size = 0;

        this.getItem = function (key) {
            if (this._cache[key]) {
                return this._cache[key];
            }

            if (this._backup[key]) {
                return this._backup[key];
            }

            return null;

        };

        this.setItem = function (key, data) {
            if (!this._cache[key]) {
                if (this._size === maxSize) {
                    this._size = 0;
                    this._backup = this._cache;
                    this._cache = {};
                }
                this._size += 1;
                this._cache[key] = data;

            } else {
                logger.warn('trying to add inverse relation object multiple times [#' + key + ']');
            }
        };

    }

    function CoreRel(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof innerCore === 'object');

        var logger = innerCore.logger,
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        this._inverseCache = new InverseOverlaysCache(options.globConf.core.inverseRelationsCacheSize,
            logger.fork('inverseCache'));

        logger.debug('initialized CoreRel');

        //<editor-fold=Helper Functions>
        function test(text, cond) {
            if (!cond) {
                throw new Error(text);
            }
        }

        function isObject(node) {
            node = innerCore.normalize(node);
            return typeof node.data === 'object' && node.data !== null;
        }

        function isValidNodeThrow(node) {
            test('coretree', innerCore.isValidNode(node));
            test('isobject', isObject(node));
        }

        function getRelativePointerPathFrom(node, source, name) {
            ASSERT(self.isValidNode(node) && typeof source === 'string' && typeof name === 'string');
            var target,
                ovrData;

            do {
                ovrData = (innerCore.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {})[source];
                if (ovrData) {
                    target = ovrData[name];
                    if (target !== undefined) {
                        break;
                    }
                }

                source = '/' + innerCore.getRelid(node) + source;
                node = innerCore.getParent(node);

            } while (node);

            return {
                target: target,
                node: node
            };
        }

        function storeNewInverseOverlays(node) {
            var hash = self.getHash(node),
                relid;

            if (hash && node.inverseOverlays) {
                self._inverseCache.setItem(hash, node.inverseOverlays);
                for (relid in node.children) {
                    storeNewInverseOverlays(node.children[relid]);
                }
            }
        }

        //</editor-fold>

        //<editor-fold=Modified Methods>
        this.isValidNode = function (node) {
            try {
                isValidNodeThrow(node);

                return true;
            } catch (error) {
                logger.error(error.message, {metadata: {stack: error.stack, node: node}});
                return false;
            }
        };

        this.persist = function (node) {
            var persisted = innerCore.persist(node);

            storeNewInverseOverlays(self.getRoot(node));

            return persisted;
        };
        //</editor-fold>

        //<editor-fold=Added Methods>
        this.getInverseOverlayOfNode = function (node) {
            var hash,
                inverseOverlays = {},
                overlay,
                source,
                name,
                target;

            // If the node already has inverse computed we return that
            if (node.inverseOverlays) {
                return node.inverseOverlays;
            }

            // If we find it in the cache we set that and use it
            hash = self.getHash(node);
            if (hash) {
                inverseOverlays = self._inverseCache.getItem(hash);
                if (inverseOverlays) {
                    node.inverseOverlays = inverseOverlays;
                    return node.inverseOverlays;
                }
            }

            // Otherwise we have to compute it
            overlay = self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY);
            overlay = overlay || {};
            inverseOverlays = {};
            for (source in overlay) {
                for (name in overlay[source]) {
                    target = overlay[source][name];
                    inverseOverlays[target] = inverseOverlays[target] || {};
                    inverseOverlays[target][name] = inverseOverlays[target][name] || [];
                    inverseOverlays[target][name].push(source);
                }
            }

            // If it is an unmodified node, we can store the inverse, otherwise it still can change
            if (hash) {
                self._inverseCache.setItem(hash, inverseOverlays);
            }

            node.inverseOverlays = inverseOverlays;

            return node.inverseOverlays;

        };

        this.isPointerName = function (name) {
            ASSERT(typeof name === 'string');
            //TODO this is needed as now we work with modified data as well
            if (name === CONSTANTS.MUTABLE_PROPERTY) {
                return false;
            }
            // return name.slice(-CONSTANTS.COLLECTION_NAME_SUFFIX.length) !==
            //     CONSTANTS.COLLECTION_NAME_SUFFIX;

            return true;
        };

        this.getAttributeNames = function (node) {
            ASSERT(self.isValidNode(node));

            var data,
                keys,
                i,
                result = [],
                key;

            data = (innerCore.getProperty(node, CONSTANTS.ATTRIBUTES_PROPERTY) || {});
            keys = Object.keys(data);
            i = keys.length;
            while (--i >= 0) {
                key = keys[i];
                if (key.charAt(0) === '') {
                    logger.error('empty named attribute found in node [' + innerCore.getPath(node) + ']');
                    //keys.splice(i, 1);
                } else if (key.charAt(0) === '_') {
                    //keys.splice(i, 1);
                } else {
                    result.push(key);
                }
            }

            return result;
        };

        this.getRegistryNames = function (node) {
            ASSERT(self.isValidNode(node));

            var data,
                keys,
                i,
                result = [],
                key;

            data = (innerCore.getProperty(node, CONSTANTS.REGISTRY_PROPERTY) || {});
            keys = Object.keys(data);
            i = keys.length;
            while (--i >= 0) {
                key = keys[i];
                if (keys[i].charAt(0) === '') {
                    logger.error('empty named attribute found in node [' + innerCore.getPath(node) + ']');
                    //keys.splice(i, 1);
                } else if (keys[i].charAt(0) === '_') {
                    //keys.splice(i, 1);
                } else {
                    result.push(key);
                }
            }

            return result;
        };

        this.getAttribute = function (node, name) {
            /*node = coretree.getChild(node, coretree.constants.ATTRIBUTES_PROPERTY);
             return coretree.getProperty(node, name);*/
            return (innerCore.getProperty(node, CONSTANTS.ATTRIBUTES_PROPERTY) || {})[name];
        };

        this.delAttribute = function (node, name) {
            node = innerCore.getChild(node, CONSTANTS.ATTRIBUTES_PROPERTY);
            innerCore.deleteProperty(node, name);
        };

        this.setAttribute = function (node, name, value) {
            node = innerCore.getChild(node, CONSTANTS.ATTRIBUTES_PROPERTY);
            innerCore.setProperty(node, name, value);
        };

        this.getRegistry = function (node, name) {
            /*node = coretree.getChild(node, coretree.constants.REGISTRY_PROPERTY);
             return coretree.getProperty(node, name);*/
            return (innerCore.getProperty(node, CONSTANTS.REGISTRY_PROPERTY) || {})[name];
        };

        this.delRegistry = function (node, name) {
            node = innerCore.getChild(node, CONSTANTS.REGISTRY_PROPERTY);
            innerCore.deleteProperty(node, name);
        };

        this.setRegistry = function (node, name, value) {
            node = innerCore.getChild(node, CONSTANTS.REGISTRY_PROPERTY);
            innerCore.setProperty(node, name, value);
        };

        this.overlayRemove = function (node, source, name, target) {
            ASSERT(self.isValidNode(node));
            ASSERT(innerCore.isValidPath(source) && innerCore.isValidPath(target) && self.isPointerName(name));
            ASSERT(innerCore.getCommonPathPrefixData(source, target).common === '');

            var overlays = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY),
                inverseOverlays = node.inverseOverlays, // we only handle it if it is already computed
                overlayNode,
                index;

            overlayNode = innerCore.getChild(overlays, source);
            ASSERT(overlayNode && innerCore.getProperty(overlayNode, name) === target);
            innerCore.deleteProperty(overlayNode, name);

            if (innerCore.getKeys(overlayNode).length === 0) {
                innerCore.deleteProperty(overlays, source);
            }

            //Now we check if some mutation happened
            if (inverseOverlays && !node.inverseOverlays) {
                inverseOverlays = JSON.parse(JSON.stringify(inverseOverlays));
                node.inverseOverlays = inverseOverlays;
            }
            if (inverseOverlays && inverseOverlays[target] && inverseOverlays[target][name]) {
                index = inverseOverlays[target][name].indexOf(source);
                if (index !== -1) {
                    inverseOverlays[target][name].splice(index, 1);
                    if (inverseOverlays[target][name].length === 0) {
                        delete inverseOverlays[target][name];
                        if (Object.keys(inverseOverlays[target]).length === 0) {
                            delete inverseOverlays[target];
                        }
                    }
                }
            }

        }

        this.overlayQuery = function (node, prefix) {
            ASSERT(self.isValidNode(node) && innerCore.isValidPath(prefix));

            var overlays = self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {},
                inverseOverlays = self.getInverseOverlayOfNode(node), // We necessarily have to compute at this point,
                i, path, name, list = [],
                prefix2 = prefix + CONSTANTS.PATH_SEP;

            for (path in overlays) {
                if (path === prefix || path.substr(0, prefix2.length) === prefix2) {
                    for (name in overlays[path]) {
                        if (self.isPointerName(name)) {
                            list.push({
                                s: path,
                                n: name,
                                t: overlays[path][name],
                                p: true
                            });
                        }
                    }
                }
            }

            for (path in inverseOverlays) {
                if (path === prefix || path.substr(0, prefix2.length) === prefix2) {
                    for (name in inverseOverlays[path]) {
                        for (i = 0; i < inverseOverlays[path][name].length; i += 1) {
                            list.push({
                                s: inverseOverlays[path][name][i],
                                n: name,
                                t: path,
                                p: false
                            });
                        }
                    }
                }
            }

            return list;
        }

        this.overlayInsert = function (node, source, name, target) {
            ASSERT(self.isValidNode(node));
            ASSERT(innerCore.isValidPath(source) && innerCore.isValidPath(target) && self.isPointerName(name));
            ASSERT(innerCore.getCommonPathPrefixData(source, target).common === '');

            var overlays = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY),
                inverseOverlays = node.inverseOverlays, // We update it only if it exists
                overlay = self.getChild(overlays, source);

            // Make sure it is an insert
            ASSERT(self.getProperty(overlay, name) === undefined);
            self.setProperty(overlay, name, target);

            // First check if mutation took place.
            if (inverseOverlays && !node.inverseOverlays) {
                inverseOverlays = JSON.parse(JSON.stringify(inverseOverlays));
                node.inverseOverlays = inverseOverlays;
            }

            if (inverseOverlays) {
                inverseOverlays[target] = inverseOverlays[target] || {};
                inverseOverlays[target][name] = inverseOverlays[target][name] || [];
                inverseOverlays[target][name].push(source);
            }
        };

        this.createNode = function (parameters, takenRelids) {
            parameters = parameters || {};
            var relid = parameters.relid,
                parent = parameters.parent;

            ASSERT(!parent || self.isValidNode(parent));
            // ASSERT(!relid || typeof relid === 'string');

            var node;
            if (parent) {
                if (relid) {
                    if ((takenRelids && takenRelids[relid]) || self.getChildrenRelids(parent).indexOf(relid) > -1) {
                        throw new Error('Given relid already used in parent "' + relid + '".');
                    } else {
                        node = innerCore.getChild(parent, relid);
                        parent.childrenRelids = null;
                    }
                } else {
                    node = self.createChild(parent, takenRelids);
                }

                innerCore.setHashed(node, true);
            } else {
                node = innerCore.createRoot();
            }

            // As we just created the node, we can allocate an empty inverse object, that is appropriate this time
            node.inverseOverlays = {};
            return node;
        };

        this.deleteNode = function (node) {
            ASSERT(self.isValidNode(node));

            var parent = innerCore.getParent(node);

            ASSERT(parent !== null);
            self.deleteChild(parent, innerCore.getRelid(node));
        };

        /**
         *
         * @param {Node} node - Node containing the child.
         * @param {string} relid - Relid of the child to be removed.
         */
        this.deleteChild = function (parent, relid) {
            var prefix = '/' + relid;
            innerCore.deleteProperty(parent, relid);
            if (parent.childrenRelids) {
                parent.childrenRelids = null;
            }

            while (parent) {

                var list = self.overlayQuery(parent, prefix);
                for (var i = 0; i < list.length; ++i) {
                    var entry = list[i];
                    self.overlayRemove(parent, entry.s, entry.n, entry.t);
                }

                prefix = CONSTANTS.PATH_SEP + innerCore.getRelid(parent) + prefix;
                parent = innerCore.getParent(parent);
            }
        };

        this.createChild = function (parent, takenRelids) {
            var child = innerCore.createChild(parent, takenRelids);

            parent.childrenRelids = null;

            return child;
        };

        this.copyNode = function (node, parent, takenRelids) {
            ASSERT(self.isValidNode(node));
            ASSERT(!parent || self.isValidNode(parent));
            var newNode,
                ancestor,
                ancestorNewPath,
                nodeToChangeOverlay,
                base,
                baseOldPath,
                aboveAncestor,
                list,
                tempAncestor,
                i,
                entry,
                relativePath,
                source,
                target,
                inverseOverlays;

            node = innerCore.normalize(node);
            inverseOverlays = node.inverseOverlays;

            if (parent) {
                ancestor = innerCore.getAncestor(node, parent);

                // cannot copy inside of itself
                if (ancestor === node) {
                    return null;
                }

                newNode = self.createChild(parent, takenRelids);
                innerCore.setHashed(newNode, true);
                innerCore.setData(newNode, innerCore.copyData(node));

                ancestorNewPath = innerCore.getPath(newNode, ancestor);

                base = innerCore.getParent(node);
                baseOldPath = '/' + innerCore.getRelid(node);
                aboveAncestor = 1;

                while (base) {
                    list = self.overlayQuery(base, baseOldPath);
                    tempAncestor = innerCore.getAncestor(base, ancestor);

                    aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

                    relativePath = aboveAncestor < 0 ?
                        innerCore.getPath(base, ancestor) : innerCore.getPath(ancestor, base);

                    for (i = 0; i < list.length; ++i) {
                        entry = list[i];

                        if (entry.p) {
                            ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
                            ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === '/');

                            if (aboveAncestor < 0) {
                                //below ancestor node - further from root
                                source = ancestorNewPath + entry.s.substr(baseOldPath.length);
                                target = innerCore.joinPaths(relativePath, entry.t);
                                nodeToChangeOverlay = ancestor;
                            } else if (aboveAncestor === 0) {
                                //at ancestor node
                                var data = innerCore.getCommonPathPrefixData(ancestorNewPath, entry.t);

                                nodeToChangeOverlay = newNode;
                                while (data.firstLength-- > 0) {
                                    nodeToChangeOverlay = innerCore.getParent(nodeToChangeOverlay);
                                }
                                // overlays = innerCore.getChild(overlays, CONSTANTS.OVERLAYS_PROPERTY);

                                source = innerCore.joinPaths(data.first, entry.s.substr(baseOldPath.length));
                                target = data.second;
                            } else {
                                //above ancestor node - closer to root
                                ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

                                source = relativePath + ancestorNewPath + entry.s.substr(baseOldPath.length);
                                target = entry.t;
                                nodeToChangeOverlay = base;
                            }

                            self.overlayInsert(nodeToChangeOverlay, source, entry.n, target);
                        }
                    }

                    baseOldPath = '/' + innerCore.getRelid(base) + baseOldPath;
                    base = innerCore.getParent(base);
                }
            } else {
                newNode = innerCore.createRoot();
                innerCore.setData(newNode, innerCore.copyData(node));
            }

            if (inverseOverlays) {
                newNode.inverseOverlays = JSON.parse(JSON.stringify(inverseOverlays));
            }
            return newNode;
        };

        this.copyNodes = function (nodes, parent, takenRelids) {
            //copying multiple nodes at once for keeping their internal relations
            var paths = [],
                i, j, index, names, pointer, newNode,
                copiedNodes = [],
                // Every single element will be an object with the
                // internally pointing relations and the index of the target.
                internalRelationPaths = [];

            for (i = 0; i < nodes.length; i++) {
                paths.push(innerCore.getPath(nodes[i]));
            }

            for (i = 0; i < nodes.length; i++) {
                names = self.getPointerNames(nodes[i]);
                pointer = {};
                for (j = 0; j < names.length; j++) {
                    index = paths.indexOf(self.getPointerPath(nodes[i], names[j]));
                    if (index !== -1) {
                        pointer[names[j]] = index;
                    }
                }
                internalRelationPaths.push(pointer);
            }

            //now we use our simple copy
            for (i = 0; i < nodes.length; i++) {
                newNode = self.copyNode(nodes[i], parent, takenRelids);
                copiedNodes.push(newNode);
                if (takenRelids) {
                    takenRelids[self.getRelid(newNode)] = true;
                }
            }

            //and now back to the relations
            for (i = 0; i < internalRelationPaths.length; i++) {
                names = Object.keys(internalRelationPaths[i]);
                for (j = 0; j < names.length; j++) {
                    self.setPointer(copiedNodes[i], names[j], copiedNodes[internalRelationPaths[i][names[j]]]);
                }
            }

            return copiedNodes;
        };

        this.moveNode = function (node, parent, takenRelids) {
            ASSERT(self.isValidNode(node) && self.isValidNode(parent));

            var ancestor,
                base,
                baseOldPath,
                aboveAncestor,
                ancestorNewPath,
                list,
                tempAncestor,
                relativePath,
                i,
                source,
                target,
                nodeToModifyOverlays,
                entry,
                tmp;

            node = innerCore.normalize(node);
            ancestor = innerCore.getAncestor(node, parent);

            // cannot move inside of itself
            if (ancestor === node) {
                return null;
            }

            base = innerCore.getParent(node);
            baseOldPath = '/' + innerCore.getRelid(node);
            aboveAncestor = 1;

            var oldNode = node;
            if (takenRelids) {
                if (takenRelids[innerCore.getRelid(oldNode)]) {
                    node = innerCore.createChild(parent, takenRelids);
                } else {
                    node = innerCore.getChild(parent, innerCore.getRelid(oldNode));
                }
            } else {
                node = innerCore.getChild(parent, innerCore.getRelid(oldNode));
                if (!innerCore.isEmpty(node)) {
                    // we have to change the relid of the node, to fit into its new
                    // place...
                    node = innerCore.createChild(parent);
                }
            }

            parent.childrenRelids = null;

            innerCore.setHashed(node, true);
            innerCore.setData(node, innerCore.copyData(oldNode));

            ancestorNewPath = innerCore.getPath(node, ancestor);

            while (base) {
                list = self.overlayQuery(base, baseOldPath);
                tempAncestor = innerCore.getAncestor(base, ancestor);

                aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

                relativePath = aboveAncestor < 0 ?
                    innerCore.getPath(base, ancestor) : innerCore.getPath(ancestor, base);

                for (i = 0; i < list.length; ++i) {
                    entry = list[i];

                    self.overlayRemove(base, entry.s, entry.n, entry.t);

                    if (!entry.p) {
                        tmp = entry.s;
                        entry.s = entry.t;
                        entry.t = tmp;
                    }

                    ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
                    ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === '/');

                    if (aboveAncestor < 0) {
                        //below ancestor node
                        source = ancestorNewPath + entry.s.substr(baseOldPath.length);
                        target = innerCore.joinPaths(relativePath, entry.t);
                        nodeToModifyOverlays = ancestor;
                    } else if (aboveAncestor === 0) {
                        //at ancestor node
                        var data = innerCore.getCommonPathPrefixData(ancestorNewPath, entry.t);

                        nodeToModifyOverlays = node;
                        while (data.firstLength-- > 0) {
                            nodeToModifyOverlays = innerCore.getParent(nodeToModifyOverlays);
                        }
                        // overlays = innerCore.getChild(overlays, CONSTANTS.OVERLAYS_PROPERTY);

                        source = innerCore.joinPaths(data.first, entry.s.substr(baseOldPath.length));
                        target = data.second;
                    } else {
                        //above ancestor node
                        ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

                        source = relativePath + ancestorNewPath + entry.s.substr(baseOldPath.length);
                        target = entry.t;
                        nodeToModifyOverlays = base;
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
                    self.overlayInsert(nodeToModifyOverlays, source, entry.n, target);
                }

                baseOldPath = '/' + innerCore.getRelid(base) + baseOldPath;
                base = innerCore.getParent(base);
            }

            self.deleteNode(oldNode);

            return node;
        };

        this.getChildrenRelids = function (node) {
            ASSERT(self.isValidNode(node));

            // Check if they are already cached by the node
            if (!node.childrenRelids) {
                node.childrenRelids = innerCore.getKeys(node, self.isValidRelid);
            }

            return node.childrenRelids;
        };

        this.getChildrenPaths = function (node) {
            var path = innerCore.getPath(node),
                relids = self.getChildrenRelids(node),
                result = [],
                i;

            for (i = 0; i < relids.length; i += 1) {
                result.push(path + '/' + relids[i]);
            }

            return result;
        };

        this.loadChildren = function (node) {
            var children = self.getChildrenRelids(node),
                result = [],
                i;

            for (i = 0; i < children.length; i += 1) {
                result.push(innerCore.loadChild(node, children[i]));
            }

            return TASYNC.lift(result);
        };

        this.getPointerNames = function (node) {
            return self.getPointerNamesFrom(node, '');
        };

        this.getPointerNamesFrom = function (node, source) {
            ASSERT(self.isValidNode(node));

            var names = [];

            do {
                var child = (innerCore.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {})[source];
                if (child) {
                    for (var name in child) {
                        ASSERT(names.indexOf(name) === -1);
                        if (self.isPointerName(name)) {
                            names.push(name);
                        }
                    }
                }

                source = '/' + innerCore.getRelid(node) + source;
                node = innerCore.getParent(node);
            } while (node);

            return names;
        };

        this.getPointerPath = function (node, name) {
            return self.getPointerPathFrom(node, '', name);
        };

        this.getPointerPathFrom = function (node, source, name) {
            var res = getRelativePointerPathFrom(node, source, name),
                target;

            if (res.target !== undefined) {
                target = innerCore.joinPaths(innerCore.getPath(res.node), res.target);
            }

            return target;
        };

        this.loadPointer = function (node, name) {
            var res = getRelativePointerPathFrom(node, '', name);

            if (res.target !== undefined) {
                return innerCore.loadByPath(res.node, res.target);
            } else {
                return null;
            }
        };

        this.getCollectionNames = function (node) {
            ASSERT(self.isValidNode(node));
            var names = [],
                target = '',
                name,
                inverseOverlays;

            do {
                inverseOverlays = self.getInverseOverlayOfNode(node);
                if (inverseOverlays[target]) {
                    for (name in inverseOverlays[target]) {
                        if (names.indexOf(name) === -1) {
                            names.push(name);
                        }
                    }
                }

                target = CONSTANTS.PATH_SEP + self.getRelid(node) + target;
                node = self.getParent(node);
            } while (node);

            return names;
        };

        this.loadCollection = function (node, name) {
            ASSERT(self.isValidNode(node) && self.isPointerName(name));

            var collection = [],
                target = '',
                i,
                inverseOverlays;

            do {
                inverseOverlays = self.getInverseOverlayOfNode(node);

                if (inverseOverlays[target] && inverseOverlays[target][name]) {
                    for (i = 0; i < inverseOverlays[target][name].length; i += 1) {
                        collection.push(self.loadByPath(node, inverseOverlays[target][name][i]));
                    }
                }

                target = CONSTANTS.PATH_SEP + self.getRelid(node) + target;
                node = self.getParent(node);
            } while (node);

            return TASYNC.lift(collection);
        };

        this.getCollectionPaths = function (node, name) {
            ASSERT(self.isValidNode(node) && self.isPointerName(name));

            var result = [],
                target = '',
                inverseOverlays,
                i,
                prefix = '';

            do {
                inverseOverlays = self.getInverseOverlayOfNode(node);
                if (inverseOverlays[target] && inverseOverlays[target][name]) {
                    prefix = self.getPath(node);
                    for (i = 0; i < inverseOverlays[target][name].length; i += 1) {
                        result.push(prefix + inverseOverlays[target][name][i]);
                    }
                }

                target = CONSTANTS.PATH_SEP + self.getRelid(node) + target;
                node = self.getParent(node);
            } while (node);

            return result;
        };

        this.deletePointer = function (node, name) {
            ASSERT(self.isValidNode(node) && typeof name === 'string');

            var source = '',
                overlays;

            do {
                overlays = self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY);
                if (overlays && overlays[source] && overlays[source][name]) {
                    self.overlayRemove(node, source, name, overlays[source][name]);
                }

                source = CONSTANTS.PATH_SEP + self.getRelid(node) + source;
                node = self.getParent(node);
            } while (node);

            return false;
        };

        this.setPointer = function (node, name, target) {
            ASSERT(self.isValidNode(node) && typeof name === 'string' && (!target || self.isValidNode(target)));

            var ancestor,
                targetPath,
                sourcePath;

            self.deletePointer(node, name);

            if (target) {
                ancestor = innerCore.getAncestor(node, target);

                sourcePath = innerCore.getPath(node, ancestor);
                targetPath = innerCore.getPath(target, ancestor);

                self.overlayInsert(ancestor, sourcePath, name, targetPath);
            }
        };

        this.getChildrenHashes = function (node) {
            var keys = self.getChildrenRelids(node),
                i, hashes = {};

            for (i = 0; i < keys.length; i++) {
                hashes[keys[i]] = innerCore.getChildHash(node, keys[i]);
            }

            return hashes;
        };

        this.isValidRelid = RANDOM.isValidRelid;

        this.isContainerPath = function (path, parentPath) {
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
    }

    return CoreRel;
});
