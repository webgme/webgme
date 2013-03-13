"use strict";

// let require load all the toplevel needed script and call us on domReady
define([  'logManager',
    'commonUtil',
    'clientUtil',
    'js/cli3nt',
    'js/Client/ClientMaster',
    'js/ObjectBrowser/TreeBrowserControl',
    'js/ObjectBrowser/JSTreeBrowserWidget',
    'js/PartBrowser/PartBrowserView',
    'js/PartBrowser/PartBrowserControl',
    'js/Project/ProjectPanel',
    'js/Project/ProjectControl',
    'js/NetworkStatus/NetworkStatusControl',
    'js/NetworkStatus/NetworkStatusView',
    'js/Project/ProjectTitleView',
    'js/SetEditor/SetEditorView',
    'js/SetEditor/SetEditorControl',
    'js/LoggerStatus/LoggerStatus',
    'js/VisualizerPanel/VisualizerPanel',
    'text!js/Visualizers.json'], function (logManager,
                                            commonUtil,
                                            util,
                                            Client,
                                            Core,
                                            TreeBrowserControl,
                                            JSTreeBrowserWidget,
                                            PartBrowserView,
                                            PartBrowserControl,
                                            ProjectPanel,
                                            ProjectControl,
                                            NetworkStatusControl,
                                            NetworkStatusView,
                                            ProjectTitleView,
                                            SetEditorView,
                                            SetEditorControl,
                                            LoggerStatus,
                                            VisualizerPanel,
                                            VisualizersJSON) {

    /*if (commonUtil.DEBUG === true) {
        logManager.setLogLevel(logManager.logLevels.ALL);
        logManager.excludeComponent("TreeBrowserControl");
        logManager.excludeComponent("JSTreeBrowserWidget");
        logManager.excludeComponent("Client");
        logManager.excludeComponent("ModelEditorSVGWidget");
        logManager.excludeComponent("ModelEditorControl");
        logManager.excludeComponent("ModelEditorSVGConnection*");

        //logManager.excludeComponent("ModelEditorModelComponent*");
        //logManager.excludeComponent("ModelWithPortsDecorator*");
        //logManager.excludeComponent("Port*");
        //logManager.excludeComponent("ModelEditorConnectionComponent*");

        //logManager.excludeComponent("ModelEditorView_*");
        //logManager.excludeComponent("HTML_ModelEditorControl");

        logManager.excludeComponent("GraphVizControl");
        logManager.excludeComponent("GraphVizObject*");
    }*/

    var proxy = null,
        tJSTree,
        mainWidget,
        doConnect,
        lastBodyWidth = 0,
        lastBodyHeight = 0,
        resizeMiddlePane,
        mainController,
        currentNodeId = null,
        partBrowserController,
        partBrowserView,
        projectPanel,
        projectController,
        networkStatusView,
        networkStatusControl,
        projectTitleView,
        setEditorView,
        setEditorControl,
        visualizerPanel,
        visArray,
        selectedObjectChanged,
        demoHackInit,
        onOneEvent;

    /*
     * Compute the size of the middle pane window based on current browser size
     */
    lastBodyWidth = 0;
    lastBodyHeight = 0;
    resizeMiddlePane = function () {
        var $body = $("body"),
            $leftPanel =  $("#leftPane"),
            $rightPanel = $("#rightPane"),
            $middlePanel = $("#middlePane"),
            $contentContainer = $("#contentContainer"),
            $header = $("#header"),
            $footer = $("#footer"),
            bodyW = $body.width(),
            bodyH = $body.height(),
            headerH = $header.height(),
            footerH = $footer.height(),
            eW = 0,
            eH = 0,
            leftPanelW = $leftPanel.outerWidth(),
            leftPanelH = $leftPanel.outerHeight(),
            rightPanelW = $rightPanel.outerWidth(),
            rightPanelH = $rightPanel.outerHeight();

        if (commonUtil.DEBUG === "DEMOHACK") {
            $leftPanel.width(1);
            $rightPanel.width(1);
            leftPanelW = 1;
            rightPanelW = 1;
        } else {
            $leftPanel.attr("style", "");
            $rightPanel.attr("style", "");
        }

        $contentContainer.height(bodyH - headerH - footerH);

        if (bodyW !== lastBodyWidth || bodyH !== lastBodyHeight) {
            $middlePanel.css({"overflow": "hidden"});

            $middlePanel.width(bodyW - leftPanelW - rightPanelW);

            lastBodyWidth = bodyW;
            lastBodyHeight = bodyH;

            eW = $middlePanel.width();
            eH = $middlePanel.height();

            if (visualizerPanel) {
                visualizerPanel.widgetContainerSizeChanged(eW, eH);
            }

            $middlePanel.css({"overflow": "auto"});
        }
    };

    //hook up windows resize event
    $(window).resize(function () {
        resizeMiddlePane();
    });

    //and call if for the first time as well
    resizeMiddlePane();

    new LoggerStatus("panLoggerStatus");

    selectedObjectChanged = function (__project, nodeId) {
        currentNodeId = nodeId;
        if (mainController) {
            mainController.selectedObjectChanged(currentNodeId);
        }
        if (partBrowserController) {
            partBrowserController.selectedObjectChanged(currentNodeId);
        }
        if (setEditorControl) {
            setEditorControl.selectedObjectChanged(currentNodeId);
        }
        if (visualizerPanel) {
            visualizerPanel.selectedObjectChanged(currentNodeId);
        }
    };

    doConnect = function (callback) {


        var options = commonUtil.combinedserver,
            i;
        if (proxy === null) {
            proxy = new Core({
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
            proxy.addEventListener(proxy.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
                selectedObjectChanged(__project, nodeId);
            });
            proxy.addEventListener(proxy.events.ACTOR_CHANGED, function () {
                if (projectTitleView) {
                    projectTitleView.refresh(proxy);
                }
            });

            tJSTree = new TreeBrowserControl(proxy, new JSTreeBrowserWidget("tbJSTree"));

            partBrowserView = new PartBrowserView("pPartBrowser");
            partBrowserController = new PartBrowserControl(proxy, partBrowserView);

            setEditorView = new SetEditorView("pSetEditor");
            setEditorControl = new SetEditorControl(proxy, setEditorView);

            projectPanel = new ProjectPanel("projectHistoryPanel");
            projectController = new ProjectControl(proxy, projectPanel);

            networkStatusView = new NetworkStatusView("panNetworkStatus");
            networkStatusControl = new NetworkStatusControl(proxy, networkStatusView);

            projectTitleView = new ProjectTitleView("projectInfoContainer");

            visualizerPanel = new VisualizerPanel({"containerElement": "visualizerPanel",
                                                   "client": proxy,
                                                   "widgetContainer": "mainWidget"});

            visArray = JSON.parse(VisualizersJSON);
            visualizerPanel.addRange(visArray, function () {
                visualizerPanel.setActiveVisualizer('DesignerCanvas_Model');
            });

            //TESTING part
            if (commonUtil.DEBUG === true) {
                $('#leftPane').append("<div class=\"sidePaneWidget\"><div class=\"header\">TESTING</div><div id=\"tetingpanel\"><input id=\"testingbtn1\" value=\"test1\" type=\"button\"><input id=\"testingbtn2\" value=\"test2\" type=\"button\"><input id=\"testingbtn3\" value=\"test3\" type=\"button\"></div></div>");
                $('#testingbtn1').on('click', function (event) {
                    proxy.testMethod(1);
                });
                $('#testingbtn2').on('click', function (event) {
                    proxy.testMethod(2);
                });
                $('#testingbtn3').on('click', function (event) {
                    proxy.testMethod(3);
                });
            }
            callback(null);
        }
    };

    return {
        start : function () {
            doConnect(function (err) {});
        }
    };
});