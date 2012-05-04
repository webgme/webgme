"use strict";

// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/lib"
});

// let require load all the toplevel needed script and call us on domReady
require([   'order!jquery.min',
            'order!jquery-ui.min',
            'domReady',
            'order!./../js/clienttwo.js',
            'order!./../js/TreeBrowserControl.js',
            'order!./../js/JSTreeBrowserWidget.js',
            'order!./../js/delayctrl.js',
            'order!./../js/DynaTreeBrowserWidget.js',
            './../../common/LogManager.js',
            './../../common/CommonUtil.js',
            './../js/ModelEditorControl.js',
            './../js/ModelEditorSVGWidget.js',
            './../js/ModelEditorWidget.js',
            './../js/MultiLevelModelEditorControl.js',
            './../js/WidgetAPI/WidgetManager.js'], function (jquery,
                                                        jqueryUI,
                                                        domReady,
                                                        Client,
                                                        TreeBrowserControl,
                                                        JSTreeBrowserWidget,
                                                        DelayControl,
                                                        DynaTreeBrowserWidget,
                                                        logManager,
                                                        commonUtil,
                                                        ModelEditorControl,
                                                        ModelEditorSVGWidget,
                                                        ModelEditorWidget,
                                                        MultiLevelModelEditorControl,
                                                        WidgetManager) {
    domReady(function () {

        //if ( commonUtil.DEBUG === true ) {
        logManager.setLogLevel(logManager.logLevels.ALL);
        //}

        var client,
            tDynaTree,
            tJSTree,
            modelEditorSVG,
            modelEditorHTML,
            doConnect,
            lastContainerWidth = 0,
            resizeMiddlePane;
        //var delayer = undefined;

        doConnect = function () {

            //figure out the server to connect to
            var serverLocation;

            //by default serverlocation is the same server the page loaded from
            if (commonUtil.ServerIP === "self") {
                serverLocation = 'http://' + window.location.hostname + ':' + commonUtil.ServerPort;
            } else {
                serverLocation = 'http://' + commonUtil.ServerIP + ':' + commonUtil.ServerPort;
            }

            client = new Client(serverLocation);
            client.connect(function () {
                client.makeconnect(function () {
                    tDynaTree = new TreeBrowserControl(client, new DynaTreeBrowserWidget("tbDynaTree"));
                    //delayer = new DelayControl(client.socket, document.getElementById("socketDelayer"));
                    tJSTree = new TreeBrowserControl(client, new JSTreeBrowserWidget("tbJSTree"));

                    modelEditorSVG = new ModelEditorControl(client, new ModelEditorSVGWidget("modelEditorSVG"));
                    modelEditorHTML = new MultiLevelModelEditorControl(client, new ModelEditorWidget("modelEditorHtml"));
                    //modelEditorHTML = new WidgetManager(client, $("#modelEditorHtml"));
                });
            });
        };

        /*main*/
        doConnect();

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
                eW = Math.floor($("#middlePane").width() / 2);
                eH = Math.floor($("#middlePane").height());

                if (eW < 560) {
                    //inner children has to be laid out under each other (horizontal split)
                    eW = Math.floor($("#middlePane").width());
                    eH = Math.floor($("#middlePane").height() / 2);
                    horizontalSplit = true;
                }

                $("#modelEditorContainer1").outerWidth(eW).outerHeight(eH);
                $("#modelEditorContainer2").outerWidth(eW).outerHeight(eH);

                /******************/
                /*eW = Math.floor($("#middlePane").width());
                eH = Math.floor($("#middlePane").height());

                $("#modelEditorContainer1").outerWidth(0).outerHeight(0);
                $("#modelEditorContainer2").outerWidth(eW).outerHeight(eH);*/

                /******************/

                //set container position correctly
                if (horizontalSplit === true) {
                    $("#modelEditorContainer2").offset({ "top": $("#modelEditorContainer1").outerHeight() + $("#modelEditorContainer1").position().top, "left": $("#modelEditorContainer1").position().left});
                } else {
                    $("#modelEditorContainer2").offset({ "top": $("#modelEditorContainer1").position().top, "left": $("#modelEditorContainer1").outerWidth() + $("#modelEditorContainer1").position().left });
                }

            }
        };

        //hook up windows resize event
        $(window).resize(function () {
            resizeMiddlePane();
        });

        //and call if for the first time as well
        resizeMiddlePane();
    });

});