"use strict";

// let require load all the toplevel needed script and call us on domReady
define(['logManager',
    'commonUtil',
    'user/basic',
    'js/LayoutManager/LayoutManager'], function (logManager,
                                            commonUtil,
                                            Client,
                                            LayoutManager) {

    var _webGMEStart = function () {
        var options = commonUtil.combinedserver,
            lm,
            client,
            loadPanels;

        lm = new LayoutManager();
        lm.loadLayout('DefaultLayout', function () {
            var panels = [];

            client = new Client({
                proxy: location.host + options.projsrv,
                options : options.socketiopar,
                projectinfo : "*PI*" + options.mongocollection,
                defaultproject : options.mongocollection,
                faulttolerant : options.faulttolerant,
                cache : options.cache,
                log : options.logging,
                logsrv : location.host + options.logsrv,
                nosaveddata : commonUtil.combinedserver.nosaveddata,
                project : commonUtil.combinedserver.project
            });

            //hook up branch changed to set read-only mode on panels
            client.addEventListener(client.events.BRANCH_CHANGED, function (__project, branchName) {
                var readOnly = (branchName === null || branchName === undefined) ? true : false;
                lm.setPanelReadOnly(readOnly);
            });

            // HEADER PANEL
            panels.push({'name': 'ProjectTitle/ProjectTitlePanel',
                'container': 'header',
                'params' : {'client': client}});

            // FOOTER PANEL
            panels.push({'name': 'FooterControls/FooterControlsPanel',
                'container': 'footer',
                'params' : {'client': client}});

            // LEFT SIDE PANELS PANELS
            panels.push({'name': 'Visualizer/VisualizerPanel',
                'container': 'left',
                'params' : {'client': client}});

            panels.push({'name': 'Project/ProjectPanel',
                'container': 'left',
                'params' : {'client': client}});

            panels.push({'name': 'PartBrowser/PartBrowserPanel',
                'container': 'left',
                'params' : {'client': client}});

            panels.push({'name': 'SetEditor/SetEditorPanel',
                'container': 'left',
                'params' : {'client': client}});

            // RIGHT SIDE PANELS PANELS
            panels.push({'name': 'ObjectBrowser/ObjectBrowserPanel',
                'container': 'right',
                'params' : {'client': client}});

            panels.push({'name': 'PropertyEditor/PropertyEditorPanel',
                'container': 'right',
                'params' : {'client': client}});

            // DEBUG ONLY PANELS
            if (commonUtil.DEBUG === true) {
                panels.push({'name': 'DebugTest/DebugTestPanel',
                    'container': 'left',
                    'params' : {'client': client}});
            }

            //load the panels
            loadPanels(panels);
        });

        loadPanels = function (panels) {
            var p = panels.splice(0, 1)[0];

            lm.loadPanel(p, function () {
                if (panels.length > 0) {
                    loadPanels(panels);
                } else {
                    client.connectToDatabaseAsync({'open': true,
                                                    'project': commonUtil.combinedserver.project});
                }
            });
        };
    };

    return {
        start : _webGMEStart
    };
});