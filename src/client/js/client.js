/*globals define*/
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
    'js/client/gmeNodeGetter',
    'js/client/gmeNodeSetter'
], function (Logger,
             Storage,
             EventDispatcher,
             Core,
             CONSTANTS,
             META,
             ASSERT,
             TASYNC,
             GUID,
             getNode,
             getNodeSetters) {
    'use strict';

    function Client(gmeConfig) {
        var self = this,
            logger = Logger.create('gme:client', gmeConfig.client.log),
            storage = Storage.getStorage(logger, gmeConfig),
            state = {
                connection: null, // CONSTANTS.STORAGE. CONNECTED/DISCONNECTED/RECONNECTED
                project: null,
                core: null,
                branchName: null,
                branchStatus: null,
                readOnlyProject: false,
                viewer: false, // This means that a specific commit is selected w/o regards to any branch.
                users: {},
                patterns: {},
                gHash: 0,
                nodes: {},
                metaNodes: {},
                loadNodes: {},
                loadError: null,
                root: {
                    current: null,
                    previous: null,
                    object: null
                },
                commit: {
                    current: null,
                    previous: null
                },
                undoRedoChain: null, //{commit: '#hash', root: '#hash', previous: object, next: object}
                inTransaction: false,
                msg: ''
            },
            monkeyPatchKey,
            nodeSetterFunctions = getNodeSetters(logger, state, saveRoot, storeNode);

        EventDispatcher.call(this);

        function logState(level, msg) {
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
                } else if (key === 'root') {
                    return {
                        current: value.current,
                        previous: value.previous
                    };
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
                                commit: chainItem.commit,
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
                                commit: chainItem.commit,
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

            logger[level]('state at ' + msg, JSON.stringify(state, replacer, 2));
            //logger[level]('state', state);
        }

        this.meta = new META();
        //TODO: These should be accessed via this.meta.
        //TODO: e.g. client.meta.getMetaAspectNames(id) instead of client.getMetaAspectNames(id)
        //TODO: However that will break a lot since it's used all over the place...
        for (monkeyPatchKey in this.meta) {
            if (this.meta.hasOwnProperty(monkeyPatchKey)) {
                self[monkeyPatchKey] = this.meta[monkeyPatchKey];
            }
        }

        for (monkeyPatchKey in nodeSetterFunctions) {
            if (nodeSetterFunctions.hasOwnProperty(monkeyPatchKey)) {
                self[monkeyPatchKey] = nodeSetterFunctions[monkeyPatchKey];
            }
        }

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
            if (isConnected()) {
                storage.close();
                state.connection = CONSTANTS.STORAGE.DISCONNECTED;
                callback(null);
            } else {
                logger.warn('Trying to disconnect when already disconnected.');
                callback(null);
            }
        };

        this.selectProject = function (projectName, callback) {
            var prevProjectName,
                branchToOpen = 'master';

            function projectOpened(err, project, branches) {
                if (err) {
                    throw new Error(err);
                }
                state.project = project;
                state.readOnlyProject = false; //TODO: this should be returned from the storage
                state.core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });
                self.meta.initialize(state.core, state.metaNodes, saveRoot);
                logState('info', 'projectOpened');
                self.dispatchEvent(CONSTANTS.PROJECT_OPENED, projectName);

                if (branches.hasOwnProperty('master') === false) {
                    branchToOpen = Object.keys(branches)[0] || null;
                    logger.debug('Project "' + projectName + '" did not have a master branch, picked:', branchToOpen);
                }
                ASSERT(branchToOpen, 'No branch avaliable in project'); // TODO: Deal with this
                self.selectBranch(branchToOpen, null, function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    logState('info', 'selectBranch');
                    reLaunchUsers();
                    callback();
                });
            }

            if (state.project) {
                prevProjectName = state.project.name;
                if (prevProjectName === projectName) {
                    logger.warn('projectName is already opened', projectName);
                    callback(null);
                    return;
                }
                state.project = null;
                //TODO what if for some reason we are in transaction?
                storage.closeProject(prevProjectName, function (err) {
                    if (err) {
                        throw new Error(err);
                    }
                    state.core = null;
                    state.branchName = null;
                    state.branchStatus = null;
                    state.patterns = {};
                    //state.gHash = 0;
                    state.nodes = {};
                    state.metaNodes = {};
                    state.loadNodes = {};
                    state.loadError = 0;
                    state.root.current = null;
                    state.root.previous = null;
                    //state.root.object = null;
                    state.inTransaction = false;
                    state.msg = '';

                    cleanUsersTerritories();
                    //TODO: Does it matter if we dispatch these before or after the storage.closeProject?
                    self.dispatchEvent(CONSTANTS.PROJECT_CLOSED, prevProjectName);
                    storage.openProject(projectName, projectOpened);
                });
            } else {
                storage.openProject(projectName, projectOpened);
            }
        };

        /**
         *
         * @param {string} branchName - name of branch to open.
         * @param {function} [commitHandler=getDefaultCommitHandler()] - Handles returned statuses after commits.
         * @param callback
         */
        this.selectBranch = function (branchName, commitHandler, callback) {
            logger.debug('selectBranch', branchName);
            if (isConnected() === false) {
                callback(new Error('There is no open database connection!'));
                return;
            }
            if (!state.project) {
                callback(new Error('selectBranch invoked without open project'));
                return;
            }

            var prevBranchName = state.branchName;

            if (prevBranchName === branchName) {
                logger.warn('branchName is already opened', branchName);
                callback(null);
                return;
            }

            function openBranch(err) {
                if (err) {
                    logger.error('Problems closing existing branch', err);
                    callback(err);
                    return;
                }
                commitHandler = commitHandler || getDefaultCommitHandler();
                storage.openBranch(state.project.name, branchName, getUpdateHandler(), commitHandler,
                    function (err, latestCommit) {
                        var commitObject;
                        if (err) {
                            logger.error('storage.openBranch returned with error', err);
                            callback(err);
                            return;
                        }
                        commitObject = latestCommit.commitObject;
                        logger.debug('Branch opened latestCommit', latestCommit);

                        //addCommit(commitObject[CONSTANTS.STORAGE.MONGO_ID]);

                        //undo-redo
                        logger.debug('changing branch - cleaning undo-redo chain');
                        addModification(commitObject, true);
                        self.dispatchEvent(CONSTANTS.UNDO_AVAILABLE, canUndo());
                        self.dispatchEvent(CONSTANTS.REDO_AVAILABLE, canRedo());

                        state.viewer = false;
                        state.branchName = branchName;
                        state.branchStatus = CONSTANTS.STORAGE.SYNCH;
                        logState('info', 'openBranch');
                        self.dispatchEvent(CONSTANTS.BRANCH_CHANGED, branchName);
                        self.dispatchEvent(CONSTANTS.BRANCH_STATUS_CHANGED, state.branchStatus);

                        loading(commitObject.root, function (err) {
                            if (err) {
                                logger.error('loading failed after opening branch', branchName);
                            } else {
                                addCommit(commitObject[CONSTANTS.STORAGE.MONGO_ID]);
                            }
                            callback(err);
                        });
                    }
                );
            }

            if (state.branchName !== null) {
                logger.debug('Other branch was open, closing it first', state.branchName);
                prevBranchName = state.branchName;
                state.branchName = null;
                state.branchStatus = null;
                storage.closeBranch(state.project.name, prevBranchName, openBranch);
            } else {
                openBranch(null);
            }
        };

        this.selectCommit = function (commitHash, callback) {
            ASSERT(state.project, 'selectCommit invoked without an open project.');
            logger.debug('selectCommit', commitHash);
            var prevBranchName;

            function openCommit(err) {
                if (err) {
                    logger.error('Problems closing existing branch', err);
                    callback(err);
                    return;
                }

                state.viewer = true;
                self.dispatchEvent(CONSTANTS.BRANCH_CHANGED, null);
                state.project.loadObject(commitHash, function (err, commitObj) {
                    if (!err && commitObj) {
                        logState('info', 'selectCommit loaded commit');
                        loading(commitObj.root, function (err, aborted) {
                            if (err) {
                                logger.error('loading returned error', commitObj.root, err);
                                logState('error', 'selectCommit loading');
                                callback(true);
                            } else if (aborted === true) {
                                logState('warn', 'selectCommit loading');
                                callback(true);
                            } else {
                                addCommit(commitHash);
                                logger.debug('loading complete for selectCommit rootHash', commitObj.root);
                                logState('info', 'selectCommit loading');
                                callback(false);
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
                state.branchStatus = null;
                storage.closeBranch(state.project.name, prevBranchName, openCommit);
            } else {
                openCommit(null);
            }
        };

        function getDefaultCommitHandler() {
            return function (commitQueue, result, callback) {
                logger.debug('default commitHandler invoked, result: ', result);
                logger.debug('commitQueue', commitQueue);
                //TODO: dispatch an event showing how far off from the origin we are.
                if (result.status === CONSTANTS.STORAGE.SYNCH) {
                    logger.debug('You are in synch.');
                    if (commitQueue.length === 0) {
                        logger.debug('No commits queued.');
                    } else {
                        logger.debug('Will proceed with next queued commit...');
                    }
                    if (state.branchStatus !== CONSTANTS.STORAGE.SYNCH) {
                        state.branchStatus = CONSTANTS.STORAGE.SYNCH;
                        self.dispatchEvent(CONSTANTS.BRANCH_STATUS_CHANGED, CONSTANTS.STORAGE.SYNCH);
                    }
                    logState('info', 'commitHandler');
                    callback(true); // All is fine, continue with the commitQueue..
                } else if (result.status === CONSTANTS.STORAGE.FORKED) {
                    logger.debug('You got forked');
                    if (state.branchStatus !== CONSTANTS.STORAGE.FORKED) {
                        state.branchStatus = CONSTANTS.STORAGE.FORKED;
                        self.dispatchEvent(CONSTANTS.BRANCH_STATUS_CHANGED, CONSTANTS.STORAGE.FORKED);
                    }
                    logState('info', 'commitHandler');
                    callback(false);
                    alert('You got forked, TODO: \nstep one - automatically create new fork \n' +
                    'step two - add UI piece.');
                } else {
                    callback(false);
                    throw new Error('Unexpected result', result);
                }
            };
        }

        function getUpdateHandler() {
            return function (eventData, callback) {
                var commitHash = eventData.commitObject[CONSTANTS.STORAGE.MONGO_ID];
                logger.debug('updateHandler invoked. project, branch', eventData.projectName, eventData.branchName);
                logger.debug('loading commitHash', commitHash);

                //undo-redo
                logger.debug('foreign modification clearing undo-redo chain');
                addModification(eventData.commitObject, true);
                self.dispatchEvent(CONSTANTS.UNDO_AVAILABLE, canUndo());
                self.dispatchEvent(CONSTANTS.REDO_AVAILABLE, canRedo());

                loading(eventData.commitObject.root, function (err, aborted) {
                    if (err) {
                        logger.error('updatehandler invoked loading and it returned error',
                            eventData.commitObject.root, err);
                        logState('error', 'updateHandler');
                        callback(true);
                    } else if (aborted === true) {
                        logState('warn', 'updateHandler');
                        callback(true);
                    } else {
                        addCommit(commitHash);
                        logger.debug('loading complete for incoming rootHash', eventData.commitObject.root);
                        logState('info', 'updateHandler');
                        callback(false);
                    }
                });
            };
        }

        // State getters.
        this.getNetworkStatus = function () {
            return state.connection;
        };

        this.getActiveProjectName = function () {
            return state.project && state.project.name;
        };

        this.getActiveBranchName = function () {
            return state.branchName;
        };

        this.getActiveCommitHash = function () {
            return state.commit.current;
        };

        this.getActiveRootHash = function () {
            return state.root.current;
        };

        this.getBranchStatus = function () {
            return state.branchStatus;
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
            var newItem;
            if (clear) {
                state.undoRedoChain = {
                    commit: commitObject[CONSTANTS.STORAGE.MONGO_ID],
                    root: commitObject.root,
                    previous: null,
                    next: null
                };
                return;
            }

            newItem = {
                commit: commitObject[CONSTANTS.STORAGE.MONGO_ID],
                root: commitObject.root,
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

            loading(state.undoRedoChain.root, function (err) {
                //TODO do we need to handle this??
                if (err) {
                    logger.error(err);
                }
            });
            self.dispatchEvent(CONSTANTS.UNDO_AVAILABLE, canUndo());
            self.dispatchEvent(CONSTANTS.REDO_AVAILABLE, canRedo());
            logState('info', 'undo [before setBranchHash]');
            storage.setBranchHash(state.project.name,
                state.branchName, state.undoRedoChain.commit, state.commit.current, function (err) {
                    if (err) {
                        //TODO do we need to handle this? How?
                        callback(err);
                        return;
                    }

                    state.commit.current = state.undoRedoChain.commit;
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

            loading(state.undoRedoChain.root, function (err) {
                //TODO do we need to handle this??
                if (err) {
                    logger.error(err);
                }
            });
            self.dispatchEvent(CONSTANTS.UNDO_AVAILABLE, canUndo());
            self.dispatchEvent(CONSTANTS.REDO_AVAILABLE, canRedo());
            logState('info', 'redo [before setBranchHash]');
            storage.setBranchHash(state.project.name,
                state.branchName, state.undoRedoChain.commit, state.commit.current, function (err) {
                    if (err) {
                        //TODO do we need to handle this? How?
                        callback(err);
                        return;
                    }
                    state.commit.current = state.undoRedoChain.commit;
                    logState('info', 'redo [after setBranchHash]');
                    callback(null);
                }
            );
        };

        // REST-like functions and forwarded to storage TODO: add these to separate base class

        //  Getters
        this.getProjectNames = function (callback) {
            if (isConnected()) {
                storage.getProjectNames(callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getProjects = function (callback) {
            if (isConnected()) {
                storage.getProjects(callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getBranches = function (projectName, callback) {
            storage.getBranches(projectName, callback);
        };

        this.getCommits = function (projectName, before, number, callback) {
            storage.getCommits(projectName, before, number, callback);
        };

        this.getLatestCommitData = function (projectName, branchName, callback) {
            storage.getLatestCommitData(projectName, branchName, callback);
        };

        this.getProjectsAndBranches = function (asObject, callback) {
            if (isConnected()) {
                storage.getProjectsAndBranches(function (err, projectsWithBranches) {
                    var i,
                        result = {};
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (asObject === true) {
                        //Move the result in the same format as before.
                        for (i = 0; i < projectsWithBranches.length; i += 1) {
                            result[projectsWithBranches[i].name] = {
                                branches: projectsWithBranches[i].branches,
                                rights: {
                                    read: projectsWithBranches[i].read,
                                    write: projectsWithBranches[i].write,
                                    delete: projectsWithBranches[i].delete,
                                }
                            };
                        }
                        callback(null, result);
                    } else {
                        callback(null, projectsWithBranches);
                    }

                });
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        //  Setters
        this.createProject = function (projectName, parameters, callback) {
            storage.createProject(projectName, parameters, callback);
        };

        this.deleteProject = function (projectName, callback) {
            storage.deleteProject(projectName, callback);
        };

        this.createBranch = function (projectName, branchName, newHash, callback) {
            storage.createBranch(projectName, branchName, newHash, callback);
        };

        this.deleteBranch = function (projectName, branchName, oldHash, callback) {
            storage.deleteBranch(projectName, branchName, oldHash, callback);
        };

        // Watchers (used in e.g. ProjectNavigator).
        this.watchDatabase = function (eventHandler) {
            storage.watchDatabase(eventHandler);
        };

        this.unwatchDatabase = function (eventHandler) {
            storage.watchDatabase(eventHandler);
        };

        this.watchProject = function (projectName, eventHandler) {
            storage.watchProject(projectName, eventHandler);
        };

        this.unwatchProject = function (projectName, eventHandler) {
            storage.unwatchProject(projectName, eventHandler);
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

                state.root.object = root;
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
        function loading(newRootHash, callback) {
            var firstRoot = !state.nodes[ROOT_PATH],
                originatingRootHash = state.nodes[ROOT_PATH] ? state.core.getHash(state.nodes[ROOT_PATH].node) : null,
                finalEvents = function () {
                    var modifiedPaths,
                        i;

                    modifiedPaths = getModifiedNodes(state.loadNodes);
                    state.nodes = state.loadNodes;
                    state.loadNodes = {};
                    state.root.previous = state.root.current;
                    state.root.current = newRootHash;
                    for (i in state.users) {
                        if (state.users.hasOwnProperty(i)) {
                            userEvents(i, modifiedPaths);
                        }
                    }
                    callback(null);
                };
            logger.debug('loading newRootHash', newRootHash);

            callback = callback || function (/*err*/) {
            };


            loadRoot(newRootHash, function (err) {
                if (err) {
                    state.root.current = null;
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

        function saveRoot(msg, callback) {
            var persisted,
                numberOfPersistedObjects,
                newCommitObject;
            logger.debug('saveRoot msg', msg);

            callback = callback || function () {
            };
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
                    numberOfPersistedObjects = Object.keys(persisted.objects).length;
                    logger.debug('persisted', persisted);
                    if (numberOfPersistedObjects === 0) {
                        logger.warn('No changes after persist will return from saveRoot.');
                        callback(null);
                        return;
                    } else if (numberOfPersistedObjects > 200) {
                        //This is just for debugging
                        logger.warn('Lots of persisted objects', numberOfPersistedObjects);
                    }
                    // Calling event-listeners (users)
                    // N.B. it is no longer waiting for the setBranchHash to return from server.
                    // Which also was the case before:
                    // https://github.com/webgme/webgme/commit/48547c33f638aedb60866772ca5638f9e447fa24
                    loading(persisted.rootHash); // FIXME: Are local updates really guaranteed to be synchronous?

                    newCommitObject = storage.makeCommit(
                        state.project.name,
                        state.branchName,
                        [state.commit.current],
                        persisted.rootHash,
                        persisted.objects,
                        msg
                    );
                    addCommit(newCommitObject[CONSTANTS.STORAGE.MONGO_ID]);
                    //undo-redo
                    addModification(newCommitObject, false);
                    self.dispatchEvent(CONSTANTS.UNDO_AVAILABLE, canUndo());
                    self.dispatchEvent(CONSTANTS.REDO_AVAILABLE, canRedo());

                    state.msg = '';
                } else {
                    logger.debug('is in transaction - will NOT persist.');
                }
            } else {
                //TODO: Why is this set to empty here?
                state.msg = '';
                callback(null);
            }
        }

        function addCommit(commitHash) {
            state.commit.previous = state.commit.current;
            state.commit.current = commitHash;
        }

        //territory functions
        this.addUI = function (ui, fn, guid) {
            ASSERT(fn);
            ASSERT(typeof fn === 'function');
            guid = guid || GUID();
            state.users[guid] = {type: 'notused', UI: ui, PATTERNS: {}, PATHS: {}, SENDEVENTS: true, FN: fn};
            return guid;
        };

        this.removeUI = function (guid) {
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
    }

    // Inherit from the EventDispatcher
    Client.prototype = Object.create(EventDispatcher.prototype);
    Client.prototype.constructor = Client;

    return Client;
});