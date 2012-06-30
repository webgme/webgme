"use strict";

// let require load all the toplevel needed script and call us on domReady
define([   'order!jquery',
    'order!jquery-ui',
    'order!underscore',
    'logManager',
    'commonUtil',
    'clientUtil',
    'order!js/cli3nt',
    'order!js/ObjectBrowser/TreeBrowserControl',
    'order!js/ObjectBrowser/JSTreeBrowserWidget',
    'order!js/ObjectBrowser/DynaTreeBrowserWidget',
    'js/ModelEditor/SVG/ModelEditorControl',
    'js/ModelEditor/SVG/ModelEditorSVGWidget',
    'js/ModelEditor/HTML/WidgetManager'], function (jquery,
                                                            jqueryui,
                                                            underscore,
                                                            logManager,
                                                            commonUtil,
                                                            util,
                                                            Client,
                                                            TreeBrowserControl,
                                                            JSTreeBrowserWidget,
                                                            DynaTreeBrowserWidget,
                                                            ModelEditorControl,
                                                            ModelEditorSVGWidget,
                                                            WidgetManager) {

    if (DEBUG === true) {
        logManager.setLogLevel(logManager.logLevels.ALL);
        logManager.excludeComponent("TreeBrowserControl");
        logManager.excludeComponent("JSTreeBrowserWidget");
        logManager.excludeComponent("Client");
        logManager.excludeComponent("ModelEditorSVGWidget");
        logManager.excludeComponent("ModelEditorControl");
        logManager.excludeComponent("ModelEditorSVGConnection*");
        logManager.excludeComponent("ModelEditorCanvasComponent*");
        logManager.excludeComponent("ModelEditorModelComponent*");
        logManager.excludeComponent("ModelEditorConnectionComponent*");
        logManager.excludeComponent("Port*");
    }

    var client,
        /*tDynaTree,*/
        tJSTree,
        modelEditorSVG,
        modelEditorHTML,
        doConnect,
        lastContainerWidth = 0,
        resizeMiddlePane;

    /*
     * Compute the size of the middle pane window based on current browser size
     */
    lastContainerWidth = 0;
    resizeMiddlePane = function () {
        var cW = $("#contentContainer").width(),
            eW = 0,
            eH = 0,
            horizontalSplit = false;
        if (cW !== lastContainerWidth) {
            $("#middlePane").outerWidth(cW - $("#leftPane").outerWidth() - $("#rightPane").outerWidth());
            lastContainerWidth = cW;

            //by default lay out in vertical split
            /*eW = Math.floor($("#middlePane").width() / 2);
            eH = Math.floor($("#middlePane").height());

            if (eW < 560) {
                //inner children has to be laid out under each other (horizontal split)
                eW = Math.floor($("#middlePane").width());
                eH = Math.floor($("#middlePane").height() / 2);
                horizontalSplit = true;
            }

            $("#modelEditorContainer1").outerWidth(eW).outerHeight(eH);
            $("#modelEditorContainer2").outerWidth(eW).outerHeight(eH);*/

            /******************/
            eW = Math.floor($("#middlePane").width());
            eH = Math.floor($("#middlePane").height());

            $("#modelEditorContainer1").outerWidth(0).outerHeight(0);
            $("#modelEditorContainer2").outerWidth(eW).outerHeight(eH);

            /******************/

            //set container position correctly
            /*if (horizontalSplit === true) {
                $("#modelEditorContainer2").offset({ "top": $("#modelEditorContainer1").outerHeight() + $("#modelEditorContainer1").position().top, "left": $("#modelEditorContainer1").position().left});
            } else {
                $("#modelEditorContainer2").offset({ "top": $("#modelEditorContainer1").position().top, "left": $("#modelEditorContainer1").outerWidth() + $("#modelEditorContainer1").position().left });
            }*/

        }
    };

    //hook up windows resize event
    $(window).resize(function () {
        resizeMiddlePane();
    });

    //and call if for the first time as well
    resizeMiddlePane();

    doConnect = function () {

        //figure out the server to connect to
        var serverLocation;

        //by default serverlocation is the same server the page loaded from
        if (commonUtil.standalone.ProjectIP === "self") {
            serverLocation = 'http://' + window.location.hostname + ':' + commonUtil.standalone.ProjectPort;
        } else {
            serverLocation = 'http://' + commonUtil.standalone.ProjectIP + ':' + commonUtil.standalone.ProjectPort;
        }

        client = new Client(serverLocation);
        //tDynaTree = new TreeBrowserControl(client, new DynaTreeBrowserWidget("tbDynaTree"));
        tJSTree = new TreeBrowserControl(client, new JSTreeBrowserWidget("tbJSTree"));

        modelEditorSVG = new ModelEditorControl(client, new ModelEditorSVGWidget("modelEditorSVG"));
        modelEditorHTML = new WidgetManager(client, $("#modelEditorHtml"));
    };

    return {
        start : function () {
            doConnect();
        }
    };
});