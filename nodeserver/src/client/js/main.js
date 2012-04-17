// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/lib"
});

// let require load all the toplevel needed script and call us on domReady
require([ 'order!jquery.min', 'order!jquery-ui.min', 'domReady', 'order!./js/clientproject.js', 'order!./js/TreeBrowserControl.js', 'order!./js/JSTreeBrowserWidget.js','order!./js/delayctrl.js', 'order!./js/DynaTreeBrowserWidget.js', '/common/logmanager.js', './js/util.js' ], function($,jqueryUI, domReady, ClientProject, TreeBrowserControl, JSTreeBrowserWidget, DelayControl, DynaTreeBrowserWidget, logManager, util ) {
    domReady(function () {

        if ( util.DEBUG === true ) {
            logManager.setLogLevel( logManager.logLevels.ALL );
        }

        var myproject = undefined;
        var tDynaTree = undefined;
        var tJSTree = undefined;
        var delayer = undefined;
        var openProject = function(){
            myproject = new ClientProject("TODO:projectId");
            myproject.onOpen = function(){
                tDynaTree = new TreeBrowserControl(myproject, new DynaTreeBrowserWidget( "tbDynaTree" ) );
                 delayer = new DelayControl(myproject.socket, document.getElementById("delaycontrol"));
                tJSTree = new TreeBrowserControl(myproject, new JSTreeBrowserWidget( "tbJSTree" ) );
            };

            myproject.open();
         }

        openProject();
    });
});