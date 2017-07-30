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
    'common/core/coreQ',
    'js/Constants',
    'common/util/assert',
    'common/core/tasync',
    'common/util/guid',
    'common/util/url',
    'common/core/users/metarules',
    'js/client/gmeNodeGetter',
    'js/client/gmeNodeSetter',
    'js/client/libraries',
    'js/client/gmeServerRequests',
    'blob/BlobClient',
    'js/client/stateloghelpers',
    'js/client/pluginmanager',
    'superagent'
], function (Logger,
             Storage,
             EventDispatcher,
             Core,
             CONSTANTS,
             ASSERT,
             TASYNC,
             GUID,
             URL,
             metaRules,
             getNode,
             getNodeSetters,
             getLibraryFunctions,
             getServerRequests,
             BlobClient,
             stateLogHelpers,
             PluginManager,
             superagent) {
    'use strict';

    function Client(gmeConfig) {
        var self = this,
            logger = Logger.create('gme:client', gmeConfig.client.log),
            storage = Storage.getStorage(logger, gmeConfig, true),
            state = {
                // CONSTANTS.STORAGE. CONNECTED/DISCONNECTED/RECONNECTED/INCOMPATIBLE_CONNECTION/CONNECTION_ERROR
                connection: null,
                renewingToken: false,
                exception: null,
                project: null,
                projectAccess: null,
                projectInfo: null,
                core: null,
                branchName: null,
                branchStatus: null, //CONSTANTS.BRANCH_STATUS. SYNC/AHEAD_SYNC/AHEAD_FORKED/PULLING/ERROR or null
                readOnlyProject: false,
                viewer: false, // This means that a specific commit is selected w/o regards to any branch.

                users: {},
                nodes: {},
                loadNodes: {},

                rootHash: null,
                rootObject: null,
                commitHash: null,

                undoRedoChain: null, //{commitHash: '#hash', rootHash: '#hash', previous: object, next: object}

                inTransaction: false,
                msg: '',
                gHash: 0,
                loadError: null,
                ongoingTerritoryUpdateCounter: 0,
                ongoingLoadPatternsCounter: 0,
                pendingTerritoryUpdatePatterns: {},
                loadingStatus: null,
                inLoading: false,
                loading: {
                    rootHash: null,
                    commitHash: null,
                    changedNodes: null,
                    next: null
                }

            },
            blobClient,
            monkeyPatchKey,
            pluginManager,
            nodeSetterFunctions,
            coreLibraryFunctions,
            serverRequests,
            ROOT_PATH = '',
            //addOnFunctions = new AddOn(state, storage, logger, gmeConfig),
            loadPatternThrottled;

        blobClient = new BlobClient({logger: logger.fork('BlobClient')});
        EventDispatcher.call(this);

        this.CONSTANTS = CONSTANTS.CLIENT;

        // Internal functions
        function COPY(object) {
            if (object) {
                return JSON.parse(JSON.stringify(object));
            }
            return null;
        }

        function addLoadUnloadPathToUpdates(paths) {
            var i,
                pathPieces;

            for (i = 0; i < paths.length; i += 1) {
                pathPieces = paths[i].split(CONSTANTS.CORE.PATH_SEP);
                while (pathPieces.length > 1) {
                    state.loading.changedNodes.update[pathPieces.join(CONSTANTS.CORE.PATH_SEP)] = true;
                    pathPieces.pop();
                }
            }
        }

        function wasNodeUpdated(changedNodes, node) {
            // Is changedNodes available at all?  If not (undo/redo) emit for all nodes...
            if (!changedNodes) {
                return true;
            }

            // Did the node have a collection update?
            if (changedNodes.partialUpdate[state.core.getPath(node)] === true) {
                return true;
            }

            // Did any of the base classes have a non-collection update?
            while (node) {
                if (changedNodes.update[state.core.getPath(node)] === true) {
                    return true;
                }

                node = state.core.getBase(node);
            }

            return false;
        }

        function getModifiedNodes(newerNodes) {
            var modifiedNodes = [],
                updatedMetaPaths = [],
                metaNodes,
                metaPath,
                updatePath,
                nodePath,
                i;

            // For the client these rules apply for finding the affected nodes.
            // 1. Updates should be triggered to any node that core.isTypeOf (i.e. mixins accounted for).
            // 2. Root node should always be triggered.
            // 3. loads/unloads should trigger updates for the parent chain.

            if (state.loading.changedNodes) {
                // 1. Account for mixins - i.e resolve isTypeOf.
                // Gather all meta-nodes that had an update.
                metaNodes = state.core.getAllMetaNodes(newerNodes[ROOT_PATH].node);
                for (updatePath in state.loading.changedNodes.update) {
                    if (metaNodes.hasOwnProperty(updatePath)) {
                        updatedMetaPaths.push(updatePath);
                    }
                }

                if (updatedMetaPaths.length > 0) {
                    // There are meta-nodes with updates.
                    for (metaPath in metaNodes) {
                        // For all meta nodes..
                        if (metaNodes.hasOwnProperty(metaPath)) {
                            for (i = 0; i < updatedMetaPaths.length; i += 1) {
                                // check if it is a typeOf (includes mixins) any of the updated meta-nodes
                                if (state.core.isTypeOf(metaNodes[metaPath],
                                        metaNodes[updatedMetaPaths[i]]) === true) {
                                    // if so add its path to the update nodes.
                                    state.loading.changedNodes.update[metaPath] = true;
                                }
                            }
                        }
                    }
                }
                //console.log('Update after meta considered', Object.keys(state.loading.changedNodes.update));

                // 2. Add Root node
                state.loading.changedNodes.update[ROOT_PATH] = true;

                // 3. Account for loads and unloads.
                addLoadUnloadPathToUpdates(Object.keys(state.loading.changedNodes.load));
                addLoadUnloadPathToUpdates(Object.keys(state.loading.changedNodes.unload));

                //console.log('Update after loads and unloads considered',
                //    Object.keys(state.loading.changedNodes.update));
            }

            for (nodePath in state.nodes) {
                if (state.nodes.hasOwnProperty(nodePath) && newerNodes.hasOwnProperty(nodePath) &&
                    wasNodeUpdated(state.loading.changedNodes, newerNodes[nodePath].node)) {

                    modifiedNodes.push(nodePath);
                }
            }
            //console.log('NewerNodes, modifiedNodes', Object.keys(newerNodes).length, modifiedNodes.length);
            return modifiedNodes;
        }

        //this is just a first brute implementation it needs serious optimization!!!
        function fitsInPatternTypes(path, pattern) {
            var i;

            if (pattern.items && pattern.items.length > 0) {
                for (i = 0; i < pattern.items.length; i += 1) {
                    if (self.isTypeOf(path, pattern.items[i])) {
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
                loadedOrUnloaded = {},
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
                    loadedOrUnloaded[i] = true;
                }
            }

            //added items
            for (i in newPaths) {
                if (!state.users[userId].PATHS[i]) {
                    events.push({etype: 'load', eid: i});
                    loadedOrUnloaded[i] = true;
                }
            }

            //updated items
            for (i = 0; i < modifiedNodes.length; i++) {
                // Check that there wasn't a load or unload event for the node
                if (newPaths[modifiedNodes[i]] && !loadedOrUnloaded[modifiedNodes[i]]) {
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
                childrenPatternLoaded = function (err) {
                    error = error || err;
                    missing -= 1;
                    if (missing === 0) {
                        callback(error);
                    }
                },
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
                };

            if (!nodesSoFar[path]) {
                nodesSoFar[path] = {
                    node: node
                };
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
            //console.log('LP',id,pattern);
            //var _callback = callback;
            //callback = function(error){
            //    console.log('LPF',id,pattern);
            //    _callback(error);
            //};

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
                if (!nodesSoFar[ROOT_PATH]) {
                    logger.error('pattern cannot be loaded if there is no root!!!');
                }
                base = nodesSoFar[ROOT_PATH].node;

                core.loadByPath(base, id, function (err, node) {
                    var path;
                    if (!err && node && !core.isEmpty(node)) {
                        path = core.getPath(node);
                        if (!nodesSoFar[path]) {
                            nodesSoFar[path] = {
                                node: node
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

        loadPatternThrottled = TASYNC.throttle(loadPattern, 1); //magic number could be fine-tuned

        function reLaunchUsers() {
            var i;
            for (i in state.users) {
                if (state.users.hasOwnProperty(i)) {
                    if (typeof state.users[i].UI.reLaunch === 'function') {
                        state.users[i].UI.reLaunch();
                    }
                }
            }
        }

        function _updateTerritoryAllDone(guid, patterns, error) {

            logger.debug('updateTerritory related loads finished', {
                metadata: {
                    userId: guid, patterns: patterns, error: error
                }
            });

            if (state.users[guid]) {
                state.users[guid].PATTERNS = COPY(patterns);
                if (!error) {
                    userEvents(guid, []);
                }
            }
        }

        function canSwitchStates() {
            if (state.inLoading && state.ongoingTerritoryUpdateCounter === 0 &&
                state.ongoingLoadPatternsCounter === 0) {
                return true;
            }
            return false;
        }

        function switchStates() {
            //it is safe now to move the loadNodes into nodes,
            // refresh the metaNodes and generate events - all in a synchronous manner!!!
            var modifiedPaths,
                key;

            //console.time('switchStates');

            logger.debug('switching project state [C#' +
                state.commitHash + ']->[C#' + state.loading.commitHash + '] : [R#' +
                state.rootHash + ']->[R#' + state.loading.rootHash + ']');

            //console.time('getModifiedNodes');
            modifiedPaths = getModifiedNodes(state.loadNodes);
            //console.timeEnd('getModifiedNodes');
            state.nodes = state.loadNodes;
            state.loadNodes = {};
            self.getAllMetaNodes(); //This ensures that all language elements can be accessed with getNode

            state.inLoading = false;
            state.rootHash = state.loading.rootHash;
            state.loading.rootHash = null;
            state.commitHash = state.loading.commitHash;
            state.loading.commitHash = null;

            //checkMetaNameCollision(state.core, state.nodes[ROOT_PATH].node);
            //checkMixinErrors(state.core, state.nodes[ROOT_PATH].node);
            // These are checked by the meta-editor..

            for (key in state.users) {
                if (state.users.hasOwnProperty(key)) {
                    userEvents(key, modifiedPaths);
                }
            }

            if (state.loadingStatus) {
                state.loading.next(state.loadingStatus);
            } else {
                state.loading.next(null);
            }

            //console.timeEnd('switchStates');
        }

        function loadingPatternFinished(err) {
            state.loadingStatus = state.loadingStatus || err;
            state.ongoingLoadPatternsCounter -= 1;

            if (canSwitchStates()) {
                switchStates();
            }
        }

        function loading(newRootHash, newCommitHash, changedNodes, callback) {
            var i, j,
                userIds,
                patternPaths,
                patternsToLoad = [];

            if (state.ongoingLoadPatternsCounter !== 0) {
                callback(new Error('at the start of loading counter should bee zero!!! [' +
                    state.ongoingLoadPatternsCounter + ']'));
                return;
            }

            state.loadingStatus = null;
            state.loadNodes = {};
            state.loading.rootHash = newRootHash;
            state.loading.commitHash = newCommitHash;
            state.loading.next = callback;
            state.loading.changedNodes = changedNodes;

            state.core.loadRoot(state.loading.rootHash, function (err, root) {
                if (err) {
                    state.loading.next(err);
                    return;
                }

                state.inLoading = true;
                state.loadNodes[state.core.getPath(root)] = {
                    node: root
                };

                //we first only set the counter of patterns but we also generate a completely separate pattern queue
                //as we cannot be sure if all the users will remain at the point of giving the actual load command!
                userIds = Object.keys(state.users);
                for (i = 0; i < userIds.length; i += 1) {
                    state.ongoingLoadPatternsCounter += Object.keys(state.users[userIds[i]].PATTERNS || {}).length;
                    patternPaths = Object.keys(state.users[userIds[i]].PATTERNS || {});
                    for (j = 0; j < patternPaths.length; j += 1) {
                        patternsToLoad.push({
                            id: patternPaths[j],
                            pattern: COPY(state.users[userIds[i]].PATTERNS[patternPaths[j]])
                        });
                    }
                }
                userIds = Object.keys(state.pendingTerritoryUpdatePatterns);
                for (i = 0; i < userIds.length; i += 1) {
                    state.ongoingLoadPatternsCounter +=
                        Object.keys(state.pendingTerritoryUpdatePatterns[userIds[i]] || {}).length;
                    patternPaths = Object.keys(state.pendingTerritoryUpdatePatterns[userIds[i]] || {});
                    for (j = 0; j < patternPaths.length; j += 1) {
                        patternsToLoad.push({
                            id: patternPaths[j],
                            pattern: COPY(state.pendingTerritoryUpdatePatterns[userIds[i]][patternPaths[j]])
                        });
                    }
                }

                //empty load check
                if (state.ongoingLoadPatternsCounter === 0) {
                    if (canSwitchStates()) {
                        switchStates();
                        reLaunchUsers();
                    }
                    return;
                }

                for (i = 0; i < patternsToLoad.length; i += 1) {
                    loadPatternThrottled(state.core,
                        patternsToLoad[i].id, patternsToLoad[i].pattern, state.loadNodes, loadingPatternFinished);
                }
            });
        }

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

        function logState(level, msg) {
            var indent = gmeConfig.debug ? 2 : 0;

            if (level === 'console') {
                console.log('state at ' + msg,
                    stateLogHelpers.getStateLogString(self, state, gmeConfig.debug, indent));
            } else {
                logger[level]('state at ' + msg,
                    stateLogHelpers.getStateLogString(self, state, gmeConfig.debug, indent));
            }
        }

        function getNewToken(callback) {
            if (state.renewingToken === false) {
                state.renewingToken = true;
                (new superagent.Request('GET', 'api/user/token'))
                    .end(function (err, res) {
                        state.renewingToken = false;
                        callback(err, res.body.webgmeToken);
                    });
            } else {
                logger.debug('Awaiting token renewal..');
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

            if (!state.viewer && !state.readOnlyProject && state.nodes[ROOT_PATH]) {
                if (state.msg) {
                    if (msg) {
                        state.msg += '\n' + msg;
                    }
                } else {
                    state.msg = msg;
                }

                if (!state.inTransaction) {
                    ASSERT(state.project && state.core && state.branchName);

                    logger.debug('is NOT in transaction - will persist.');
                    // console.time('persist');
                    persisted = state.core.persist(state.nodes[ROOT_PATH].node);
                    // console.timeEnd('persist');
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
                //state.metaNodes[path] = node;
                if (state.nodes[path]) {
                    //TODO we try to avoid this
                } else {
                    state.nodes[path] = {
                        node: node
                    };
                    //TODO this only needed when real eventing will be reintroduced
                    //_inheritanceHash[path] = getInheritanceChain(node);
                }
                return path;
            }
            return null;
        }

        // Plugin Manager
        pluginManager = new PluginManager(self, storage, state, logger, gmeConfig);
        this.getCurrentPluginContext = pluginManager.getCurrentPluginContext;
        this.runBrowserPlugin = pluginManager.runBrowserPlugin;
        this.runServerPlugin = pluginManager.runServerPlugin;
        this.filterPlugins = pluginManager.filterPlugins;
        this.dispatchPluginNotification = pluginManager.dispatchPluginNotification;

        function printCoreError(error) {
            logger.error('Faulty core usage raised an error', error);
            self.dispatchEvent(CONSTANTS.CLIENT.NOTIFICATION, {
                type: 'CORE',
                severity: 'error',
                message: error.message
            });
        }

        // Node setters and getters.

        nodeSetterFunctions = getNodeSetters(logger, state, saveRoot, storeNode, printCoreError);

        for (monkeyPatchKey in nodeSetterFunctions) {
            if (nodeSetterFunctions.hasOwnProperty(monkeyPatchKey)) {
                self[monkeyPatchKey] = nodeSetterFunctions[monkeyPatchKey];
            }
        }

        coreLibraryFunctions = getLibraryFunctions(logger, state, storage, saveRoot);

        for (monkeyPatchKey in coreLibraryFunctions) {
            if (coreLibraryFunctions.hasOwnProperty(monkeyPatchKey)) {
                self[monkeyPatchKey] = coreLibraryFunctions[monkeyPatchKey];
            }
        }

        serverRequests = getServerRequests(self, logger, state, storage);

        for (monkeyPatchKey in serverRequests) {
            if (serverRequests.hasOwnProperty(monkeyPatchKey)) {
                self[monkeyPatchKey] = serverRequests[monkeyPatchKey];
            }
        }

        // Main API functions (with helpers) for connecting, selecting project and branches etc.

        function closeProject(projectId, callback) {

            state.project = null;
            state.projectAccess = null;
            state.projectInfo = null;
            state.readOnlyProject = false;
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
                state.loadNodes = {};
                state.loadError = 0;
                state.rootHash = null;
                //state.rootObject = null;
                state.inTransaction = false;
                state.msg = '';

                cleanUsersTerritories();
                self.dispatchEvent(CONSTANTS.CLIENT.PROJECT_CLOSED, projectId);

                callback(null);
            });
        }

        this.connectToDatabase = function (callback) {
            if (self.isConnected()) {
                logger.warn('connectToDatabase - already connected');
                callback(null);
                return;
            }
            storage.open(function (connectionState) {
                state.connection = connectionState;
                if (connectionState === CONSTANTS.STORAGE.CONNECTED) {
                    //N.B. this event will only be triggered once.
                    self.dispatchEvent(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, connectionState);
                    storage.webSocket.addEventListener(CONSTANTS.STORAGE.NOTIFICATION,
                        function (emitter, eventData) {
                            logger.debug('received notification', eventData);
                            if (eventData.type === CONSTANTS.STORAGE.BRANCH_ROOM_SOCKETS) {
                                self.dispatchConnectedUsersChanged(eventData);
                                // If a new socket joined our branch -> emit to the branch room letting
                                // any newly connected users know that we are in this branch too.
                                // If a socket with the same userId as us disconnected -> emit to
                                // make sure we're not deleted from the other users.
                                self.emitStateNotification();

                            } else if (eventData.type === CONSTANTS.STORAGE.PLUGIN_NOTIFICATION) {
                                self.dispatchPluginNotification(eventData);
                            } else if (eventData.type === CONSTANTS.STORAGE.ADD_ON_NOTIFICATION) {
                                self.dispatchAddOnNotification(eventData);
                            } else if (eventData.type === CONSTANTS.STORAGE.CLIENT_STATE_NOTIFICATION) {
                                self.dispatchConnectedUsersChanged(eventData);
                            } else {
                                logger.error('Unknown notification type', eventData.type, eventData);
                            }
                        }
                    );
                    reLaunchUsers();
                    callback(null);
                } else if (connectionState === CONSTANTS.STORAGE.DISCONNECTED) {
                    if (state.connection !== CONSTANTS.STORAGE.INCOMPATIBLE_CONNECTION) {
                        self.dispatchEvent(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, connectionState);
                    }
                } else if (connectionState === CONSTANTS.STORAGE.RECONNECTED) {
                    self.dispatchEvent(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, connectionState);
                } else if (connectionState === CONSTANTS.STORAGE.INCOMPATIBLE_CONNECTION) {
                    self.disconnectFromDatabase(function (err) {
                        if (err) {
                            logger.error(err);
                        }

                        self.dispatchEvent(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, connectionState);
                    });
                } else if (connectionState === CONSTANTS.STORAGE.JWT_ABOUT_TO_EXPIRE) {
                    logger.warn('Token about is about to expire');
                    getNewToken(function (err, newToken) {
                        if (err) {
                            logger.error('Failed to renew token', err);
                            // Token will probably expire soon
                        } else {
                            storage.setToken(newToken);
                        }
                    });
                } else if (connectionState === CONSTANTS.STORAGE.JWT_EXPIRED) {
                    self.disconnectFromDatabase(function (err) {
                        if (err) {
                            logger.error(err);
                        }

                        self.dispatchEvent(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, CONSTANTS.STORAGE.JWT_EXPIRED);
                    });
                } else {
                    logger.error(new Error('Connection failed error ' + connectionState));
                    self.disconnectFromDatabase(function (err) {
                        if (err) {
                            logger.error(err);
                        }

                        self.dispatchEvent(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, CONSTANTS.STORAGE.CONNECTION_ERROR);
                        callback(new Error('Connection failed! ' + connectionState));
                    });
                }
            });
        };

        this.disconnectFromDatabase = function (callback) {

            function closeStorage(err) {
                storage.close(function (err2) {
                    if (state.connection !== CONSTANTS.STORAGE.INCOMPATIBLE_CONNECTION &&
                        state.connection !== CONSTANTS.STORAGE.CONNECTION_ERROR) {
                        state.connection = CONSTANTS.STORAGE.DISCONNECTED;
                    }

                    callback(err || err2);
                });
            }

            if (state.project) {
                closeProject(state.project.projectId, closeStorage);
            } else {
                closeStorage(null);
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
            if (self.isConnected() === false) {
                callback(new Error('There is no open database connection!'));
            }
            var prevProjectId,
                branchToOpen = branchName || 'master';

            logger.debug('selectProject', projectId, branchToOpen);

            function projectOpened(err, project, branches, access) {
                if (err) {
                    callback(err);
                    return;
                }

                project.getProjectInfo(function (err, projectInfo) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    state.project = project;
                    state.projectAccess = access;
                    state.projectInfo = projectInfo;
                    state.readOnlyProject = access.write === false;
                    state.core = new Core(project, {
                        globConf: gmeConfig,
                        logger: logger.fork('core')
                    });

                    logState('info', 'projectOpened');
                    logger.debug('projectOpened, branches: ', branches);
                    self.dispatchEvent(CONSTANTS.CLIENT.PROJECT_OPENED, projectId);

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
                });
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
            if (state.undoRedoChain && state.undoRedoChain.previous && state.undoRedoChain.previous.commitHash) {
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

        function getBranchStatusHandler() {
            return function (branchStatus, commitQueue, updateQueue) {
                logger.debug('branchStatus changed', branchStatus, commitQueue, updateQueue);
                logState('debug', 'branchStatus');
                state.branchStatus = branchStatus;
                self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_STATUS_CHANGED, {
                        status: branchStatus,
                        commitQueue: commitQueue,
                        updateQueue: updateQueue
                    }
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
                self.dispatchEvent(CONSTANTS.CLIENT.UNDO_AVAILABLE, canUndo());
                self.dispatchEvent(CONSTANTS.CLIENT.REDO_AVAILABLE, canRedo());
                self.dispatchEvent(CONSTANTS.CLIENT.NEW_COMMIT_STATE, {
                    data: data,
                    uiState: typeof self.uiStateGetter === 'function' ? self.uiStateGetter() : null
                });

                logger.debug('loading commitHash, local?', commitHash, data.local);
                loading(commitData.commitObject.root, commitHash, commitData.changedNodes, function (err, aborted) {
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

        /**
         * Opens the given branch and closes any open branch (even though the same branch is opened)
         * @param {string} branchName - name of branch to open.
         * @param {function} [branchStatusHandler=getDefaultCommitHandler()] - Handles returned statuses after commits.
         * @param callback
         */
        this.selectBranch = function (branchName, branchStatusHandler, callback) {
            var prevBranchName = state.branchName;
            logger.debug('selectBranch', branchName);
            if (self.isConnected() === false) {
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

            function openBranch() {
                logger.debug('openBranch, calling storage openBranch', state.project.projectId, branchName);
                storage.openBranch(state.project.projectId, branchName,
                    getHashUpdateHandler(), getBranchStatusHandler(),
                    function (err /*, latestCommit*/) {
                        if (err) {
                            logger.error('storage.openBranch returned with error', err);
                            self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_CHANGED, null);
                            callback(err);
                            return;
                        }

                        state.viewer = false;
                        state.branchName = branchName;
                        self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_OPENED, branchName);
                        self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_CHANGED, branchName);
                        logState('info', 'openBranch');
                        callback(null);
                    }
                );
            }

            if (prevBranchName !== null) {
                logger.debug('Branch was open, closing it first', prevBranchName);
                storage.closeBranch(state.project.projectId, prevBranchName, function (err) {
                    if (err) {
                        logger.error('Problems closing existing branch', err);
                        callback(err);
                        return;
                    }

                    state.branchName = null;
                    self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_CLOSED, prevBranchName);
                    openBranch();
                });
            } else {
                openBranch();
            }
        };

        this.selectCommit = function (commitHash, callback) {
            self._selectCommitFilteredEvents(commitHash, null, callback);
        };

        this._selectCommitFilteredEvents = function (commitHash, changedNodes, callback) {
            var prevBranchName;

            logger.debug('selectCommit', commitHash);
            if (self.isConnected() === false) {
                callback(new Error('There is no open database connection!'));
                return;
            }
            if (!state.project) {
                callback(new Error('selectCommit invoked without open project'));
                return;
            }

            function openCommit() {
                state.viewer = true;

                state.project.loadObject(commitHash, function (err, commitObj) {
                    if (!err && commitObj) {
                        logState('info', 'selectCommit loaded commit');
                        self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_CHANGED, null);
                        loading(commitObj.root, commitHash, changedNodes, function (err, aborted) {
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
                                self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_CHANGED, null);
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

                storage.closeBranch(state.project.projectId, prevBranchName, function (err) {
                    if (err) {
                        logger.error('Problems closing existing branch', err);
                        callback(err);
                        return;
                    }

                    state.branchName = null;
                    self.dispatchEvent(CONSTANTS.CLIENT.BRANCH_CLOSED, prevBranchName);
                    openCommit();
                });
            } else {
                openCommit();
            }
        };

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
        this.isConnected = function () {
            return state.connection === CONSTANTS.STORAGE.CONNECTED ||
                state.connection === CONSTANTS.STORAGE.RECONNECTED;
        };

        this.getNetworkStatus = function () {
            return state.connection;
        };

        this.getConnectedStorageVersion = function () {
            // This is the version of the server the storage is currently connected to.
            return storage.serverVersion;
        };

        this.getBranchStatus = function () {
            return state.branchStatus;
        };

        this.getActiveProjectId = function () {
            return state.project && state.project.projectId;
        };

        this.getActiveProjectName = function () {
            return state.project && state.project.projectName;
        };

        this.getActiveProjectKind = function () {
            return state.projectInfo && state.projectInfo.info && state.projectInfo.info.kind;
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

        this.isReadOnly = function () {
            return state.viewer || state.readOnlyProject;
        };

        this.getProjectAccess = function () {
            return state.projectAccess;
        };

        this.getProjectInfo = function () {
            return state.projectInfo;
        };

        this.getProjectObject = function () {
            return state.project;
        };

        /**
         * Creates a new core instance using the state of the client and loads the root node.
         * @param {object} [options]
         * @param {string} [options.commitHash=%state.commitHash%] - If a different commit-hash should be loaded.
         * @param {GmeLogger} [options.logger=%clientLogger%] - Logger passed to the core instance.
         * @param {function} callback
         * @param {Error|null} callback.error - Non-null if failed to retrieve result.
         * @param {object} callback.result - The result object
         * @param {Core} callback.result.core - Newly created core instance
         * @param {Core~Node} callback.result.rootNode - The root-node that was loaded.
         * @param {string} callback.result.commitHash - The commitHash used as basis for loading root-node.
         * @param {Project} callback.result.project - A reference to the project.
         */
        this.getCoreInstance = function (options, callback) {
            options = options || {};
            options.logger = options.logger || logger.fork('core');

            var result = {
                core: null,
                rootNode: null,
                project: state.project,
                commitHash: options.commitHash || state.commitHash
            };

            function loadRootNode(rootHash) {
                result.core = new Core(state.project, {
                    globConf: gmeConfig,
                    logger: options.logger
                });

                result.core.loadRoot(rootHash)
                    .then(function (rootNode) {
                        result.rootNode = rootNode;
                        return result;
                    })
                    .nodeify(callback);
            }

            if (!state.project) {
                callback(new Error('Cannot get a core instance without an open project.'));
            } else if (options.commitHash && options.commitHash !== state.commitHash) {
                state.project.loadObject(options.commitHash, function (err, commitObj) {
                    if (err) {
                        callback(err);
                    } else if (!commitObj || commitObj.type !== CONSTANTS.STORAGE.COMMIT_TYPE) {
                        callback(new Error('Object at given commit-hash is not a commit-object.'));
                    } else {
                        loadRootNode(commitObj.root);
                    }
                });
            } else if (state.rootHash) {
                loadRootNode(state.rootHash);
            } else {
                callback(new Error('No root-hash available in state.'));
            }
        };

        this.getCommitQueue = function () {
            if (state.project && state.branchName && state.project.branches.hasOwnProperty(state.branchName)) {
                return state.project.branches[state.branchName].getCommitQueue();
            }

            return [];
        };

        this.downloadCommitQueue = function () {
            var commitQueue = self.getCommitQueue();

            if (commitQueue.length > 0) {
                stateLogHelpers.downloadCommitQueue(self, commitQueue);
                return true;
            }

            return false;
        };

        this.downloadError = function () {
            stateLogHelpers.downloadStateDump(self, state);
        };

        // Undo/Redo functionality
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

        /**
         * Persists all commits in commitQueue and optionally tries to fast-forward the current branch.
         * If not fast-forwarding or it fails to do that - a new branch will be created.
         *
         * @param {commitQueue} commitQueue -
         * @param {object} [options] - optional parameters
         * @param {object} [options.fastForward] - If truthy will attempt to setBranchHash from current branch to last in queue.
         * @param {object} [options.newBranchName=%currentBranch_time-now%] - Name of new branch if needed.
         */
        this.applyCommitQueue = function (commitQueue, options, callback) {
            var branchName = self.getActiveBranchName(),
                projectId = commitQueue[0].projectId,
                firstCommitsParents = commitQueue[0].commitObject.parents,
                lastCommitHash = commitQueue[commitQueue.length - 1].commitObject._id;

            options = options || {};
            options.newBranchName = options.newBranchName || self.getActiveBranchName() + '_' + Date.now();

            function createNewBranch() {
                storage.createBranch(projectId, options.newBranchName, lastCommitHash, callback);
            }

            storage.persistCommits(commitQueue, function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                if (options.fastForward && firstCommitsParents.indexOf(self.getActiveCommitHash()) > -1) {
                    storage.setBranchHash(projectId, branchName, lastCommitHash, self.getActiveCommitHash(),
                        function (err, result) {
                            if (err) {
                                callback(err);
                            } else if (result.status !== CONSTANTS.STORAGE.SYNCED) {
                                createNewBranch();
                            } else {
                                callback();
                            }
                        }
                    );
                } else {
                    createNewBranch();
                }
            });
        };

        // REST-like functions and forwarded to storage TODO: add these to separate base class

        //  Getters
        this.getProjects = function (options, callback) {
            var asObject;
            if (self.isConnected()) {
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
            if (self.isConnected()) {
                storage.getBranches(projectId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getTags = function (projectId, callback) {
            if (self.isConnected()) {
                storage.getTags(projectId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getCommits = function (projectId, before, number, callback) {
            if (self.isConnected()) {
                storage.getCommits(projectId, before, number, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getHistory = function (projectId, start, number, callback) {
            if (self.isConnected()) {
                storage.getHistory(projectId, start, number, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getLatestCommitData = function (projectId, branchName, callback) {
            if (self.isConnected()) {
                storage.getLatestCommitData(projectId, branchName, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        //  Setters
        this.createProject = function (projectName, parameters, callback) {
            if (self.isConnected()) {
                storage.createProject(projectName, parameters, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.deleteProject = function (projectId, callback) {
            if (self.isConnected()) {
                storage.deleteProject(projectId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.transferProject = function (projectId, newOwnerId, callback) {
            if (self.isConnected()) {
                storage.transferProject(projectId, newOwnerId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.duplicateProject = function (projectId, projectName, newOwnerId, callback) {
            if (self.isConnected()) {
                storage.duplicateProject(projectId, projectName, newOwnerId, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.createBranch = function (projectId, branchName, newHash, callback) {
            if (self.isConnected()) {
                storage.createBranch(projectId, branchName, newHash, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.deleteBranch = function (projectId, branchName, oldHash, callback) {
            if (self.isConnected()) {
                storage.deleteBranch(projectId, branchName, oldHash, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.createTag = function (projectId, tagName, commitHash, callback) {
            if (self.isConnected()) {
                storage.createTag(projectId, tagName, commitHash, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.deleteTag = function (projectId, tagName, callback) {
            if (self.isConnected()) {
                storage.deleteTag(projectId, tagName, callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.squashCommits = function (projectId, fromCommit, toCommitOrBranch, msg, callback) {
            // logger.debug('squashing latest commits of branch: ', parameters);
            storage.squashCommits(projectId, fromCommit, toCommitOrBranch, msg, callback);
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

        // Node handling
        this.getNode = function (nodePath) {
            return getNode(nodePath, logger, state, storeNode);
        };

        this.getAllMetaNodes = function (asObject) {
            var result = asObject ? {} : [];
            if (state && state.core && state.nodes && state.nodes[ROOT_PATH]) {
                var metaNodes = state.core.getAllMetaNodes(state.nodes[ROOT_PATH].node),
                    gmeNode,
                    keys = Object.keys(metaNodes || {}),
                    i;

                for (i = 0; i < keys.length; i += 1) {
                    gmeNode = self.getNode(storeNode(metaNodes[keys[i]]), logger, state, storeNode);
                    if (asObject) {
                        result[keys[i]] = gmeNode;
                    } else {
                        result.push(gmeNode);
                    }
                }
            }

            return result;
        };

        this.checkMetaConsistency = function () {
            var result;

            if (state && state.core && state.nodes && state.nodes[ROOT_PATH]) {
                result = metaRules.checkMetaConsistency(state.core, state.nodes[ROOT_PATH].node);
            } else {
                result = [];
            }

            return result;
        };

        this.startTransaction = function (msg) {
            if (state.inTransaction) {
                logger.error('Already in transaction, will proceed though..');
            }
            if (state.core) {
                state.inTransaction = true;
                msg = typeof msg === 'string' ? msg : '[';
                saveRoot(msg);
            } else {
                logger.error('Can not start transaction with no core available.');
            }
        };

        this.completeTransaction = function (msg, callback) {
            state.inTransaction = false;
            if (state.core) {
                msg = msg || ']';
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

        this._removeAllUIs = function () {
            // This is mainly intended for clean up during testing.
            logger.debug('_removeAllUIs called');
            state.users = {};
        };

        this.updateTerritory = function (guid, patterns) {
            var loadRequestCounter = 0,
                updateRequestId = GUID(),
                error = null,
                keys = Object.keys(patterns || {}),
                i,
                patternLoaded = function (err) {
                    error = error || err;
                    if (--loadRequestCounter === 0) {
                        delete state.pendingTerritoryUpdatePatterns[updateRequestId];
                        _updateTerritoryAllDone(guid, patterns, error);
                        state.ongoingTerritoryUpdateCounter -= 1;
                        if (state.ongoingTerritoryUpdateCounter < 0) {
                            logger.error('patternLoaded callback have been called multiple times!!');
                            state.ongoingTerritoryUpdateCounter = 0; //FIXME
                        }
                        if (canSwitchStates()) {
                            switchStates();
                        }
                    }
                };

            logger.debug('updatingTerritory', {
                metadata: {
                    userId: guid,
                    patterns: patterns
                }
            });

            if (!state.nodes[ROOT_PATH]) {
                if (state.users[guid]) {
                    logger.debug('early updateTerritory for user[' + guid + ']. No loaded project state yet.');
                    state.users[guid].PATTERNS = COPY(patterns);
                }
                return;
            }

            //empty territory check
            if (keys.length === 0) {
                _updateTerritoryAllDone(guid, patterns, null);
                return;
            }

            state.ongoingTerritoryUpdateCounter += 1;

            //first we have to set the internal counter as the actual load can get synchronous :(
            loadRequestCounter = keys.length;

            for (i = 0; i < keys.length; i += 1) {
                if (state.inLoading) {
                    state.ongoingLoadPatternsCounter += 1;
                    loadPatternThrottled(state.core,
                        keys[i], patterns[keys[i]], state.loadNodes, loadingPatternFinished);
                } else {
                    //we should save the patterns to a pending directory
                    state.pendingTerritoryUpdatePatterns[updateRequestId] = patterns;
                }
                loadPatternThrottled(state.core, keys[i], patterns[keys[i]], state.nodes, patternLoaded);
            }

        };

        this.dispatchAddOnNotification = function (data) {
            var notification = {
                severity: data.notification.severity || 'info',
                message: '[AddOn] ' + data.addOnName + ' - ' + data.notification.message
            };

            logger.debug('addOn notification', data);
            self.dispatchEvent(CONSTANTS.CLIENT.NOTIFICATION, notification);
            self.dispatchEvent(CONSTANTS.CLIENT.ADD_ON_NOTIFICATION, data);
        };

        // Constraints
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

        this.emitStateNotification = function () {
            var data = {
                type: CONSTANTS.STORAGE.CLIENT_STATE_NOTIFICATION,
                state: null,
                projectId: self.getActiveProjectId(),
                branchName: self.getActiveBranchName()
            };

            if (!data.projectId || !data.branchName) {
                // No need to send event if we're not a branch.
                return;
            }

            if (typeof self.uiStateGetter === 'function') {
                data.state = self.uiStateGetter();
            }
            logger.info('Sending state notification...');
            storage.sendNotification(data, function (err) {
                if (err) {
                    logger.error('Sending state notification failed', data, err);
                }

                logger.info('Sending state notification succeeded');
            });
        };

        this.dispatchConnectedUsersChanged = function (eventData) {
            self.dispatchEvent(CONSTANTS.CLIENT.CONNECTED_USERS_CHANGED, eventData);
        };

        this.registerUIStateGetter = function (uiStateGetter) {
            self.uiStateGetter = uiStateGetter;
        };

        //generic notification
        this.notifyUser = function (notification) {
            if (typeof notification === 'string') {
                notification = {
                    message: notification
                };
            }

            notification.severity = notification.severity || 'info';

            if (notification.message) {
                logger.debug('generic notification', notification);
                self.dispatchEvent(CONSTANTS.CLIENT.NOTIFICATION, notification);
            } else {
                logger.debug('cannot set empty notification');
            }
        };

        this.gmeConfig = gmeConfig;

        this.getUserId = function () {
            throw new Error('Deprecated! Username is not stored in a cookie anymore. If available, use ' +
                'WebGMEGlobal.userInfo, if not the user info is available at GET /api/user');
        };

        window.addEventListener('error', function (evt) {
            var errorType;
            state.exception = {};
            if (evt.error) {
                state.exception.message = evt.error.message;
                state.exception.stack = evt.error.stack;
                errorType = evt.error.name;
            } else {
                state.exception = 'No error on event - check browser';
            }

            if (errorType === 'CoreIllegalOperationError') {
                // Do not propagate these errors (for now)
                self.dispatchEvent(CONSTANTS.CLIENT.NOTIFICATION, {
                    severity: 'error',
                    message: evt.error.message
                });

                return true;
            }

            self.dispatchEvent(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, CONSTANTS.CLIENT.UNCAUGHT_EXCEPTION);
        });
    }

    // Inherit from the EventDispatcher
    Client.prototype = Object.create(EventDispatcher.prototype);
    Client.prototype.constructor = Client;

    return Client;
});