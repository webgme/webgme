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
    'js/Utils/METAAspectHelper',
    'js/Utils/PreferencesHelper',
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Utils/InterpreterManager',
    'superagent'
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
             METAAspectHelper,
             PreferencesHelper,
             ProjectsDialog,
             InterpreterManager,
             superagent) {

    'use strict';

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


    function webGMEStart(afterPanelsLoaded) {
        var layoutManager,
            client,
            loadPanels,
            logger = Logger.create('gme:WebGME', WebGMEGlobal.gmeConfig.client.log),
            initialThingsToDo = WebGMEUrlManager.parseInitialThingsToDoFromUrl(),
            projectOpenDialog;

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
            client.addEventListener(CLIENT_CONSTANTS.BRANCH_CHANGED, function (__project, branchName) {
                layoutManager.setPanelReadOnly(client.isCommitReadOnly() || client.isProjectReadOnly());
                WebGMEGlobal.State.registerActiveBranchName(branchName);
            });
            client.addEventListener(CLIENT_CONSTANTS.PROJECT_OPENED, function (__project, projectName) {
                layoutManager.setPanelReadOnly(client.isProjectReadOnly());
                WebGMEGlobal.State.registerActiveProjectName(projectName);
            });

            //on project close clear the current state
            client.addEventListener(CLIENT_CONSTANTS.PROJECT_CLOSED, function (/* __project, projectName */) {
                WebGMEGlobal.State.clear();
            });


            client.decoratorManager = new DecoratorManager();
            getAvaliablePluginsAndDecoratorsAndSeeds();

            client.decoratorManager.downloadAll(gmeConfig.client.usedDecorators, function (err) {
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
                    if (initialThingsToDo.createNewProject) {
                        createNewProject();
                    } else {
                        if (initialThingsToDo.projectToLoad) {
                            client.connectToDatabase(function (err) {
                                if (err) {
                                    logger.error('Failed to connect to database', err);
                                    return;
                                }
                                client.selectProject(initialThingsToDo.projectToLoad, initialThingsToDo.branchToLoad,
                                    function (err) {
                                        if (err) {
                                            logger.error(err);
                                            openProjectLoadDialog(false);
                                            return;
                                        }
                                        if (initialThingsToDo.commitToLoad) {
                                            client.selectCommit(initialThingsToDo.commitToLoad, function (err) {
                                                if (err) {
                                                    logger.error(err);
                                                    openProjectLoadDialog(false);
                                                    return;
                                                }
                                                selectObject();
                                            });
                                        } else {
                                            selectObject();
                                        }
                                    });
                            });
                        } else {
                            openProjectLoadDialog(true);
                        }
                    }
                }
            });
        };

        function openProjectLoadDialog(connect) {
            //if initial project openings failed we show the project opening dialog
            WebGMEGlobal.State.setIsInitPhase(false);
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

        function selectObject() {
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

                            initialThingsToDo.activeSelectionToLoad = initialThingsToDo.activeSelectionToLoad || [];

                            if (initialThingsToDo.activeSelectionToLoad.length > 0) {
                                updatedState[CONSTANTS.STATE_ACTIVE_SELECTION] =
                                    initialThingsToDo.activeSelectionToLoad;
                            }

                            updatedState[CONSTANTS.STATE_ACTIVE_VISUALIZER] = initialThingsToDo.visualizerToLoad;
                            if (initialThingsToDo.tabToSelect !== null &&
                                initialThingsToDo.tabToSelect !== undefined) {
                                updatedState[CONSTANTS.STATE_ACTIVE_TAB] = initialThingsToDo.tabToSelect;

                                //we also have to set the selected aspect according to the selectedTabIndex
                                //TODO this is not the best solution,
                                // but as the node always orders the aspects based on their names, it is fine
                                aspectNames = client.getMetaAspectNames(nodePath);
                                aspectNames.unshift('All');
                                updatedState[CONSTANTS.STATE_ACTIVE_ASPECT] =
                                    aspectNames[initialThingsToDo.tabToSelect] || 'All';
                            }

                            WebGMEGlobal.State.set(updatedState);
                            break;
                        }
                    }
                }
                client.removeUI(userActiveNodeId);
            }

            userActiveNodeId = client.addUI(user, eventHandler);
            client.updateTerritory(userActiveNodeId, userPattern);
        }

        function loadBranch(branchName) {
            client.getBranches(initialThingsToDo.projectToLoad, function (err, branches) {
                var branchNames;
                if (err) {
                    logger.error(err);
                    openProjectLoadDialog(false);
                    return;
                }
                branchNames = Object.keys(branches);
                if (branchNames.indexOf(branchName) > -1) {
                    logger.debug('Given branch exists among branches, selecting..', branchName, branchNames);
                    client.selectBranch(branchName, null, function (err) {
                        if (err) {
                            logger.error(err);
                            openProjectLoadDialog(false);
                        } else {
                            selectObject();
                        }
                    });
                } else {
                    logger.error('Given branch did not exist among branches.', branchName, branchNames);
                    openProjectLoadDialog(false);
                }
            });
        }

        function createNewProject() {
            client.connectToDatabase(function (err) {
                if (err) {
                    logger.error('Failed to connect to database', err);
                    return;
                }
                client.getProjects({}, function (err, projectArray) {
                    var seedParameters,
                        projectExisted = false,
                        userId = client.getUserId() === 'n/a' ?
                            gmeConfig.authentication.guestAccount : client.getUserId(),
                        newProjectId = userId + client.CONSTANTS.STORAGE.PROJECT_ID_SEP +
                            initialThingsToDo.projectToLoad,
                        i;

                    if (err) {
                        logger.error(err);
                        openProjectLoadDialog(false);
                        return;
                    }

                    for (i = 0; i < projectArray.length; i += 1) {
                        if (projectArray[i]._id === newProjectId) {
                            projectExisted = true;
                            break;
                        }
                    }

                    if (projectExisted) {
                        // we fallback to loading
                        client.selectProject(newProjectId, initialThingsToDo.branchToLoad, function (err) {
                            if (err) {
                                logger.error(err);
                                openProjectLoadDialog(false);
                                return;
                            }
                            if (initialThingsToDo.commitToLoad && initialThingsToDo.commitToLoad !== '') {
                                client.selectCommit(initialThingsToDo.commitToLoad, function (err) {
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
                        seedParameters = {
                            type: 'file', // FIXME: is the default project always file?
                            projectName: initialThingsToDo.projectToLoad,
                            seedName: WebGMEGlobal.gmeConfig.seedProjects.defaultProject,
                            branchName: 'master'
                        };

                        client.seedProject(seedParameters, function (err) {
                            if (err) {
                                logger.error(err);
                                openProjectLoadDialog(false);
                                return;
                            }
                            //FIXME: this is not necessarily safe
                            setTimeout(function () {
                                client.selectProject(newProjectId, null, function (err) {
                                    if (err) {
                                        logger.error(err);
                                        openProjectLoadDialog(false);
                                        return;
                                    }
                                    WebGMEGlobal.State.setIsInitPhase(false);
                                    logger.info('init-phase false');
                                    //otherwise we are pretty much done cause we ignore the other parameters
                                });
                            });
                        });
                    }
                });
            });
        }

        //This is still asychronous but has a better chance to finish here rather than from the client.
        function getAvaliablePluginsAndDecoratorsAndSeeds() {
            superagent.get('/listAllPlugins')
                .end(function (err, res) {
                    if (res.status === 200) {
                        WebGMEGlobal.allPlugins = res.body.allPlugins;
                        logger.debug('/listAllPlugins', WebGMEGlobal.allPlugins);
                    } else {
                        logger.error('/listAllPlugins failed');
                        WebGMEGlobal.allPlugins = [];
                    }
                });
            superagent.get('/listAllDecorators')
                .end(function (err, res) {
                    if (res.status === 200) {
                        WebGMEGlobal.allDecorators = res.body.allDecorators;
                        logger.debug('/listAllDecorators', WebGMEGlobal.allDecorators);
                    } else {
                        logger.error('/listAllDecorators failed', err);
                        WebGMEGlobal.allDecorators = [];
                    }
                });
            superagent.get('/listAllSeeds')
                .end(function (err, res) {
                    if (res.status === 200) {
                        WebGMEGlobal.allSeeds = res.body.allSeeds;
                        logger.debug('/listAllSeeds', WebGMEGlobal.allSeeds);
                    } else {
                        logger.error('/listAllSeeds failed', err);
                        WebGMEGlobal.allSeeds = [];
                    }
                });
        }

    }

    return {
        start: webGMEStart
    };
});
