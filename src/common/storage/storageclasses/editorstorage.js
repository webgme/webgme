/*globals define*/
/*jshint node:true*/
/**
 * This class implements the functionality needed to edit a model in a specific project and branch in a
 * collaborative fashion.
 *
 * It keeps a state of the open projects which in turn keeps track of the open branches.
 *
 * Each project is associated with a project-cache which is shared amongst the branches. So switching
 * between branches is (potentially) an operation that does not require lots of server round-trips.
 *
 * It is possible to have multiple projects open and multiple branches within each project. However
 * one instance of a storage can only hold a single instance of a project (or branch within a project).
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/storageclasses/objectloaders',
    'common/storage/constants',
    'common/storage/project/project',
    'common/util/assert',
    'common/util/key'
], function (StorageObjectLoaders, CONSTANTS, Project, ASSERT, GENKEY) {
    'use strict';

    function EditorStorage(webSocket, mainLogger, gmeConfig) {
        var self = this,
            logger = mainLogger.fork('storage'),
            connected = false,
            projects = {};

        this.logger = logger;
        StorageObjectLoaders.call(this, webSocket, mainLogger, gmeConfig);

        this.open = function (networkHandler) {
            webSocket.connect(function (err, connectionState) {
                if (err) {
                    logger.error(err);
                    networkHandler(CONSTANTS.ERROR);
                } else if (connectionState === CONSTANTS.CONNECTED) {
                    connected = true;
                    networkHandler(connectionState);
                } else if (connectionState === CONSTANTS.RECONNECTED) {
                    self._rejoinWatcherRooms();
                    self._rejoinBranchRooms();
                    connected = true;
                    networkHandler(connectionState);
                } else if (connectionState === CONSTANTS.DISCONNECTED) {
                    connected = false;
                    networkHandler(connectionState);
                } else {
                    logger.error('unexpected connection state');
                    networkHandler(CONSTANTS.ERROR);
                }
            });
        };

        this.close = function () {
            webSocket.disconnect();
            webSocket.removeAllEventListeners();
        };

        this.openProject = function (projectName, callback) {
            var data = {
                projectName: projectName
            };
            webSocket.openProject(data, function (err, branches) {
                var project = new Project(projectName, self, logger, gmeConfig);
                projects[projectName] = project;
                callback(err, project, branches);
            });
        };

        this.closeProject = function (projectName, callback) {
            var project = projects[projectName],
                branches;
            logger.debug('closeProject', projectName);
            if (project) {
                branches = Object.keys(project[projectName].branches);
                if (branches.length > 0) {
                    //TODO: Determine the behaviour here.. Currently will raise errors and not close branches.
                    logger.error('Branches still open for project', projectName, branches);
                    callback('Branches still open for project');
                }
            } else {
                logger.error('Project is not open ', projectName);
            }
            delete projects[projectName];
            webSocket.closeProject({projectName: projectName}, callback);
        };

        this.openBranch = function (projectName, branchName, updateHandler, commitHandler, callback) {
            ASSERT(projects.hasOwnProperty(projectName), 'Project not opened: ' + projectName);
            var self = this,
                project = projects[projectName],
                data = {
                    projectName: projectName,
                    branchName: branchName
                };
            webSocket.openBranch(data, function (err, latestCommit) {
                var i,
                    branchHash = latestCommit.commitObject[CONSTANTS.MONGO_ID],
                    branch = project.getBranch(branchName);

                branch.updateHashes(branchHash, branchHash);

                branch.commitHandler = commitHandler;
                branch.localUpdateHandler = updateHandler;
                branch.updateHandler = function (_ws, updateData) {
                    var j,
                        originHash = updateData.commitObject[CONSTANTS.MONGO_ID];
                    logger.debug('updateHandler invoked for project, branch', projectName, branchName);
                    for (j = 0; j < updateData.coreObjects.length; j += 1) {
                        project.insertObject(updateData.coreObjects[j]);
                    }
                    if (branch.getCommitQueue().length === 0) {
                        logger.debug('commitQueue is empty localHash will point to new originHash.');
                        branch.updateHashes(originHash, originHash);
                        // TODO: Updating the localHash before the update in the client has
                        // TODO: taken place might not be correct.
                        branch.localUpdateHandler(updateData);
                    } else {
                        logger.debug('commitQueue is not empty, only updating originHash.');
                        branch.updateHashes(null, originHash);
                        branch.addToUpdateQueue(updateData);
                    }
                };

                webSocket.addEventListener(webSocket.getBranchUpdateEventName(projectName, branchName),
                    branch.updateHandler);

                // Insert the objects from the latest commit into the project cache.
                for (i = 0; i < latestCommit.coreObjects.length; i += 1) {
                    project.insertObject(latestCommit.coreObjects[i]);
                }

                self._pushNextQueuedCommit(projectName, branchName); // This only has an effect after a fork with pending commits.
                callback(err, latestCommit);
            });
        };

        this.closeBranch = function (projectName, branchName, callback) {
            ASSERT(projects.hasOwnProperty(projectName), 'Project not opened: ' + projectName);
            logger.debug('closeBranch', projectName, branchName);

            var project = project[projectName],
                branch = project.getBranch(branchName);
            if (branch) {
                webSocket.removeEventListener(webSocket.getBranchUpdateEventName(projectName, branchName),
                    branch.updateHandler);
            } else {
                logger.error('Branch is not open', projectName, branchName);
            }

            project[projectName].removeBranch(branchName);
            webSocket.closeBranch({projectName: projectName, branchName: branchName}, callback);
        };

        this.forkBranch = function (projectName, branchName, forkName, commitHash, callback) {
            ASSERT(projects.hasOwnProperty(projectName), 'Project not opened: ' + projectName);

            var self = this,
                project = projects[projectName],
                branch = project.getBranch(branchName, true),
                forkData;

            forkData = branch.getCommitsForNewFork(commitHash);

            self.setBranchHash(projectName, forkName, forkData.hash, '', function (err) {
                var fork;
                if (err) {
                    callback(err);
                    return;
                }
                fork = project.getBranch(forkName, false);
                fork.setCommitQueue(forkData.queue);
                fork.updateHashes(commitHash, forkData.hash);
                callback(null); // Now it's up to the client to close the old branch and open the fork.
            });
        };

        this.setBranchHash = function (projectName, branchName, newHash, oldHash, callback) {
            var setBranchHashData = {
                projectName: projectName,
                branchName: branchName,
                newHash: newHash,
                oldHash: oldHash
            };
            webSocket.setBranchHash(setBranchHashData, callback);
        };

        this.makeCommit = function (projectName, branchName, parents, rootHash, stageBucket, msg, callback) {
            ASSERT(projects.hasOwnProperty(projectName), 'Project not opened: ' + projectName);
            var project = projects[projectName],
                branch,
                commitData = {
                    projectName: projectName
                };

            commitData.commitObject = self._getCommitObject(projectName, parents, rootHash, msg);
            commitData.coreObjects = stageBucket;
            if (typeof branchName === 'string') {
                commitData.branchName = branchName;
                branch = project.getBranch(branchName, true);
                branch.updateHashes(commitData.commitObject[CONSTANTS.MONGO_ID], null);
                branch.queueCommit(commitData);
                if (branch.getCommitQueue().length === 1) {
                    self._pushNextQueuedCommit(projectName, branchName, commitData, callback);
                }
            } else {
                ASSERT(typeof callback === 'function', 'Making commit without updating branch requires a callback.');
                webSocket.makeCommit(commitData, callback);
            }

            return commitData.commitObject; //commitHash
        };

        this._getCommitObject = function (projectName, parents, rootHash, msg) {
            msg = msg || 'n/a';
            var commitObj = {
                    root: rootHash,
                    parents: parents,
                    updater: ['dummy'], //TODO: use session to get user
                    time: (new Date()).getTime(),
                    message: msg,
                    type: 'commit'
                },
                commitHash = '#' + GENKEY(commitObj, gmeConfig);

            commitObj[CONSTANTS.MONGO_ID] = commitHash;

            return commitObj;
        };

        this._pushNextQueuedCommit = function (projectName, branchName, callback) {
            ASSERT(projects.hasOwnProperty(projectName), 'Project not opened: ' + projectName);
            var project = projects[projectName],
                branch = project.getBranch(branchName, true),
                commitData;
            if (branch.getCommitQueue().length === 0) {
                return;
            }
            commitData = branch.getFirstCommit(false);
            webSocket.makeCommit(commitData, function (err, result) {
                if (err) {
                    //TODO: check error code and retry if e.g. failed inserts.
                    throw new Error(err);
                }

                if (result.status === CONSTANTS.SYNCH) {
                    branch.getFirstCommit(true);
                    branch.updateHashes(null, commitData.commitObject[CONSTANTS.MONGO_ID]);
                }
                if (typeof callback === 'function') {
                    callback(err, result);
                }
                branch.commitHandler(branch.getCommitQueue(), result, function (push) {
                    if (push) {
                        self._pushNextQueuedCommit(projectName, branchName);
                        //TODO: Make sure the stack doesn't grow too big.
                    }
                });
            });
        };

        this._rejoinBranchRooms = function () {
            var projectName,
                project,
                branchName;
            logger.debug('_rejoinBranchRooms');
            for (projectName in projects) {
                if (projects.hasOwnProperty(projectName)) {
                    project = projects[projectName];
                    logger.debug('_rejoinBranchRooms found project', projectName);
                    for (branchName in project.branches) {
                        if (project.branches.hasOwnProperty(branchName)) {
                            logger.debug('_rejoinBranchRooms joining branch', projectName, branchName);
                            webSocket.watchBranch({
                                projectName: projectName,
                                branchName: branchName,
                                join: true
                            });
                        }
                    }
                }
            }
        };
    }

    EditorStorage.prototype = Object.create(StorageObjectLoaders.prototype);
    EditorStorage.prototype.constructor = EditorStorage;

    return EditorStorage;
});