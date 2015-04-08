/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

WebGMEGlobal.version = 'x';
WebGMEGlobal['SUPPORTS_TOUCH'] = 'ontouchstart' in window || navigator.msMaxTouchPoints;


// let require load all the toplevel needed script and call us on domReady
define(['js/logger',
    'text!/gmeConfig.json',
    'text!/package.json',
    'js/client',
    'js/Constants',
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
    'js/Utils/METAAspectHelper',
    'js/Utils/PreferencesHelper',
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Utils/InterpreterManager'], function (Logger,
                                              gmeConfigJson,
                                              packagejson,
                                              Client,
                                              CONSTANTS,
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
                                              METAAspectHelper,
                                              PreferencesHelper,
                                              ProjectsDialog,
                                              InterpreterManager) {

    "use strict";

    var npmJSON = JSON.parse(packagejson),
        gmeConfig = JSON.parse(gmeConfigJson),
        npmJSONFromSplit;
    WebGMEGlobal.version = npmJSON.version;
    WebGMEGlobal.NpmVersion = npmJSON.dist ? npmJSON.version : '';
    WebGMEGlobal.GitHubVersion = '';
    if (npmJSON._from) {
        npmJSONFromSplit = npmJSON._from.split('/');
        WebGMEGlobal.GitHubVersion = npmJSONFromSplit[npmJSONFromSplit.length - 1];
    }


    var _webGMEStart = function (afterPanelsLoaded) {
        var layoutManager,
            client,
            loadPanels,
            logger = Logger.create('gme:WebGME', WebGMEGlobal.gmeConfig.client.log),
            selectObject,
            loadBranch,
            initialThingsToDo = WebGMEUrlManager.parseInitialThingsToDoFromUrl(),
            projectOpenDialog,
            openProjectLoadDialog;

        // URL query has higher priority than the config.
        if ((initialThingsToDo.projectToLoad || initialThingsToDo.createNewProject) === false) {
            initialThingsToDo.projectToLoad = gmeConfig.client.defaultProject.name;
            initialThingsToDo.branchToLoad = initialThingsToDo.branchToLoad || gmeConfig.client.defaultProject.branch;
            initialThingsToDo.objectToLoad = initialThingsToDo.objectToLoad || gmeConfig.client.defaultProject.node;
            // TODO: add commit to load
        }


        layoutManager = new LayoutManager();
        layoutManager.loadLayout(initialThingsToDo.layoutToLoad, function () {
            var panels = [],
                layoutPanels = layoutManager._currentLayout.panels,
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

            WebGMEGlobal.State.setIsInitPhase(true);
            logger.info('init-phase true');
            WebGMEHistory.initialize();

            GMEConcepts.initialize(client);
            GMEVisualConcepts.initialize(client);

            METAAspectHelper.initialize(client);
            PreferencesHelper.initialize(client);

            ExportManager.initialize(client);
            ImportManager.initialize(client);

            WebGMEGlobal.ExportManager = ExportManager;
            WebGMEGlobal.ImportManager = ImportManager;

            //hook up branch changed to set read-only mode on panels
            client.addEventListener(client.events.BRANCH_CHANGED, function (__project, branchName) {
                layoutManager.setPanelReadOnly(client.isCommitReadOnly() || client.isProjectReadOnly());
                WebGMEGlobal.State.registerActiveBranchName(branchName);
            });
            client.addEventListener(client.events.PROJECT_OPENED, function (__project, projectName) {
                layoutManager.setPanelReadOnly(client.isProjectReadOnly());
                WebGMEGlobal.State.registerActiveProjectName(projectName);
            });

            //on project close clear the current state
            client.addEventListener(client.events.PROJECT_CLOSED, function (__project, projectName) {
                WebGMEGlobal.State.clear();
            });

            client.decoratorManager = new DecoratorManager();
            client.decoratorManager.downloadAll(gmeConfig.client.usedDecorators, function (err) {
                if (err) {
                    logger.error(err);
                }
                for (i = 0; i < len; i += 1) {
                    panels.push({
                        'panel': layoutPanels[i].panel,
                        'container': layoutPanels[i].container,
                        'control': layoutPanels[i].control,
                        'params': {'client': client}
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

                    if (initialThingsToDo.createNewProject) {
                        client.connectToDatabaseAsync({}, function (err) {
                            if (err) {
                                logger.error(err);
                                openProjectLoadDialog();
                                return;
                            }
                            client.getAvailableProjectsAsync(function (err, projectArray) {
                                if (err) {
                                    logger.error(err);
                                    openProjectLoadDialog();
                                    return;
                                }
                                if (projectArray.indexOf(initialThingsToDo.projectToLoad) !== -1) {
                                    //we fallback to loading
                                    client.selectProjectAsync(initialThingsToDo.projectToLoad, function (err) {
                                        if (err) {
                                            logger.error(err);
                                            openProjectLoadDialog();
                                            return;
                                        }
                                        if (initialThingsToDo.branchToLoad) {
                                            loadBranch(initialThingsToDo.branchToLoad);
                                        } else if (initialThingsToDo.commitToLoad && initialThingsToDo.commitToLoad !== "") {
                                            client.selectCommitAsync(initialThingsToDo.commitToLoad, function (err) {
                                                if (err) {
                                                    logger.error(err);
                                                    WebGMEGlobal.State.setIsInitPhase(false);
                                                    logger.info('init-phase false');
                                                    return;
                                                }
                                                selectObject();
                                            });
                                        } else {
                                            selectObject();
                                        }
                                    });
                                } else {
                                    //we create the project
                                    var seedParameters = {
                                        type: 'file', // FIXME: is the default project always file?
                                        projectName: initialThingsToDo.projectToLoad,
                                        seedName: WebGMEGlobal.gmeConfig.seedProjects.defaultProject,
                                        branchName: 'master'
                                    };
                                    client.seedProjectAsync(seedParameters, function (err) {
                                        if (err) {
                                            logger.error(err);
                                            openProjectLoadDialog();
                                            return;
                                        }
                                        client.selectProjectAsync(initialThingsToDo.projectToLoad, function (err) {
                                            if (err) {
                                                logger.error(err);
                                                openProjectLoadDialog();
                                                return;
                                            }
                                            WebGMEGlobal.State.setIsInitPhase(false);
                                            logger.info('init-phase false');
                                            //otherwise we are pretty much done cause we ignore the other parameters
                                        });
                                    });
                                }
                            });
                        });
                    } else {
                        if (!initialThingsToDo.projectToLoad) {
                            openProjectLoadDialog();
                        } else {
                            client.connectToDatabaseAsync({
                                'open': initialThingsToDo.projectToLoad,
                                'project': initialThingsToDo.projectToLoad
                            }, function (err) {
                                if (err) {
                                    logger.error(err);
                                    openProjectLoadDialog();
                                    return;
                                }
                                if (initialThingsToDo.branchToLoad) {
                                    loadBranch(initialThingsToDo.branchToLoad);
                                } else if (initialThingsToDo.commitToLoad) {
                                    client.selectCommitAsync(initialThingsToDo.commitToLoad, function (err) {
                                        if (err) {
                                            logger.error(err);
                                            openProjectLoadDialog();
                                            return;
                                        }
                                        selectObject();
                                    });
                                } else {
                                    selectObject();
                                }
                            });
                        }
                    }
                }
            });
        };

        openProjectLoadDialog = function () {
            //if initial project openings failed we show the project opening dialog
            WebGMEGlobal.State.setIsInitPhase(false);
            logger.info('init-phase false');
            client.connectToDatabaseAsync({}, function (err) {
                if (err) {
                    logger.error(err);
                    return;
                }
                client.getAvailableProjectsAsync(function (err, projectArray) {
                    projectOpenDialog = new ProjectsDialog(client);
                    projectOpenDialog.show();
                });
            });
        };

        selectObject = function () {
            var user = {},
                userPattern = {},
                userActiveNodeId,
                nodePath = initialThingsToDo.objectToLoad === 'root' ?
                    CONSTANTS.PROJECT_ROOT_ID : initialThingsToDo.objectToLoad;

            userPattern[nodePath] = {children: 0};
            logger.debug('selectObject', initialThingsToDo.objectToLoad);
            logger.debug('activeSelectionToLoad', initialThingsToDo.activeSelectionToLoad);
            if (initialThingsToDo.activeSelectionToLoad && initialThingsToDo.activeSelectionToLoad.length > 0) {
                userPattern[nodePath] = {children: 1};
            } else {
                userPattern[nodePath] = {children: 0};
            }

            userPattern[METACONSTANTS.META_ASPECT_CONTAINER_ID] = {children: 0};

            function eventHandler(events) {
                var metaContainer,
                    i,
                    metaPaths,
                    metaEventHandler,
                    metaPattern = {},
                    userMetaId;
                logger.debug('events from selectObject', events);
                if (events[0].etype === 'complete') {
                    logger.debug('active node loaded');
                    metaContainer = client.getNode(METACONSTANTS.META_ASPECT_CONTAINER_ID);
                    metaPaths = metaContainer.getMemberIds(METACONSTANTS.META_ASPECT_SET_NAME);
                    for (i = 0; i < metaPaths.length; i += 1) {
                        metaPattern[metaPaths[i]] = {children: 0};
                    }
                    metaEventHandler = function (metaEvents) {
                        logger.debug('events from meta-nodes load', metaEvents);
                        if (metaEvents[0].etype === 'complete') {
                            logger.debug('meta nodes loaded');
                            WebGMEUrlManager.loadStateFromParsedUrl(initialThingsToDo);
                            client.removeUI(userActiveNodeId);
                            client.removeUI(userMetaId);
                        }
                    };
                    userMetaId = client.addUI(user, metaEventHandler);
                    client.updateTerritory(userMetaId, metaPattern);
                }
            }

            userActiveNodeId = client.addUI(user, eventHandler);
            client.updateTerritory(userActiveNodeId, userPattern);
        };


        loadBranch = function (branchName) {
            client.selectBranchAsync(branchName, function (err) {
                if (err) {
                    logger.error(err);
                    openProjectLoadDialog();
                } else {
                    selectObject();
                }
            });
        };

    };

    return {
        start: _webGMEStart
    };
});
