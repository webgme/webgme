/*
 * @author ksmyth / https://github.com/ksmyth
 */

define([], function () {
    "use strict";

    function Database(_database) {
        function fsyncDatabase(callback) {
            _database.fsyncDatabase(callback);
        }

        function deleteProject(project, callback) {
            _database.deleteProject(project, callback);
        }

        function openProject(projectName, callback) {
            var project = null;

            var Heap = require('heap');
            var writeOps = new Heap();
            var numWriteOps = 0;
            var fsyncs = [];

            var doWriteOp = function doWriteOp(this_, fn /*, ...*/) {
                var args = Array.prototype.slice.call(arguments, 2);
                var callback = args[args.length - 1];
                args[args.length - 1] = function () {
                    var writeOp,
                        i,
                        pendingFsyncs = [],
                        numOldestWriteOp;
                    op.numWriteOps = 0;
                    writeOps.updateItem(op);
                    writeOp = writeOps.pop();

                    callback.apply(this, arguments);

                    if (writeOps.size()) {
                        numOldestWriteOp = writeOps.peek().numWriteOps;
                    } else {
                        numOldestWriteOp = Number.MAX_VALUE;
                    }
                    for (i = 0; i < fsyncs.length; i++) {
                        if (fsyncs[i].numWriteOps < numOldestWriteOp) {
                            fsyncs[i].cb();
                        } else {
                            pendingFsyncs.push(fsyncs[i]);
                        }
                    }
                    fsyncs = pendingFsyncs;
                }
                var op = {numWriteOps: ++numWriteOps};
                writeOps.push(op);
                this_[fn].apply(this_, args);
            }

            function fsyncDatabase(callback) {
                if (writeOps.size()) {
                    fsyncs.push({numWriteOps: numWriteOps, cb: callback});
                } else {
                    callback();
                }
            }

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
                        return waiters.length;
                    }
                };
            };
            var setBranchLocks = {};

            function setBranchHash(branch, oldhash, newhash, callback) {
                var oldcb = callback;
                callback = function () {
                    oldcb.apply(this, arguments);
                    var branchLocksSize = setBranchLocks[branch].unlock();
                    if (branchLocksSize === 0) {
                        delete setBranchLocks[branch];
                    }
                };
                setBranchLocks[branch] = setBranchLocks[branch] || new Lock();
                setBranchLocks[branch].lock(function () {
                    return doWriteOp(project, 'setBranchHash', branch, oldhash, newhash, callback);
                    if (writeOps.size()) {
                        fsyncs.push({
                            numWriteOps: numWriteOps, cb: function () {
                                //project.setBranchHash(branch, oldhash, newhash, callback);
                                doWriteOp(project, 'setBranchHash', branch, oldhash, newhash, callback);
                            }
                        });
                    } else {
                        //project.setBranchHash(branch, oldhash, newhash, callback);
                        doWriteOp(project, 'setBranchHash', branch, oldhash, newhash, callback);
                    }
                });
            }


            _database.openProject(projectName, function (err, proj) {
                if (!err && proj) {
                    project = proj;
                    callback(null, {
                        fsyncDatabase: fsyncDatabase,
                        closeProject: closeProject,
                        loadObject: project.loadObject,
                        getInfo: project.getInfo,
                        setInfo: setInfo,
                        insertObject: insertObject,
                        findHash: project.findHash,
                        dumpObjects: project.dumpObjects,
                        getBranchNames: project.getBranchNames,
                        getBranchHash: project.getBranchHash,
                        setBranchHash: project.setBranchHash,
                        getCommits: project.getCommits,
                        makeCommit: project.makeCommit,
                        setUser: project.setUser,
                        getCommonAncestorCommit: project.getCommonAncestorCommit,
                        ID_NAME: project.ID_NAME
                    });
                } else {
                    callback(err, proj);
                }
            });

            function closeProject(callback) {
                project.closeProject(callback);
            }

            function insertObject(object, callback) {
                doWriteOp(project, 'insertObject', object, callback);
            }

            function setInfo(info, callback) {
                doWriteOp(project, 'setInfo', info, callback);
            }
        }

        return {
            openDatabase: _database.openDatabase,
            closeDatabase: _database.closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getProjectNames: _database.getProjectNames,
            getAllowedProjectNames: _database.getAllowedProjectNames,
            getAuthorizationInfo: _database.getAuthorizationInfo,
            getDatabaseStatus: _database.getDatabaseStatus,
            openProject: openProject,
            deleteProject: deleteProject,
            simpleRequest: _database.simpleRequest,
            simpleResult: _database.simpleResult,
            simpleQuery: _database.simpleQuery,
            getNextServerEvent: _database.getNextServerEvent,
            getToken: _database.getToken
        };
    }

    return Database;
});
