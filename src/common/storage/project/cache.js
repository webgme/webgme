/*globals define*/
/*jshint browser: true, node:true*/
/**
 * This class (extracted functionality from cache implemented by mmaroti) caches objects associated
 * with a project.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/util/assert',
    'common/storage/constants',
    'common/storage/util'
], function (ASSERT, CONSTANTS, UTIL) {
    'use strict';
    function ProjectCache(storage, projectId, mainLogger, gmeConfig) {
        var self = this,
            missing = {},
            backup = {},
            cache = {},
            logger = mainLogger.fork('ProjectCache'),
            cacheSize = 0;

        logger.debug('ctor', projectId);

        this.queuedPersists = {};

        function cacheInsert(key, obj) {
            ASSERT(obj[CONSTANTS.MONGO_ID] === key);
            logger.debug('cacheInsert', key);

            //deepFreeze(obj);
            if (!cache[key]) {
                cache[key] = obj;

                if (++cacheSize >= gmeConfig.storage.cache) {
                    backup = cache;
                    cache = {};
                    cacheSize = 0;
                }
                return true;
            } else {
                return false;
            }
        }

        function getFromCache(hash) {
            var obj = cache[hash],
                commitId;

            if (typeof obj === 'undefined') {
                obj = backup[hash];

                if (typeof obj === 'undefined') {
                    for (commitId in self.queuedPersists) {
                        if (self.queuedPersists.hasOwnProperty(commitId) && self.queuedPersists[commitId][hash]) {
                            obj = self.queuedPersists[commitId][hash];
                            break;
                        }
                    }
                }
            }

            return obj;
        }

        this.loadObject = function (key, callback) {
            var commitId;
            ASSERT(typeof key === 'string' && typeof callback === 'function');
            logger.debug('loadObject', {metadata: key});

            var obj = cache[key];
            if (typeof obj === 'undefined') {
                obj = backup[key];
                if (typeof obj === 'undefined') {
                    for (commitId in self.queuedPersists) {
                        if (self.queuedPersists.hasOwnProperty(commitId) && self.queuedPersists[commitId][key]) {
                            obj = self.queuedPersists[commitId][key];
                            break;
                        }
                    }
                    if (typeof obj === 'undefined') {
                        obj = missing[key];
                        if (typeof obj === 'undefined') {
                            obj = [callback];
                            missing[key] = obj;
                            logger.debug('object set to be loaded from storage');
                            storage.loadObject(projectId, key, function (err, obj2) {
                                ASSERT(typeof obj2 === 'object' || typeof obj2 === 'undefined');

                                if (obj.length !== 0) {
                                    ASSERT(missing[key] === obj);

                                    delete missing[key];
                                    if (!err && obj2) {
                                        cacheInsert(key, obj2);
                                    }

                                    var cb;
                                    while ((cb = obj.pop())) {
                                        cb(err, obj2);
                                    }
                                }
                            });
                        } else {
                            logger.debug('object was already queued to be loaded');
                            obj.push(callback);
                        }
                        return;
                    } else {
                        logger.debug('object was erased from cache and backup but present in queuedPersists');
                        cacheInsert(key, obj);
                    }
                } else {
                    logger.debug('object was in backup');
                    cacheInsert(key, obj);
                }
            } else {
                logger.debug('object was in cache');
            }

            ASSERT(typeof obj === 'object' && obj !== null && obj[CONSTANTS.MONGO_ID] === key);
            callback(null, obj);
        };

        /**
         * Loads the necessary objects for the nodes corresponding to paths and inserts them in the cache.
         * If the rootKey is empty or does not exist - it won't attempt to load any nodes.
         * @param {string} rootKey
         * @param {string[]} paths
         * @param {function(err)} callback
         */
        this.loadPaths = function (rootKey, paths, callback) {
            logger.debug('loadPaths', {metadata: {rootKey: rootKey, paths: paths}});

            var cachedObjects = {},
                excludes = [],
                rootObj = getFromCache(rootKey),
                i = paths.length,
                j,
                pathArray,
                obj,
                pathsInfo = [],
                key;

            if (!rootKey) {
                logger.debug('rootKey empty:', rootKey);
                callback(null);
                return;
            }

            if (rootObj) {
                // The root was loaded, so for each requested path we start from the root
                // and work our way down to the containment chain and add each object that is
                // already in the cache to 'excludes'.

                excludes.push(rootKey);
                cachedObjects[rootKey] = rootObj;
                while (i--) {
                    pathArray = paths[i].split('/');
                    pathArray.shift();

                    obj = rootObj;
                    for (j = 0; j < pathArray.length; j += 1) {
                        key = obj[pathArray[j]];
                        if (key) {
                            obj = getFromCache(key);
                            if (typeof obj !== 'undefined') {
                                excludes.push(key);
                                cachedObjects[key] = obj;
                            } else {
                                pathsInfo.push({
                                    parentHash: key,
                                    path: '/' + pathArray.slice(j + 1).join('/')
                                });
                                break;
                            }
                        } else {
                            // The given path does not exist anymore - break.
                            break;
                        }
                    }
                }
            } else {
                pathsInfo = paths.map(function (path) {
                    return {
                        parentHash: rootKey,
                        path: path
                    };
                });
            }

            if (pathsInfo.length === 0) {
                logger.debug('All given paths already loaded');
                callback(null);
                return;
            }

            logger.debug('loadPaths will request from server, pathsInfo:', pathsInfo);
            storage.loadPaths(projectId, pathsInfo, excludes, function (err, serverObjects) {
                var keys, i;
                if (!err && serverObjects) {
                    // Insert every obtained object into the cache (that was not there before).
                    keys = Object.keys(serverObjects);
                    for (i = 0; i < keys.length; i += 1) {
                        if (serverObjects[keys[i]] !== undefined) {
                            // When not going through a web-socket loadPaths returns keys with
                            // undefined values, therefore the extra check.
                            cacheInsert(keys[i], serverObjects[keys[i]]);
                        }
                    }

                    // Reinsert the cachedObjects.
                    keys = Object.keys(cachedObjects);
                    for (i = 0; i < keys.length; i += 1) {
                        cacheInsert(keys[i], cachedObjects[keys[i]]);
                    }
                    callback(null);
                } else {
                    logger.error('loadingPaths failed', err || new Error('no object arrived from server'));
                    callback(err);
                }
            });
        };

        this.insertObject = function (obj, stackedObjects) {
            ASSERT(typeof obj === 'object' && obj !== null);

            var key = obj[CONSTANTS.MONGO_ID];
            logger.debug('insertObject', {metadata: key});
            ASSERT(typeof key === 'string');

            if (cacheInsert(key, obj) === false) {
                // The storage on the server will return error if it's not the same..
                logger.debug('object inserted was already in cache');
            } else {
                var item = backup[key];

                if (typeof item !== 'undefined') {
                    // The storage on the server will return error if it's not the same..
                    logger.debug('object inserted was already in back-up');
                } else {
                    item = missing[key];
                    if (typeof item !== 'undefined') {
                        delete missing[key];

                        var cb;
                        while ((cb = item.pop())) {
                            cb(null, obj);
                        }
                    }
                }
            }
            if (stackedObjects) {
                stackedObjects[key] = obj;
            }
        };

        this.insertPatchObject = function (obj) {
            ASSERT(typeof obj === 'object' && obj !== null);

            var base,
                patch,
                key = obj[CONSTANTS.MONGO_ID];

            if (obj.base && typeof obj.patch === 'object' && key) {
                base = getFromCache(obj.base);

                if (base) {
                    patch = UTIL.applyPatch(base, obj.patch);
                    if (patch.status === 'success') {
                        patch.result[CONSTANTS.MONGO_ID] = key;
                        this.insertObject(patch.result);
                    } else {
                        logger.error('patch application failed', patch);
                    }
                } else {
                    logger.debug('the base [' +
                        obj.base + '] is not available from the cache so the patch object is ignored');
                }
            } else {
                logger.error('invalid patch object format', obj);
            }
        };
    }

    return ProjectCache;
});