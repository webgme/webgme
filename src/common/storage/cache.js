/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Miklos Maroti
 */

define([ "util/assert" ], function (ASSERT) {
	"use strict";

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
        var gmeConfig = options.globConf;
		ASSERT(typeof database === "object" && typeof gmeConfig === "object");

		var projects = {};
		var dlock = new Lock();

		function openProject (name, callback) {
			ASSERT(typeof name === "string" && typeof callback === "function");

			dlock.lock(function () {
				if (typeof projects[name] !== "undefined") {
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

		function closeDatabase (callback) {
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

		function deleteProject (name, callback) {
			if (typeof projects[name] !== "undefined") {
				projects[name].deleteProject();
			}

			database.deleteProject(name, callback);
		}

		function wrapProject (name, project) {
			var ID_NAME = project.ID_NAME;

			var refcount = 0;
			var missing = {};
			var backup = {};
			var cache = {};
			var cacheSize = 0;

			function tryFreeze(o) {
				try{
					Object.freeze(o);
				}
				catch(e){
					//TODO find the proper answer why this can occur
					return;
				}
			}

			function maybeFreeze(o) {
				if (o !== null && typeof o === "object") {
					deepFreeze(o);
				}
			}

			var deepFreeze = function (obj) {
				ASSERT(typeof obj === "object");

				tryFreeze(obj);

				var key;
				for (key in obj) {
					maybeFreeze(obj[key]);
				}
			};
			if (gmeConfig.debug === false) {
				deepFreeze = function () { };
			}

			function cacheInsert (key, obj) {
				ASSERT(typeof cache[key] === "undefined" && obj[ID_NAME] === key);

				deepFreeze(obj);
				cache[key] = obj;

				if (++cacheSize >= gmeConfig.storage.cache) {
					backup = cache;
					cache = {};
					cacheSize = 0;
				}
			}

			function loadObject (key, callback) {
				ASSERT(typeof key === "string" && typeof callback === "function");
				ASSERT(project !== null);

				var obj = cache[key];
				if (typeof obj === "undefined") {
					obj = backup[key];
					if (typeof obj === "undefined") {
						obj = missing[key];
						if (typeof obj === "undefined") {
							obj = [ callback ];
							missing[key] = obj;
							project.loadObject(key, function (err, obj2) {
								ASSERT(typeof obj2 === "object" || typeof obj2 === "undefined");

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

				ASSERT(typeof obj === "object" && obj !== null && obj[ID_NAME] === key);
				callback(null, obj);
			}

			function insertObject (obj, callback) {
				ASSERT(typeof obj === "object" && obj !== null && typeof callback === "function");

				var key = obj[ID_NAME];
				ASSERT(typeof key === "string");

				if (typeof cache[key] !== "undefined") {
					callback(null);
					return;
				} else {
					var item = backup[key];
					cacheInsert(key, obj);

					if (typeof item !== "undefined") {
						callback(null);
						return;
					} else {
						item = missing[key];
						if (typeof item !== "undefined") {
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

			function abortProject (callback) {
				if (project !== null) {
					var p = project;
					project = null;
					delete projects[name];
					deleteProject();
					p.closeProject(callback);
				} else if (typeof callback === "function ") {
					callback(null);
				}
			}

			function closeProject (callback) {
				ASSERT(refcount >= 1);

				if (--refcount === 0) {
					abortProject(callback);
				} else if (typeof callback === "function") {
					callback(null);
				}
			}

			function deleteProject () {
				var key, callbacks, cb, err = new Error("cache closed");
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

			function reopenProject (callback) {
				ASSERT(project !== null && refcount >= 0 && typeof callback === "function");

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
