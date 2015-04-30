/*globals define*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/util/assert',
    'common/EventDispatcher',
    'common/util/guid',
    'common/core/core',
    'common/storage/clientstorage',
    'js/logger',
    'common/util/url',
    'common/core/users/meta',
    'common/core/users/tojson',
    'common/core/tasync',
    'superagent',
    './undoredo',
    './gmeNodeGetter',
    './gmeNodeSetter',
    './commitCache',
    './serverEventer',
    './addon',
    './requests'
], function (ASSERT,
             EventDispatcher,
             GUID,
             Core,
             Storage,
             Logger,
             URL,
             BaseMeta,
             toJson,
             TASYNC,
             superagent,
             UndoRedo,
             getNode,
             gmeNodeSetter,
             createCommitCache,
             serverEventer,
             createAddOn,
             Requests) {

    'use strict';

    var ROOT_PATH = '';

    function COPY(object) {
        if (object) {
            return JSON.parse(JSON.stringify(object));
        }
        return null;
    }


    function getNewCore(project, gmeConfig, logger) {
        //return new NullPointerCore(new DescriptorCore(new SetCore(new GuidCore(new Core(project)))));
        // FIXME: why usertype is nodejs when it is running from the browser?
        var options = {usertype: 'nodejs', globConf: gmeConfig, logger: logger.fork('core')};
        return new Core(project, options);
    }

    function Client(gmeConfig) {

        function storeNode(node /*, basic */) {
            var path;
            //basic = basic || true;
            if (node) {
                path = _clientGlobal.core.getPath(node);
                _metaNodes[path] = node;
                if (_clientGlobal.nodes[path]) {
                    //TODO we try to avoid this
                } else {
                    _clientGlobal.nodes[path] = {node: node, hash: ''/*,incomplete:true,basic:basic*/};
                    //TODO this only needed when real eventing will be reintroduced
                    //_inheritanceHash[path] = getInheritanceChain(node);
                }
                return path;
            }
            return null;
        }

        function saveRoot(msg, callback) {
            var newRootHash,
                newCommitHash;

            callback = callback || function () {
                };
            if (!_viewer && !_readOnlyProject) {
                if (_msg) {
                    _msg += '\n' + msg;
                } else {
                    _msg += msg;
                }
                if (!_inTransaction) {
                    ASSERT(_clientGlobal.project && _clientGlobal.core && _clientGlobal.branch);
                    _clientGlobal.core.persist(_clientGlobal.nodes[ROOT_PATH].node, function (/*err*/) {
                    });
                    newRootHash = _clientGlobal.core.getHash(_clientGlobal.nodes[ROOT_PATH].node);
                    newCommitHash = _clientGlobal.project.makeCommit([_recentCommits[0]],
                        newRootHash, _msg, function (/*err*/) {
                            //TODO now what??? - could we end up here?
                        });
                    _msg = '';
                    addCommit(newCommitHash);
                    _selfCommits[newCommitHash] = true;
                    _redoer.addModification(newCommitHash, '');
                    _clientGlobal.project.setBranchHash(_clientGlobal.branch,
                        _recentCommits[1], _recentCommits[0], function (err) {
                            //TODO now what??? - could we screw up?
                            loading(newRootHash);
                            callback(err);
                        });
                    //loading(newRootHash);
                }
            } else {
                _msg = '';
                callback(null);
            }
        }

        function closeOpenedProject(callback) {
            var returning,
                project;

            callback = callback || function () {
                };
            returning = function (e) {
                var oldProjName = _clientGlobal.projectName;
                _clientGlobal.projectName = null;
                _inTransaction = false;
                _clientGlobal.core = null;
                _clientGlobal.nodes = {};
                _metaNodes = {};
                //_commitObject = null;
                _patterns = {};
                _msg = '';
                _recentCommits = [];
                _clientGlobal.root.current = null;
                _clientGlobal.root.previous = null;
                _viewer = false;
                _readOnlyProject = false;
                _loadNodes = {};
                _loadError = 0;
                _offline = false;
                cleanUsersTerritories();
                if (oldProjName) {
                    //otherwise there were no open project at all
                    _self.dispatchEvent(_self.events.PROJECT_CLOSED, oldProjName);
                }

                callback(e);
            };
            if (_clientGlobal.branch) {
                //otherwise the branch will not 'change'
                _self.dispatchEvent(_self.events.BRANCH_CHANGED, null);
            }
            _clientGlobal.branch = null;
            if (_clientGlobal.project) {
                project = _clientGlobal.project;
                _clientGlobal.project = null;
                project.closeProject(function (err) {
                    //TODO what if for some reason we are in transaction???
                    returning(err);
                });
            } else {
                returning(null);
            }
        }

        function viewerCommit(hash, callback) {
            //no project change
            //we stop watching branch
            //we create the core
            //we use the existing territories
            //we set viewer mode, so there will be no modification allowed to send to server...
            _clientGlobal.branch = null;
            _viewer = true;
            _recentCommits = [hash];
            _self.dispatchEvent(_self.events.BRANCH_CHANGED, _clientGlobal.branch);
            _clientGlobal.project.loadObject(hash, function (err, commitObj) {
                if (!err && commitObj) {
                    loading(commitObj.root, callback);
                } else {
                    logger.error('Cannot view given ' + hash + ' commit as it\'s root cannot be loaded! [' +
                        JSON.stringify(err) + ']');
                    callback(err || new Error('commit object cannot be found!'));
                }
            });
        }

        function startTransaction(msg) {
            if (_clientGlobal.core) {
                _inTransaction = true;
                msg = msg || 'startTransaction()';
                saveRoot(msg);
            }
        }

        function completeTransaction(msg, callback) {
            _inTransaction = false;
            if (_clientGlobal.core) {
                msg = msg || 'completeTransaction()';
                saveRoot(msg, callback);
            }
        }

        function branchWatcher(branch, callback) {
            ASSERT(_clientGlobal.project);
            callback = callback || function () {
                };
            var myCallback = function (err) {
                myCallback = function () {
                };
                callback(err);
            };
            var redoerNeedsClean = true;
            var branchHashUpdated = function (err, newhash, forked) {
                var doUpdate = false;
                if (branch === _clientGlobal.branch && !_offline) {
                    if (!err && typeof newhash === 'string') {
                        if (newhash === '') {
                            logger.warn('The current branch ' + branch + ' have been deleted!');
                            //we should open a viewer with our current commit...
                            var latestCommit = _recentCommits[0];
                            viewerCommit(latestCommit, function (err) {
                                if (err) {
                                    logger.error('Current branch ' + branch +
                                        ' have been deleted, and unable to open the latest commit ' +
                                        latestCommit + '! [' + JSON.stringify(err) + ']');
                                }
                            });
                        } else {
                            if (_redoer.isCurrentTarget(newhash)) {
                                addCommit(newhash);
                                doUpdate = true;
                            } else if (!_selfCommits[newhash] || redoerNeedsClean) {
                                redoerNeedsClean = false;
                                _redoer.clean();
                                _redoer.addModification(newhash, 'branch initial');
                                _selfCommits = {};
                                _selfCommits[newhash] = true;
                                doUpdate = true;
                                addCommit(newhash);
                            }
                            var redoInfo = _redoer.checkStatus(),
                                canUndo = false,
                                canRedo = false;

                            if (_selfCommits[newhash]) {
                                if (redoInfo.undo) {
                                    canUndo = true;
                                }
                                if (redoInfo.redo) {
                                    canRedo = true;
                                }
                            }

                            _self.dispatchEvent(_self.events.UNDO_AVAILABLE, canUndo);
                            _self.dispatchEvent(_self.events.REDO_AVAILABLE, canRedo);

                            if (doUpdate) {
                                _clientGlobal.project.loadObject(newhash, function (err, commitObj) {
                                    if (!err && commitObj) {
                                        loading(commitObj.root, myCallback);
                                    } else {
                                        setTimeout(function () {
                                            _clientGlobal.project.loadObject(newhash, function (err, commitObj) {
                                                if (!err && commitObj) {
                                                    loading(commitObj.root, myCallback);
                                                } else {
                                                    logger.error('second load try failed on commit!!!', err);
                                                }
                                            });
                                        }, 1000);
                                    }
                                });
                            }

                            //branch status update
                            if (_offline) {
                                changeBranchState(_self.branchStates.OFFLINE);
                            } else {
                                if (forked) {
                                    changeBranchState(_self.branchStates.FORKED);
                                }
                            }

                            //FIXME should kill the branch watcher gracefully as it is possible now to get a callback,
                            // but the branch is already closed here - actually the whole project is closed
                            return (branch === _clientGlobal.branch &&
                            _clientGlobal.db &&
                            _clientGlobal.project) ? _clientGlobal.project.getBranchHash(branch,
                                _recentCommits[0],
                                branchHashUpdated) : null;
                        }
                    } else {
                        myCallback(null);
                        return _clientGlobal.project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
                    }
                } else {
                    myCallback(null);
                }
            };

            if (_clientGlobal.branch === branch) {
                if (_offline) {
                    _viewer = false;
                    _offline = false;
                    changeBranchState(_self.branchStates.SYNC);
                    _clientGlobal.project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
                } else {
                    callback(null);
                }
            } else {
                _clientGlobal.branch = branch;
                _viewer = false;
                _offline = false;
                _recentCommits = [''];
                _self.dispatchEvent(_self.events.BRANCH_CHANGED, _clientGlobal.branch);
                changeBranchState(_self.branchStates.SYNC);
                _clientGlobal.project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
            }
        }

        function reLaunchUsers() {
            var i;
            for (i in _users) {
                if (_users.hasOwnProperty(i)) {
                    if (_users[i].UI.reLaunch) {
                        _users[i].UI.reLaunch();
                    }
                }
            }
        }

        function openProject(name, callback) {
            //this function cannot create new project
            ASSERT(_clientGlobal.db);
            var waiting = 1,
                innerCallback = function (err) {
                    error = error || err;
                    if (--waiting === 0) {
                        if (error) {
                            logger.error('The branch ' + firstName + ' of project ' + name +
                                ' cannot be selected! [' + JSON.stringify(error) + ']');
                        }
                        callback(error);
                    }
                },
                firstName = null,
                error = null;
            _clientGlobal.db.getProjectNames(function (err, names) {
                if (err) {
                    return callback(err);
                }
                if (names.indexOf(name) !== -1) {
                    _clientGlobal.db.openProject(name, function (err, p) {
                        if (!err && p) {
                            _clientGlobal.db.getAuthorizationInfo(name, function (err, authInfo) {
                                _readOnlyProject = authInfo ? (authInfo.write === true ? false : true) : true;
                                _clientGlobal.project = p;
                                _clientGlobal.projectName = name;
                                _inTransaction = false;
                                _clientGlobal.nodes = {};
                                _metaNodes = {};
                                _clientGlobal.core = getNewCore(_clientGlobal.project,
                                    gmeConfig, logger.fork('project' + name));
                                _clientGlobal.META.initialize(_clientGlobal.core, _metaNodes, saveRoot);
                                if (_clientGlobal.commitCache) {
                                    _clientGlobal.commitCache.clearCache();
                                } else {
                                    createCommitCache(_clientGlobal); //attaches itself to the global
                                }
                                _self.dispatchEvent(_self.events.PROJECT_OPENED, _clientGlobal.projectName);

                                //check for master or any other branch
                                _clientGlobal.project.getBranchNames(function (err, names) {
                                    if (!err && names) {

                                        if (names.master) {
                                            firstName = 'master';
                                        } else {
                                            firstName = Object.keys(names)[0] || null;
                                        }

                                        if (firstName) {
                                            _clientGlobal.addOn.stopRunningAddOns();
                                            branchWatcher(firstName, innerCallback);
                                        } else {
                                            //we should try the latest commit
                                            viewLatestCommit(callback);
                                        }
                                    } else {
                                        //we should try the latest commit
                                        viewLatestCommit(callback);
                                    }
                                });
                            });
                        } else {
                            logger.error('The project ' + name + ' cannot be opened! [' + JSON.stringify(err) +
                                ']');
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error('there is no such project'));
                }

            });
        }

        function changeBranchState(newstate) {
            if (_clientGlobal.branchState !== newstate) {
                _clientGlobal.branchState = newstate;
                _self.dispatchEvent(_self.events.BRANCHSTATUS_CHANGED, _clientGlobal.branchState);
            }
        }

        var _self = this,
            logger = Logger.create('gme:client', gmeConfig.client.log),
            _metaNodes = {},
            _inTransaction = false,
            _users = {},
            _patterns = {},
            _networkStatus = '',
            _msg = '',
            _recentCommits = [],
            _viewer = false,
            _readOnlyProject = false,
            _loadNodes = {},
            _loadError = 0,
            _offline = false,
            _networkWatcher = null,
            _TOKEN = null,
        //_changeTree = null,
            _gHash = 0,
            _redoer = null,
            _selfCommits = {},
            _configuration = {},
            AllPlugins,
            AllDecorators,
            eventDispatcher,
            i,
            _clientGlobal = {
                gmeConfig: gmeConfig,
                logger: logger,
                core: null,
                branch: null,
                branchState: null,
                projectName: null,
                root: {
                    current: null,
                    previous: null,
                    object: null
                },
                nodes: {},
                project: null,
                db: null,
                META: new BaseMeta(),
                functions: {
                    toJson: toJson,
                    storeNode: storeNode,
                    saveRoot: saveRoot,
                    getNewCore: getNewCore,
                    closeOpenedProject: closeOpenedProject,
                    viewerCommit: viewerCommit,
                    startTransaction: startTransaction,
                    completeTransaction: completeTransaction,
                    branchWatcher: branchWatcher, //refactor this
                    reLaunchUsers: reLaunchUsers,
                    openProject: openProject,
                    changeBranchState: changeBranchState
                }
            },
            _clientAPI = {},
            _requests = new Requests(_clientGlobal);

        gmeNodeSetter(_clientGlobal); //this attaches itself to the global object
        createAddOn(_clientGlobal); //this attaches itself to the global

        if (window) {
            _configuration.host = window.location.protocol + '//' + window.location.host;
        } else {
            //TODO: Is this ever applicable?
            _configuration.host = '';
        }
        // FIXME: These are asynchronous
        superagent.get('/listAllPlugins')
            .end(function (err, res) {
                if (res.status === 200) {
                    AllPlugins = res.body.allPlugins;
                    logger.debug('/listAllPlugins', AllPlugins);
                } else {
                    logger.error('/listAllPlugins failed', err);
                }
            });

        superagent.get('/listAllDecorators')
            .end(function (err, res) {
                if (res.status === 200) {
                    AllDecorators = res.body.allDecorators;
                    logger.debug('/listAllDecorators', AllDecorators);
                } else {
                    logger.error('/listAllDecorators failed', err);
                }
            });

        //default configuration
        //FIXME: Are these gme options or not??
        _configuration.autoreconnect = true; // MAGIC NUMBERS
        _configuration.reconndelay = 1000; // MAGIC NUMBERS
        _configuration.reconnamount = 1000; // MAGIC NUMBERS
        _configuration.autostart = false; // MAGIC NUMBERS

        //TODO remove the usage of jquery
        //$.extend(_self, new EventDispatcher());
        eventDispatcher = new EventDispatcher();
        for (i in eventDispatcher) {
            _self[i] = eventDispatcher[i];
        }
        _clientGlobal.eDispatcher = _self; //propagating dispatching functionality

        _self.events = {
            NETWORKSTATUS_CHANGED: 'NETWORKSTATUS_CHANGED',
            BRANCHSTATUS_CHANGED: 'BRANCHSTATUS_CHANGED',
            BRANCH_CHANGED: 'BRANCH_CHANGED',
            PROJECT_CLOSED: 'PROJECT_CLOSED',
            PROJECT_OPENED: 'PROJECT_OPENED',

            SERVER_PROJECT_CREATED: 'SERVER_PROJECT_CREATED',
            SERVER_PROJECT_DELETED: 'SERVER_PROJECT_DELETED',
            SERVER_BRANCH_CREATED: 'SERVER_BRANCH_CREATED',
            SERVER_BRANCH_UPDATED: 'SERVER_BRANCH_UPDATED',
            SERVER_BRANCH_DELETED: 'SERVER_BRANCH_DELETED',

            UNDO_AVAILABLE: 'UNDO_AVAILABLE',
            REDO_AVAILABLE: 'REDO_AVAILABLE'
        };

        _clientGlobal.events = _self.events; //propagating the event names

        _self.networkStates = {
            CONNECTED: 'connected',
            DISCONNECTED: 'socket.io is disconnected'
        };

        _self.branchStates = {
            SYNC: 'inSync',
            FORKED: 'forked',
            OFFLINE: 'offline'
        };

        _clientGlobal.branchStates = _self.branchStates;

        function getUserId() {
            var cookies = URL.parseCookie(document.cookie);
            if (cookies.webgme) {
                return cookies.webgme;
            } else {
                return 'n/a';
            }
        }

        //FIXME remove TESTING
        function newDatabase() {
            var storageOptions = {
                    logger: Logger.create('gme:client:storage', gmeConfig.client.log),
                    host: _configuration.host
                },
                protocolStr;

            if (typeof TESTING === 'undefined') {
                storageOptions.user = getUserId();
            } else {
                protocolStr = gmeConfig.server.https.enable ? 'https' : 'http';

                storageOptions.type = 'node';
                storageOptions.host = protocolStr + '://127.0.0.1';
                storageOptions.user = 'TEST';
            }

            storageOptions.globConf = gmeConfig;
            return new Storage(storageOptions);
        }

        function connect() {
            //this is when the user force to go online on network level
            //TODO implement :) - but how, there is no such function on the storage's API
            if (_clientGlobal.db) {
                _clientGlobal.db.openDatabase(function (/*err*/) {
                });
            }
        }

        //branch handling functions
        function goOffline() {
            //TODO stop watching the branch changes
            _offline = true;
            changeBranchState(_self.branchStates.OFFLINE);
        }

        function goOnline() {
            //TODO we should try to update the branch with our latest commit
            //and 'restart' listening to branch changes
            if (_offline) {
                _clientGlobal.addOn.stopRunningAddOns();
                branchWatcher(_clientGlobal.branch);
            }
        }

        function addCommit(commitHash) {
            _clientGlobal.commitCache.newCommit(commitHash);
            _recentCommits.unshift(commitHash);
            if (_recentCommits.length > 100) {
                _recentCommits.pop();
            }
        }


        function tokenWatcher() {
            var token = null,
                refreshToken = function () {
                    _clientGlobal.db.getToken(function (err, t) {
                        if (!err) {
                            token = t || '_';
                        }
                    });
                },
                getToken = function () {
                    return token;
                };

            setInterval(refreshToken, 10000); //maybe it could be configurable
            refreshToken();

            return {
                getToken: getToken
            };
        }

        function networkWatcher() {
            _networkStatus = '';
            //FIXME: Are these gme options or not??

            var frequency = 10,
                running = true,
                stop = function () {
                    running = false;
                },
                checking = false,
                reconnecting = function (finished) {
                    var connecting = false,
                        counter = 0,
                        frequency = _configuration.reconndelay || 10,
                        timerId = setInterval(function () {
                            if (!connecting) {
                                connecting = true;
                                _clientGlobal.db.openDatabase(function (err) {
                                    connecting = false;
                                    if (!err) {
                                        //we are back!
                                        clearInterval(timerId);
                                        return finished(null);
                                    }
                                    if (++counter === _configuration.reconnamount) {
                                        //we failed, stop trying
                                        clearInterval(timerId);
                                        return finished(err);
                                    }
                                });
                            }
                        }, frequency);
                },
                checkId = setInterval(function () {
                    if (!checking) {
                        checking = true;
                        _clientGlobal.db.getDatabaseStatus(_networkStatus, function (err, newStatus) {
                            if (running) {
                                if (_networkStatus !== newStatus) {
                                    _networkStatus = newStatus;
                                    _self.dispatchEvent(_self.events.NETWORKSTATUS_CHANGED, _networkStatus);
                                    if (_networkStatus === _self.networkStates.DISCONNECTED &&
                                        _configuration.autoreconnect) {
                                        reconnecting(function (err) {
                                            checking = false;
                                            if (err) {
                                                logger.error('permanent network failure:', err);
                                                clearInterval(checkId);
                                            }
                                        });
                                    } else {
                                        checking = false;
                                    }
                                } else {
                                    checking = false;
                                }
                            } else {
                                clearInterval(checkId);
                            }
                        });
                    }
                }, frequency);

            return {
                stop: stop
            };
        }

        function viewLatestCommit(callback) {
            _clientGlobal.commitCache.getNCommitsFrom(null, 1, function (err, commits) {
                if (!err && commits && commits.length > 0) {
                    viewerCommit(commits[0][_clientGlobal.project.ID_NAME], callback);
                } else {
                    logger.error('Cannot get latest commit! [' + JSON.stringify(err) + ']');
                    callback(err);
                }
            });
        }

        //internal functions
        function cleanUsersTerritories() {
            //look out as the user can remove itself at any time!!!
            var userIds = Object.keys(_users),
                i,
                j,
                events;

            for (i = 0; i < userIds.length; i++) {
                if (_users[userIds[i]]) {
                    events = [{eid: null, etype: 'complete'}];
                    for (j in _users[userIds[i]].PATHS
                        ) {
                        events.push({etype: 'unload', eid: j});
                    }
                    _users[userIds[i]].PATTERNS = {};
                    _users[userIds[i]].PATHS = {};
                    _users[userIds[i]].SENDEVENTS = true;
                    _users[userIds[i]].FN(events);
                }
            }
        }

        function connectToDatabaseAsync(options, callback) {
            var oldcallback = callback;
            callback = function (err) {
                _TOKEN = tokenWatcher();
                reLaunchUsers();
                oldcallback(err);
            }; //we add tokenWatcher start at this point
            options = options || {};
            callback = callback || function () {
                };
            options.open = (options.open !== undefined || options.open !== null) ? options.open : false;
            options.project = options.project || null;
            if (_clientGlobal.db) {
                //we have to close the current
                closeOpenedProject(function () {
                });
                _clientGlobal.db.closeDatabase(function () {
                });
                _networkStatus = '';
                changeBranchState(null);
            }
            _clientGlobal.db = newDatabase();

            _clientGlobal.db.openDatabase(function (err) {
                if (err) {
                    logger.error('Cannot open database');
                    callback(err);
                    return;
                }

                if (_networkWatcher) {
                    _networkWatcher.stop();
                }
                _networkWatcher = networkWatcher();
                serverEventer(_clientGlobal); //this starts the eventing service

                //FIXME remove option open, and the possibility to open 'first' project
                // should be clear if it is projectId or projectName
                if (options.open) {
                    if (options.project) {
                        openProject(options.project, callback);
                    } else {
                        //default opening routine
                        _clientGlobal.db.getProjectNames(function (err, names) {
                            if (!err && names && names.length > 0) {
                                openProject(names[0], callback);
                            } else {
                                logger.error('Cannot get project names / There is no project on the server');
                                callback(err);
                            }
                        });
                    }
                } else {
                    callback(null);
                }
            });
        }

        //loading functions
        function getStringHash(/* node */) {
            //TODO there is a memory issue with the huge strings so we have to replace it with something
            _gHash += 1;
            return _gHash;
        }

        //TODO this function will be used when diff based event generation will be reintroduced
        //function getInheritanceChain(node) {
        //    var ancestors = [];
        //    node = _clientGlobal.core.getBase(node);
        //    while (node) {
        //        ancestors.push(_clientGlobal.core.getPath(node));
        //        node = _clientGlobal.core.getBase(node);
        //    }
        //    return ancestors;
        //}

        //TODO this function will be used when diff based event generation will be reintroduced
        //function isInChangeTree(path) {
        //    var pathArray = path.split('/'),
        //        diffObj = _changeTree,
        //        index = 0,
        //        found = false;
        //
        //    pathArray.shift();
        //    if (pathArray.length === 0) {
        //        found = true;
        //    }
        //
        //    if (!diffObj) {
        //        return false;
        //    }
        //
        //    while (index < pathArray.length && !found) {
        //        if (diffObj[pathArray[index]]) {
        //            diffObj = diffObj[pathArray[index]];
        //            index += 1;
        //            if (index === pathArray.length) {
        //                found = true;
        //            }
        //        } else {
        //            index = pathArray.length;
        //        }
        //    }
        //
        //    if (found && diffObj) {
        //        if (diffObj.removed !== undefined) {
        //            return false;
        //        }
        //        if (diffObj.reg || diffObj.attr || diffObj.pointer || diffObj.set || diffObj.meta ||
        //            diffObj.childrenListChanged) {
        //            return true;
        //        }
        //    }
        //
        //    return false;
        //}

        function getModifiedNodes(newerNodes) {
            var modifiedNodes = [],
                i;

            for (i in _clientGlobal.nodes) {
                if (_clientGlobal.nodes.hasOwnProperty(i)) {
                    if (newerNodes[i]) {
                        if (newerNodes[i].hash !== _clientGlobal.nodes[i].hash && _clientGlobal.nodes[i].hash !== '') {
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
                    if (_clientGlobal.META.isTypeOf(path, pattern.items[i])) {
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

            if (_clientGlobal.nodes[patternId]) {
                pathsSoFar[patternId] = true;
                if (pattern.children && pattern.children > 0) {
                    children = _clientGlobal.core.getChildrenPaths(_clientGlobal.nodes[patternId].node);
                    subPattern = COPY(pattern);
                    subPattern.children -= 1;
                    for (i = 0; i < children.length; i += 1) {
                        if (fitsInPatternTypes(children[i], pattern)) {
                            patternToPaths(children[i], subPattern, pathsSoFar);
                        }
                    }
                }
            } else {
                _loadError++;
            }

        }

        function userEvents(userId, modifiedNodes) {
            var newPaths = {},
                startErrorLevel = _loadError,
                i,
                events = [];

            for (i in _users[userId].PATTERNS) {
                if (_users[userId].PATTERNS.hasOwnProperty(i)) {
                    if (_clientGlobal.nodes[i]) { //TODO we only check pattern if its root is there...
                        patternToPaths(i, _users[userId].PATTERNS[i], newPaths);
                    }
                }
            }

            if (startErrorLevel !== _loadError) {
                return; //we send events only when everything is there correctly
            }

            //deleted items
            for (i in _users[userId].PATHS) {
                if (!newPaths[i]) {
                    events.push({etype: 'unload', eid: i});
                }
            }

            //added items
            for (i in newPaths) {
                if (!_users[userId].PATHS[i]) {
                    events.push({etype: 'load', eid: i});
                }
            }

            //updated items
            for (i = 0; i < modifiedNodes.length; i++) {
                if (newPaths[modifiedNodes[i]]) {
                    events.push({etype: 'update', eid: modifiedNodes[i]});
                }
            }

            _users[userId].PATHS = newPaths;

            //this is how the events should go
            if (events.length > 0) {
                if (_loadError > startErrorLevel) {
                    events.unshift({etype: 'incomplete', eid: null});
                } else {
                    events.unshift({etype: 'complete', eid: null});
                }
            } else {
                events.unshift({etype: 'complete', eid: null});
            }
            _users[userId].FN(events);
        }


        //partially optimized
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
            _metaNodes[path] = node;
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
                if (_loadNodes[ROOT_PATH]) {
                    base = _loadNodes[ROOT_PATH].node;
                } else if (_clientGlobal.nodes[ROOT_PATH]) {
                    base = _clientGlobal.nodes[ROOT_PATH].node;
                }
                core.loadByPath(base, id, function (err, node) {
                    var path;
                    if (!err && node && !core.isEmpty(node)) {
                        path = core.getPath(node);
                        _metaNodes[path] = node;
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

        //TODO will be used when diff based event generation is reintroduced
        //function getEventTree(oldRootHash, newRootHash, callback) {
        //    var error = null,
        //        sRoot = null,
        //        tRoot = null,
        //        loadRoot = function (hash /*, root */) {
        //            _clientGlobal.core.loadRoot(hash, function (err, r) {
        //                error = error || err;
        //                if (sRoot === null && hash === oldRootHash) {
        //                    sRoot = r;
        //                } else {
        //                    tRoot = r;
        //                }
        //                needed -= 1;
        //                if (needed === 0) {
        //                    rootsLoaded();
        //                }
        //            });
        //
        //        },
        //        rootsLoaded = function () {
        //            if (error) {
        //                return callback(error);
        //            }
        //            _clientGlobal.core.generateLightTreeDiff(sRoot, tRoot, function (err, diff) {
        //                callback(err, diff);
        //            });
        //        },
        //        needed = 2;
        //    loadRoot(oldRootHash, sRoot);
        //    loadRoot(newRootHash, tRoot);
        //}

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

            _loadNodes = {};
            _loadError = 0;

            //gathering the patterns
            keysi = Object.keys(_users);
            for (i = 0; i < keysi.length; i++) {
                keysj = Object.keys(_users[keysi[i]].PATTERNS);
                for (j = 0; j < keysj.length; j++) {
                    if (patterns[keysj[j]]) {
                        //we check if the range is bigger for the new definition
                        if (patterns[keysj[j]].children < _users[keysi[i]].PATTERNS[keysj[j]].children) {
                            patterns[keysj[j]].children = _users[keysi[i]].PATTERNS[keysj[j]].children;
                        }
                    } else {
                        patterns[keysj[j]] = _users[keysi[i]].PATTERNS[keysj[j]];
                    }
                }
            }
            //getting an ordered key list
            orderedPatternIds = Object.keys(patterns);
            orderedPatternIds = orderStringArrayByElementLength(orderedPatternIds);


            //and now the one-by-one loading
            _clientGlobal.core.loadRoot(newRootHash, function (err, root) {
                var fut,
                    _loadPattern;

                ASSERT(err || root);

                _clientGlobal.root.object = root;
                error = error || err;
                if (!err) {
                    _clientGlobal.addOn.updateRunningAddOns(root);
                    _loadNodes[_clientGlobal.core.getPath(root)] = {
                        node: root,
                        incomplete: true,
                        basic: true,
                        hash: getStringHash(root)
                    };
                    _metaNodes[_clientGlobal.core.getPath(root)] = root;
                    if (orderedPatternIds.length === 0 && Object.keys(_users) > 0) {
                        //we have user, but they do not interested in any object -> let's relaunch them :D
                        callback(null);
                        reLaunchUsers();
                    } else {
                        _loadPattern = TASYNC.throttle(TASYNC.wrap(loadPattern), 1);
                        fut = TASYNC.lift(
                            orderedPatternIds.map(function (pattern /*, index */) {
                                return TASYNC.apply(_loadPattern,
                                    [_clientGlobal.core, pattern, patterns[pattern], _loadNodes],
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
            var finalEvents = function () {
                var modifiedPaths,
                    i;

                modifiedPaths = getModifiedNodes(_loadNodes);
                _clientGlobal.nodes = _loadNodes;
                _loadNodes = {};
                for (i in _users) {
                    if (_users.hasOwnProperty(i)) {
                        userEvents(i, modifiedPaths);
                    }
                }
                callback(null);
            };

            callback = callback || function (/*err*/) {
                };

            _clientGlobal.root.previous = _clientGlobal.root.current;
            _clientGlobal.root.current = newRootHash;
            loadRoot(newRootHash, function (err) {
                if (err) {
                    _clientGlobal.root.current = null;
                    callback(err);
                } else {
                    finalEvents();
                }
            });
        }

        function getActiveProject() {
            return _clientGlobal.projectName;
        }

        function getActualCommit() {
            return _recentCommits[0];
        }

        function getActualBranch() {
            return _clientGlobal.branch;
        }

        function getActualNetworkStatus() {
            return _networkStatus;
        }

        function getActualBranchStatus() {
            return _clientGlobal.branchState;
        }

        function commitAsync(params, callback) {
            var msg;

            if (_clientGlobal.db) {
                if (_clientGlobal.project) {
                    msg = params.message || '';
                    saveRoot(msg, callback);
                } else {
                    callback(new Error('there is no open project!'));
                }
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }


        //constraint functions
        function setConstraint(path, name, constraintObj) {
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.setConstraint(_clientGlobal.nodes[path].node, name, constraintObj);
                saveRoot('setConstraint(' + path + ',' + name + ')');
            }
        }

        function delConstraint(path, name) {
            if (_clientGlobal.core && _clientGlobal.nodes[path] && typeof _clientGlobal.nodes[path].node === 'object') {
                _clientGlobal.core.delConstraint(_clientGlobal.nodes[path].node, name);
                saveRoot('delConstraint(' + path + 'name' + ')');
            }
        }

        //territory functions
        function addUI(ui, fn, guid) {
            ASSERT(fn);
            ASSERT(typeof fn === 'function');
            guid = guid || GUID();
            _users[guid] = {type: 'notused', UI: ui, PATTERNS: {}, PATHS: {}, SENDEVENTS: true, FN: fn};
            return guid;
        }

        function removeUI(guid) {
            delete _users[guid];
        }

        function _updateTerritoryAllDone(guid, patterns, error) {
            if (_users[guid]) {
                _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
                if (!error) {
                    userEvents(guid, []);
                }
            }
        }

        function updateTerritory(guid, patterns) {
            var missing,
                error,
                patternLoaded,
                i;

            if (_users[guid]) {
                if (_clientGlobal.project) {
                    if (_clientGlobal.nodes[ROOT_PATH]) {
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
                                    loadPattern(_clientGlobal.core, i, patterns[i], _clientGlobal.nodes, patternLoaded);
                                }
                            }
                        } else {
                            //allDone();
                            _updateTerritoryAllDone(guid, patterns, error);
                        }
                    } else {
                        //something funny is going on
                        if (_loadNodes[ROOT_PATH]) {
                            //probably we are in the loading process,
                            // so we should redo this update when the loading finishes
                            //setTimeout(updateTerritory, 100, guid, patterns);
                        } else {
                            //root is not in nodes and has not even started to load it yet...
                            _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
                        }
                    }
                } else {
                    //we should update the patterns, but that is all
                    _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
                }
            }
        }

        function getProjectObject() {
            return _clientGlobal.project;
        }

        function getAvailableInterpreterNames() {
            if (!AllPlugins) {
                logger.error('AllPlugins were never uploaded!');
                return [];
            }
            var names = [],
                valids = _clientGlobal.nodes[ROOT_PATH] ? _clientGlobal.core.getRegistry(
                    _clientGlobal.nodes[ROOT_PATH].node, 'validPlugins') || '' : '';
            valids = valids.split(' ');
            for (var i = 0; i < valids.length; i++) {
                if (AllPlugins.indexOf(valids[i]) !== -1) {
                    names.push(valids[i]);
                }
            }
            return names;
        }

        function runServerPlugin(name, context, callback) {
            _clientGlobal.db.simpleRequest({command: 'executePlugin', name: name, context: context}, callback);
        }

        function getAvailableDecoratorNames() {
            if (!AllDecorators) {
                logger.error('AllDecorators were never uploaded!');
                return [];
            }
            return AllDecorators;
        }

        function getSeedInfoAsync(callback) {
            _clientGlobal.db.simpleRequest({command: 'getSeedInfo'}, function (err, id) {
                if (err) {
                    return callback(err);
                }

                _clientGlobal.db.simpleResult(id, callback);
            });
        }

        function seedProjectAsync(parameters, callback) {
            parameters.command = 'seedProject';
            _clientGlobal.db.simpleRequest(parameters, function (err, id) {
                if (err) {
                    return callback(err);
                }

                _clientGlobal.db.simpleResult(id, callback);
            });
        }


        _redoer = new UndoRedo({
            //eventer
            events: _self.events,
            networkStates: _self.networkStates,
            branchStates: _self.branchStates,
            _eventList: _self._eventList,
            _getEvent: _self._getEvent,
            addEventListener: _self.addEventListener,
            removeEventListener: _self.removeEventListener,
            removeAllEventListeners: _self.removeAllEventListeners,
            dispatchEvent: _self.dispatchEvent,
            getProjectObject: getProjectObject
        });


        _clientAPI = {
            //eventer
            events: _self.events,
            networkStates: _self.networkStates,
            branchStates: _self.branchStates,
            _eventList: _self._eventList,
            _getEvent: _self._getEvent,
            addEventListener: _self.addEventListener,
            removeEventListener: _self.removeEventListener,
            removeAllEventListeners: _self.removeAllEventListeners,
            dispatchEvent: _self.dispatchEvent,
            connect: connect,

            getUserId: getUserId,

            //projects, branch, etc.
            connectToDatabaseAsync: connectToDatabaseAsync,
            getActiveProjectName: getActiveProject,
            getActualCommit: getActualCommit,
            getActualBranch: getActualBranch,
            getActualNetworkStatus: getActualNetworkStatus,
            getActualBranchStatus: getActualBranchStatus,
            commitAsync: commitAsync,
            goOffline: goOffline,
            goOnline: goOnline,
            isProjectReadOnly: function () {
                return _readOnlyProject;
            },
            isCommitReadOnly: function () {
                return _viewer;
            },

            startTransaction: startTransaction,
            completeTransaction: completeTransaction,

            //decorators
            getAvailableDecoratorNames: getAvailableDecoratorNames,
            //interpreters
            getAvailableInterpreterNames: getAvailableInterpreterNames,
            getProjectObject: getProjectObject,
            runServerPlugin: runServerPlugin,

            //constraint
            setConstraint: setConstraint,
            delConstraint: delConstraint,

            //territory functions for the UI
            addUI: addUI,
            removeUI: removeUI,
            updateTerritory: updateTerritory,
            getNode: function (_id) {
                return getNode(_id,
                    _clientGlobal);
            },

            //undo - redo
            undo: _redoer.undo,
            redo: _redoer.redo,

            //clone services
            getSeedInfoAsync: getSeedInfoAsync,
            seedProjectAsync: seedProjectAsync

        };

        for (i in _clientGlobal.META) {
            _clientAPI[i] = _clientGlobal.META[i];
        }

        for (i in _clientGlobal.nodeSetter) {
            _clientAPI[i] = _clientGlobal.nodeSetter[i];
        }

        for (i in _requests) {
            _clientAPI[i] = _requests[i];
        }

        //addOn
        _clientAPI.validateProjectAsync = _clientGlobal.addOn.validateProjectAsync;
        _clientAPI.validateModelAsync = _clientGlobal.addOn.validateModelAsync;
        _clientAPI.validateNodeAsync = _clientGlobal.addOn.validateNodeAsync;
        _clientAPI.setValidationCallback = _clientGlobal.addOn.setValidationCallback;
        _clientAPI.getDetailedHistoryAsync = _clientGlobal.addOn.getDetailedHistoryAsync;
        _clientAPI.getRunningAddOnNames = _clientGlobal.addOn.getRunningAddOnNames;
        _clientAPI.addOnsAllowed = gmeConfig.addOn.enable === true;

        return _clientAPI;
    }

    return Client;
});
