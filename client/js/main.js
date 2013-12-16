"use strict";

var DEBUG = false;
var _webGME_jquery_ver = '2.0.3';
var _webGME_jqueryui_ver = '1.10.3';

// configure require path and modules
require.config({
    baseUrl: "/",
    paths: {
        //RequireJS plugins
        "text":	'lib/require/text',
        "css": 'lib/require/rcss',
        "domReady":	'lib/require/domReady',

        //jQuery and stuff
        "jquery": 'lib/jquery/jquery-' + _webGME_jquery_ver + '.min',
        "jquery-ui": 'lib/jquery/jquery-ui-' + _webGME_jqueryui_ver + '.custom.min',
        "jquery-ui-iPad": 'lib/jquery/jquery.ui.ipad',
        "jquery-WebGME": 'js/jquery.WebGME',
        "jquery-dataTables": 'lib/jquery/jquery.dataTables.min',
        "jquery-dataTables-bootstrapped": 'lib/jquery/jquery.dataTables.bootstrapped',

        //necessary 3rd party modules
        "bootstrap": 'lib/bootstrap/bootstrap.amd',
        "underscore": 'lib/underscore/underscore-min',
        "d3": 'lib/d3/d3.v3.min',
        "jscolor": 'lib/jscolor/jscolor',

        //RaphaelJS family
        "eve": 'lib/raphael/eve',   //needed because of raphael.core.js uses require with 'eve'
        "raphaeljs": 'lib/raphael/raphael.amd',

        //WebGME custom modules
        "logManager": 'common/LogManager',
        "eventDispatcher": 'common/EventDispatcher',
        "notificationManager": 'js/NotificationManager',
        "clientUtil": 'js/util',
        "loaderCircles": "js/Loader/LoaderCircles",
        "loaderProgressBar": "js/Loader/LoaderProgressBar",

        "codemirror": 'lib/codemirror/codemirror.amd',
        "jquery-csszoom": 'lib/jquery/jquery.csszoom'
    },
    shim: {
        'jquery-ui': ['jquery'],
        'jquery-ui-iPad': ['jquery','jquery-ui'],
        'bootstrap': ['jquery'],
        'clientUtil': ['jquery'],
        'jquery-WebGME': ['bootstrap'],
        'jquery-dataTables': ['jquery'],
        'jquery-dataTables-bootstrapped': ['jquery-dataTables'],
        'WebGME': ['jquery-WebGME'],
        'jquery-csszoom': ['jquery-ui']
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
        'js/WebGME',
        'clientUtil',
        'bin/getconfig'
    ],
    function (domReady, jQuery, jQueryUi, jQueryUiiPad, jqueryWebGME, jqueryDataTables, bootstrap, underscore, webGME, util, CONFIG) {
        domReady(function () {
            //#1 set debug info from config file
            if (CONFIG.hasOwnProperty('debug')) {
                DEBUG = CONFIG['debug'];
            }

            //#2 check URL
            var d = util.getURLParameterByName('d').toLowerCase();
            if (d === 'debug') {
                DEBUG = true;
            } else if (d === 'rel') {
                DEBUG = false;
            }

            webGME.start();
        });
    }
);
