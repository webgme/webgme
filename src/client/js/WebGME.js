/*globals define, _, DEBUG*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */
var WebGMEGlobal = WebGMEGlobal || {};
WebGMEGlobal.version = 'x';
WebGMEGlobal['SUPPORTS_TOUCH'] = 'ontouchstart' in window || navigator.msMaxTouchPoints;


// let require load all the toplevel needed script and call us on domReady
define(['logManager',
    'text!/gmeConfig.json',
    'text!/package.json',
    'js/client',
    'js/Constants',
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
    'js/Utils/InterpreterManager'], function (logManager,
                                            gmeConfigJson,
                                            packagejson,
                                            Client,
                                            CONSTANTS,
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
        gmeConfig = JSON.parse(gmeConfigJson);
    WebGMEGlobal.version = npmJSON.version;


    var _webGMEStart = function ( afterPanelsLoaded ) {
        var layoutManager,
            client,
            loadPanels,
            logger = logManager.create('WebGME'),
            selectObject,
            loadBranch,
            initialThingsToDo = WebGMEUrlManager.parseInitialThingsToDoFromUrl(),
            projectOpenDialog,
            openProjectLoadDialog;

        initialThingsToDo.branchToLoad = initialThingsToDo.branchToLoad ||  gmeConfig.client.defaultProject.branch;

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
                value : StateManager.initialize(),
                writable : false,
                enumerable : true,
                configurable : false}
            );

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

            for (i = 0; i < len; i += 1) {
                panels.push({'panel': layoutPanels[i].panel,
                    'container': layoutPanels[i].container,
                    'control': layoutPanels[i].control,
                    'params' : {'client': client}});
            }

            //load the panels
            loadPanels(panels);

            //as of now it's a global variable just to make access to it easier
            //TODO: might need to be changed
            WebGMEGlobal.KeyboardManager = KeyboardManager;
            WebGMEGlobal.KeyboardManager.setEnabled(true);
            WebGMEGlobal.PanelManager = new PanelManager();
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

                    if(initialThingsToDo.createNewProject){
                        client.connectToDatabaseAsync({},function(err){
                            if(err){
                                logger.error(err);
                                openProjectLoadDialog();
                            } else {
                                client.getAvailableProjectsAsync(function(err,projectArray){
                                    if(err){
                                        logger.error(err);
                                        openProjectLoadDialog();
                                    } else {
                                        if(projectArray.indexOf(initialThingsToDo.projectToLoad) !== -1){
                                            //we fallback to loading
                                            client.selectProjectAsync(initialThingsToDo.projectToLoad,function(err){
                                                if(err){
                                                    logger.error(err);
                                                    openProjectLoadDialog();
                                                } else {
                                                    if (initialThingsToDo.branchToLoad) {
                                                        loadBranch(initialThingsToDo.branchToLoad);
                                                    } else  if (initialThingsToDo.commitToLoad && initialThingsToDo.commitToLoad !== "") {
                                                        client.selectCommitAsync(initialThingsToDo.commitToLoad, function (err) {
                                                            if (err) {
                                                                logger.error(err);
                                                            } else {
                                                                selectObject();
                                                            }
                                                        });
                                                    } else {
                                                        selectObject();
                                                    }
                                                }
                                            });
                                        } else {
                                            //we create the project
                                            //TODO probably some meaningful INFO is needed
                                            client.createProjectAsync(initialThingsToDo.projectToLoad,null,function(err){
                                                if(err){
                                                    logger.error(err);
                                                    openProjectLoadDialog();
                                                } else {
                                                    client.selectProjectAsync(initialThingsToDo.projectToLoad,function(err) {
                                                        if (err) {
                                                            logger.error(err);
                                                            openProjectLoadDialog();
                                                        } else {
                                                            GMEConcepts.createBasicProjectSeed();
                                                        }
                                                        //otherwise we are pretty much done cause we ignore the other parameters
                                                    });
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    } else {

                        initialThingsToDo.projectToLoad = initialThingsToDo.projectToLoad ||
                            gmeConfig.client.defaultProject.name;

                        if (!initialThingsToDo.projectToLoad){
                            openProjectLoadDialog();
                        } else {
                            client.connectToDatabaseAsync({
                                'open': initialThingsToDo.projectToLoad,
                                'project': initialThingsToDo.projectToLoad
                            }, function (err) {
                                if (err) {
                                    logger.error(err);
                                    openProjectLoadDialog();
                                } else {
                                    if (initialThingsToDo.branchToLoad) {
                                        loadBranch(initialThingsToDo.branchToLoad);
                                    } else  if (initialThingsToDo.commitToLoad) {
                                        client.selectCommitAsync(initialThingsToDo.commitToLoad, function (err) {
                                            if (err) {
                                                logger.error(err);
                                                openProjectLoadDialog();
                                            } else {
                                                selectObject();
                                            }
                                        });
                                    } else {
                                        selectObject();

                                    }
                                }
                            });
                        }
                    }
                }
            });
        };

        openProjectLoadDialog = function(){
            //if initial project openings failed we shhow the project opening dialog
            client.connectToDatabaseAsync({},function(err){
                if(err){
                    logger.error(err);
                } else {
                    client.getAvailableProjectsAsync(function(err,projectArray){
                        projectOpenDialog = new ProjectsDialog(client);
                        projectOpenDialog.show();
                    });
                }
            });
        };

        selectObject = function () {
            if (initialThingsToDo.objectToLoad) {
                if (initialThingsToDo.objectToLoad.toLowerCase() === 'root') {
                    initialThingsToDo.objectToLoad = CONSTANTS.PROJECT_ROOT_ID;
                }
                setTimeout(function () {
                    WebGMEGlobal.State.registerActiveObject(initialThingsToDo.objectToLoad);
                }, 1000);
            }
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
        start : _webGMEStart
    };
});
