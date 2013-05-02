/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "util/assert", "storage/mongo", "storage/cache", "core/tasync", "core/core" ], function (ASSERT, Mongo, Cache, TASYNC, Core) {

	function getParameters (option, argv) {
		ASSERT(option.charAt(0) !== "-");

		var option1 = "-" + option;
		var option2 = "--" + option;
		argv = argv || process.argv.slice(2);

		var i, j;
		for (i = 0; i < argv.length; ++i) {
			if (argv[i] === option1 || argv[i] === option2) {
				for (j = i + 1; j < argv.length && argv[j].charAt(0) !== "-"; ++j) {
				}
				return argv.slice(i + 1, j);
			}
		}

		return null;
	}

	// --- database

	var database;

	function openDatabase (argv) {
		var database;

		if (false) {

		} else {
			var params = getParameters("mongo") || [];

			var opt = {
				database: params[0] || "webgme",
				host: params[1] || "localhost",
				port: params[2]
			};

			console.log("Opening mongo database " + opt.database + " on " + opt.host + (opt.port ? ":" + opt.port : ""));
			database = new Cache(new Mongo(opt), {});
		}

		database.openDatabase = TASYNC.wrap(database.openDatabase);
		database.openProject = TASYNC.wrap(database.openProject);
		database.closeDatabase = TASYNC.wrap(database.closeDatabase);

		return TASYNC.call(openDatabase2, database, database.openDatabase());
	}

	function openDatabase2 (d) {
		database = d;
	}

	function closeDatabase () {
		if (database) {
			console.log("Closing database");

			var d = database;
			database = null;

			return d.closeDatabase();
		}
	}

	// --- project

	var project, core;

	function openProject (argv) {
		ASSERT(database);

		var params = getParameters("proj") || [];
		var name = params[0] || "test";

		console.log("Opening project " + name);

		TASYNC.call(openProject2, database.openProject(name));
	}

	function openProject2 (p) {
		p.closeProject = TASYNC.wrap(p.closeProject);
		p.dumpObjects = TASYNC.wrap(p.dumpObjects);
		p.loadObject = TASYNC.wrap(p.loadObject);
		p.insertObject = TASYNC.wrap(p.insertObject);
		p.findHash = TASYNC.wrap(p.findHash);
		p.setBranchHash = TASYNC.wrap(p.setBranchHash);
		p.getBranchHash = TASYNC.wrap(p.getBranchHash);

		project = p;

		core = new Core(project, {
			autopersist: true
		});

		core.persist = TASYNC.wrap(core.persist);
		core.loadByPath = TASYNC.wrap(core.loadByPath);
		core.loadRoot = TASYNC.wrap(core.loadRoot);
		core.loadChildren = TASYNC.wrap(core.loadChildren);
	}

	function closeProject () {
		if (project) {
			console.log("Closing project");

			var p = project;
			project = null;
			core = null;

			return p.closeProject();
		}
	}

	function getProject () {
		return project;
	}

	// --- progress

	var progress;

	function setProgress (func) {
		if (progress) {
			clearInterval(progress);
		}

		if (func) {
			progress = setInterval(func, 2000);
		}
	}

	// --- export

	return {
		getParameters: getParameters,
		openDatabase: openDatabase,
		closeDatabase: closeDatabase,
		openProject: openProject,
		closeProject: closeProject,
		getProject: getProject,
		setProgress: setProgress
	};
});
