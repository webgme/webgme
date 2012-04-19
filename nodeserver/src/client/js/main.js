// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/lib"
});

// let require load all the toplevel needed script and call us on domReady
require([ 'order!jquery.min', 'order!jquery-ui.min', 'domReady', 'order!./js/clientproject.js', 'order!./js/TreeBrowserControl.js', 'order!./js/JSTreeBrowserWidget.js','order!./js/delayctrl.js', 'order!./js/DynaTreeBrowserWidget.js', '/common/logmanager.js', './js/util.js', './js/ModelEditorControl.js','./js/ModelEditorSVGWidget.js' ], function(jquery,jqueryUI, domReady, ClientProject, TreeBrowserControl, JSTreeBrowserWidget, DelayControl, DynaTreeBrowserWidget, logManager, util, ModelEditorControl, ModelEditorSVGWidget ) {
    domReady(function () {

        //if ( util.DEBUG === true ) {
            logManager.setLogLevel( logManager.logLevels.ALL );
        //}

        var myproject = undefined;
        var tDynaTree = undefined;
        var tJSTree = undefined;
        var delayer = undefined;
        var modelEditor = undefined;
        var openProject = function(){
            myproject = new ClientProject("TODO:projectId");
            myproject.onOpen = function(){
                tDynaTree = new TreeBrowserControl(myproject, new DynaTreeBrowserWidget( "tbDynaTree" ) );
                delayer = new DelayControl(myproject.socket, document.getElementById("socketDelayer"));
                tJSTree = new TreeBrowserControl(myproject, new JSTreeBrowserWidget( "tbJSTree" ) );

                modelEditor = new ModelEditorControl(myproject, new ModelEditorSVGWidget( "modelEditorSVG" ));
            };

            myproject.open();
         }

        openProject();

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
        }

        //hook up windows resize event
        $(window).resize(function(){
            resizeMiddlePane();
        });

        //and call if for the first time as well
        resizeMiddlePane();
    });

});