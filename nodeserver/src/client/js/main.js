"use strict";

var DEBUG = true;
var _webGME_jquery_ver = '1.8.2';
var _webGME_jqueryui_ver = '1.8.23';  //jquery.ui.mouse has been fixed by RobertK, not yet in the official jQuery.UI release

// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/",
    paths: {
        "jquery": 'lib/jquery/' + (DEBUG ? 'jquery-' + _webGME_jquery_ver : 'jquery-' + _webGME_jquery_ver + '.min'),
        "jquery-ui": 'lib/jquery/' + (DEBUG ? 'jquery-ui-' + _webGME_jqueryui_ver + '.custom' : 'jquery-ui-' + _webGME_jqueryui_ver + '.custom.min'),
        "datGUI": 'lib/datGUI/dat.gui.min',
        "bootstrap": 'lib/bootstrap/bootstrap.amd',
        "underscore": './../../common/underscore',
        "commonUtil": './../../common/CommonUtil',
        "logManager": './../../common/LogManager',
        "eventDispatcher": './../../common/EventDispatcher',
        "notificationManager": 'js/NotificationManager',
        "clientUtil": 'js/util',
        "bezierHelper" : 'js/BezierHelper',
        "raphaeljs": 'lib/raphael/raphael.amd',
        "eve": 'lib/raphael/eve',
        "order": 'lib/require/order',
        "text":	'lib/require/text',
        "css": 'lib/require/rcss',
        "domReady":	'lib/require/domReady',
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
        "PropertyEditor": "js/PropertyEditor",
        "PartBrowserCSS": "css/PartBrowser",
        "PartBrowser": "js/PartBrowser",
        "Repository": "js/Repository",
        "RepositoryCSS": "css/Repository"
    }
});

require(
    [
        'domReady',
        'js/WebGME'
    ],
    function (domReady, webGME) {
        domReady(function () {
            webGME.start();
        });
    }
);
