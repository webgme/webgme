"use strict";

var WebGMEGlobal = { 'version': 'DEMO - 12/16/2013',
    'SUPPORTS_TOUCH': 'ontouchstart' in window || navigator.msMaxTouchPoints }; //touch device detection}

// let require load all the toplevel needed script and call us on domReady
define(['logManager',
    'bin/getconfig',
    'js/client',
    'clientUtil',
    'js/Utils/GMEConcepts',
    'js/LayoutManager/LayoutManager',
    'js/Decorators/DecoratorManager',
    'js/KeyboardManager/KeyboardManager',
    'js/PanelManager/PanelManager',
    './WebGME.History',
    'js/Utils/METAAspectHelper',
    'js/ConstraintManager/ConstraintManager'], function (logManager,
                                            CONFIG,
                                            Client,
                                            util,
                                            GMEConcepts,
                                            LayoutManager,
                                            DecoratorManager,
                                            KeyboardManager,
                                            PanelManager,
                                            WebGMEHistory,
                                            METAAspectHelper,
                                            ConstraintManager) {

    var _webGMEStart = function () {
        var lm,
            client,
            loadPanels,
            layoutToLoad = util.getURLParameterByName('layout') || 'DefaultLayout',
            commitToLoad = util.getURLParameterByName('commit').toLowerCase(),
            projectToLoad = util.getURLParameterByName('project'),
            objectToLoad = util.getURLParameterByName('obj').toLowerCase(),
            logger = logManager.create('WebGME'),
            selectObject;

        lm = new LayoutManager();
        lm.loadLayout(layoutToLoad, function () {
            var panels = [],
                layoutPanels = lm._currentLayout.panels,
                len = layoutPanels ? layoutPanels.length : 0,
                i;

            client = new Client(CONFIG);

            WebGMEGlobal.ConstraintManager = new ConstraintManager(client);

            WebGMEHistory.setClient(client);

            GMEConcepts.initialize(client);

            METAAspectHelper.initialize(client);

            //hook up branch changed to set read-only mode on panels
            client.addEventListener(client.events.BRANCH_CHANGED, function (__project, branchName) {
                var readOnly = branchName === null || branchName === undefined;
                lm.setPanelReadOnly(readOnly);
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

            lm.loadPanel(p, function () {
                if (panels.length > 0) {
                    loadPanels(panels);
                } else {
                    client.connectToDatabaseAsync({'open': true,
                                                    'project': projectToLoad || CONFIG.project}, function (err) {
                        if (err) {
                            logger.error(err);
                        } else {
                            if (commitToLoad && commitToLoad !== "") {
                                client.selectCommitAsync(commitToLoad, function (err) {
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
                }
            });
        };

        selectObject = function () {
            if (objectToLoad && objectToLoad !== "") {
                setTimeout(function () {
                    client.setSelectedObjectId(objectToLoad);
                }, 1000);
            }
        };
    };

    return {
        start : _webGMEStart
    };
});