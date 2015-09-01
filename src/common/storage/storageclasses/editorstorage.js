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
    'common/storage/project/branch',
    'common/util/assert',
    'common/util/key',
    'common/util/guid'
], function (StorageObjectLoaders, CONSTANTS, Project, Branch, ASSERT, GENKEY, GUID) {
    'use strict';

    /**
     *
     * @param webSocket
     * @param mainLogger
     * @param gmeConfig
     * @constructor
     */
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
            var error = null,
                openProjects = Object.keys(projects),
                projectCnt = openProjects.length;

            logger.debug('Closing storage, openProjects', openProjects);

            function afterProjectClosed(err) {
                if (err) {
                    logger.error(err.message);
                    error = err;
                }
                logger.debug('inside afterProjectClosed projectCnt', projectCnt);
                if (projectCnt === 0) {
                    // Remove the handler for the socket.io events 'connect' and 'disconnect'.
                    logger.debug('Removing connect and disconnect events');
                    webSocket.socket.removeAllListeners('connect');
                    webSocket.socket.removeAllListeners('disconnect');
                    // Disconnect from the server.
                    logger.debug('Disconnecting web-socket');
                    webSocket.disconnect();
                    self.connected = false;
                    // Remove all local event-listeners.
                    webSocket.clearAllEvents();
                    callback(error);
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
                callback(new Error('project is already open'));
            }
            webSocket.openProject(data, function (err, branches, access) {
                if (err) {
                    callback(err);
                    return;
                }
                var project = new Project(projectId, self, logger, gmeConfig);
                projects[projectId] = project;
                callback(null, project, branches, access);
            });
        };

        this.closeProject = function (projectId, callback) {
            var project = projects[projectId],
                error = null,
                branchCnt,
                branchNames;
            logger.debug('closeProject', projectId);

            function closeAndDelete(err) {
                if (err) {
                    logger.error(err.message);
                    error = err;
                }
                logger.debug('inside closeAndDelete branchCnt', branchCnt);
                if (branchCnt === 0) {
                    webSocket.closeProject({projectId: projectId}, function (err) {
                        logger.debug('project closed on server.');
                        delete projects[projectId];
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

        this.openBranch = function (projectId, branchName, hashUpdateHandler, branchStatusHandler, callback) {
            var project = projects[projectId],
                data = {
                    projectId: projectId,
                    branchName: branchName
                },
                branch;

            if (!project) {
                callback(new Error('Cannot open branch, ' + branchName + ', project ' + projectId + ' is not opened.'));
                return;
            }

            if (project.branches[branchName]) {
                callback(new Error('Branch is already open ' + branchName + ', project: ' + projectId));
                return;
            }

            logger.debug('openBranch, calling webSocket openBranch', projectId, branchName);

            webSocket.openBranch(data, function (err, latestCommit) {
                var branchHash;
                if (err) {
                    callback(err);
                    return;
                }

                branch = new Branch(branchName, project.logger);
                project.branches[branchName] = branch;

                // Update state of branch
                branch.latestCommitData = latestCommit;
                branchHash = latestCommit.commitObject[CONSTANTS.MONGO_ID];
                branch.updateHashes(branchHash, branchHash);

                // Add handlers to branch and set the remote update handler for the web-socket.
                branch.addHashUpdateHandler(hashUpdateHandler);
                branch.addBranchStatusHandler(branchStatusHandler);

                branch._remoteUpdateHandler = function (_ws, updateData, callback) {
                    var j,
                        originHash = updateData.commitObject[CONSTANTS.MONGO_ID];
                    logger.debug('_remoteUpdateHandler invoked for project, branch', projectId, branchName);
                    for (j = 0; j < updateData.coreObjects.length; j += 1) {
                        project.insertObject(updateData.coreObjects[j]);
                    }

                    branch.queueUpdate(updateData);
                    branch.updateHashes(null, originHash);

                    if (branch.getCommitQueue().length === 0) {
                        if (branch.getUpdateQueue().length === 1) {
                            self._pullNextQueuedCommit(projectId, branchName, callback); // hashUpdateHandlers
                        }
                    } else {
                        logger.debug('commitQueue is not empty, only updating originHash.');
                    }
                };

                branch._remoteUpdateHandler(null, latestCommit, function (err) {
                    webSocket.addEventListener(webSocket.getBranchUpdateEventName(projectId, branchName),
                        branch._remoteUpdateHandler);
                    callback(err, latestCommit);
                });
            });
        };

        this.closeBranch = function (projectId, branchName, callback) {
            var project = projects[projectId],
                branch;

            logger.debug('closeBranch', projectId, branchName);

            if (!project) {
                callback(new Error('Cannot close branch, ' + branchName + ', project ' + projectId +
                    ' is not opened.'));
                return;
            }

            branch = project.branches[branchName];

            if (!branch) {
                logger.warn('Project does not have given branch.', projectId, branchName);
                callback(null);
                return;
            }

            // This will prevent memory leaks and expose if a commit is being
            // processed at the server this time (see last error in _pushNextQueuedCommit).
            branch.dispatchBranchStatus(null);

            // Stop listening to events from the server
            webSocket.removeEventListener(webSocket.getBranchUpdateEventName(projectId, branchName),
                branch._remoteUpdateHandler);

            branch.cleanUp();

            webSocket.closeBranch({projectId: projectId, branchName: branchName}, function (err) {
                delete project.branches[branchName];
                callback(err);
            });
        };

        this.forkBranch = function (projectId, branchName, forkName, commitHash, callback) {
            var project = projects[projectId],
                branch,
                forkData;

            this.logger.debug('forkBranch', projectId, branchName, forkName, commitHash);

            if (!project) {
                callback(new Error('Cannot fork branch, ' + branchName + ', project ' + projectId + ' is not opened.'));
                return;
            }

            branch = project.branches[branchName];

            if (!branch) {
                callback(new Error('Cannot fork branch, branch is not open ' + branchName + ', project: ' + projectId));
                return;
            }

            forkData = branch.getCommitsForNewFork(commitHash, forkName); // commitHash = null defaults to latest commit
            self.logger.debug('forkBranch - forkData', forkData);
            if (forkData === false) {
                callback(new Error('Could not find specified commitHash'));
                return;
            }

            function commitNext() {
                var currentCommitData = forkData.queue.shift();

                logger.debug('forkBranch - commitNext, currentCommitData', currentCommitData);
                if (currentCommitData) {
                    delete currentCommitData.branchName;

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
            var project = projects[projectId],
                branch,
                commitId,
                commitCallback,
                commitData = {
                    projectId: projectId,
                    commitObject: null,
                    coreObjects: null
                };

            commitData.commitObject = self._getCommitObject(projectId, parents, rootHash, msg);
            commitData.coreObjects = coreObjects;

            if (project) {
                project.insertObject(commitData.commitObject);
                commitId = GUID();

                commitCallback = function commitCallback() {
                    delete project.projectCache.queuedPersists[commitId];
                    self.logger.debug('Removed now persisted core-objects from cache: ',
                        Object.keys(project.projectCache.queuedPersists).length);
                    callback.apply(null, arguments);
                };

                project.projectCache.queuedPersists[commitId] = coreObjects;
                logger.debug('Queued non-persisted core-objects in cache: ',
                    Object.keys(project.projectCache.queuedPersists).length);
            } else {
                commitCallback = callback;
            }

            if (typeof branchName === 'string') {
                commitData.branchName = branchName;
                branch = project ? project.branches[branchName] : null;
            }

            logger.debug('makeCommit', commitData);
            if (branch) {
                logger.debug('makeCommit, branch is open will commit using commitQueue. branchName:', branchName);
                self._commitToBranch(projectId, branchName, commitData, parents[0], commitCallback);
            } else {
                webSocket.makeCommit(commitData, commitCallback);
            }
        };

        this.setBranchHash = function (projectId, branchName, newHash, oldHash, callback) {
            var project = projects[projectId],
                branch;

            logger.debug('setBranchHash', projectId, branchName, newHash, oldHash);
            if (project && project.branches[branchName]) {
                branch = project.branches[branchName];
                logger.debug('setBranchHash, branch is open, will notify other local users about change');
                project.loadObject(newHash, function (err, commitObject) {
                    var commitData;
                    if (err) {
                        logger.error('setBranchHash, faild to load in commitObject');
                        callback(err);
                        return;
                    }
                    logger.debug('setBranchHash, loaded commitObject');
                    commitData = {
                        projectId: projectId,
                        branchName: branchName,
                        coreObjects: [],
                        commitObject: commitObject,
                        oldHash: oldHash
                    };
                    self._commitToBranch(projectId, branchName, commitData, oldHash, callback);
                });
            } else {
                StorageObjectLoaders.prototype.setBranchHash.call(self,
                    projectId, branchName, newHash, oldHash, callback);
            }
        };

        this._commitToBranch = function (projectId, branchName, commitData, oldCommitHash, callback) {
            var project = projects[projectId],
                newCommitHash = commitData.commitObject._id,
                branch = project.branches[branchName],
                eventData = {
                    commitData: commitData,
                    local: true
                };

            logger.debug('_commitToBranch, [oldCommitHash, localHash]', oldCommitHash, branch.getLocalHash());

            if (oldCommitHash === branch.getLocalHash()) {
                branch.updateHashes(newCommitHash, null);
                branch.queueCommit(commitData, callback);

                if (branch.inSync === false) {
                    branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.AHEAD_NOT_SYNC);
                } else {
                    branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.AHEAD_SYNC);
                }

                if (branch.getCommitQueue().length === 1) { // i.e. this commit is the only one queued.
                    logger.debug('_commitToBranch, commit was first in queue. Will start pushing commit');
                    self._pushNextQueuedCommit(projectId, branchName);
                }

                branch.dispatchHashUpdate(eventData, function (err, proceed) {
                    logger.debug('_commitToBranch, dispatchHashUpdate done. [err, proceed]', err, proceed);

                    if (err) {
                        callback(new Error('Commit failed being loaded in users: ' + err));
                    } else if (proceed === true) {
                        logger.debug('_commitToBranch, proceed only applicable when loading external updates');
                    } else {
                        callback(new Error('Commit halted when loaded in users: ' + err));
                    }
                });
            } else {
                // The current user is behind the local branch, e.g. plugin trying to save after client changes.
                logger.warn('_commitToBranch, incoming commit parent was not the same as the localHash ' +
                    'for the branch, commit will be canceled!');
                callback(null, {status: CONSTANTS.CANCELED, hash: newCommitHash});
            }
        };

        this._pushNextQueuedCommit = function (projectId, branchName) {
            var project = projects[projectId],
                branch = project.branches[branchName],
                commitData;

            logger.debug('_pushNextQueuedCommit, length=', branch.getCommitQueue().length);

            commitData = branch.getFirstCommit();

            logger.debug('_pushNextQueuedCommit, makeCommit [from# -> to#]',
                commitData.commitObject.parents[0], commitData.commitObject._id);

            webSocket.makeCommit(commitData, function (err, result) {
                if (err) {
                    logger.error('makeCommit failed', err);
                }

                if (branch.isOpen) {
                    branch.callbackQueue[0](err, result);
                    if (!err && result) {
                        if (result.status === CONSTANTS.SYNCED) {
                            branch.inSync = true;
                            branch.updateHashes(null, result.hash);
                            branch.getFirstCommit(true);
                            if (branch.getCommitQueue().length === 0) {
                                branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.SYNC);
                            } else {
                                branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.AHEAD_SYNC);
                                self._pushNextQueuedCommit(projectId, branchName);
                            }
                        } else if (result.status === CONSTANTS.FORKED) {
                            branch.inSync = false;
                            branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.AHEAD_NOT_SYNC);
                        } else {
                            logger.error('Unsupported commit status ' + result.status);
                        }
                    }
                } else {
                    logger.error('_pushNextQueuedCommit returned from server but the branch was closed, ' +
                        'the branch has probably been closed while waiting for the response.', projectId, branchName);
                }
            });
        };

        this._pullNextQueuedCommit = function (projectId, branchName, callback) {
            ASSERT(projects.hasOwnProperty(projectId), 'Project not opened: ' + projectId);
            var project = projects[projectId],
                branch = project.branches[branchName],
                error,
                updateData;

            if (!branch) {
                error = new Error('Branch, ' + branchName + ', not in project ' + projectId + '.');
                if (callback) {
                    callback(error);
                } else {
                    throw error;
                }
            }

            logger.debug('About to update, updateQueue', {metadata: branch.getUpdateQueue()});
            if (branch.getUpdateQueue().length === 0) {
                logger.debug('No queued updates, returns');
                branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.SYNC);
                if (callback) {
                    callback(null);
                }
                return;
            }

            updateData = branch.getFirstUpdate();

            if (branch.isOpen) {
                branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.PULLING);
                branch.dispatchHashUpdate({commitData: updateData, local: false}, function (err, proceed) {
                    var originHash = updateData.commitObject[CONSTANTS.MONGO_ID];
                    if (err) {
                        logger.error('Loading of update commit failed with error', err, {metadata: updateData});
                    } else if (proceed === true) {
                        logger.debug('New commit was successfully loaded, updating localHash.');
                        branch.updateHashes(originHash, null);
                        branch.getFirstUpdate(true);
                        if (branch.getCommitQueue().length === 0) {
                            self._pullNextQueuedCommit(projectId, branchName, callback);
                        }
                        return;
                    } else {
                        logger.warn('Loading of update commit was aborted', {metadata: updateData});
                    }
                    if (callback) {
                        callback(err || 'Loading the first commit was aborted');
                    }
                });
            } else {
                logger.error('_pullNextQueuedCommit returned from server but the branch was closed.',
                    projectId, branchName);
            }
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

        this._rejoinBranchRooms = function () {
            var projectId,
                project,
                branchName;
            logger.debug('_rejoinBranchRooms');
            function afterRejoinFn(projectId, branchName) {
                return function (err) {
                    var project = projects[projectId];
                    if (err) {
                        logger.error('_rejoinBranchRooms, could not rejoin branch room', projectId, branchName);
                        logger.error(err);
                        return;
                    }
                    logger.debug('_rejoinBranchRooms, rejoined branch room', projectId, branchName);

                    if (!project) {
                        logger.error('_rejoinBranchRooms, project has been closed after disconnect',
                            projectId, branchName);
                        return;
                    }
                    project.getBranchHash(branchName)
                        .then(function (branchHash) {
                            var branch = project.branches[branchName],
                                queuedCommitHash;
                            logger.debug('_rejoinBranchRooms received branchHash', projectId, branchName, branchHash);
                            if (!branch) {
                                logger.error('_rejoinBranchRooms, branch had been closed disconnect',
                                    projectId, branchName);
                                return;
                            }

                            if (branch.getCommitQueue().length > 0) {
                                queuedCommitHash = branch.getFirstCommit().commitObject._id;
                                logger.debug('_rejoinBranchRooms, commits were queued length=, firstQueuedCommitHash',
                                    branch.getCommitQueue().length, queuedCommitHash);

                                project.getCommonAncestorCommit(branchHash, queuedCommitHash)
                                    .then(function (commonCommitHash) {
                                        var result,
                                            branch = project.branches[branchName];

                                        logger.debug('_rejoinBranchRooms getCommonAncestorCommit',
                                            projectId, branchName, commonCommitHash);
                                        if (!branch) {
                                            logger.error('_rejoinBranchRooms, branch had been closed after disconnect',
                                                projectId, branchName);
                                            return;
                                        }
                                        function dispatchSynced() {
                                            result = {status: CONSTANTS.SYNCED, hash: branchHash};

                                            branch.callbackQueue[0](null, result);
                                            branch.inSync = true;
                                            branch.updateHashes(null, branchHash);
                                            branch.getFirstCommit(true);
                                            if (branch.getCommitQueue().length === 0) {
                                                branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.SYNC);
                                            } else {
                                                branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.AHEAD_SYNC);
                                                self._pushNextQueuedCommit(projectId, branchName);
                                            }
                                        }
                                        function dispatchForked() {
                                            result = {status: CONSTANTS.FORKED, hash: branchHash};

                                            branch.callbackQueue[0](null, result);
                                            branch.inSync = false;
                                            branch.dispatchBranchStatus(CONSTANTS.BRANCH_STATUS.AHEAD_NOT_SYNC);
                                        }

                                        // The commit was inserted.
                                        if (commonCommitHash === queuedCommitHash) {
                                            // The commit is (or was) in sync with the branch.
                                            dispatchSynced();
                                        } else if (commonCommitHash === branchHash) {
                                            // The branch has moved back since the commit was made.
                                            // Treat it like the commit was forked.
                                            dispatchForked();
                                        } else {
                                            // The branch has moved forward and the commit was forked.
                                            dispatchForked();
                                        }
                                    })
                                    .catch(function (err) {
                                        if (err.message.indexOf('Commit object does not exist [' + queuedCommitHash) > -1) {
                                            // Commit never made it to the server - push it.
                                            logger.debug('First queued commit never made it to the server. push...');
                                            self._pushNextQueuedCommit(projectId, branchName);
                                        } else {
                                            logger.error(err);
                                        }
                                    })
                                    .done();
                            } else {
                                logger.debug('_rejoinBranchRooms, no commits were queued during disconnect.');
                            }
                        })
                        .catch(function (err) {
                            logger.error(err);
                        });
                };
            }

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
                            }, afterRejoinFn(projectId, branchName));
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
