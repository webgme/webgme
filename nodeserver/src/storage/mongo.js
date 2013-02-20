/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "mongodb", "util/assert" ], function (MONGODB, ASSERT) {
	"use strict";

	var PROJECT_REGEXP = new RegExp("^[0-9a-zA-Z_]*$");
	var HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$");
	var BRANCH_REGEXP = new RegExp("^\\*[0-9a-zA-Z_]*$");

	var STATUS_CLOSED = "mongodb closed";
	var STATUS_UNREACHABLE = "mongodb unreachable";
	var STATUS_CONNECTED = "connected";

	function openDatabase (options, callback) {
		ASSERT(typeof options === "object" && typeof callback === "function");

		options.host = options.host || "localhost";
		options.port = options.port || 27017;
		options.database = options.database || "webgme";
		options.timeout = options.timeout || 1000000;

		var branches = {};

		var database = new MONGODB.Db(options.database, new MONGODB.Server(options.host, options.port), {
			w: 1
		});

		database.open(function (err) {
			if (err) {
				database.close();
				database = null;
				callback(err);
			} else {
				callback(null, {
					closeDatabase: closeDatabase,
					fsyncDatabase: fsyncDatabase,
                    getDatabaseStatus: getDatabaseStatus,
					getProjectNames: getProjectNames,
					openProject: openProject,
					deleteProject: deleteProject
				});
			}
		});

		function closeDatabase (callback) {
			ASSERT(typeof callback === "function");

			if (database !== null) {
				fsyncDatabase(function () {
					database.close(function () {
						database = null;
						callback();
					});
				});
			} else {
				callback();
			}
		}

		function fsyncDatabase (callback) {
			ASSERT(typeof callback === "function");

			var error = null;
			var synced = 0;

			function fsyncConnection (conn) {
				database.lastError({
					fsync: true
				}, {
					connection: conn
				}, function (err, res) {
					error = error || err || res[0].err;
					if (++synced === conns.length) {
						callback(error);
					}
				});
			}

			var conns = database.serverConfig.allRawConnections();
			ASSERT(Array.isArray(conns) && conns.length >= 1);

			for ( var i = 0; i < conns.length; ++i) {
				fsyncConnection(conns[i]);
			}
		}

		function getDatabaseStatus (oldstatus, callback) {
			ASSERT(oldstatus === null || typeof oldstatus === "string");
			ASSERT(typeof callback === "function");

			if (database === null) {
				reportStatus(oldstatus, STATUS_CLOSED, callback);
			} else {
				database.command({
					ping: 1
				}, function (err) {
					reportStatus(oldstatus, err ? STATUS_UNREACHABLE : STATUS_CONNECTED, callback);
				});
			}
		}

		function reportStatus (oldstatus, newstatus, callback) {
			if (oldstatus !== newstatus) {
				callback(null, newstatus);
			} else {
				setTimeout(callback, options.timeout, null, newstatus);
			}
		}

		function getProjectNames (callback) {
			ASSERT(typeof callback === "function");

			database.collectionNames(function (err, collections) {
				if (err) {
					callback(err);
				} else {
					var names = [];
					for ( var i = 0; i < collections.length; i++) {
						var p = collections[i].name.indexOf(".");
						var n = collections[i].name.substring(p + 1);
						if (n.indexOf('system') === -1 && n.indexOf('.') === -1) {
							names.push(n);
						}
					}
					callback(null, names);
				}
			});
		}

		function deleteProject (project, callback) {
			ASSERT(typeof project === "string" && typeof callback === "function");
			ASSERT(PROJECT_REGEXP.test(project));

			database.dropCollection(project, callback);
		}

		function openProject (project, callback) {
			ASSERT(database !== null && typeof callback === "function");
			ASSERT(typeof project === "string" && PROJECT_REGEXP.test(project));

			var collection = null;

			database.collection(project, function (err, result) {
				if (err) {
					callback(err);
				} else {
					collection = result;
					callback(null, {
						fsyncDatabase: fsyncDatabase,
						getDatabaseStatus: getDatabaseStatus,
						loadObject: loadObject,
						insertObject: insertObject,
						findHash: findHash,
						dumpObjects: dumpObjects,
						getBranchNames: getBranchNames,
						getBranchHash: getBranchHash,
						setBranchHash: setBranchHash
					});
				}
			});

			function closeProject (callback) {
				ASSERT(typeof callback === "function");

				collection = null;
				callback(null);
			}

			function loadObject (hash, callback) {
				ASSERT(typeof hash === "string" && HASH_REGEXP.test(hash));

				collection.findOne({
					_id: hash
				}, callback);
			}

			function insertObject (object, callback) {
				ASSERT(object !== null && typeof object === "object");
				ASSERT(typeof object._id === "string" && HASH_REGEXP.test(object._id));

				collection.insert(object, callback);
			}

			function findHash (beginning, callback) {
				ASSERT(typeof beginning === "string" && typeof callback === "function");

				if (!HASH_REGEXP.test(beginning)) {
					callback(new Error("hash " + beginning + " not valid"));
				} else {
					collection.find({
						_id: {
							$regex: "^" + beginning
						}
					}, {
						limit: 2
					}).toArray(function (err, docs) {
						if (err) {
							callback(err);
						} else if (docs.length === 0) {
							callback(new Error("hash " + beginning + " not found"));
						} else if (docs.length !== 1) {
							callback(new Error("hash " + beginning + " not unique"));
						} else {
							callback(null, docs[0]._id);
						}
					});
				}
			}

			function dumpObjects (callback) {
				ASSERT(typeof callback === "function");

				collection.find().each(function (err, item) {
					if (err || item === null) {
						callback(err);
					} else {
						console.log(item);
					}
				});
			}

			function getBranchNames (callback) {
				ASSERT(typeof callback === "function");

				collection.find({
					_id: {
						$regex: "^\\*"
					}
				}).toArray(function (err, docs) {
					if (err) {
						callback(err);
					} else {
						var branches = {};
						for ( var i = 0; i < docs.length; ++i) {
							branches[docs[i]._id] = docs[i].hash;
						}
					}
				});
			}

			function getBranchObj (branch) {
				ASSERT(typeof branch === "string" && BRANCH_REGEXP.test(branch));

				var name = project + "/" + branch;
				if (typeof branches[name] === "object") {
					return branches[name];
				}
				else {
					
				}
			}

			function getBranchHash (branch, oldhash, callback) {
				ASSERT(typeof branch === "string" && BRANCH_REGEXP.test(branch));
				ASSERT(typeof oldhash === "string" && HASH_REGEXP.test(oldhash));
				ASSERT(typeof callback === "function");

			}

			function setBranchHash (branch, oldhash, newhash, callback) {
				ASSERT(typeof branch === "string" && BRANCH_REGEXP.test(branch));
				ASSERT(typeof oldhash === "string" && (oldhash === "" || HASH_REGEXP.test(oldhash)));
				ASSERT(typeof newhash === "string" && HASH_REGEXP.test(newhash));
				ASSERT(typeof callback === "function");

				if (oldhash === "") {
					collection.insert({
						_id: branch,
						hash: newhash
					}, {
						w: 1
					});
				} else if (newhash === "") {
					collection.remove({
						_id: branch,
						hash: oldhash
					}, {
						w: 1
					});
				} else {
					collection.update({
						_id: branch,
						hash: oldhash
					}, {
						$set: {
							hash: newhash
						}
					}, {
						w: 1
					});
				}

				var n = project + "/" + branch;
				var b = branches[n];
				if (typeof b === "object") {

				}
			}
		}
	}

	return openDatabase;
});
