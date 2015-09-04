/*globals define, console*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */
define([
    'js/logger',
    'common/storage/browserstorage',
    'common/EventDispatcher',
    'common/core/core',
    'js/client/constants',
    'common/core/users/meta',
    'common/util/assert',
    'common/core/tasync',
    'common/util/guid',
    'common/util/url',
    'js/client/gmeNodeGetter',
    'js/client/gmeNodeSetter',
    'common/core/users/serialization',
    'js/client/addon'
], function (Logger,
             Storage,
             EventDispatcher,
             Core,
             CONSTANTS,
             META,
             ASSERT,
             TASYNC,
             GUID,
             URL,
             getNode,
             getNodeSetters,
             Serialization,
             AddOn) {
    'use strict';

    function Client(gmeConfig) {
        var self = this,
            logger = Logger.create('gme:client', gmeConfig.client.log),
            storage = Storage.getStorage(logger, gmeConfig, true),
            state = {
                connection: null, // CONSTANTS.STORAGE. CONNECTED/DISCONNECTED/RECONNECTED
                project: null,
                core: null,
                branchName: null,
                branchStatus: null, //CONSTANTS.BRANCH_STATUS. SYNC/AHEAD_SYNC/AHEAD_FORKED/PULLING or null
                readOnlyProject: false,
                viewer: false, // This means that a specific commit is selected w/o regards to any branch.

                users: {},
                nodes: {},
                loadNodes: {},
                // FIXME: This should be the same as nodes (need to make sure they are not modified in meta).
                metaNodes: {},

                rootHash: null,
                rootObject: null,
                commitHash: null,

                undoRedoChain: null, //{commitHash: '#hash', rootHash: '#hash', previous: object, next: object}

                inTransaction: false,
                msg: '',
                gHash: 0,
                loadError: null
            },
            monkeyPatchKey,
            nodeSetterFunctions,
            addOnFunctions = new AddOn(state, storage, logger, gmeConfig);

        EventDispatcher.call(this);

        this.CONSTANTS = CONSTANTS;

        function logState(level, msg) {
            var lightState;

            function replacer(key, value) {
                var chainItem,
                    prevChain,
                    nextChain,
                    chain;
                if (key === 'project') {
                    if (value) {
                        return value.name;
                    } else {
                        return null;
                    }

                } else if (key === 'core') {
                    if (value) {
                        return 'instantiated';
                    } else {
                        return 'notInstantiated';
                    }
                } else if (key === 'metaNodes') {
                    return Object.keys(value);
                } else if (key === 'nodes') {
                    return Object.keys(value);
                } else if (key === 'loadNodes') {
                    return Object.keys(value);
                } else if (key === 'users') {
                    return Object.keys(value);
                } else if (key === 'rootObject') {
                    return;
                } else if (key === 'undoRedoChain') {
                    if (value) {
                        chain = {
                            previous: null,
                            next: null
                        };
                        if (value.previous) {
                            prevChain = {};
                            chain.previous = prevChain;
                        }
                        chainItem = value;
                        while (chainItem.previous) {
                            prevChain.previous = {
                                commitHash: chainItem.commitHash,
                                previous: null
                            };
                            prevChain = prevChain.previous;
                            chainItem = chainItem.previous;
                        }
                        if (value.next) {
                            nextChain = {};
                            chain.next = nextChain;
                        }
                        chainItem = value;
                        while (chainItem.next) {
                            nextChain.next = {
                                commitHash: chainItem.commitHash,
                                next: null
                            };
                            nextChain = nextChain.next;
                            chainItem = chainItem.next;
                        }
                        return chain;
                    }
                }

                return value;
            }

            if (gmeConfig.debug) {
                logger[level]('state at ' + msg, JSON.stringify(state, replacer, 2));
            } else {
                lightState = {
                    connection: self.getNetworkStatus(),
                    projectId: self.getActiveProjectId(),
                    branchName: self.getActiveBranchName(),
                    branchStatus: self.getBranchStatus(),
                    commitHash: self.getActiveCommitHash(),
                    rootHash: self.getActiveRootHash(),
                    projectReadOnly: self.isProjectReadOnly(),
                    commitReadOnly: self.isCommitReadOnly()
                };
                if (level === 'console') {
                    console.log('state at ' + msg, JSON.stringify(lightState));
                } else {
                    logger[level]('state at ' + msg, JSON.stringify(lightState));
                }
            }
        }

        // Forwarded functions
        function saveRoot(msg, callback) {
            var persisted,
                numberOfPersistedObjects,
                wrappedCallback,
                newCommitObject;
            logger.debug('saveRoot msg', msg);
            if (callback) {
                wrappedCallback = function (err, result) {
                    if (err) {
                        logger.error('saveRoot failure', err);
                    } else {
                        logger.debug('saveRoot', result);
                    }
                    callback(err, result);
                };
            } else {
                wrappedCallback = function (err, result) {
                    if (err) {
                        logger.error('saveRoot failure', err);
                    } else {
                        logger.debug('saveRoot', result);
                    }
                };
            }

            if (!state.viewer && !state.readOnlyProject) {
                if (state.msg) {
                    state.msg += '\n' + msg;
                } else {
                    state.msg += msg;
                }
                if (!state.inTransaction) {
                    ASSERT(state.project && state.core && state.branchName);

                    logger.debug('is NOT in transaction - will persist.');
                    persisted = state.core.persist(state.nodes[ROOT_PATH].node);
                    logger.debug('persisted', persisted);
                    numberOfPersistedObjects = Object.keys(persisted.objects).length;
                    if (numberOfPersistedObjects === 0) {
                        logger.warn('No changes after persist will return from saveRoot.');
                        wrappedCallback(null);
                        return;
                    } else if (numberOfPersistedObjects > 200) {
                        //This is just for debugging
                        logger.warn('Lots of persisted objects', numberOfPersistedObjects);
                    }

                    // Make the commit on the storage (will emit hashUpdated)
                    newCommitObject = storage.makeCommit(
                        state.project.projectId,
                        state.branchName,
                        [state.commitHash],
                        persisted.rootHash,
                        persisted.objects,
                        state.msg,
                        wrappedCallback
                    );

                    state.msg = '';
                } else {
                    logger.debug('is in transaction - will NOT persist.');
                }
            } else {
                //TODO: Why is this set to empty here?
                state.msg = '';
                wrappedCallback(null);
            }
        }

        function storeNode(node /*, basic */) {
            var path;
            //basic = basic || true;
            if (node) {
                path = state.core.getPath(node);
                state.metaNodes[path] = node;
                if (state.nodes[path]) {
                    //TODO we try to avoid this
                } else {
                    state.nodes[path] = {node: node, hash: ''/*,incomplete:true,basic:basic*/};
                    //TODO this only needed when real eventing will be reintroduced
                    //_inheritanceHash[path] = getInheritanceChain(node);
                }
                return path;
            }
            return null;
        }

        // Monkey patching from other files..
        this.meta = new META();

        for (monkeyPatchKey in this.meta) {
            //TODO: These should be accessed via this.meta.
            //TODO: e.g. client.meta.getMetaAspectNames(id) instead of client.getMetaAspectNames(id)
            //TODO: However that will break a lot since it's used all over the place...
            if (this.meta.hasOwnProperty(monkeyPatchKey)) {
                self[monkeyPatchKey] = this.meta[monkeyPatchKey];
            }
        }

        nodeSetterFunctions = getNodeSetters(logger, state, saveRoot, storeNode);

        for (monkeyPatchKey in nodeSetterFunctions) {
            if (nodeSetterFunctions.hasOwnProperty(monkeyPatchKey)) {
                self[monkeyPatchKey] = nodeSetterFunctions[monkeyPatchKey];
            }
        }

        // Main API functions (with helpers) for connecting, selecting project and branches etc.
        this.connectToDatabase = function (callback) {
            if (isConnected()) {
                logger.warn('connectToDatabase - already connected');
                callback(null);
                return;
            }
            storage.open(function (connectionState) {
                state.connection = connectionState;
                if (connectionState === CONSTANTS.STORAGE.CONNECTED) {
                    //N.B. this event will only be triggered once.
                    self.dispatchEvent(CONSTANTS.NETWORK_STATUS_CHANGED, connectionState);
                    reLaunchUsers();
                    callback(null);
                } else if (connectionState === CONSTANTS.STORAGE.DISCONNECTED) {
                    self.dispatchEvent(CONSTANTS.NETWORK_STATUS_CHANGED, connectionState);
                } else if (connectionState === CONSTANTS.STORAGE.RECONNECTED) {
                    self.dispatchEvent(CONSTANTS.NETWORK_STATUS_CHANGED, connectionState);
                } else { //CONSTANTS.ERROR
                    callback(Error('Connection failed!' + connectionState));
                }
            });
        };

        this.disconnectFromDatabase = function (callback) {

            function closeStorage(err) {
                storage.close(function (err2) {
                    state.connection = CONSTANTS.STORAGE.DISCONNECTED;
                    callback(err || err2);
                });
            }

            if (isConnected()) {
                if (state.project) {
                    closeProject(state.project.projectId, closeStorage);
                } else {
                    closeStorage(null);
                }
            } else {
                logger.warn('Trying to disconnect when already disconnected.');
                callback(null);
            }
        };

        /**
         * If branchName is given and it does not exist, the project will be closed and callback resolved with an error.
         * If branchName NOT given it will attempt the following in order and break if successful at any step:
         *  1) Select the master if available.
         *  2) Select any available branch.
         *  3) Select the latest commit.
         *  4) Close the project and resolve with error.
         * @param {string} projectId
         * @param {string} [branchName='master']
         * @param {function} callback
         */
        this.selectProject = function (projectId, branchName, callback) {
            if (callback === undefined && typeof branchName === 'function') {
                callback = branchName;
                branchName = undefined;
            }
            if (isConnected() === false) {
                callback(new Error('There is no open database connection!'));
            }
            var prevProjectId,
                branchToOpen = branchName || 'master';

            logger.debug('selectProject', projectId, branchToOpen);

            function projectOpened(err, project, branches, access) {
                if (err) {
                    callback(new Error(err));
                    return;
                }
                state.project = project;
                state.readOnlyProject = access.write === false;
                state.core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });
                self.meta.initialize(state.core, state.metaNodes, saveRoot);
                logState('info', 'projectOpened');
                logger.debug('projectOpened, branches: ', branches);
                self.dispatchEvent(CONSTANTS.PROJECT_OPENED, projectId);

                if (branches.hasOwnProperty(branchToOpen) === false) {
                    if (branchName) {
                        logger.error('Given branch does not exist "' + branchName + '"');
                        closeProject(projectId, function (err) {
                            if (err) {
                                logger.error('closeProject after missing branch failed with err', err);
                            }
                            callback(new Error('Given branch does not exist "' + branchName + '"'));
                        });
                        return;
                    }
                    logger.warn('Project "' + projectId + '" did not have branch', branchToOpen);
                    branchToOpen = Object.keys(branches)[0] || null;
                    logger.debug('Picked "' + branchToOpen + '".');
                }

                if (branchToOpen) {
                    self.selectBranch(branchToOpen, null, function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        logState('info', 'selectBranch');
                        reLaunchUsers();
                        callback(null);
                    });
                } else {
                    logger.warn('No branches available in project, will attempt to select latest commit.');
                    self.getCommits(projectId, (new Date()).getTime(), 1, function (err, commitObjects) {
                        if (err || commitObjects.length === 0) {
                            logger.error(err);
                            closeProject(projectId, function (err) {
                                if (err) {
                                    logger.error('closeProject after missing any commits failed with err', err);
                                }
                                callback(new Error('Project does not have any commits.'));
                            });
                            return;
                        }
                        self.selectCommit(commitObjects[0]._id, function (err) {
                            if (err) {
                                logger.error(err);
                                closeProject(projectId, function (err) {
                                    if (err) {
                                        logger.error('closeProject after missing any commits failed with err', err);
                                    }
                                    callback(new Error('Failed selecting commit when opening project.'));
                                });
                                return;
                            }
                            reLaunchUsers();
                            callback(null);
                        });
                    });
                }
            }

            if (state.project) {
                prevProjectId = state.project.projectId;
                logger.debug('A project was open, closing it', prevProjectId);

                if (prevProjectId === projectId) {
                    logger.warn('projectId is already opened', projectId);
                    callback(null);
                    return;
                }
                closeProject(prevProjectId, function (err) {
                    if (err) {
                        logger.error('problems closing previous project', err);
                        callback(err);
                        return;
                    }
                    storage.openProject(projectId, projectOpened);
                });
            } else {
                storage.openProject(projectId, projectOpened);
            }
        };

        function closeProject(projectId, callback) {
            state.project = null;
            //TODO what if for some reason we are in transaction?
            storage.closeProject(projectId, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                state.core = null;
                state.branchName = null;
                //self.dispatchEvent(null);
                state.patterns = {};
                //state.gHash = 0;
                state.nodes = {};
                state.metaNodes = {};
                state.loadNodes = {};
                state.loadError = 0;
                state.rootHash = null;
                //state.rootObject = null;
                state.inTransaction = false;
                state.msg = '';

                cleanUsersTerritories();
                self.dispatchEvent(CONSTANTS.PROJECT_CLOSED, projectId);
                callback(null);
            });
        }

        /**
         *
         * @param {string} branchName - name of branch to open.
         * @param {function} [branchStatusHandler=getDefaultCommitHandler()] - Handles returned statuses after commits.
         * @param callback
         */
        this.selectBranch = function (branchName, branchStatusHandler, callback) {
            var prevBranchName = state.branchName;
            logger.debug('selectBranch', branchName);
            if (isConnected() === false) {
                callback(new Error('There is no open database connection!'));
                return;
            }
            if (!state.project) {
                callback(new Error('selectBranch invoked without an opened project'));
                return;
            }

            if (branchStatusHandler) {
                logger.warn('passing branchStatusHandler is deprecated, use addHashUpdateHandler or' +
                    ' addBranchStatusHandler on the branch object instead (getProjectObject().branches[branchName]).');
            }

            function openBranch(err) {
                if (err) {
                    logger.error('Problems closing existing branch', err);
                    callback(err);
                    return;
                }

                state.branchName = branchName;
                logger.debug('openBranch, calling storage openBranch', state.project.projectId, branchName);
                storage.openBranch(state.project.projectId, branchName,
                    getHashUpdateHandler(), getBranchStatusHandler(),
                    function (err /*, latestCommit*/) {
                        if (err) {
                            logger.error('storage.openBranch returned with error', err);
                            self.dispatchEvent(CONSTANTS.BRANCH_CHANGED, null);
                            callback(err);
                            return;
                        }

                        state.viewer = false;
                        state.branchName = branchName;
                        self.dispatchEvent(CONSTANTS.BRANCH_CHANGED, branchName);
                        logState('info', 'openBranch');
                        callback(null);
                    }
                );
            }

            if (prevBranchName !== null) {
                logger.debug('Branch was open, closing it first', prevBranchName);
                storage.closeBranch(state.project.projectId, prevBranchName, openBranch);
            } else {
                openBranch(null);
            }
        };

        this.selectCommit = function (commitHash, callback) {
            logger.debug('selectCommit', commitHash);
            if (isConnected() === false) {
                callback(new Error('There is no open database connection!'));
                return;
            }
            if (!state.project) {
                callback(new Error('selectCommit invoked without open project'));
                return;
            }
            var prevBranchName;

            function openCommit(err) {
                if (err) {
                    logger.error('Problems closing existing branch', err);
                    callback(err);
                    return;
                }

                state.viewer = true;

                state.project.loadObject(commitHash, function (err, commitObj) {
                    if (!err && commitObj) {
                        logState('info', 'selectCommit loaded commit');
                        self.dispatchEvent(CONSTANTS.BRANCH_CHANGED, null);
                        loading(commitObj.root, commitHash, function (err, aborted) {
                            if (err) {
                                logger.error('loading returned error', commitObj.root, err);
                                logState('error', 'selectCommit loading');
                                callback(err);
                            } else if (aborted === true) {
                                logState('warn', 'selectCommit loading');
                                callback(new Error('Loading selected commit was aborted'));
                            } else {
                                logger.debug('loading complete for selectCommit rootHash', commitObj.root);
                                logState('info', 'selectCommit loading');
                                self.dispatchEvent(CONSTANTS.BRANCH_CHANGED, null);
                                callback(null);
                            }
                        });
                    } else {
                        logger.error('Cannot view given ' + commitHash + ' commit as it\'s root cannot be loaded! [' +
                            JSON.stringify(err) + ']');
                        callback(err || new Error('commit object cannot be found!'));
                    }
                });
            }

            if (state.branchName !== null) {
                logger.debug('Branch was open, closing it first', state.branchName);
                prevBranchName = state.branchName;
                state.branchName = null;
                storage.closeBranch(state.project.projectId, prevBranchName, openCommit);
            } else {
                openCommit(null);
            }
        };

        function getBranchStatusHandler () {
            return function (branchStatus, commitQueue, updateQueue) {
                logger.debug('branchStatus changed', branchStatus, commitQueue, updateQueue);
                logState('debug', 'branchStatus');
                state.branchStatus = branchStatus;
                self.dispatchEvent(CONSTANTS.BRANCH_STATUS_CHANGED, {
                    status: branchStatus,
                    commitQueue: commitQueue,
                    updateQueue: updateQueue}
                );
            };
        }

        function getHashUpdateHandler() {
            return function (data, commitQueue, updateQueue, callback) {
                var commitData = data.commitData,
                    clearUndoRedo = data.local !== true,
                    commitHash = commitData.commitObject[CONSTANTS.STORAGE.MONGO_ID];
                logger.debug('hashUpdateHandler invoked. project, branch, commitHash',
                    commitData.projectId, commitData.branchName, commitHash);

                if (state.inTransaction) {
                    logger.warn('Is in transaction, will not load in changes');
                    callback(null, false); // proceed: false
                    return;
                }

                //undo-redo
                addModification(commitData.commitObject, clearUndoRedo);
                self.dispatchEvent(CONSTANTS.UNDO_AVAILABLE, canUndo());
                self.dispatchEvent(CONSTANTS.REDO_AVAILABLE, canRedo());

                logger.debug('loading commitHash, local?', commitHash, data.local);
                loading(commitData.commitObject.root, commitHash, function (err, aborted) {
                    if (err) {
                        logger.error('hashUpdateHandler invoked loading and it returned error',
                            commitData.commitObject.root, err);
                        logState('error', 'hashUpdateHandler');
                        callback(err, false); // proceed: false
                    } else if (aborted === true) {
                        logState('warn', 'hashUpdateHandler');
                        callback(null, false); // proceed: false
                    } else {
                        logger.debug('loading complete for incoming rootHash', commitData.commitObject.root);
                        logState('debug', 'hashUpdateHandler');
                        callback(null, true); // proceed: true
                    }
                });
            };
        }

        this.forkCurrentBranch = function (newName, commitHash, callback) {
            var self = this,
                activeBranchName = self.getActiveBranchName(),
                activeProjectId = self.getActiveProjectId(),
                forkName;

            logger.debug('forkCurrentBranch', newName, commitHash);
            if (!state.project) {
                callback('Cannot fork without an open project!');
                return;
            }
            if (activeBranchName === null) {
                callback('Cannot fork without an open branch!');
                return;
            }
            forkName = newName || activeBranchName + '_' + (new Date()).getTime();
            storage.forkBranch(activeProjectId, activeBranchName, forkName, commitHash,
                function (err, forkHash) {
                    if (err) {
                        logger.error('Could not fork branch:', newName, err);
                        callback(err);
                        return;
                    }
                    callback(null, forkName, forkHash);
                }
            );
        };

        // State getters.
        this.getNetworkStatus = function () {
            return state.connection;
        };

        this.getBranchStatus = function () {
            return state.branchStatus;
        };

        this.getActiveProjectId = function () {
            return state.project && state.project.projectId;
        };

        this.getActiveBranchName = function () {
            return state.branchName;
        };

        this.getActiveCommitHash = function () {
            return state.commitHash;
        };

        this.getActiveRootHash = function () {
            return state.rootHash;
        };

        this.isProjectReadOnly = function () {
            return state.readOnlyProject;
        };

        this.isCommitReadOnly = function () {
            // This means that a specific commit is selected w/o regards to any branch.
            return state.viewer;
        };

        this.getProjectObject = function () {
            return state.project;
        };

        // Undo/Redo functionality
        function addModification(commitObject, clear) {
            var newItem,
                commitHash = commitObject[CONSTANTS.STORAGE.MONGO_ID],
                currItem;
            if (clear) {
                logger.debug('foreign modification clearing undo-redo chain');
                state.undoRedoChain = {
                    commitHash: commitHash,
                    rootHash: commitObject.root,
                    previous: null,
                    next: null
                };
                return;
            }

            // Check if the modification already exist, i.e. commit is from undoing or redoing.
            currItem = state.undoRedoChain;
            while (currItem) {
                if (currItem.commitHash === commitHash) {
                    return;
                }
                currItem = currItem.previous;
            }

            currItem = state.undoRedoChain;
            while (currItem) {
                if (currItem.commitHash === commitHash) {
                    return;
                }
                currItem = currItem.next;
            }

            newItem = {
                commitHash: commitHash,
                rootHash: commitObject.root,
                previous: state.undoRedoChain,
                next: null
            };
            state.undoRedoChain.next = newItem;
            state.undoRedoChain = newItem;
        }

        function canUndo() {
            var result = false;
            if (state.undoRedoChain && state.undoRedoChain.previous) {
                result = true;
            }

            return result;
        }

        function canRedo() {
            var result = false;
            if (state.undoRedoChain && state.undoRedoChain.next) {
                result = true;
            }

            return result;
        }

        this.undo = function (branchName, callback) {
            if (canUndo() === false) {
                callback(new Error('unable to make undo'));
                return;
            }

            state.undoRedoChain = state.undoRedoChain.previous;

            logState('info', 'undo [before setBranchHash]');
            storage.setBranchHash(state.project.projectId, branchName, state.undoRedoChain.commitHash, state.commitHash,
                function (err) {
                    if (err) {
                        //TODO do we need to handle this? How?
                        callback(err);
                        return;
                    }
                    logState('info', 'undo [after setBranchHash]');
                    callback(null);
                }
            );

        };

        this.redo = function (branchName, callback) {
            if (canRedo() === false) {
                callback(new Error('unable to make redo'));
                return;
            }

            state.undoRedoChain = state.undoRedoChain.next;

            logState('info', 'redo [before setBranchHash]');
            storage.setBranchHash(state.project.projectId, branchName, state.undoRedoChain.commitHash, state.commitHash,
                function (err) {
                    if (err) {
                        //TODO do we need to handle this? How?
                        callback(err);
                        return;
                    }
                    logState('info', 'redo [after setBranchHash]');
                    callback(null);
                }
            );
        };

        // REST-like functions and forwarded to storage TODO: add these to separate base class

        //  Getters
        this.getProjects = function (options, callback) {
            var asObject;
            if (isConnected()) {
                if (options.asObject) {
                    asObject = true;
                    delete options.asObject;
                }
                storage.getProjects(options, function (err, result) {
                    var i,
                        resultObj = {};
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (asObject === true) {
                        for (i = 0; i < result.length; i += 1) {
                            resultObj[result[i]._id] = result[i];
                        }
                        callback(null, resultObj);
                    } else {
                        callback(null, result);
                    }
                });
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getProjectsAndBranches = function (asObject, callback) {
            //This is kept for the tests.
            self.getProjects({rights: true, branches: true, asObject: asObject}, callback);
        };

        this.getBranches = function (projectId, callback) {
            if (isConnected()) {
                storage.getBranches(projectId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getCommits = function (projectId, before, number, callback) {
            if (isConnected()) {
                storage.getCommits(projectId, before, number, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getLatestCommitData = function (projectId, branchName, callback) {
            if (isConnected()) {
                storage.getLatestCommitData(projectId, branchName, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        //  Setters
        this.createProject = function (projectName, parameters, callback) {
            if (isConnected()) {
                storage.createProject(projectName, parameters, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.deleteProject = function (projectId, callback) {
            if (isConnected()) {
                storage.deleteProject(projectId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.transferProject = function (projectId, newOwnerId, callback) {
            if (isConnected()) {
                storage.transferProject(projectId, newOwnerId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.createBranch = function (projectId, branchName, newHash, callback) {
            if (isConnected()) {
                storage.createBranch(projectId, branchName, newHash, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.deleteBranch = function (projectId, branchName, oldHash, callback) {
            if (isConnected()) {
                storage.deleteBranch(projectId, branchName, oldHash, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        // Watchers (used in e.g. ProjectNavigator).
        /**
         * Triggers eventHandler(storage, eventData) on PROJECT_CREATED and PROJECT_DELETED.
         *
         * eventData = {
         *    etype: PROJECT_CREATED||DELETED,
         *    projectId: %id of project%
         * }
         *
         * @param {function} eventHandler
         * @param {function} [callback]
         */
        this.watchDatabase = function (eventHandler, callback) {
            callback = callback || function (err) {
                    if (err) {
                        logger.error('Problems watching database room');
                    }
                };
            storage.watchDatabase(eventHandler, callback);
        };

        this.unwatchDatabase = function (eventHandler, callback) {
            callback = callback || function (err) {
                    if (err) {
                        logger.error('Problems unwatching database room');
                    }
                };
            storage.unwatchDatabase(eventHandler, callback);
        };

        /**
         * Triggers eventHandler(storage, eventData) on BRANCH_CREATED, BRANCH_DELETED and BRANCH_HASH_UPDATED
         * for the given projectId.
         *
         *
         * eventData = {
         *    etype: BRANCH_CREATED||DELETED||HASH_UPDATED,
         *    projectId: %id of project%,
         *    branchName: %name of branch%,
         *    newHash: %new commitHash (='' when DELETED)%
         *    oldHash: %previous commitHash (='' when CREATED)%
         * }
         *
         * @param {string} projectId
         * @param {function} eventHandler
         * @param {function} [callback]
         */
        this.watchProject = function (projectId, eventHandler, callback) {
            callback = callback || function (err) {
                    if (err) {
                        logger.error('Problems watching project room', projectId);
                    }
                };
            storage.watchProject(projectId, eventHandler, callback);
        };

        this.unwatchProject = function (projectId, eventHandler, callback) {
            callback = callback || function (err) {
                    if (err) {
                        logger.error('Problems unwatching project room', projectId);
                    }
                };
            storage.unwatchProject(projectId, eventHandler, callback);
        };

        // Internal functions
        function isConnected() {
            return state.connection === CONSTANTS.STORAGE.CONNECTED ||
                state.connection === CONSTANTS.STORAGE.RECONNECTED;
        }

        var ROOT_PATH = ''; //FIXME: This should come from constants..

        function COPY(object) {
            if (object) {
                return JSON.parse(JSON.stringify(object));
            }
            return null;
        }

        // Node handling
        this.getNode = function (nodePath) {
            return getNode(nodePath, logger, state, self.meta, storeNode);
        };

        function getStringHash(/* node */) {
            //TODO there is a memory issue with the huge strings so we have to replace it with something
            state.gHash += 1;
            return state.gHash;
        }

        function getModifiedNodes(newerNodes) {
            var modifiedNodes = [],
                i;

            for (i in state.nodes) {
                if (state.nodes.hasOwnProperty(i)) {
                    if (newerNodes[i]) {
                        if (newerNodes[i].hash !== state.nodes[i].hash && state.nodes[i].hash !== '') {
                            modifiedNodes.push(i);
                        }
                    }
                }
            }
            return modifiedNodes;
        }

        //this is just a first brute implementation it needs serious optimization!!!
        function fitsInPatternTypes(path, pattern) {
            var i;

            if (pattern.items && pattern.items.length > 0) {
                for (i = 0; i < pattern.items.length; i += 1) {
                    if (self.meta.isTypeOf(path, pattern.items[i])) {
                        return true;
                    }
                }
                return false;
            } else {
                return true;
            }
        }

        function patternToPaths(patternId, pattern, pathsSoFar) {
            var children,
                subPattern,
                i;

            if (state.nodes[patternId]) {
                pathsSoFar[patternId] = true;
                if (pattern.children && pattern.children > 0) {
                    children = state.core.getChildrenPaths(state.nodes[patternId].node);
                    subPattern = COPY(pattern);
                    subPattern.children -= 1;
                    for (i = 0; i < children.length; i += 1) {
                        if (fitsInPatternTypes(children[i], pattern)) {
                            patternToPaths(children[i], subPattern, pathsSoFar);
                        }
                    }
                }
            } else {
                state.loadError++;
            }
        }

        function userEvents(userId, modifiedNodes) {
            var newPaths = {},
                startErrorLevel = state.loadError,
                i,
                events = [];

            for (i in state.users[userId].PATTERNS) {
                if (state.users[userId].PATTERNS.hasOwnProperty(i)) {
                    if (state.nodes[i]) { //TODO we only check pattern if its root is there...
                        patternToPaths(i, state.users[userId].PATTERNS[i], newPaths);
                    }
                }
            }

            if (startErrorLevel !== state.loadError) {
                return; //we send events only when everything is there correctly
            }

            //deleted items
            for (i in state.users[userId].PATHS) {
                if (!newPaths[i]) {
                    events.push({etype: 'unload', eid: i});
                }
            }

            //added items
            for (i in newPaths) {
                if (!state.users[userId].PATHS[i]) {
                    events.push({etype: 'load', eid: i});
                }
            }

            //updated items
            for (i = 0; i < modifiedNodes.length; i++) {
                if (newPaths[modifiedNodes[i]]) {
                    events.push({etype: 'update', eid: modifiedNodes[i]});
                }
            }

            state.users[userId].PATHS = newPaths;

            //this is how the events should go
            if (events.length > 0) {
                if (state.loadError > startErrorLevel) {
                    events.unshift({etype: 'incomplete', eid: null});
                } else {
                    events.unshift({etype: 'complete', eid: null});
                }
            } else {
                events.unshift({etype: 'complete', eid: null});
            }
            state.users[userId].FN(events);
        }

        function loadChildrenPattern(core, nodesSoFar, node, level, callback) {
            var path = core.getPath(node),
                childrenPaths = core.getChildrenPaths(node),
                childrenRelids = core.getChildrenRelids(node),
                missing = childrenPaths.length,
                error = null,
                i,
                childLoaded = function (err, child) {
                    if (err || child === null) {
                        error = error || err;
                        missing -= 1;
                        if (missing === 0) {
                            callback(error);
                        }
                    } else {
                        loadChildrenPattern(core, nodesSoFar, child, level - 1, childrenPatternLoaded);
                    }
                },
                childrenPatternLoaded = function (err) {
                    error = error || err;
                    missing -= 1;
                    if (missing === 0) {
                        callback(error);
                    }
                };
            state.metaNodes[path] = node;
            if (!nodesSoFar[path]) {
                nodesSoFar[path] = {node: node, incomplete: true, basic: true, hash: getStringHash(node)};
            }
            if (level > 0) {
                if (missing > 0) {
                    for (i = 0; i < childrenPaths.length; i++) {
                        if (nodesSoFar[childrenPaths[i]]) {
                            loadChildrenPattern(core,
                                nodesSoFar,
                                nodesSoFar[childrenPaths[i]].node,
                                level - 1, childrenPatternLoaded);
                        } else {
                            core.loadChild(node, childrenRelids[i], childLoaded);
                        }
                    }
                } else {
                    callback(error);
                }
            } else {
                callback(error);
            }
        }

        function loadPattern(core, id, pattern, nodesSoFar, callback) {
            var base = null,
                baseLoaded = function () {
                    if (pattern.children && pattern.children > 0) {
                        var level = pattern.children;
                        loadChildrenPattern(core, nodesSoFar, base, level, callback);
                    } else {
                        callback(null);
                    }
                };

            if (nodesSoFar[id]) {
                base = nodesSoFar[id].node;
                baseLoaded();
            } else {
                base = null;
                if (state.loadNodes[ROOT_PATH]) {
                    base = state.loadNodes[ROOT_PATH].node;
                } else if (state.nodes[ROOT_PATH]) {
                    base = state.nodes[ROOT_PATH].node;
                }
                core.loadByPath(base, id, function (err, node) {
                    var path;
                    if (!err && node && !core.isEmpty(node)) {
                        path = core.getPath(node);
                        state.metaNodes[path] = node;
                        if (!nodesSoFar[path]) {
                            nodesSoFar[path] = {
                                node: node,
                                incomplete: false,
                                basic: true,
                                hash: getStringHash(node)
                            };
                        }
                        base = node;
                        baseLoaded();
                    } else {
                        callback(err);
                    }
                });
            }
        }

        function orderStringArrayByElementLength(strArray) {
            var ordered = [],
                i, j, index;

            for (i = 0; i < strArray.length; i++) {
                index = -1;
                j = 0;
                while (index === -1 && j < ordered.length) {
                    if (ordered[j].length > strArray[i].length) {
                        index = j;
                    }
                    j++;
                }

                if (index === -1) {
                    ordered.push(strArray[i]);
                } else {
                    ordered.splice(index, 0, strArray[i]);
                }
            }
            return ordered;
        }

        function loadRoot(newRootHash, callback) {
            //with the newer approach we try to optimize a bit the mechanism of the loading and
            // try to get rid of the parallelism behind it
            var patterns = {},
                orderedPatternIds = [],
                error = null,
                i,
                j,
                keysi,
                keysj;

            state.loadNodes = {};
            state.loadError = 0;

            //gathering the patterns
            keysi = Object.keys(state.users);
            for (i = 0; i < keysi.length; i++) {
                keysj = Object.keys(state.users[keysi[i]].PATTERNS);
                for (j = 0; j < keysj.length; j++) {
                    if (patterns[keysj[j]]) {
                        //we check if the range is bigger for the new definition
                        if (patterns[keysj[j]].children < state.users[keysi[i]].PATTERNS[keysj[j]].children) {
                            patterns[keysj[j]].children = state.users[keysi[i]].PATTERNS[keysj[j]].children;
                        }
                    } else {
                        patterns[keysj[j]] = state.users[keysi[i]].PATTERNS[keysj[j]];
                    }
                }
            }
            //getting an ordered key list
            orderedPatternIds = Object.keys(patterns);
            orderedPatternIds = orderStringArrayByElementLength(orderedPatternIds);


            //and now the one-by-one loading
            state.core.loadRoot(newRootHash, function (err, root) {
                var fut,
                    _loadPattern;

                ASSERT(err || root);

                state.rootObject = root;
                addOnFunctions.updateRunningAddOns(root);
                error = error || err;
                if (!err) {
                    //_clientGlobal.addOn.updateRunningAddOns(root); //FIXME: ADD ME BACK!!
                    state.loadNodes[state.core.getPath(root)] = {
                        node: root,
                        incomplete: true,
                        basic: true,
                        hash: getStringHash(root)
                    };
                    state.metaNodes[state.core.getPath(root)] = root;
                    if (orderedPatternIds.length === 0 && Object.keys(state.users) > 0) {
                        //we have user, but they do not interested in any object -> let's relaunch them :D
                        callback(null);
                        reLaunchUsers();
                    } else {
                        _loadPattern = TASYNC.throttle(TASYNC.wrap(loadPattern), 1);
                        fut = TASYNC.lift(
                            orderedPatternIds.map(function (pattern /*, index */) {
                                return TASYNC.apply(_loadPattern,
                                    [state.core, pattern, patterns[pattern], state.loadNodes],
                                    this);
                            }));
                        TASYNC.unwrap(function () {
                            return fut;
                        })(callback);
                    }
                } else {
                    callback(err);
                }
            });
        }

        //this is just a first brute implementation it needs serious optimization!!!
        function loading(newRootHash, newCommitHash, callback) {
            var firstRoot = !state.nodes[ROOT_PATH],
                originatingRootHash = state.nodes[ROOT_PATH] ? state.core.getHash(state.nodes[ROOT_PATH].node) : null,
                finalEvents = function () {
                    var modifiedPaths,
                        i;
                    logger.debug('firing finalEvents from loading for new rootHash', newRootHash);
                    modifiedPaths = getModifiedNodes(state.loadNodes);
                    state.nodes = state.loadNodes;
                    state.loadNodes = {};
                    // We have now loaded the new root from the commit, update the state
                    state.rootHash = newRootHash;
                    state.commitHash = newCommitHash;

                    for (i in state.users) {
                        if (state.users.hasOwnProperty(i)) {
                            userEvents(i, modifiedPaths);
                        }
                    }
                    callback(null);
                };
            logger.debug('loading originatingRootHash, newRootHash', originatingRootHash, newRootHash);

            callback = callback || function (/*err*/) {
                };


            loadRoot(newRootHash, function (err) {
                if (err) {
                    state.rootHash = null;
                    callback(err);
                } else {
                    if (firstRoot ||
                        state.core.getHash(state.nodes[ROOT_PATH].node) === originatingRootHash) {
                        finalEvents();
                    } else {
                        // This relies on the fact that loading is synchronous for local updates.
                        logger.warn('Modifications were done during loading - load aborted.');
                        callback(null, true);
                    }
                }
            });
        }

        this.startTransaction = function (msg) {
            if (state.inTransaction) {
                logger.error('Already in transaction, will proceed though..');
            }
            if (state.core) {
                state.inTransaction = true;
                msg = msg || 'startTransaction()';
                saveRoot(msg);
            } else {
                logger.error('Can not start transaction with no core avaliable.');
            }
        };

        this.completeTransaction = function (msg, callback) {
            state.inTransaction = false;
            if (state.core) {
                msg = msg || 'completeTransaction()';
                saveRoot(msg, callback);
            }
        };

        //territory functions
        this.addUI = function (ui, fn, guid) {
            ASSERT(fn);
            ASSERT(typeof fn === 'function');
            guid = guid || GUID();
            state.users[guid] = {type: 'notused', UI: ui, PATTERNS: {}, PATHS: {}, SENDEVENTS: true, FN: fn};
            return guid;
        };

        this.removeUI = function (guid) {
            logger.debug('removeUI', guid);
            delete state.users[guid];
        };

        function reLaunchUsers() {
            var i;
            for (i in state.users) {
                if (state.users.hasOwnProperty(i)) {
                    if (state.users[i].UI.reLaunch) {
                        state.users[i].UI.reLaunch();
                    }
                }
            }
        }

        function _updateTerritoryAllDone(guid, patterns, error) {
            if (state.users[guid]) {
                state.users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
                if (!error) {
                    userEvents(guid, []);
                }
            }
        }

        this.updateTerritory = function (guid, patterns) {
            var missing,
                error,
                patternLoaded,
                i;

            if (state.users[guid]) {
                if (state.project) {
                    if (state.nodes[ROOT_PATH]) {
                        //TODO: this has to be optimized
                        missing = 0;
                        error = null;

                        patternLoaded = function (err) {
                            error = error || err;
                            missing -= 1;
                            if (missing === 0) {
                                //allDone();
                                _updateTerritoryAllDone(guid, patterns, error);
                            }
                        };

                        for (i in patterns) {
                            missing += 1;
                        }
                        if (missing > 0) {
                            for (i in patterns) {
                                if (patterns.hasOwnProperty(i)) {
                                    loadPattern(state.core, i, patterns[i], state.nodes, patternLoaded);
                                }
                            }
                        } else {
                            //allDone();
                            _updateTerritoryAllDone(guid, patterns, error);
                        }
                    } else {
                        //something funny is going on
                        if (state.loadNodes[ROOT_PATH]) {
                            //probably we are in the loading process,
                            // so we should redo this update when the loading finishes
                            //setTimeout(updateTerritory, 100, guid, patterns);
                        } else {
                            //root is not in nodes and has not even started to load it yet...
                            state.users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
                        }
                    }
                } else {
                    //we should update the patterns, but that is all
                    state.users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
                }
            }
        };

        function cleanUsersTerritories() {
            //look out as the user can remove itself at any time!!!
            var userIds = Object.keys(state.users),
                i,
                j,
                events;

            for (i = 0; i < userIds.length; i++) {
                if (state.users[userIds[i]]) {
                    events = [{eid: null, etype: 'complete'}];
                    for (j in state.users[userIds[i]].PATHS
                        ) {
                        events.push({etype: 'unload', eid: j});
                    }
                    state.users[userIds[i]].PATTERNS = {};
                    state.users[userIds[i]].PATHS = {};
                    state.users[userIds[i]].SENDEVENTS = true;
                    state.users[userIds[i]].FN(events);
                }
            }
        }

        this.getUserId = function () {
            var cookies = URL.parseCookie(document.cookie);
            if (cookies.webgme) {
                return cookies.webgme;
            } else {
                return 'n/a';
            }
        };

        //create from file
        this.createProjectFromFile = function (projectName, branchName, jProject, ownerId, callback) {
            branchName = branchName || 'master';
            if (callback === undefined && typeof ownerId === 'function') {
                callback = ownerId;
                ownerId = undefined;
            }

            storage.createProject(projectName, ownerId, function (err, projectId) {
                if (err) {
                    callback(err);
                    return;
                }
                storage.openProject(projectId, function (err, project) {
                    var core,
                        rootNode,
                        persisted;
                    if (err) {
                        callback(err);
                        return;
                    }

                    core = new Core(project, {
                        globConf: gmeConfig,
                        logger: logger.fork('core')
                    });

                    rootNode = core.createNode({parent: null, base: null});
                    Serialization.import(core, rootNode, jProject, function (err) {
                        if (err) {
                            return callback(err);
                        }

                        persisted = core.persist(rootNode);

                        storage.makeCommit(projectId,
                            null,
                            [],
                            persisted.rootHash,
                            persisted.objects,
                            'creating project from a file',
                            function (err, commitResult) {
                                if (err) {
                                    logger.error('cannot make initial commit for project creation from file');
                                    callback(err);
                                    return;
                                }

                                project.createBranch(branchName, commitResult.hash, function (err) {
                                    if (err) {
                                        logger.error('cannot set branch \'master\' for project creation from file');
                                        callback(err);
                                        return;
                                    }

                                    storage.closeProject(projectId, function (err) {
                                        if (err) {
                                            logger.error('Closing temporary project failed in project creation ' +
                                                'from file', err);
                                            callback(err);
                                            return;
                                        }
                                        callback(null, projectId, branchName);
                                    });
                                });
                            }
                        );
                    });
                });
            });
        };

        //seed
        this.seedProject = function (parameters, callback) {
            logger.debug('seeding project', parameters);
            parameters.command = 'seedProject';
            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        };

        //export branch
        this.getExportProjectBranchUrl = function (projectId, branchName, fileName, callback) {
            var command = {};
            command.command = 'exportLibrary';
            command.projectId = projectId;
            command.branchName = branchName;
            command.path = ROOT_PATH;
            logger.debug('getExportProjectBranchUrl, command', command);
            if (command.projectId && command.branchName) {
                storage.simpleRequest(command, function (err, result) {
                    if (err) {
                        logger.error('getExportProjectBranchUrl failed with error', err);
                        callback(err);
                    } else {
                        callback(null, result.file.url);
                    }
                });
            } else {
                callback(new Error('invalid parameters!'));
            }
        };

        this.getExportItemsUrl = function (paths, filename, callback) {
            callback(new Error('getExportItemsUrl is no longer supported!'));
        }
        //library functions
        this.getExportLibraryUrl = function (libraryRootPath, filename, callback) {
            var command = {};
            command.command = 'exportLibrary';
            command.projectId = state.project.projectId;
            command.hash = state.rootHash;
            command.path = libraryRootPath;
            if (command.projectId && command.hash) {
                storage.simpleRequest(command, function (err, result) {
                    if (err) {
                        logger.error('getExportLibraryUrl failed with error', err);
                        callback(err);
                    } else {
                        callback(null, result.file.url);
                    }
                });
            } else {
                callback(new Error('there is no open project!'));
            }
        };

        this.updateLibrary = function (libraryRootPath, newLibrary, callback) {
            Serialization.import(state.core, state.nodes[libraryRootPath].node, newLibrary, function (err, log) {
                if (err) {
                    return callback(err);
                }

                saveRoot('library update done\nlogs:\n' + log, callback);
            });
        };

        this.addLibrary = function (libraryParentPath, newLibrary, callback) {
            self.startTransaction('creating library as a child of ' + libraryParentPath);
            var libraryRoot = self.createChild({
                parentId: libraryParentPath,
                baseId: null
            }, 'library placeholder');
            Serialization.import(state.core,
                state.nodes[libraryRoot].node, newLibrary, function (err, log) {
                    if (err) {
                        return callback(err);
                    }

                    self.completeTransaction('library update done\nlogs:\n' + log, callback);
                }
            );
        };

        /**
         * Run the plugin on the server inside a worker process.
         * @param {string} name - name of plugin.
         * @param {object} context
         * @param {object} context.managerConfig - where the plugin should execute.
         * @param {string} context.managerConfig.project - id of project.
         * @param {string} context.managerConfig.activeNode - path to activeNode.
         * @param {string} [context.managerConfig.activeSelection=[]] - paths to selected nodes.
         * @param {string} context.managerConfig.commit - commit hash to start the plugin from.
         * @param {string} context.managerConfig.branchName - branch which to save to.
         * @param {object} [context.pluginConfig=%defaultForPlugin%] - specific configuration for the plugin.
         * @param {function} callback
         */
        this.runServerPlugin = function (name, context, callback) {
            storage.simpleRequest({command: 'executePlugin', name: name, context: context}, callback);
        };

        /**
         * @param {string[]} pluginNames - All avaliable plugins from server.
         * @param {string} [nodePath=''] - Node to get the validPlugins from.
         * @returns {string[]} - Filtered plugin names.
         */
        this.filterPlugins = function (pluginNames, nodePath) {
            var filteredNames = [],
                validPlugins,
                i,
                node;

            logger.debug('filterPluginsBasedOnNode allPlugins, given nodePath', pluginNames, nodePath);
            if (!nodePath) {
                logger.debug('filterPluginsBasedOnNode nodePath not given - will fall back on root-node.');
                nodePath = ROOT_PATH;
            }

            node = state.nodes[nodePath];

            if (!node) {
                logger.warn('filterPluginsBasedOnNode node not loaded - will fall back on root-node.', nodePath);
                nodePath = ROOT_PATH;
                node = state.nodes[nodePath];
            }

            if (!node) {
                logger.warn('filterPluginsBasedOnNode root node not loaded - will return full list.');
                return pluginNames;
            }

            validPlugins = (state.core.getRegistry(node.node, 'validPlugins') || '').split(' ');
            for (i = 0; i < validPlugins.length; i += 1) {
                if (pluginNames.indexOf(validPlugins[i]) > -1) {
                    filteredNames.push(validPlugins[i]);
                } else {
                    logger.warn('Registered plugin for node at path "' + nodePath +
                        '" is not amongst avaliable plugins', pluginNames);
                }
            }

            return filteredNames;
        };

        //addOn
        this.validateProjectAsync = addOnFunctions.validateProjectAsync;
        this.validateModelAsync = addOnFunctions.validateModelAsync;
        this.validateNodeAsync = addOnFunctions.validateNodeAsync;
        this.setValidationCallback = addOnFunctions.setValidationCallback;
        this.getDetailedHistoryAsync = addOnFunctions.getDetailedHistoryAsync;
        this.getRunningAddOnNames = addOnFunctions.getRunningAddOnNames;
        this.addOnsAllowed = gmeConfig.addOn.enable === true;

        //constraint
        this.setConstraint = function (path, name, constraintObj) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.setConstraint(state.nodes[path].node, name, constraintObj);
                saveRoot('setConstraint(' + path + ',' + name + ')');
            }
        };

        this.delConstraint = function (path, name) {
            if (state.core && state.nodes[path] && typeof state.nodes[path].node === 'object') {
                state.core.delConstraint(state.nodes[path].node, name);
                saveRoot('delConstraint(' + path + 'name' + ')');
            }
        };

        //automerge
        this.autoMerge = function (projectId, mine, theirs, callback) {
            var command = {
                command: 'autoMerge',
                projectId: projectId,
                mine: mine,
                theirs: theirs
            };
            storage.simpleRequest(command, function (err, result) {
                if (err) {
                    logger.error('autoMerge failed with error', err);
                    callback(err);
                } else {
                    callback(null, result);
                }
            });
        };

        this.resolve = function (mergeResult, callback) {
            var command = {
                command: 'resolve',
                partial: mergeResult
            };
            storage.simpleRequest(command, function (err, result) {
                if (err) {
                    logger.error('resolve failed with error', err);
                    callback(err);
                } else {
                    callback(null, result);
                }
            });
        };
    }


    // Inherit from the EventDispatcher
    Client.prototype = Object.create(EventDispatcher.prototype);
    Client.prototype.constructor = Client;

    return Client;
});