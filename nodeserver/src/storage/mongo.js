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

	function openDatabase (options, callback) {
		ASSERT(typeof options === "object" && typeof callback === "function");

		options.host = options.host || "localhost";
		options.port = options.port || 27017;
		options.database = options.database || "webgme";
		options.timeout = options.timeout || 1000000;

		var database = new MONGODB.Db(options.database, new MONGODB.Server(options.host,
		options.port), {
			w: 0
		});

		database.open(function (err) {
			if( err ) {
				database.close();
				database = null;
				callback(err);
			}
			else {
				callback(null, {
					closeDatabase: closeDatabase,
					fsyncDatabase: fsyncDatabase,
					getProjectNames: getProjectNames,
					openProject: openProject,
					deleteProject: deleteProject
				});
			}
		});

		function closeDatabase (callback) {
			ASSERT(database !== null);

			fsyncDatabase(function () {
				database.close(function () {
					database = null;
					if( typeof callback === "function" ) {
						callback();
					}
				});
			});
		}

		function fsyncDatabase (callback) {
			ASSERT(database !== null && typeof callback === "function");

			var error = null;
			var synced = 0;

			function fsync2 (conn) {
				database.lastError({
					fsync: true
				}, {
					connection: conn
				}, function (err, res) {
					error = error || err || res[0].err;
					if( ++synced === conns.length ) {
						callback(error);
					}
				});
			}

			var conns = database.serverConfig.allRawConnections();
			ASSERT(Array.isArray(conns) && conns.length >= 1);

			for( var i = 0; i < conns.length; ++i ) {
				fsync2(conns[i]);
			}
		}

		function getDatabaseStatus (callback) {
			ASSERT(typeof callback === "function");

			if( database !== null ) {
				database.command({
					ping: 1
				}, function (err) {
					if( err ) {
						callback("mongodb server unreachable");
					}
					else {
						setTimeout(callback, options.timeout, null, null);
					}
				});
			}
			else {
				callback("mongodb connection closed");
			}
		}

		function getProjectNames (callback) {
			ASSERT(typeof callback === "function");

			database.collectionNames(function (err, collections) {
				if( err ) {
					callback(err);
				}
				else {
					var names = [];
					for( var i = 0; i < collections.length; i++ ) {
						var p = collections[i].name.indexOf(".");
						var n = collections[i].name.substring(p + 1);
						if( n.indexOf('system') === -1 && n.indexOf('.') === -1 ) {
							names.push(n);
						}
					}
					callback(null, names);
				}
			});
		}

		function deleteProject (project, callback) {
			ASSERT(typeof project === "string" && typeof callback === "function");
			ASSERT(PROJECT_REGEXP.find(project));

			database.dropCollection(project, callback);
		}

		function openProject (project, callback) {
			ASSERT(database !== null && typeof callback === "function");
			ASSERT(typeof project === "string" && PROJECT_REGEXP.find(project));

			var collection = null;

			database.collection(project, function (err, result) {
				if( err ) {
					callback(err);
				}
				else {
					collection = result;
					callback(null, {
						fsyncDatabase: fsyncDatabase,
						getDatabaseStatus: getDatabaseStatus,
						closeProject: closeProject,
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

				if( !HASH_REGEXP.test(beginning) ) {
					callback(new Error("hash " + beginning + " not valid"));
				}
				else {
					collection.find({
						_id: {
							$regex: "^" + beginning
						}
					}, {
						limit: 2
					}).toArray(function (err, docs) {
						if( err ) {
							callback(err);
						}
						else if( docs.length === 0 ) {
							callback(new Error("hash " + beginning + " not found"));
						}
						else if( docs.length !== 1 ) {
							callback(new Error("hash " + beginning + " not unique"));
						}
						else {
							callback(null, docs[0]._id);
						}
					});
				}
			}

			function dumpObjects (callback) {
				ASSERT(typeof callback === "function");

				collection.find().each(function (err, item) {
					if( err || item === null ) {
						callback(err);
					}
					else {
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
					if( err ) {
						callback(err);
					}
					else {
						var branches = {};
						for( var i = 0; i < docs.length; ++i ) {
							branches[docs[i]._id] = docs[i].hash;
						}
					}
				});
			}

			function getBranchHash (branch, oldhash, callback) {
				ASSERT(typeof branch === "string" && BRANCH_REGEXP.find(branch));
				ASSERT(typeof oldhash === "string" && HASH_REGEXP.find(oldhash));
				ASSERT(typeof callback === "function");

			}

			function setBranchHash (branch, oldhash, newhash, callback) {
				ASSERT(typeof branch === "string" && BRANCH_REGEXP.find(branch));
				ASSERT(typeof oldhash === "string" && HASH_REGEXP.find(oldhash));
				ASSERT(typeof newhash === "string" && HASH_REGEXP.find(newhash));

				ASSERT(typeof callback === "function");
			}
		}
	}

	return openDatabase;
});
