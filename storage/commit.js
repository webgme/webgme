/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/sha1", "util/canon" ], function (ASSERT, SHA1, CANON) {
	"use strict";
	var HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$");

	function Database (_database) {
		ASSERT(typeof _database === "object");

		function openProject (projectName, callback) {

			var _project = null;
			_database.openProject(projectName, function (err, proj) {
				if (!err && proj) {
					_project = proj;
					callback(null, {
						fsyncDatabase: _project.fsyncDatabase,
						closeProject: _project.closeProject,
						loadObject: _project.loadObject,
						insertObject: _project.insertObject,
						findHash: _project.findHash,
						dumpObjects: _project.dumpObjects,
						getBranchNames: _project.getBranchNames,
						getBranchHash: _project.getBranchHash,
						setBranchHash: _project.setBranchHash,
						getCommits: _project.getCommits,
						makeCommit: makeCommit,
						ID_NAME: _project.ID_NAME
					});
				} else {
					callback(err, proj);
				}
			});

			function makeCommit (parents, roothash, msg, callback) {
				ASSERT(HASH_REGEXP.test(roothash));
				ASSERT(typeof callback === 'function');

				parents = parents || [];
				msg = msg || "n/a";

				var commitObj = {
					root: roothash,
					parents: parents,
					updater: [ 'TODO' ],
					time: (new Date()).getTime(),
					message: msg,
					type: "commit"
				};

				var id = '#' + SHA1(CANON.stringify(commitObj));
				commitObj[_project.ID_NAME] = id;

				_project.insertObject(commitObj, function (err) {
					if (err) {
						callback(err);
					} else {
						callback(null, id);
					}
				});

				return id;
			}
		}

		return {
			openDatabase: _database.openDatabase,
			closeDatabase: _database.closeDatabase,
			fsyncDatabase: _database.fsyncDatabase,
			getProjectNames: _database.getProjectNames,
            getAllowedProjectNames: _database.getAllowedProjectNames,
			getDatabaseStatus: _database.getDatabaseStatus,
			openProject: openProject,
			deleteProject: _database.deleteProject,
            authenticate: _database.authenticate
		};
	}

	return Database;
});
