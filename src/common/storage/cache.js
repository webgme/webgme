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
        //TODO: Add this to the default configuration
        options.cache = options.cache || 2000;

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
			var branches = {};
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
			if (typeof WebGMEGlobal !== 'undefined' && typeof WebGMEGlobal.getConfig !== 'undefined' && !WebGMEGlobal.getConfig().debug) {
				deepFreeze = function () { };
			}

			function cacheInsert (key, obj) {
				ASSERT(typeof cache[key] === "undefined" && obj[ID_NAME] === key);

				deepFreeze(obj);
				cache[key] = obj;

				if (++cacheSize >= gmeConfig.cache) {
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

				for (key in branches) {
					callbacks = branches[key];
					while ((cb = callbacks.pop())) {
						cb(err);
					}
				}

				branches = {};
				missing = {};
				backup = {};
				cache = {};
				cacheSize = 0;
			}

			function getBranchHash (name, oldhash, callback) {
				ASSERT(typeof name === "string" && typeof callback === "function");
				ASSERT(typeof oldhash === "string" || oldhash === null);

				var tag = name + "@" + oldhash;
				var branch = branches[tag];
				if (typeof branch === "undefined") {
					branch = [ callback ];
					branches[tag] = branch;

					project.getBranchHash(name, oldhash, function (err, newhash, forkedhash) {
						if (branches[tag] === branch) {
							var cb;
							delete branches[tag];

							while ((cb = branch.pop())) {
								cb(err, newhash, forkedhash);
							}
						}
					});
				} else {
					branch.push(callback);
				}
			}

			function setBranchHash (name, oldhash, newhash, callback) {
				ASSERT(typeof name === "string" && typeof oldhash === "string");
				ASSERT(typeof newhash === "string" && typeof callback === "function");

				project.setBranchHash(name, oldhash, newhash, function (err) {
					if (!err) {
						var prefix = name + "@", tag;
						for (tag in branches) {
							if (tag.substr(0, prefix.length) === prefix) {
								var cb, branch = branches[tag];
								delete branches[tag];

								while ((cb = branch.pop())) {
									cb(err, newhash, null);
								}
							}
						}
					}

					callback(err);
				});
			}

			function reopenProject (callback) {
				ASSERT(project !== null && refcount >= 0 && typeof callback === "function");

                var cacheProject = {};
                for (var key in project) {
                    if (project.hasOwnProperty(key)) {
                        cacheProject[key] = project[key];
                    }
                }
                if (options.cache !== 0) {
                    cacheProject.loadObject = loadObject;
                    cacheProject.insertObject = insertObject;
                }
                cacheProject.getBranchHash = getBranchHash;
                cacheProject.setBranchHash = setBranchHash;
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
