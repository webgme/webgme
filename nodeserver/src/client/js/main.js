"use strict";

var DEBUG = true;
var _webGME_jquery_ver = '1.8.0';
var _webGME_jqueryui_ver = '1.8.22.mousefixed';  //jquery.ui.mouse has been fixed by RobertK, not yet in the official jQuery.UI release

// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/",
    paths: {
        "jquery": 'lib/jquery/' + (DEBUG ? 'jquery-' + _webGME_jquery_ver : 'jquery-' + _webGME_jquery_ver + '.min'),
        "jquery-ui": 'lib/jquery/' + (DEBUG ? 'jquery-ui-' + _webGME_jqueryui_ver + '.custom' : 'jquery-ui-' + _webGME_jqueryui_ver + '.custom.min'),
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
        "css": 'lib/require/css',
        "domReady":	'lib/require/domReady',
        "ModelEditorHTML": "js/ModelEditor/HTML",
        "nodeAttributeNames": 'js/ModelEditor/HTML/NodeAttributeNames',
        "nodeRegistryNames": 'js/ModelEditor/HTML/NodeRegistryNames',
        "ModelEditorHTMLCSS": "css/ModelEditor",
        "GraphVizCSS": "css/GraphViz",
        "GraphViz": "js/GraphViz"
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
