"use strict";

var DEBUG = true;
var _webGME_jquery_ver = '2.0.0';
var _webGME_jqueryui_ver = '1.10.3';

//touch device detection
var SUPPORTS_TOUCH = 'ontouchstart' in window || navigator.msMaxTouchPoints;

// configure require path and modules
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
        "jquery-ui-iPad": 'lib/jquery/jquery.ui.ipad',
        "jquery-WebGME": 'js/jquery.WebGME',
        "jquery-dataTables": 'lib/jquery/jquery.dataTables' + (DEBUG ? '' : '.min'),
        "jquery-dataTables-bootstrapped": 'lib/jquery/jquery.dataTables.bootstrapped',

        //necessary 3rd party modules
        "bootstrap": 'lib/bootstrap/bootstrap.amd',
        "underscore": 'lib/underscore/underscore'+ (DEBUG ? '': '-min'),
        "d3": 'lib/d3/d3.v3.min',

        //RaphaelJS family
        "eve": 'lib/raphael/eve',   //needed because of raphael.core.js uses require with 'eve'
        "raphaeljs": 'lib/raphael/raphael.amd',

        //WebGME custom modules
        "logManager": 'common/LogManager',
        "eventDispatcher": 'common/EventDispatcher',
        "notificationManager": 'js/NotificationManager',
        "clientUtil": 'js/util',
        "loaderCircles": "js/Loader/LoaderCircles",
        "loaderProgressBar": "js/Loader/LoaderProgressBar"
    },
    shim: {
        'jquery-ui': ['jquery'],
        'jquery-ui-iPad': ['jquery','jquery-ui'],
        'bootstrap': ['jquery'],
        'clientUtil': ['jquery'],
        'jquery-WebGME': ['bootstrap'],
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
        'js/WebGME'
    ],
    function (domReady, jQuery, jQueryUi, jQueryUiiPad, jqueryWebGME, jqueryDataTables, bootstrap, underscore, webGME) {
        domReady(function () {
            webGME.start();
        });
    }
);
