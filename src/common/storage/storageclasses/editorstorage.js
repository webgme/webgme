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
            projects = {};

        self.logger = logger;
        self.userId = null;

        StorageObjectLoaders.call(this, webSocket, mainLogger, gmeConfig);

        this.open = function (networkHandler) {
            webSocket.connect(function (err, connectionState) {
                if (err) {
                    logger.error(err);
                    networkHandler(CONSTANTS.ERROR);
                } else if (connectionState === CONSTANTS.CONNECTED) {
                    self.connected = true;
                    self.userId = webSocket.userId;
                    networkHandler(connectionState);
                } else if (connectionState === CONSTANTS.RECONNECTED) {
                    self._rejoinWatcherRooms();
                    self._rejoinBranchRooms();
                    self.connected = true;
                    networkHandler(connectionState);
                } else if (connectionState === CONSTANTS.DISCONNECTED) {
                    self.connected = false;
                    networkHandler(connectionState);
                } else {
                    logger.error('unexpected connection state');
                    networkHandler(CONSTANTS.ERROR);
                }
            });
        };

        this.close = function (callback) {
            var error = '',
                openProjects = Object.keys(projects),
                projectCnt = openProjects.length;

            logger.debug('Closing storage, openProjects', openProjects);

            function afterProjectClosed(err) {
                if (err) {
                    logger.error(err);
                    error += err;
                }
                logger.debug('inside afterProjectClosed projectCnt', projectCnt);
                if (projectCnt === 0) {
                    // Remove the handler for the socket.io events 'connect' and 'disconnect'.
                    webSocket.socket.removeAllListeners('connect');
                    webSocket.socket.removeAllListeners('disconnect');
                    // Disconnect from the server.
                    webSocket.disconnect();
                    self.connected = false;
                    // Remove all local event-listeners.
                    webSocket.removeAllEventListeners();
                    callback(error || null);
                }
            }

            if (projectCnt > 0) {
                while (projectCnt) {
                    projectCnt -= 1;
                    this.closeProject(openProjects[projectCnt], afterProjectClosed);
                }
            } else {
                logger.debug('No projects were open, will disconnect directly');
                afterProjectClosed(null);
            }
        };

        /**
         * Callback for openProject.
         *
         * @callback EditorStorage~openProjectCallback
         * @param {string} err - error string.
         * @param {Project} project - the newly opened project.
         * @param {object} branches - the newly opened project.
         * @example
         * // branches is of the form
         * // { master: '#somevalidhash', b1: '#someothervalidhash' }
         */

        /**
         *
         * @param {string} projectId - name of project to open.
         * @param {EditorStorage~openProjectCallback} - callback
         */
        this.openProject = function (projectId, callback) {
            var data = {
                projectId: projectId
            };
            if (projects[projectId]) {
                logger.error('project is already open', projectId);
                callback('project is already open');
            }
            webSocket.openProject(data, function (err, branches, access) {
                if (err) {
                    callback(err);
                    return;
                }
                var project = new Project(projectId, self, logger, gmeConfig);
                projects[projectId] = project;
                callback(err, project, branches, access);
            });
        };

        this.closeProject = function (projectId, callback) {
            var project = projects[projectId],
                error = '',
                branchCnt,
                branchNames;
            logger.debug('closeProject', projectId);

            function closeAndDelete(err) {
                if (err) {
                    logger.error(err);
                    error += err;
                }
                logger.debug('inside closeAndDelete branchCnt', branchCnt);
                if (branchCnt === 0) {
                    delete projects[projectId];
                    logger.debug('project reference deleted, sending close to server.');
                    webSocket.closeProject({projectId: projectId}, function (err) {
                        logger.debug('project closed on server.');
                        callback(err || error);
                    });
                }
            }

            if (project) {
                branchNames = Object.keys(project.branches);
                branchCnt = branchNames.length;
                if (branchCnt > 0) {
                    logger.warn('Branches still open for project, will be closed.', projectId, branchNames);
                    while (branchCnt) {
                        branchCnt -= 1;
                        this.closeBranch(projectId, branchNames[branchCnt], closeAndDelete);
                    }
                } else {
                    closeAndDelete(null);
                }
            } else {
                logger.warn('Project is not open ', projectId);
                callback(null);
            }

        };

        this.openBranch = function (projectId, branchName, updateHandler, commitHandler, callback) {
            ASSERT(projects.hasOwnProperty(projectId), 'Project not opened: ' + projectId);
            var self = this,
                project = projects[projectId],
                data = {
                    projectId: projectId,
                    branchName: branchName
                };

            webSocket.openBranch(data, function (err, latestCommit) {
                if (err) {
                    callback(err);
                    return;
                }
                var i,
                    branchHash = latestCommit.commitObject[CONSTANTS.MONGO_ID],
                    branch = project.getBranch(branchName, false);

                branch.updateHashes(branchHash, branchHash);

                branch.commitHandler = commitHandler;
                branch.localUpdateHandler = updateHandler;

                branch.updateHandler = function (_ws, updateData) {
                    var j,
                        originHash = updateData.commitObject[CONSTANTS.MONGO_ID];
                    logger.debug('updateHandler invoked for project, branch', projectId, branchName);
                    for (j = 0; j < updateData.coreObjects.length; j += 1) {
                        project.insertObject(updateData.coreObjects[j]);
                    }

                    branch.queueUpdate(updateData);
                    branch.updateHashes(null, originHash);

                    if (branch.getCommitQueue().length === 0) {
                        if (branch.getUpdateQueue().length === 1) {
                            self._pullNextQueuedCommit(projectId, branchName);
                        }
                    } else {
                        logger.debug('commitQueue is not empty, only updating originHash.');
                    }
                };

                webSocket.addEventListener(webSocket.getBranchUpdateEventName(projectId, branchName),
                    branch.updateHandler);

                // Insert the objects from the latest commit into the project cache.
                for (i = 0; i < latestCommit.coreObjects.length; i += 1) {
                    project.insertObject(latestCommit.coreObjects[i]);
                }

                callback(err, latestCommit);
            });
        };

        this.closeBranch = function (projectId, branchName, callback) {
            ASSERT(projects.hasOwnProperty(projectId), 'Project not opened: ' + projectId);
            logger.debug('closeBranch', projectId, branchName);

            var project = projects[projectId],
                branch = project.branches[branchName];

            if (branch) {
                // This will prevent memory leaks and expose if a commit is being
                // processed at the server this time (see last error in _pushNextQueuedCommit).
                branch.cleanUp();

                // Stop listening to events from the sever
                webSocket.removeEventListener(webSocket.getBranchUpdateEventName(projectId, branchName),
                    branch.updateHandler);
            } else {
                logger.warn('Branch is not open', projectId, branchName);
                callback(null);
                return;
            }

            project.removeBranch(branchName);
            webSocket.closeBranch({projectId: projectId, branchName: branchName}, callback);
        };

        this.forkBranch = function (projectId, branchName, forkName, commitHash, callback) {
            ASSERT(projects.hasOwnProperty(projectId), 'Project not opened: ' + projectId);
            this.logger.debug('forkBranch', projectId, branchName, forkName, commitHash);
            var self = this,
                project = projects[projectId],
                branch = project.getBranch(branchName, true),
                forkData;

            forkData = branch.getCommitsForNewFork(commitHash, forkName); // commitHash = null defaults to latest commit
            self.logger.debug('forkBranch - forkData', forkData);
            if (forkData === false) {
                callback('Could not find specified commitHash');
                return;
            }

            function commitNext() {
                var currentCommitData = forkData.queue.shift();
                logger.debug('forkBranch - commitNext, currentCommitData', currentCommitData);
                if (currentCommitData) {
                    webSocket.makeCommit(currentCommitData, function (err, result) {
                        if (err) {
                            logger.error('forkBranch - failed committing', err);
                            callback(err);
                            return;
                        }
                        logger.debug('forkBranch - commit successful, hash', result);
                        commitNext();
                    });
                } else {
                    self.createBranch(projectId, forkName, forkData.commitHash, function (err) {
                        if (err) {
                            logger.error('forkBranch - failed creating new branch', err);
                            callback(err);
                            return;
                        }
                        callback(null, forkData.commitHash);
                    });
                }
            }

            commitNext();
        };

        this.makeCommit = function (projectId, branchName, parents, rootHash, coreObjects, msg, callback) {
            ASSERT(projects.hasOwnProperty(projectId), 'Project not opened: ' + projectId);
            var project = projects[projectId],
                branch,
                commitData = {
                    projectId: projectId
                };

            commitData.commitObject = self._getCommitObject(projectId, parents, rootHash, msg);
            commitData.coreObjects = coreObjects;
            if (typeof branchName === 'string') {
                commitData.branchName = branchName;
                branch = project.getBranch(branchName, true);
                branch.updateHashes(commitData.commitObject[CONSTANTS.MONGO_ID], null);
                branch.queueCommit(commitData);
                if (branch.getCommitQueue().length === 1) {
                    self._pushNextQueuedCommit(projectId, branchName, callback);
                }
            } else {
                ASSERT(typeof callback === 'function', 'Making commit without updating branch requires a callback.');
                webSocket.makeCommit(commitData, callback);
            }

            return commitData.commitObject; //commitHash
        };

        this._pushNextQueuedCommit = function (projectId, branchName, callback) {
            ASSERT(projects.hasOwnProperty(projectId), 'Project not opened: ' + projectId);
            var project = projects[projectId],
                branch = project.getBranch(branchName, true),
                commitData;
            logger.debug('_pushNextQueuedCommit', branch.getCommitQueue());
            if (branch.getCommitQueue().length === 0) {
                return;
            }

            commitData = branch.getFirstCommit(false);
            webSocket.makeCommit(commitData, function (err, result) {
                if (err) {
                    logger.error('makeCommit failed', err);
                }

                // This is for when e.g. a plugin makes a commit to the same branch as the
                // client and waits for the callback before proceeding.
                // (If it is a forking commit, the plugin can proceed knowing that and the client will get notified of
                // the fork through the commitHandler.
                if (typeof callback === 'function') {
                    callback(err, result);
                }

                if (branch.isOpen) {
                    branch.commitHandler(branch.getCommitQueue(), result, function (push) {
                        if (push) {
                            branch.getFirstCommit(true); // Remove the commit from the queue.
                            branch.updateHashes(null, commitData.commitObject[CONSTANTS.MONGO_ID]);
                            self._pushNextQueuedCommit(projectId, branchName);
                        }
                    });
                } else {
                    logger.error('_pushNextQueuedCommit returned from server but the branch was closed, ' +
                        'the branch has probably been closed while waiting for the response.', projectId, branchName);
                }
            });
        };

        this._getCommitObject = function (projectId, parents, rootHash, msg) {
            msg = msg || 'n/a';
            var commitObj = {
                    root: rootHash,
                    parents: parents,
                    updater: [self.userId],
                    time: (new Date()).getTime(),
                    message: msg,
                    type: 'commit'
                },
                commitHash = '#' + GENKEY(commitObj, gmeConfig);

            commitObj[CONSTANTS.MONGO_ID] = commitHash;

            return commitObj;
        };

        this._pullNextQueuedCommit = function (projectId, branchName) {
            ASSERT(projects.hasOwnProperty(projectId), 'Project not opened: ' + projectId);
            var self = this,
                project = projects[projectId],
                branch = project.getBranch(branchName, true),
                updateData;

            logger.debug('About to update, updateQueue', {metadata: branch.getUpdateQueue()});
            if (branch.getUpdateQueue().length === 0) {
                logger.debug('No queued updates, returns');
                return;
            }

            updateData = branch.getFirstUpdate();
            if (branch.isOpen) {
                branch.localUpdateHandler(branch.getUpdateQueue(), updateData, function (aborted) {
                    var originHash = updateData.commitObject[CONSTANTS.MONGO_ID];
                    if (aborted === false) {
                        logger.debug('New commit was successfully loaded, updating localHash.');
                        branch.updateHashes(originHash, null);
                        branch.getFirstUpdate(true);
                        self._pullNextQueuedCommit(projectId, branchName);
                    } else {
                        logger.warn('Loading of update commit was aborted or failed.', {metadat: updateData});
                    }
                });
            } else {
                logger.error('_pullNextQueuedCommit returned from server but the branch was closed.',
                    projectId, branchName);
            }
        };

        this._rejoinBranchRooms = function () {
            var projectId,
                project,
                branchName;
            logger.debug('_rejoinBranchRooms');
            for (projectId in projects) {
                if (projects.hasOwnProperty(projectId)) {
                    project = projects[projectId];
                    logger.debug('_rejoinBranchRooms found project', projectId);
                    for (branchName in project.branches) {
                        if (project.branches.hasOwnProperty(branchName)) {
                            logger.debug('_rejoinBranchRooms joining branch', projectId, branchName);
                            webSocket.watchBranch({
                                projectId: projectId,
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