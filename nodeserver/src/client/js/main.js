"use strict";

var DEBUG = true;

// set the baseUrl for module lookup to '/lib' folder
require.config({
    baseUrl: "/",
    paths: {
        "jquery": 'lib/jquery/' + (DEBUG ? 'jquery-1.7.2' : 'jquery-1.7.2.min'),
        "jquery-ui": 'lib/jquery/' + (DEBUG ? 'jquery-ui-1.8.21.custom' : 'jquery-ui-1.8.21.custom.min'),
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
        'js/webGME'
    ],
    function (domReady, webGME) {
        domReady(function () {
            webGME.start();
        });
    }
);