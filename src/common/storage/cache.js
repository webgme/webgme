/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define(['common/util/assert'], function (ASSERT) {
    'use strict';

    var Lock = function () {
        var waiters = [];

        return {
            lock: function (func) {
                waiters.push(func);
                if (waiters.length === 1) {
                    func();
                }
            },

            unlock: function () {
                waiters.shift();
                if (waiters.length >= 1) {
                    var func = waiters[0];
                    func();
                }
            }
        };
    };

    var Database = function (database, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        ASSERT(typeof options.globConf === 'object');
        var gmeConfig = options.globConf,
            logger = options.logger.fork('cache');
        logger.debug('Initializing');
        ASSERT(typeof database === 'object' && typeof gmeConfig === 'object');

        var projects = {};
        var dlock = new Lock();

        function openProject(name, callback) {
            ASSERT(typeof name === 'string' && typeof callback === 'function');

            logger.debug('openProject', {metadata: {name: name}});

            dlock.lock(function () {
                if (typeof projects[name] !== 'undefined') {
                    projects[name].reopenProject(callback);
                    dlock.unlock();
                } else {
                    database.openProject(name, function (err, project) {
                        if (err) {
                            callback(err);
                        } else {
                            project = wrapProject(name, project);
                            projects[name] = project;
                            project.reopenProject(callback);
                        }
                        dlock.unlock();
                    });
                }
            });
        }

        function closeDatabase(callback) {
            logger.debug('closeDatabase');

            dlock.lock(function () {
                var n;
                for (n in projects) {
                    projects[n].abortProject();
                }
                projects = {};
                database.closeDatabase(callback);
                dlock.unlock();
            });
        }

        function deleteProject(name, callback) {
            logger.debug('deleteProject', {metadata: {name: name}});

            if (typeof projects[name] !== 'undefined') {
                projects[name].deleteProject();
            }

            database.deleteProject(name, callback);
        }

        function wrapProject(name, project) {
            var ID_NAME = project.ID_NAME;

            var refcount = 0;
            var missing = {};
            var backup = {};
            var cache = {};
            var cacheSize = 0;

            var wrapLogger = logger.fork('wrapProject:' + name);
            wrapLogger.debug('Initializing');

            function tryFreeze(o) {
                try {
                    Object.freeze(o);
                }
                catch (e) {
                    //TODO find the proper answer why this can occur
                    return;
                }
            }

            function maybeFreeze(o) {
                if (o !== null && typeof o === 'object') {
                    deepFreeze(o);
                }
            }

            var deepFreeze = function (obj) {
                ASSERT(typeof obj === 'object');

                tryFreeze(obj);

                var key;
                for (key in obj) {
                    maybeFreeze(obj[key]);
                }
            };
            if (gmeConfig.debug === false) {
                deepFreeze = function () {
                };
            }

            function cacheInsert(key, obj) {
                ASSERT(typeof cache[key] === 'undefined' && obj[ID_NAME] === key);
                wrapLogger.debug('cacheInsert', {metadata: key});

                deepFreeze(obj);
                cache[key] = obj;

                if (++cacheSize >= gmeConfig.storage.cache) {
                    backup = cache;
                    cache = {};
                    cacheSize = 0;
                }
            }

            function loadObject(key, callback) {
                ASSERT(typeof key === 'string' && typeof callback === 'function');
                ASSERT(project !== null);
                wrapLogger.debug('loadObject', {metadata: key});

                var obj = cache[key];
                if (typeof obj === 'undefined') {
                    obj = backup[key];
                    if (typeof obj === 'undefined') {
                        obj = missing[key];
                        if (typeof obj === 'undefined') {
                            obj = [callback];
                            missing[key] = obj;
                            project.loadObject(key, function (err, obj2) {
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
                            obj.push(callback);
                        }
                        return;
                    } else {
                        cacheInsert(key, obj);
                    }
                }

                ASSERT(typeof obj === 'object' && obj !== null && obj[ID_NAME] === key);
                callback(null, obj);
            }

            function insertObject(obj, callback) {
                ASSERT(typeof obj === 'object' && obj !== null && typeof callback === 'function');
                wrapLogger.debug('insertObject');

                var key = obj[ID_NAME];
                ASSERT(typeof key === 'string');

                if (typeof cache[key] !== 'undefined') {
                    callback(null);
                    return;
                } else {
                    var item = backup[key];
                    cacheInsert(key, obj);

                    if (typeof item !== 'undefined') {
                        callback(null);
                        return;
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

                project.insertObject(obj, callback);
            }

            function abortProject(callback) {
                wrapLogger.debug('abortProject');

                if (project !== null) {
                    var p = project;
                    project = null;
                    delete projects[name];
                    deleteProject();
                    p.closeProject(callback);
                } else if (typeof callback === 'function') {
                    callback(null);
                }
            }

            function closeProject(callback) {
                wrapLogger.debug('closeProject', {metadata: {refcount: refcount}});

                if (refcount >= 1) {
                    if (--refcount === 0) {
                        abortProject(callback);
                    } else if (typeof callback === 'function') {
                        callback(null);
                    }
                } else {
                    wrapLogger.warn('closeProject was called more times than open project');
                    // nothing to close
                    callback(null);
                }
            }

            function deleteProject() {
                var key, callbacks, cb, err = new Error('cache closed');
                wrapLogger.debug('deleteProject');

                for (key in missing) {
                    callbacks = missing[key];
                    while ((cb = callbacks.pop())) {
                        cb(err);
                    }
                }

                missing = {};
                backup = {};
                cache = {};
                cacheSize = 0;
            }

            function reopenProject(callback) {
                ASSERT(project !== null && refcount >= 0 && typeof callback === 'function');
                wrapLogger.debug('reopenProject');

                var cacheProject = {};
                for (var key in project) {
                    if (project.hasOwnProperty(key)) {
                        cacheProject[key] = project[key];
                    }
                }
                if (gmeConfig.storage.cache !== 0) {
                    cacheProject.loadObject = loadObject;
                    cacheProject.insertObject = insertObject;
                }
                cacheProject.closeProject = closeProject;

                ++refcount;
                callback(null, cacheProject);
            }

            return {
                reopenProject: reopenProject,
                abortProject: abortProject,
                deleteProject: deleteProject
            };
        }

        logger.debug('Ready');
        return {
            openDatabase: database.openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: database.fsyncDatabase,
            getDatabaseStatus: database.getDatabaseStatus,
            getProjectNames: database.getProjectNames,
            getAllowedProjectNames: database.getAllowedProjectNames,
            getAuthorizationInfo: database.getAuthorizationInfo,
            openProject: openProject,
            deleteProject: deleteProject,
            simpleRequest: database.simpleRequest,
            simpleResult: database.simpleResult,
            simpleQuery: database.simpleQuery,
            getNextServerEvent: database.getNextServerEvent,
            getToken: database.getToken
        };
    };

    return Database;
});
