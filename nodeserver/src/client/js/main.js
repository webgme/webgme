"use strict";

var __WebGME__DEBUG = true;
var _webGME_jquery_ver = '1.8.2';
var _webGME_jqueryui_ver = '1.8.23';

// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/",
    paths: {
        //RequireJS plugins
        "text":	'lib/require/text',
        "css": 'lib/require/rcss',
        "domReady":	'lib/require/domReady',

        //jQuery and stuff
        "jquery": 'lib/jquery/' + (__WebGME__DEBUG ? 'jquery-' + _webGME_jquery_ver : 'jquery-' + _webGME_jquery_ver + '.min'),
        "jquery-ui": 'lib/jquery/' + (__WebGME__DEBUG ? 'jquery-ui-' + _webGME_jqueryui_ver + '.custom' : 'jquery-ui-' + _webGME_jqueryui_ver + '.custom.min'),
        "jquery-ui-iPad": 'lib/jquery/jquery.ui.ipad',
        "datGUI": 'lib/datGUI/dat.gui.min',
        "jquery-WebGME": 'js/jquery.WebGME',
        "jquery-dataTables": 'lib/jquery/jquery.dataTables' + (__WebGME__DEBUG ? '' : '.min'),
        "jquery-dataTables-bootstrapped": 'lib/jquery/jquery.dataTables.bootstrapped',

        //necessary 3rd party modules
        "bootstrap": 'lib/bootstrap/bootstrap.amd',
        "underscore": 'common/underscore',

        "WebGME": 'js/WebGME',

        //RaphaelJS family
        "eve": 'lib/raphael/eve',
        "raphaeljs": 'lib/raphael/raphael.amd',

        //WebGME custom modules
        "commonUtil": './../../common/CommonUtil',
        "logManager": 'common/LogManager',
        "eventDispatcher": 'common/EventDispatcher',
        "notificationManager": 'js/NotificationManager',
        "clientUtil": 'js/util',
        "bezierHelper" : 'js/BezierHelper',
        "loaderCircles": "js/Loader/LoaderCircles",
        "loaderProgressBar": "js/Loader/LoaderProgressBar",

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
        "DataGridCSS": "css/DataGrid",
        "LoaderCSS": "css/Loader",
        "VisualizerPanelCSS": "css/VisualizerPanel"
    },
    shim: {
        'jquery-ui': ['jquery'],
        'jquery-ui-iPad': ['jquery','jquery-ui'],
        'bootstrap': ['jquery'],
        'clientUtil': ['jquery'],
        'jquery-WebGME': ['jquery'],
        'jquery-dataTables': ['jquery'],
        'jquery-dataTables-bootstrapped': ['jquery-dataTables'],
        'WebGME': ['jquery-WebGME']
    }
});

require(
    [
        'domReady',
        'jquery',
        'jquery-ui',
        'jquery-ui-iPad',
        'jquery-WebGME',
        'jquery-dataTables-bootstrapped',
        'bootstrap',
        'underscore',
        'WebGME'
    ],
    function (domReady, jQuery, jQueryUi, jQueryUiiPad, jqueryWebGME, jqueryDataTables, bootstrap, underscore, webGME) {
        domReady(function () {
            webGME.start();
        });
    }
);
