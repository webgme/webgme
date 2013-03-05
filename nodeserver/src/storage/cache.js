/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/util", "core/config" ], function (ASSERT, UTIL, CONFIG) {
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
				waiters.pop();
				if (waiters.length >= 1) {
					var func = waiters[0];
					func();
				}
			}
		};
	};

	var Database = function (database, options) {
		ASSERT(typeof database === "object" && typeof options === "object");

		options.size = options.size || 2000;

		var ID_NAME = database.ID_NAME;
		var projects = {};
		var dlock = new Lock();

		function openProject (name, callback) {
			ASSERT(typeof name === "string" && typeof callback === "function");

			dlock.lock(function () {
				if (typeof projects[name] !== "undefined") {
					callback(null, projects[name].reopenProject());
					dlock.unlock();
				} else {
					database.openProject(name, function (err, project) {
						if (err) {
							callback(err);
						} else {
							project = wrapProject(name, project);
							projects[name] = project;
							callback(null, project.reopenProject());
						}
						dlock.unlock();
					});
				}
			});
		}

		function closeDatabase (callback) {
			ASSERT(typeof callback === "function");

			dlock.lock(function () {
				var n;
				for (n in projects) {
					projects[n].abort();
				}
				projects = {};
				callback(null);
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
			var refcount = 0;

			var missing = {};
			var backup = {};
			var cache = {};
			var cacheSize = 0;

			function cacheInsert (key, obj) {
				ASSERT(typeof cache[key] === "undefined" && obj[ID_NAME] === key);

				cache[key] = obj;
				if (++cacheSize >= options.size) {
					backup = cache;
					cache = {};
					cacheSize = 0;
				}
			}

			var loadObject = function (key, callback) {
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
			};

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
				ASSERT(typeof callback === "function");

				if (project !== null) {
					var p = project;
					project = null;
					delete projects[name];

					var key, err = new Error("cache closed");
					for (key in missing) {
						var callbacks = missing[key];

						var cb;
						while ((cb = callbacks.pop())) {
							cb(err);
						}
					}

					missing = {};
					backup = {};
					cache = {};
					cacheSize = 0;

					p.closeProject(callback);
				} else {
					callback(null);
				}
			}

			function closeProject (callback) {
				ASSERT(typeof callback === "function" && refcount >= 1);

				if (--refcount === 0) {
					abortProject(callback);
				} else {
					callback(null);
				}
			}

			var deleteProject = function () {
				var key;
				for (key in missing) {
					var callbacks = missing[key];

					var cb;
					while ((cb = callbacks.pop())) {
						cb(null, null);
					}
				}

				missing = {};
				backup = {};
				cache = {};
				cacheSize = 0;
			};

			function reopenProject (callback) {
				ASSERT(project !== null && refcount >= 0);

				++refcount;
				callback(null, {
					fsyncDatabase: project.fsyncDatabase,
					getDatabaseStatus: project.getDatabaseStatus,
					closeProject: closeProject,
					loadObject: loadObject,
					insertObject: insertObject,
					findHash: project.findHash,
					dumpObjects: project.dumpObjects,
					getBranchNames: project.getBranchNames,
					getBranchHash: project.getBranchHash,
					setBranchHash: project.setBranchHash
				});
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
			openProject: openProject,
			deleteProject: deleteProject,
			ID_NAME: ID_NAME
		};
	};

	return Database;
});
