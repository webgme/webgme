/*globals define*/
/*jshint browser: true, node:true*/
/**
 * This class (extracted functionality from cache implemented by mmaroti) caches objects associated
 * with a project.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @author mmaroti / https://github.com/mmaroti
 */

define(['common/util/assert', 'common/storage/constants'], function (ASSERT, CONSTANTS) {
    'use strict';
    function ProjectCache(storage, projectId, mainLogger, gmeConfig) {
        var missing = {},
            backup = {},
            cache = {},
            logger = mainLogger.fork('ProjectCache'),
            cacheSize = 0;

        logger.debug('ctor');
        function cacheInsert(key, obj) {
            ASSERT(typeof cache[key] === 'undefined' && obj[CONSTANTS.MONGO_ID] === key);
            logger.debug('cacheInsert', key);

            //deepFreeze(obj);
            cache[key] = obj;

            if (++cacheSize >= gmeConfig.storage.cache) {
                backup = cache;
                cache = {};
                cacheSize = 0;
            }
        }

        this.loadObject = function (key, callback) {
            ASSERT(typeof key === 'string' && typeof callback === 'function');
            logger.debug('loadObject', {metadata: key});

            var obj = cache[key];
            if (typeof obj === 'undefined') {
                obj = backup[key];
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
                    logger.debug('object was in backup');
                    cacheInsert(key, obj);
                }
            } else {
                logger.debug('object was in cache');
            }

            ASSERT(typeof obj === 'object' && obj !== null && obj[CONSTANTS.MONGO_ID] === key);
            callback(null, obj);
        };

        this.insertObject = function (obj, stackedObjects) {
            ASSERT(typeof obj === 'object' && obj !== null);

            var key = obj[CONSTANTS.MONGO_ID];
            logger.debug('insertObject', {metadata: key});
            ASSERT(typeof key === 'string');

            if (typeof cache[key] !== 'undefined') {
                logger.warn('object inserted was already in cache');
            } else {
                var item = backup[key];
                cacheInsert(key, obj);

                if (typeof item !== 'undefined') {
                    logger.warn('object inserted was already in back-up');
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
    }

    return ProjectCache;
});