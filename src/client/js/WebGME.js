/*globals define, _, WebGMEGlobal, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define([
        'js/logger',
        'js/client',
        'js/Constants',
        'js/Panels/MetaEditor/MetaEditorConstants',
        'js/Utils/GMEConcepts',
        'js/Utils/GMEVisualConcepts',
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
        'js/Utils/ComponentSettings',
        'common/storage/util',
        'q',
        'jquery'
    ], function (Logger,
                 Client,
                 CONSTANTS,
                 METACONSTANTS,
                 GMEConcepts,
                 GMEVisualConcepts,
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
                 ComponentSettings,
                 StorageUtil,
                 Q) {

        'use strict';

        var componentId = 'GenericUIWebGMEStart',
            defaultConfig = {
                pageTitle: 'WebGME',
                disableProjectsDialog: false,
                initialContext: {
                    project: null,
                    branch: null,
                    node: null
                },
                nodeAtOpen: '',
                byProjectName: {
                    nodeAtOpen: {}
                },
                byProjectId: {
                    nodeAtOpen: {}
                }
            };

        function webGMEStart(afterPanelsLoaded) {
            var layoutManager,
                client,
                gmeConfig = WebGMEGlobal.gmeConfig,
                logger = Logger.create('gme:WebGME', WebGMEGlobal.gmeConfig.client.log),
                initialThingsToDo = WebGMEUrlManager.parseInitialThingsToDoFromUrl(),
                projectOpenDialog,
                initialProject = true,
                config = defaultConfig;

            ComponentSettings.resolveWithWebGMEGlobal(config, componentId);

            // URL query has higher priority than the config.
            if ((initialThingsToDo.projectToLoad || initialThingsToDo.createNewProject) === false) {
                initialThingsToDo.projectToLoad = config.initialContext.project;
                initialThingsToDo.branchToLoad = initialThingsToDo.branchToLoad ||
                    config.initialContext.branch;
                initialThingsToDo.objectToLoad = initialThingsToDo.objectToLoad ||
                    config.initialContext.node || initialThingsToDo.objectToLoad; // i.e. the root-node.
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

                client.registerUIStateGetter(function () {
                    return WebGMEGlobal.State.toJSON();
                });

                WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, function () {
                    // Currently we only emit events to other users when our active object changed,
                    // this is up for debate. 
                    client.emitStateNotification();
                });

                WebGMEGlobal.State.registerLayout(initialThingsToDo.layoutToLoad);

                document.title = config.pageTitle;

                logger.info('init-phase true');
                WebGMEHistory.initialize();

                GMEConcepts.initialize(client);
                GMEVisualConcepts.initialize(client);

                PreferencesHelper.initialize(client);

                //hook up branch changed to set read-only mode on panels
                client.addEventListener(client.CONSTANTS.BRANCH_CHANGED, function (_client, branchName) {
                    layoutManager.setPanelReadOnly(client.isCommitReadOnly() || client.isProjectReadOnly());
                    if (branchName) {
                        WebGMEGlobal.State.registerActiveBranchName(branchName);
                    } else if (client.getActiveCommitHash()) {
                        WebGMEGlobal.State.registerActiveCommit(client.getActiveCommitHash());
                    } else {
                        WebGMEGlobal.State.registerActiveBranchName(null);
                    }
                });
                client.addEventListener(client.CONSTANTS.PROJECT_OPENED, function (_client, projectId) {
                    var projectName,
                        nodePath;

                    document.title = WebGMEGlobal.gmeConfig.authentication.enable ?
                        StorageUtil.getProjectDisplayedNameFromProjectId(projectId) :
                        StorageUtil.getProjectNameFromProjectId(projectId);

                    layoutManager.setPanelReadOnly(client.isProjectReadOnly());
                    WebGMEGlobal.State.registerActiveProjectName(projectId);

                    if (initialProject === false) {
                        projectName = client.getActiveProjectName();

                        if (config.byProjectId.nodeAtOpen.hasOwnProperty(projectId)) {
                            nodePath = config.byProjectId.nodeAtOpen[projectId];
                        } else if (config.byProjectName.nodeAtOpen.hasOwnProperty(projectName)) {
                            nodePath = config.byProjectName.nodeAtOpen[projectName];
                        } else {
                            nodePath = config.nodeAtOpen;
                        }

                        if (nodePath) {
                            setActiveNode(nodePath);
                        } else {
                            setActiveNode(CONSTANTS.PROJECT_ROOT_ID);
                        }
                    }
                });

                //on project close clear the current state
                client.addEventListener(client.CONSTANTS.PROJECT_CLOSED, function (/* __project, projectName */) {
                    document.title = config.pageTitle;
                    initialProject = false;
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

            function loadPanels(panels) {
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
            }

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
                WebGMEGlobal.State.registerSuppressVisualizerFromNode(false);
                initialProject = false;
                //if initial project openings failed we show the project opening dialog
                logger.info('init-phase false');
                logger.info('about to open projectOpenDialog, connect:', connect);
                if (connect) {
                    client.connectToDatabase(function (err) {
                        if (err) {
                            logger.error('Failed to connect to database', err);
                            return;
                        }
                        if (config.disableProjectsDialog === false) {
                            projectOpenDialog = new ProjectsDialog(client);
                            projectOpenDialog.show();
                        } else {
                            showNoProjectModal();
                        }
                    });
                } else if (config.disableProjectsDialog === false) {
                    projectOpenDialog = new ProjectsDialog(client);
                    projectOpenDialog.show();
                } else {
                    showNoProjectModal();
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
                                updatedState[CONSTANTS.STATE_ACTIVE_OBJECT] = nodePath;

                                selectionIds = selectionIds || [];

                                if (selectionIds.length > 0) {
                                    updatedState[CONSTANTS.STATE_ACTIVE_SELECTION] = selectionIds;
                                }

                                tab = parseInt(tab, 10);
                                if (tab >= 0 && vizualizer) {
                                    updatedState[CONSTANTS.STATE_ACTIVE_VISUALIZER] = vizualizer;
                                    updatedState[CONSTANTS.STATE_ACTIVE_TAB] = tab;

                                    // Suppress the node determining the visualizer.
                                    WebGMEGlobal.State.registerActiveVisualizer(vizualizer);
                                    WebGMEGlobal.State.registerActiveTab(tab);

                                    // We also have to set the selected aspect according to the selectedTabIndex,
                                    //TODO this is not the best solution,
                                    // but as the node always orders the aspects based on their names, it is fine.
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

                                setTimeout(function () {
                                    WebGMEGlobal.State.set(updatedState);
                                    // After the state has been updated, make sure to allow node look-up again.
                                    WebGMEGlobal.State.registerSuppressVisualizerFromNode(false);
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
                            userId = WebGMEGlobal.userInfo._id,
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

            function showNoProjectModal() {
                $('<div class="modal fade" tabindex="-1" role="dialog">' +
                    '<div class="modal-dialog" style="margin-top: 200px;">' +
                    '<div class="modal-content" style="background: none; border: none;">' +
                    '<h1 style="text-align: center;">No project opened ...</h1>' +
                    '</div></div></div>').modal('show');
            }

            function setActiveNode(nodePath) {
                var userPattern = {},
                    tempUI;
                userPattern[nodePath] = {children: 0};
                function eventHandler(events) {
                    var i,
                        activeNode;

                    for (i = 0; i < events.length; i += 1) {
                        //look for the active node
                        if (events[i].eid === nodePath) {
                            activeNode = client.getNode(nodePath);
                            if (activeNode) {
                                WebGMEGlobal.State.registerActiveObject(nodePath);
                                break;
                            }
                        }
                    }

                    client.removeUI(tempUI);
                }

                tempUI = client.addUI(null, eventHandler);
                client.updateTerritory(tempUI, userPattern);
            }
        }

        return {
            start: webGMEStart
        };
    }
);
