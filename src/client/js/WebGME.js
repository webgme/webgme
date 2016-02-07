/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

WebGMEGlobal.version = 'x';
WebGMEGlobal.SUPPORTS_TOUCH = 'ontouchstart' in window || navigator.msMaxTouchPoints;


// let require load all the toplevel needed script and call us on domReady
define([
        'js/logger',
        'text!/gmeConfig.json',
        'text!/package.json',
        'js/client',
        'js/Constants',
        'js/client/constants',
        'js/Panels/MetaEditor/MetaEditorConstants',
        'js/Utils/GMEConcepts',
        'js/Utils/GMEVisualConcepts',
        'js/Utils/ExportManager',
        'js/Utils/ImportManager',
        'js/Utils/StateManager',
        'js/Utils/WebGMEUrlManager',
        'js/LayoutManager/LayoutManager',
        'js/Decorators/DecoratorManager',
        'js/KeyboardManager/KeyboardManager',
        'js/PanelManager/PanelManager',
        './WebGME.History',
        'js/Utils/PreferencesHelper',
        'js/Dialogs/Projects/ProjectsDialog',
        'js/Utils/InterpreterManager',
        'common/storage/util',
        'superagent',
        'q'
    ], function (Logger,
                 gmeConfigJson,
                 packagejson,
                 Client,
                 CONSTANTS,
                 CLIENT_CONSTANTS,
                 METACONSTANTS,
                 GMEConcepts,
                 GMEVisualConcepts,
                 ExportManager,
                 ImportManager,
                 StateManager,
                 WebGMEUrlManager,
                 LayoutManager,
                 DecoratorManager,
                 KeyboardManager,
                 PanelManager,
                 WebGMEHistory,
                 PreferencesHelper,
                 ProjectsDialog,
                 InterpreterManager,
                 StorageUtil,
                 superagent,
                 Q) {

        'use strict';

        var npmJSON = JSON.parse(packagejson),
            gmeConfig = JSON.parse(gmeConfigJson),
            npmJSONFromSplit,
            defaultPageTitle = 'WebGME';

        WebGMEGlobal.version = npmJSON.version;
        WebGMEGlobal.NpmVersion = npmJSON.dist ? npmJSON.version : '';
        WebGMEGlobal.GitHubVersion = '';
        if (npmJSON._from) {
            npmJSONFromSplit = npmJSON._from.split('/');
            WebGMEGlobal.GitHubVersion = npmJSONFromSplit[npmJSONFromSplit.length - 1];
        }


        function webGMEStart(afterPanelsLoaded) {
            var layoutManager,
                client,
                loadPanels,
                logger = Logger.create('gme:WebGME', WebGMEGlobal.gmeConfig.client.log),
                initialThingsToDo = WebGMEUrlManager.parseInitialThingsToDoFromUrl(),
                projectOpenDialog;

            // URL query has higher priority than the config.
            if ((initialThingsToDo.projectToLoad || initialThingsToDo.createNewProject) === false) {
                initialThingsToDo.projectToLoad = gmeConfig.client.defaultContext.project;
                initialThingsToDo.branchToLoad = initialThingsToDo.branchToLoad ||
                    gmeConfig.client.defaultContext.branch;
                initialThingsToDo.objectToLoad = initialThingsToDo.objectToLoad ||
                    gmeConfig.client.defaultContext.node || initialThingsToDo.objectToLoad; // i.e. the root-node.
                // TODO: add commit to load
            }


            layoutManager = new LayoutManager();
            layoutManager.loadLayout(initialThingsToDo.layoutToLoad, function () {
                var panels = [],
                    layoutPanels = layoutManager._currentLayout.panels,
                    decorators,
                    len = layoutPanels ? layoutPanels.length : 0,
                    i;

                client = new Client(gmeConfig);
                WebGMEGlobal.Client = client;

                WebGMEGlobal.InterpreterManager = new InterpreterManager(client, gmeConfig);

                Object.defineProperty(WebGMEGlobal, 'State', {
                        value: StateManager.initialize(),
                        writable: false,
                        enumerable: true,
                        configurable: false
                    }
                );

                document.title = defaultPageTitle;
                logger.info('init-phase true');
                WebGMEHistory.initialize();

                GMEConcepts.initialize(client);
                GMEVisualConcepts.initialize(client);

                PreferencesHelper.initialize(client);

                ExportManager.initialize(client);
                ImportManager.initialize(client);

                WebGMEGlobal.ExportManager = ExportManager;
                WebGMEGlobal.ImportManager = ImportManager;

                //hook up branch changed to set read-only mode on panels
                client.addEventListener(CLIENT_CONSTANTS.BRANCH_CHANGED, function (__project, branchName) {
                    layoutManager.setPanelReadOnly(client.isCommitReadOnly() || client.isProjectReadOnly());
                    WebGMEGlobal.State.registerActiveBranchName(branchName);
                });
                client.addEventListener(CLIENT_CONSTANTS.PROJECT_OPENED, function (__project, projectName) {
                    document.title = StorageUtil.getProjectFullNameFromProjectId(projectName);
                    layoutManager.setPanelReadOnly(client.isProjectReadOnly());
                    WebGMEGlobal.State.registerActiveProjectName(projectName);
                });

                //on project close clear the current state
                client.addEventListener(CLIENT_CONSTANTS.PROJECT_CLOSED, function (/* __project, projectName */) {
                    document.title = defaultPageTitle;
                    WebGMEGlobal.State.clear();
                });

                client.decoratorManager = new DecoratorManager();
                decorators = gmeConfig.visualization.decoratorsToPreload || WebGMEGlobal.allDecorators || [];

                client.decoratorManager.downloadAll(decorators, function (err) {
                    if (err) {
                        logger.error(err);
                    }
                    for (i = 0; i < len; i += 1) {
                        panels.push({
                            panel: layoutPanels[i].panel,
                            container: layoutPanels[i].container,
                            control: layoutPanels[i].control,
                            params: {client: client}
                        });
                    }

                    //load the panels
                    loadPanels(panels);

                    //as of now it's a global variable just to make access to it easier
                    //TODO: might need to be changed
                    WebGMEGlobal.KeyboardManager = KeyboardManager;
                    WebGMEGlobal.KeyboardManager.setEnabled(true);
                    WebGMEGlobal.PanelManager = new PanelManager(client);
                });
            });

            loadPanels = function (panels) {
                var p = panels.splice(0, 1)[0];

                layoutManager.loadPanel(p, function () {
                    if (panels.length > 0) {
                        loadPanels(panels);
                    } else {
                        if (_.isFunction(afterPanelsLoaded)) {
                            afterPanelsLoaded(client);
                        }
                        client.connectToDatabase(function (err) {
                            if (err) {
                                logger.error('Failed to connect to database', err);
                                return;
                            }

                            if (initialThingsToDo.createNewProject) {
                                createNewProject();
                            } else if (initialThingsToDo.projectToLoad) {
                                loadProject();
                            } else {
                                openProjectLoadDialog(false);
                            }
                        });
                    }
                });
            };

            function loadProject() {
                Q.nfcall(client.selectProject, initialThingsToDo.projectToLoad, undefined)
                    .then(function () {
                        if (!initialThingsToDo.branchToLoad) {
                            return {};
                        }

                        return Q.nfcall(client.getBranches, initialThingsToDo.projectToLoad);
                    })
                    .then(function (branches) {
                        if (initialThingsToDo.commitToLoad) {
                            return Q.nfcall(client.selectCommit, initialThingsToDo.commitToLoad);
                        }

                        if (initialThingsToDo.branchToLoad &&
                            branches[initialThingsToDo.branchToLoad]) {
                            return Q.nfcall(client.selectBranch, initialThingsToDo.branchToLoad, null);
                        }
                    })
                    .then(function () {
                        selectObject(initialThingsToDo.objectToLoad, initialThingsToDo.activeSelectionToLoad,
                        initialThingsToDo.visualizerToLoad, initialThingsToDo.tabToSelect);
                    })
                    .catch(function (err) {
                        logger.error('error during startup', err);
                        openProjectLoadDialog(false);
                        return;
                    });
            }

            function openProjectLoadDialog(connect) {
                //if initial project openings failed we show the project opening dialog
                logger.info('init-phase false');
                logger.info('about to open projectOpenDialog, connect:', connect);
                if (connect) {
                    client.connectToDatabase(function (err) {
                        if (err) {
                            logger.error('Failed to connect to database', err);
                            return;
                        }
                        //client.getAvailableProjectsAsync(function (/*err, projectArray*/) {
                        projectOpenDialog = new ProjectsDialog(client);
                        projectOpenDialog.show();
                        //});
                    });
                } else {
                    projectOpenDialog = new ProjectsDialog(client);
                    projectOpenDialog.show();
                }
            }

            function selectObject(nodeId, selectionIds, vizualizer, tab) {
                var user = {},
                    userPattern = {},
                    activeNodeUI,
                    nodePath = nodeId === 'root' ? CONSTANTS.PROJECT_ROOT_ID : nodeId;

                userPattern[nodePath] = {children: 0};
                logger.debug('selectObject', nodeId);
                logger.debug('activeSelectionToLoad', selectionIds);
                if (selectionIds && selectionIds.length > 0) {
                    userPattern[nodePath] = {children: 1};
                } else {
                    userPattern[nodePath] = {children: 0};
                }

                //we try to set the visualizer first so we will not change it later with the other settings
                //TODO when there will be a new global state element, it has to be added here
                function eventHandler(events) {
                    var i,
                        activeNode,
                        updatedState = {},
                        aspectNames;
                    logger.debug('events from selectObject', events);

                    if (events[0].etype !== 'complete') {
                        logger.warn('partial events only');
                        return;
                    }

                    logger.debug('active "' + nodePath + '" node loaded');

                    for (i = 0; i < events.length; i += 1) {
                        //look for the active node
                        if (events[i].eid === nodePath) {
                            activeNode = client.getNode(nodePath);
                            if (activeNode) {
                                // First register the activeObject and let it pick the visualizer.
                                WebGMEGlobal.State.registerActiveObject(nodePath);

                                // In the next tick we set the other preferences.
                                setTimeout(function () {
                                    //WebGMEGlobal.State.registerActiveVisualizer(vizualizer);
                                    updatedState[CONSTANTS.STATE_ACTIVE_VISUALIZER] = vizualizer;
                                    //updatedState[CONSTANTS.STATE_ACTIVE_OBJECT] = nodePath;

                                    selectionIds = selectionIds || [];

                                    if (selectionIds.length > 0) {
                                        updatedState[CONSTANTS.STATE_ACTIVE_SELECTION] = selectionIds;
                                    }

                                    tab = parseInt(tab, 10);
                                    if (tab >= 0 && vizualizer) {
                                        updatedState[CONSTANTS.STATE_ACTIVE_TAB] = tab;

                                        //we also have to set the selected aspect according to the selectedTabIndex
                                        //TODO this is not the best solution,
                                        // but as the node always orders the aspects based on their names, it is fine
                                        if (vizualizer === 'ModelEditor') {
                                            aspectNames = client.getMetaAspectNames(nodePath);
                                            aspectNames.sort(function (a, b) {
                                                var an = a.toLowerCase(),
                                                    bn = b.toLowerCase();

                                                return (an < bn) ? -1 : 1;
                                            });
                                            aspectNames.unshift('All');
                                            updatedState[CONSTANTS.STATE_ACTIVE_ASPECT] = aspectNames[tab] || 'All';
                                        }
                                    }

                                    WebGMEGlobal.State.set(updatedState);
                                });
                                break;
                            }
                        }
                    }
                    client.removeUI(activeNodeUI);
                }

                activeNodeUI = client.addUI(user, eventHandler);
                client.updateTerritory(activeNodeUI, userPattern);
            }

            function createNewProject() {
                Q.nfcall(client.getProjects, {})
                    .then(function (projectArray) {
                        var projectDeferred = Q.defer(),
                            projectExisted = false,
                            userId = client.getUserId() === 'n/a' ?
                                gmeConfig.authentication.guestAccount : client.getUserId(),
                            newProjectId = userId + client.CONSTANTS.STORAGE.PROJECT_ID_SEP +
                                initialThingsToDo.projectToLoad,
                            i;

                        for (i = 0; i < projectArray.length; i += 1) {
                            if (projectArray[i]._id === newProjectId) {
                                projectExisted = true;
                                break;
                            }
                        }

                        if (projectExisted) {
                            //fall back to loading
                            Q.nfcall(client.selectProject, newProjectId, undefined)
                                .then(function () {
                                    return Q.nfcall(client.getBranches, newProjectId);
                                })
                                .then(projectDeferred.resolve)
                                .catch(projectDeferred.reject);
                            return projectDeferred.promise;
                        }

                        Q.nfcall(client.seedProject, {
                            type: 'file',
                            projectName: initialThingsToDo.projectToLoad,
                            seedName: WebGMEGlobal.gmeConfig.seedProjects.defaultProject
                        })
                            .then(function () {
                                return Q.nfcall(client.selectProject, newProjectId, undefined);
                            })
                            .then(function () {
                                return Q.nfcall(client.getBranches, newProjectId);
                            })
                            .then(projectDeferred.resolve)
                            .catch(projectDeferred.reject);

                        return projectDeferred.promise;
                    })
                    .then(function (branches) {
                        if (initialThingsToDo.commitToLoad) {
                            return Q.nfcall(client.selectCommit, initialThingsToDo.commitToLoad);
                        }

                        if (initialThingsToDo.branchToLoad &&
                            branches[initialThingsToDo.branchToLoad]) {
                            return Q.nfcall(client.selectBranch, initialThingsToDo.branchToLoad, null);
                        }
                    })
                    .then(function () {
                        selectObject(initialThingsToDo.objectToLoad, initialThingsToDo.activeSelectionToLoad,
                            initialThingsToDo.visualizerToLoad, initialThingsToDo.tabToSelect);
                    })
                    .catch(function (err) {
                        logger.error('error during startup', err);
                        openProjectLoadDialog(false);
                    });
            }
        }

        return {
            start: webGMEStart
        };
    }
);
