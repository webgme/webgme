// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/lib"
});

// let require load all the toplevel needed script and call us on domReady
require([   'order!jquery.min',
            'order!jquery-ui.min',
            'domReady',
            'order!./js/clienttwo.js',
            'order!./js/TreeBrowserControl.js',
            'order!./js/JSTreeBrowserWidget.js',
            'order!./js/delayctrl.js',
            'order!./js/DynaTreeBrowserWidget.js',
            '/common/logmanager.js',
            '/common/CommonUtil.js',
            './js/ModelEditorControl.js',
            './js/ModelEditorSVGWidget.js' ], function( jquery,
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
                                                        ModelEditorSVGWidget ) {
    domReady(function () {

        //if ( commonUtil.DEBUG === true ) {
            logManager.setLogLevel( logManager.logLevels.ALL );
        //}

        var client = undefined;
        var tDynaTree = undefined;
        var tJSTree = undefined;
        //var delayer = undefined;
        var modelEditor = undefined;

        var doConnect = function(){

            //figure out the server to connect to
            var serverLocation = undefined;

            //by default serverlocation is the same server the page loaded from
            if ( commonUtil.ServerIP === "self" )
            {
                serverLocation = 'http://' + window.location.hostname + ':' + commonUtil.ServerPort;
            } else {
                serverLocation = 'http://' + commonUtil.ServerIP + ':' + commonUtil.ServerPort;
            }

            client = new Client( serverLocation );
            client.connect(function(){
                client.makeconnect(function(){
                    tDynaTree = new TreeBrowserControl(client, new DynaTreeBrowserWidget( "tbDynaTree" ) );
                    //delayer = new DelayControl(client.socket, document.getElementById("socketDelayer"));
                    tJSTree = new TreeBrowserControl(client, new JSTreeBrowserWidget( "tbJSTree" ) );

                    modelEditor = new ModelEditorControl(client, new ModelEditorSVGWidget( "modelEditorSVG" ));
                });
            });
        };

        /*main*/
        doConnect();

        /*
         * Compute the size of the middle pane window
         */
        var lastContainerWidth = 0;
        var resizeMiddlePane = function() {
            var cW = $("#contentContainer").width();
            if ( cW != lastContainerWidth ) {
                $("#middlePane").outerWidth( cW - $("#leftPane").outerWidth() - $("#rightPane").outerWidth() );
                lastContainerWidth = cW;
            }
        };

        //hook up windows resize event
        $(window).resize(function(){
            resizeMiddlePane();
        });

        //and call if for the first time as well
        resizeMiddlePane();
    });

});