//jshint ignore: start
/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */
//TODO this is an outdated file, will be updated and maintained in the future.
define(["common/util/assert", "common/storage/mongo", "common/storage/cache", "common/storage/commit", "common/core/tasync", "common/util/sax", "fs", "bin/getconfig", "common/storage/client", "common/core/core"], function (ASSERT, Mongo, Cache, Commit, TASYNC, SAX, FS, CONFIG, Client, Core) {
    throw new Error('TODO this is an outdated file, will be updated and maintained in the future.');
    function getParameters(option) {
        ASSERT(option === null || typeof option === "string" && option.charAt(0) !== "-");

        var i, j, argv = process.argv.slice(2);

        if (option === null) {
            for (i = 0; i < argv.length && argv[i].charAt(0) !== "-"; ++i) {
            }
            return argv.slice(0, i);
        }

        var option1 = "-" + option;
        var option2 = "--" + option;

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

    function openDatabase() {
        var paramsMongo = getParameters("mongo");
        var paramsSIO = getParameters("socketio");
        var isSIO = paramsMongo === null && paramsSIO !== null && paramsSIO.length > 0;
        paramsMongo = paramsMongo || [];
        paramsSIO = paramsSIO || [];

        var opt = {
            database: paramsMongo[0] || CONFIG.mongodatabase || "webgme",
            host: paramsMongo[1] || paramsSIO[0] || CONFIG.mongoip || "localhost",
            port: paramsMongo[2] || paramsSIO[1] || CONFIG.mongoport || 27017
        };

        var database = null;
        if (isSIO) {
            opt.type = "node";
            console.log("Opening database through socket.io connection on " + opt.host + (opt.port ? ":" + opt.port : ""));
            database = new Commit(new Cache(new Client(opt), {}));
        } else {
            console.log("Opening mongo database " + opt.database + " on " + opt.host + (opt.port ? ":" + opt.port : ""));
            database = new Commit(new Cache(new Mongo(opt), {}));
        }

        database.openDatabase = TASYNC.wrap(database.openDatabase);
        database.openProject = TASYNC.wrap(database.openProject);
        database.closeDatabase = TASYNC.wrap(database.closeDatabase);
        database.getProjectNames = TASYNC.wrap(database.getProjectNames);

        return TASYNC.call(openDatabase2, database, database.openDatabase());
    }

    function openDatabase2(d) {
        database = d;
    }

    function closeDatabase() {
        if (database) {
            console.log("Closing database");

            var d = database;
            database = null;

            return d.closeDatabase();
        }
    }

    function getDatabase() {
        return database;
    }

    // --- project

    var project, core;

    function openProject(overRideName) {
        ASSERT(database);

        var params = getParameters("proj") || [];
        var name = params[0] || "test";
        if (typeof overRideName === 'string') {
            name = overRideName;
        }

        console.log("Opening project " + name);

        TASYNC.call(openProject2, database.openProject(name));
    }

    function openProject2(p) {
        p.closeProject = TASYNC.wrap(p.closeProject);
        p.dumpObjects = TASYNC.wrap(p.dumpObjects);
        p.loadObject = TASYNC.wrap(p.loadObject);
        p.insertObject = TASYNC.wrap(p.insertObject);
        p.findHash = TASYNC.wrap(p.findHash);
        p.getBranchNames = TASYNC.wrap(p.getBranchNames);
        p.setBranchHash = TASYNC.wrap(p.setBranchHash);
        p.getBranchHash = TASYNC.wrap(p.getBranchHash);
        p.makeCommit = TASYNC.wrap(p.makeCommit);

        project = p;

        core = Core(project, {autopersist: true, usertype: 'tasync'});
    }

    function closeProject() {
        if (project) {
            console.log("Closing project");

            var p = project;
            project = null;
            core = null;

            return p.closeProject();
        }
    }

    function getProject() {
        return project;
    }

    function getCore() {
        return core;
    }

    // --- progress

    var progress;

    function setProgress(func) {
        if (progress) {
            clearInterval(progress);
        }

        if (func) {
            progress = setInterval(func, 2000);
        }
    }

    // --- sax parsing

    var saxParse = TASYNC.wrap(function (xmlfile, handler, callback) {
        ASSERT(typeof handler.opentag === "function");
        ASSERT(typeof handler.closetag === "function");
        ASSERT(typeof handler.text === "function");
        ASSERT(typeof handler.getstat === "function");

        var parser = SAX.createStream(true, {
            trim: true
        });

        parser.on("opentag", handler.opentag);
        parser.on("closetag", handler.closetag);
        parser.on("text", handler.text);

        parser.on("error", function (error) {
            setProgress(null);
            callback(error);
        });

        parser.on("end", function () {
            console.log("Parsing done");
            setProgress(null);
            callback(null);
        });

        var stream = FS.createReadStream(xmlfile);

        stream.on("error", function (err) {
            setProgress(null);
            callback(new Error(err.code === "ENOENT" ? "File not found: " + xmlfile : "Unknown file error: " + JSON.stringify(err)));
        });

        stream.on("open", function () {
            console.log("Parsing " + xmlfile + " ...");
            stream.pipe(parser);
        });

        setProgress(function () {
            var stat = handler.getstat();
            console.log("  at line " + parser._parser.line + (typeof stat === "string" ? " (" + stat + ")" : ""));
        });
    });

    // --- export

    return {
        getParameters: getParameters,
        openDatabase: openDatabase,
        closeDatabase: closeDatabase,
        getDatabase: getDatabase,
        openProject: openProject,
        closeProject: closeProject,
        getProject: getProject,
        getCore: getCore,
        setProgress: setProgress,
        saxParse: saxParse
    };
});
