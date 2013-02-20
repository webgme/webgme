"use strict";

var DEBUG = true;
var _webGME_jquery_ver = '1.8.2';
var _webGME_jqueryui_ver = '1.8.23';  //jquery.ui.mouse has been fixed by RobertK, not yet in the official jQuery.UI release

// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/",
    paths: {
        //RequireJS plugins
        "text":	'lib/require/text',
        "css": 'lib/require/rcss',
        "domReady":	'lib/require/domReady',

        //jQuery and stuff
        "jquery": 'lib/jquery/' + (DEBUG ? 'jquery-' + _webGME_jquery_ver : 'jquery-' + _webGME_jquery_ver + '.min'),
        "jquery-ui": 'lib/jquery/' + (DEBUG ? 'jquery-ui-' + _webGME_jqueryui_ver + '.custom' : 'jquery-ui-' + _webGME_jqueryui_ver + '.custom.min'),
        "datGUI": 'lib/datGUI/dat.gui.min',
        "jquery-WebGME": 'js/jquery.WebGME',
        "jquery-dataTables": 'lib/jquery/jquery.dataTables' + (DEBUG ? '' : '.min'),
        "jquery-dataTables-bootstrapped": 'lib/jquery/jquery.dataTables.bootstrapped',

        //necessary 3rd party modules
        "bootstrap": 'lib/bootstrap/bootstrap.amd',
        "underscore": './../../common/underscore',

        //RaphaelJS family
        "eve": 'lib/raphael/eve',
        "raphaeljs": 'lib/raphael/raphael.amd',

        //WebGME custom modules
        "commonUtil": './../../common/CommonUtil',
        "logManager": './../../common/LogManager',
        "eventDispatcher": './../../common/EventDispatcher',
        "notificationManager": 'js/NotificationManager',
        "clientUtil": 'js/util',
        "bezierHelper" : 'js/BezierHelper',

        "ModelEditorHTML": "js/ModelEditor/HTML",
        "nodeAttributeNames": 'js/ModelEditor/HTML/NodeAttributeNames',
        "nodeRegistryNames": 'js/ModelEditor/HTML/NodeRegistryNames',
        "ModelEditorHTMLCSS": "css/ModelEditor",
        "GraphVizCSS": "css/GraphViz",
        "GraphViz": "js/GraphViz",

        "ModelEditor2": "js/ModelEditor2",
        "nodeAttributeNames2": 'js/ModelEditor2/NodeAttributeNames',
        "nodeRegistryNames2": 'js/ModelEditor2/NodeRegistryNames',
        "ModelEditor2CSS": "css/ModelEditor2",
        "PropertyEditorCSS": "css/PropertyEditor",
        "PartBrowserCSS": "css/PartBrowser",
        "PartBrowser": "js/PartBrowser",
        "Repository": "js/Repository",
        "RepositoryCSS": "css/Repository",
        "SetEditorCSS": "css/SetEditor",
        "SetEditor": "js/SetEditor",

        "DiagramDesignerCSS": "css/DiagramDesigner",
        "ModelEditor3CSS": "css/ModelEditor3",
        "SetEditor2CSS": "css/SetEditor2",
        "DataGridCSS": "css/DataGrid"
    },
    shim: {
        'jquery-ui': ['jquery'],
        'bootstrap': ['jquery'],
        'clientUtil': ['jquery'],
        'jquery-WebGME': ['jquery'],
        'jquery-dataTables': ['jquery'],
        'jquery-dataTables-bootstrapped': ['jquery-dataTables']
    }
});

require(
    [
        'domReady',
        'jquery',
        'jquery-ui',
        'jquery-WebGME',
        'jquery-dataTables-bootstrapped',
        'bootstrap',
        'underscore',
        'js/WebGME'
    ],
    function (domReady, jQuery, jQueryUi, jqueryWebGME, jqueryDataTables, bootstrap, underscore, webGME) {
        domReady(function () {
            webGME.start();
        });
    }
);
