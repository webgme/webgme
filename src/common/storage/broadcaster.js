define(["util/assert"], function (ASSERT) {
    "use strict";

    var Database = function (database, options) {
        var gmeConfig = options.globConf;
        ASSERT(typeof database === "object" && typeof gmeConfig === "object");

        function openProject(name, callback) {
            var branches = {},
                project,
                getBranchHash = function getBranchHash(name, oldhash, callback) {
                    ASSERT(typeof name === "string" && typeof callback === "function");
                    ASSERT(typeof oldhash === "string" || oldhash === null);

                    var tag = name + "@" + oldhash;
                    var branch = branches[tag];
                    if (typeof branch === "undefined") {
                        branch = [callback];
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
                },
                setBranchHash = function setBranchHash(name, oldhash, newhash, callback) {
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
                },
                closeProject = function closeProject(callback) {
                    var callbacks,
                        key,
                        cb,
                        err = new Error("project closed");
                    for (key in branches) {
                        callbacks = branches[key];
                        while ((cb = callbacks.pop())) {
                            cb(err);
                        }
                    }

                    branches = {};

                    project.closeProject(callback);
                };

            database.openProject(name, function (err, proj) {
                project = proj;
                var broadcasterProject = {};
                for (var key in project) {
                    if (project.hasOwnProperty(key)) {
                        broadcasterProject[key] = project[key];
                    }
                }
                broadcasterProject.getBranchHash = getBranchHash;
                broadcasterProject.setBranchHash = setBranchHash;
                broadcasterProject.closeProject = closeProject;

                callback(null, broadcasterProject);
            });
        }

        return {
            openDatabase: database.openDatabase,
            closeDatabase: database.closeDatabase,
            fsyncDatabase: database.fsyncDatabase,
            getDatabaseStatus: database.getDatabaseStatus,
            getProjectNames: database.getProjectNames,
            getAllowedProjectNames: database.getAllowedProjectNames,
            getAuthorizationInfo: database.getAuthorizationInfo,
            openProject: openProject,
            deleteProject: database.deleteProject,
            simpleRequest: database.simpleRequest,
            simpleResult: database.simpleResult,
            simpleQuery: database.simpleQuery,
            getNextServerEvent: database.getNextServerEvent,
            getToken: database.getToken
        };
    };

    return Database;
});
