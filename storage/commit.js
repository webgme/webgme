/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/zssha1", "util/canon" ], function (ASSERT, SHA1, CANON) {
	"use strict";
	var HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$");
    var zsSHA = new SHA1();

	function Database (_database,_options) {
        _options = _options || {};
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
                        setUser: setUser,
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
					updater: [ _options.user ],
					time: (new Date()).getTime(),
					message: msg,
					type: "commit"
				};

				var id = '#' + zsSHA.getHash(CANON.stringify(commitObj));
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

            function setUser (userId){
                if(typeof userId === 'string'){
                    _options.user = userId;
                };
            }
		}

		return {
			openDatabase: _database.openDatabase,
			closeDatabase: _database.closeDatabase,
			fsyncDatabase: _database.fsyncDatabase,
			getProjectNames: _database.getProjectNames,
            getAllowedProjectNames: _database.getAllowedProjectNames,
            getAuthorizationInfo: _database.getAuthorizationInfo,
			getDatabaseStatus: _database.getDatabaseStatus,
			openProject: openProject,
			deleteProject: _database.deleteProject,
            simpleRequest: _database.simpleRequest,
            simpleResult: _database.simpleResult,
            getNextServerEvent: _database.getNextServerEvent,
            getToken: _database.getToken
		};
	}

	return Database;
});
