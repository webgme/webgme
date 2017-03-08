/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/core/CoreAssert',
    'common/core/tasync',
    'common/util/random',
    'common/core/constants',
    'common/storage/constants',
    'common/util/key',
    'common/regexp'
], function (ASSERT, TASYNC, RANDOM, CONSTANTS, STORAGE_CONSTANTS, GENKEY, REGEXP) {

    'use strict';

    function InverseOverlaysCache(maxSize, logger) {
        var self = this;

        maxSize = maxSize || 10000;
        this._backup = {};
        this._cache = {};
        this._size = 0;

        this.getItem = function (key) {
            if (self._cache[key]) {
                return self._cache[key];
            }

            if (self._backup[key]) {
                return self._backup[key];
            }

            return null;

        };

        this.setItem = function (key, data) {
            if (!self._cache[key]) {
                if (self._size === maxSize) {
                    self._size = 0;
                    self._backup = self._cache;
                    self._cache = {};
                }
                self._size += 1;
                self._cache[key] = data;

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
            _shardSize = options.globConf.core.overlayShardSize,
            _shardingLimit = Math.floor(_shardSize / 2),
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        //removing direct storage functions on this level
        delete this.loadObject;
        delete this.insertObject;

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
                ovrInfo,
                ovrData;

            do {
                ovrInfo = self.overlayInquiry(node, source, name);
                if (typeof ovrInfo.value === 'string') {
                    target = ovrInfo.value;
                    break;
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

            if (hash && node.inverseOverlays && node.inverseOverlaysMutable) {
                self._inverseCache.setItem(hash, node.inverseOverlays);
                delete node.inverseOverlaysMutable;
                for (relid in node.children) {
                    storeNewInverseOverlays(node.children[relid]);
                }
            }
        }

        function attachOverlays(node) {

            if (hasShardedOverlays(node) !== true) {
                return node;
            }

            var overlays = self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY),
                shardId,
                shardIds = [],
                loadPromises = [];

            for (shardId in overlays) {
                if (REGEXP.DB_HASH.test(overlays[shardId]) === true) {
                    shardIds.push(shardId);
                    loadPromises.push(innerCore.loadObject(overlays[shardId]));
                }
            }

            return TASYNC.call(function (overlayShards) {
                var i;

                node.overlays = {};
                node.overlayMutations = {};
                node.overlayInitials = {};
                for (i = 0; i < overlayShards.length; i += 1) {
                    shardId = shardIds[i];
                    node.overlays[shardId] = overlayShards[i];
                    node.overlayInitials[shardId] = overlayShards[i];
                    node.overlayMutations[shardId] = false;
                }
                updateSmallestOverlayShardIndex(node);
                return node;
            }, TASYNC.lift(loadPromises));
        }

        function hasShardedOverlays(node) {
            return (self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {})[CONSTANTS.OVERLAY_SHARD_INDICATOR]
                === true;
        }

        // We only shard regular GME nodes, technical sub-nodes do not get sharded
        function shouldHaveShardedOverlays(node) {
            return Object.keys(self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {}).length >=
                _shardingLimit && self.getPath(node).indexOf('_') === -1;
        }

        function addNewOverlayShard(node) {
            var overlaysNode = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY),
                shardId = RANDOM.generateRelid(overlaysNode.data),
                newShardObject = {
                    type: STORAGE_CONSTANTS.OVERLAY_SHARD_TYPE,
                    itemCount: 0,
                    items: {}
                };

            newShardObject[self.ID_NAME] = '';
            node.overlays[shardId] = newShardObject;
            node.overlayMutations[shardId] = true;

            self.setProperty(overlaysNode, shardId, null);
            return shardId;
        }

        function removeOverlayShard(node, shardId) {
            // At this point the node should always be mutated.
            var overlaysNode = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);

            delete node.overlays[shardId];
            delete node.overlayMutations[shardId];
            self.deleteProperty(overlaysNode, shardId);
        }

        function transformOverlays(node) {
            var originalOverlays = self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY),
                count = _shardSize,
                source,
                name,
                shardId;

            self.deleteChild(node, CONSTANTS.OVERLAYS_PROPERTY);
            self.removeChildFromCache(node, CONSTANTS.OVERLAYS_PROPERTY);

            self.setProperty(self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY), CONSTANTS.OVERLAY_SHARD_INDICATOR, true);

            node.overlays = {};
            node.overlayMutations = {};
            node.overlayInitials = {};
            node.minimalOverlayShardId = null;
            for (source in originalOverlays) {
                if (source !== CONSTANTS.MUTABLE_PROPERTY) {
                    for (name in originalOverlays[source]) {
                        if (name !== CONSTANTS.MUTABLE_PROPERTY) {
                            if (count >= _shardSize) {
                                shardId = addNewOverlayShard(node);
                                node.minimalOverlayShardId = shardId;
                                count = 0;
                            }

                            node.overlays[shardId].items[source] = node.overlays[shardId].items[source] || {};
                            node.overlays[shardId].items[source][name] = originalOverlays[source][name];
                            node.overlays[shardId].itemCount += 1;
                            count += 1;
                        }
                    }
                }
            }

            // In the unlikely event that during transition the original shard is empty.
            if (Object.keys(node.overlays).length === 0) {
                node.minimalOverlayShardId = addNewOverlayShard(node);
            }
        }

        function updateSmallestOverlayShardIndex(node) {
            var shardId,
                minimalItemCount = _shardSize + 1;

            for (shardId in node.overlays) {
                if (node.overlays[shardId].itemCount < minimalItemCount) {
                    minimalItemCount = node.overlays[shardId].itemCount;
                    node.minimalOverlayShardId = shardId;
                }
            }
        }

        function ensureOverlayShardMutated(node, shardId) {
            var overlayNode;

            if (node.overlayMutations[shardId] !== true) {
                node.overlayMutations[shardId] = true;
                node.overlays[shardId] = JSON.parse(JSON.stringify(node.overlays[shardId]));
                overlayNode = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);
                self.setProperty(overlayNode, shardId, null);
            }
        }

        function putEntryIntoOverlayShard(node, shardId, source, name, target) {

            if (node.overlays[shardId].itemCount >= _shardSize &&
                node.overlays[shardId].items.hasOwnProperty(source) === false) {
                shardId = addNewOverlayShard(node);
                node.minimalOverlayShardId = shardId;
            }

            ensureOverlayShardMutated(node, shardId);

            node.overlays[shardId].items[source] = node.overlays[shardId].items[source] || {};
            node.overlays[shardId].items[source][name] = target;
            node.overlays[shardId].itemCount += 1;

            if (node.minimalOverlayShardId === shardId && node.overlays[shardId].itemCount >= _shardSize) {
                updateSmallestOverlayShardIndex(node);
            }
        }

        function putEntryIntoShardedOverlays(node, source, name, target) {
            // At this point we expect that everything was checked and we can simply look for
            // the proper place of the entry.
            var shardId;

            for (shardId in node.overlays) {
                if (node.overlays[shardId].items.hasOwnProperty(source)) {
                    putEntryIntoOverlayShard(node, shardId, source, name, target);
                    return;
                }
            }

            putEntryIntoOverlayShard(node, node.minimalOverlayShardId, source, name, target);
        }

        function removeEntryFromShardedOverlays(node, source, name) {
            var shardId;

            for (shardId in node.overlays) {
                if (node.overlays[shardId].items[source]) {
                    if (typeof node.overlays[shardId].items[source][name] === 'string') {

                        ensureOverlayShardMutated(node, shardId);

                        delete node.overlays[shardId].items[source][name];
                        node.overlays[shardId].itemCount -= 1;
                    }
                    break;
                }
            }
        }

        function persistShardedOverlays(node, stackedObjects) {
            // This recursive function will save objects, right before calling the underlying persist.
            var relids,
                shardId,
                source,
                hash,
                overlayNode,
                shouldUpdateSmallest = false,
                i;

            if (self.isMutable(node) !== true) {
                return;
            }

            relids = self.getChildrenRelids(node);

            for (i = 0; i < relids.length; i += 1) {
                if (self.childLoaded(node, relids[i]) === true) {
                    persistShardedOverlays(self.getChild(node, relids[i]), stackedObjects);
                }
            }

            overlayNode = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);
            for (shardId in node.overlayMutations) {
                // We only remove shards if they were empty at loading as well. Otherwise
                // node eventing would be impossible.
                if (node.overlayMutations[shardId] === true) {
                    node.overlayMutations[shardId] = false;
                    node.overlays[shardId][self.ID_NAME] = '';
                    node.overlays[shardId].__v = STORAGE_CONSTANTS.VERSION;

                    // if we persist an empty shard we have to ensure that its hash will be unique
                    if (node.overlays[shardId].itemCount === 0) {
                        node.overlays[shardId].oldHash = node.overlayInitials[shardId] ?
                            node.overlayInitials[shardId][self.ID_NAME] || null : null;
                        node.overlays[shardId].items = {};
                    } else {
                        for (source in node.overlays[shardId].items) {
                            if (Object.keys(node.overlays[shardId].items[source]).length === 0) {
                                delete node.overlays[shardId].items[source];
                            }
                        }
                    }

                    hash = '#' + GENKEY(node.overlays[shardId], options.globConf);
                    node.overlays[shardId][self.ID_NAME] = hash;
                    innerCore.insertObject(node.overlays[shardId], stackedObjects);
                    stackedObjects[hash] = {
                        oldHash: node.overlayInitials[shardId] ? node.overlayInitials[shardId][self.ID_NAME] : null,
                        oldData: node.overlayInitials[shardId],
                        newHash: hash,
                        newData: node.overlays[shardId]
                    };

                    self.setProperty(overlayNode, shardId, hash);
                    shouldUpdateSmallest = true;
                } else if (node.overlays[shardId].itemCount === 0) {
                    removeOverlayShard(node, shardId);
                    shouldUpdateSmallest = true;
                }
            }

            if (shouldUpdateSmallest) {
                updateSmallestOverlayShardIndex(node);
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
            var stackedObjects = {},
                persisted;

            persistShardedOverlays(node, stackedObjects);
            persisted = innerCore.persist(node, stackedObjects);
            storeNewInverseOverlays(self.getRoot(node));

            return persisted;
        };

        this.loadRoot = function (hash) {
            return TASYNC.call(function (root) {
                return attachOverlays(root);
            }, innerCore.loadRoot(hash));
        };

        this.loadChild = function (node, relid) {
            return TASYNC.call(function (child) {
                return attachOverlays(child);
            }, innerCore.loadChild(node, relid));
        };

        this.loadByPath = function (node, relPath) {
            return TASYNC.call(function (target) {
                return attachOverlays(target);
            }, innerCore.loadByPath(node, relPath));
        };
        //</editor-fold>

        //<editor-fold=Added Methods>
        this.getInverseOverlayOfNode = function (node) {
            var hash,
                inverseOverlays = {},
                overlay,
                overlaysObject,
                shardId,
                i,
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
                    delete node.inverseOverlaysMutable;
                    return node.inverseOverlays;
                }
            }

            // Otherwise we have to compute it
            if (hasShardedOverlays(node)) {
                overlaysObject = node.overlays;
            } else {
                overlaysObject = {single: {items: self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {}}};
            }

            inverseOverlays = {};
            for (shardId in overlaysObject) {
                overlay = overlaysObject[shardId];
                for (source in overlay.items) {
                    if (source !== CONSTANTS.MUTABLE_PROPERTY) {
                        for (name in overlay.items[source]) {
                            if (name !== CONSTANTS.MUTABLE_PROPERTY) {
                                target = overlay.items[source][name];
                                inverseOverlays[target] = inverseOverlays[target] || {};
                                inverseOverlays[target][name] = inverseOverlays[target][name] || [];
                                inverseOverlays[target][name].push(source);
                            }
                        }
                    }
                }
            }

            // If it is an unmodified node, we can store the inverse, otherwise it still can change
            if (hash) {
                self._inverseCache.setItem(hash, inverseOverlays);
                delete node.inverseOverlaysMutable;
            } else {
                node.inverseOverlaysMutable = true;
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

        this.overlayInquiry = function (node, source, name) {
            // If name is not given, then the whole object returned.
            // If no entry found, null is returned.
            var shardId,
                ordinaryOverlays,
                result = {
                    shardId: null,
                    value: null
                };

            if (hasShardedOverlays(node) === true) {
                for (shardId in node.overlays) {
                    if (node.overlays[shardId].items[source]) {
                        result.shardId = shardId;
                        if (typeof name === 'string') {
                            result.value = typeof node.overlays[shardId].items[source][name] === 'string' ?
                                node.overlays[shardId].items[source][name] : null;
                        } else {
                            result.value = node.overlays[shardId].items[source];
                        }
                        break;
                    }
                }
            } else {
                ordinaryOverlays = self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {};
                if (ordinaryOverlays.hasOwnProperty(source)) {
                    if (typeof name === 'string') {
                        result.value = typeof ordinaryOverlays[source][name] === 'string' ?
                            ordinaryOverlays[source][name] : null;
                    } else {
                        result.value = ordinaryOverlays[source];
                    }
                }
            }

            return result;
        };

        this.overlayRemove = function (node, source, name, target) {
            ASSERT(self.isValidNode(node));
            ASSERT(innerCore.isValidPath(source) && innerCore.isValidPath(target) && self.isPointerName(name));
            ASSERT(innerCore.getCommonPathPrefixData(source, target).common === '');

            var currentOverlayInfo = self.overlayInquiry(node, source, name),
                index,
                overlays,
                overlayNode;

            ASSERT(currentOverlayInfo.value === target);

            if (hasShardedOverlays(node)) {
                removeEntryFromShardedOverlays(node, source, name);
            } else {
                overlays = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);

                overlayNode = innerCore.getChild(overlays, source);
                innerCore.deleteProperty(overlayNode, name);

                if (innerCore.getKeys(overlayNode).length === 0) {
                    innerCore.deleteProperty(overlays, source);
                }
            }

            //Now we check if we need to mutate the inverse overlays
            if (node.inverseOverlays) {
                if (node.inverseOverlaysMutable !== true) {
                    node.inverseOverlays = JSON.parse(JSON.stringify(node.inverseOverlays));
                    node.inverseOverlaysMutable = true;
                }

                index = ((node.inverseOverlays[target] || {})[name] || []).indexOf(source);
                if (index !== -1) {
                    node.inverseOverlays[target][name].splice(index, 1);
                    if (node.inverseOverlays[target][name].length === 0) {
                        delete node.inverseOverlays[target][name];
                        if (Object.keys(node.inverseOverlays[target]).length === 0) {
                            delete node.inverseOverlays[target];
                        }
                    }
                }
            }
        };

        this.overlayQuery = function (node, prefix) {
            ASSERT(self.isValidNode(node) && innerCore.isValidPath(prefix));

            var overlays,
                overlaysObject,
                shardId,
                inverseOverlays = self.getInverseOverlayOfNode(node), // We necessarily have to compute at this point,
                i, path, name, list = [],
                prefix2 = prefix + CONSTANTS.PATH_SEP;

            if (hasShardedOverlays(node)) {
                overlaysObject = node.overlays;
            } else {
                overlaysObject = {'single': {items: self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {}}};
            }

            for (shardId in overlaysObject) {
                overlays = overlaysObject[shardId].items;
                for (path in overlays) {
                    if (path === prefix || path.substr(0, prefix2.length) === prefix2) {
                        for (name in overlays[path]) {
                            if (self.isPointerName(name)) {
                                list.push({
                                    s: path,                // source
                                    n: name,                // name
                                    t: overlays[path][name],// target
                                    p: true                 // is forward relation
                                });
                            }
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
        };

        this.overlayInsert = function (node, source, name, target) {
            ASSERT(self.isValidNode(node));
            ASSERT(innerCore.isValidPath(source) && innerCore.isValidPath(target) && self.isPointerName(name));
            ASSERT(innerCore.getCommonPathPrefixData(source, target).common === '');

            var currentOverlayInfo = self.overlayInquiry(node, source, name),
                index,
                overlays,
                overlay,
                entryCount,
                overlayArray;

            ASSERT(currentOverlayInfo.value === null);

            if (hasShardedOverlays(node) === false && shouldHaveShardedOverlays(node)) {
                transformOverlays(node);
            }

            if (hasShardedOverlays(node) === true) {
                putEntryIntoShardedOverlays(node, source, name, target);
            } else {
                overlays = self.getChild(node, CONSTANTS.OVERLAYS_PROPERTY);
                overlay = self.getChild(overlays, source);

                self.setProperty(overlay, name, target);
            }

            //Now we check if we need to mutate the inverse overlays
            if (node.inverseOverlays) {
                if (node.inverseOverlaysMutable !== true) {
                    node.inverseOverlays = JSON.parse(JSON.stringify(node.inverseOverlays));
                    node.inverseOverlaysMutable = true;
                }

                node.inverseOverlays[target] = node.inverseOverlays[target] || {};
                node.inverseOverlays[target][name] = node.inverseOverlays[target][name] || [];
                node.inverseOverlays[target][name].push(source);
            }
        };

        this.createNode = function (parameters, takenRelids, relidLength) {
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
                    node = self.createChild(parent, takenRelids, relidLength);
                }

                innerCore.setHashed(node, true);
            } else {
                node = innerCore.createRoot();
            }

            // As we just created the node, we can allocate an empty inverse object, that is appropriate this time
            node.inverseOverlays = {};
            node.inverseOverlayMutable = true;
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
            innerCore.removeChildFromCache(parent, relid);
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

        this.createChild = function (parent, takenRelids, relidLength) {
            var child = innerCore.createChild(parent, takenRelids, relidLength);

            parent.childrenRelids = null;

            return child;
        };

        this.copyNode = function (node, parent, takenRelids, relidLength) {
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
                target;

            node = innerCore.normalize(node);

            if (parent) {
                ancestor = innerCore.getAncestor(node, parent);

                // cannot copy inside of itself
                if (ancestor === node) {
                    return null;
                }

                newNode = self.createChild(parent, takenRelids, relidLength);
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

            if (node.inverseOverlaysMutable) {
                newNode.inverseOverlays = JSON.parse(JSON.stringify(node.inverseOverlays));
            } else {
                newNode.inverseOverlays = node.inverseOverlays;
            }
            newNode.inverseOverlaysMutable = node.inverseOverlaysMutable;

            var root = self.getRoot(newNode);
            root.initial[self.getPath(newNode)] = root.initial[self.getPath(node)];
            return newNode;
        };

        this.copyNodes = function (nodes, parent, takenRelids, relidLength) {
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
                newNode = self.copyNode(nodes[i], parent, takenRelids, relidLength);
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

        this.moveNode = function (node, parent, takenRelids, relidLength) {
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
                    node = innerCore.createChild(parent, takenRelids, relidLength);
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

            var root = self.getRoot(node);
            root.initial[self.getPath(node)] = root.initial[self.getPath(oldNode)];
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
                result.push(self.loadChild(node, children[i]));
            }

            return TASYNC.lift(result);
        };

        this.getPointerNames = function (node) {
            return self.getPointerNamesFrom(node, '');
        };

        this.getPointerNamesFrom = function (node, source) {
            ASSERT(self.isValidNode(node));

            var names = [],
                name,
                overlayInfo;

            do {
                overlayInfo = self.overlayInquiry(node, source);
                if (overlayInfo.value !== null) {
                    for (name in overlayInfo.value) {
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
                return self.loadByPath(res.node, res.target);
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
                overlayInfo;

            do {
                overlayInfo = self.overlayInquiry(node, source, name);
                if (typeof overlayInfo.value === 'string') {
                    self.overlayRemove(node, source, name, overlayInfo.value);
                    break;
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

        // by default the function removes any 'sub-node' relations
        this.getRawOverlayInformation = function (node) {
            var completeOverlayInfo = {},
                shardId,
                source,
                complexOverlayObject,
                name;

            if (hasShardedOverlays(node)) {
                complexOverlayObject = node.overlays;
            } else {
                complexOverlayObject = {single: {items: self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY) || {}}};
            }

            for (shardId in complexOverlayObject) {
                for (source in complexOverlayObject[shardId].items) {
                    if (source.indexOf('_') === -1) {
                        completeOverlayInfo[source] = {};
                        for (name in complexOverlayObject[shardId].items[source]) {
                            if (name.indexOf('_') === -1) {
                                if (complexOverlayObject[shardId].items[source][name] === '/_nullptr') {
                                    completeOverlayInfo[source][name] = null;
                                } else if (complexOverlayObject[shardId].items[source][name]
                                        .indexOf('_') === -1) {
                                    completeOverlayInfo[source][name] =
                                        complexOverlayObject[shardId].items[source][name];
                                }
                            }
                        }
                    }
                }
            }

            return completeOverlayInfo;
        };
        //</editor-fold>
    }

    return CoreRel;
});
