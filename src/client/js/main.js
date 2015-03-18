/*globals require, $, console, angular*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


var DEBUG = false,
    _jqueryVersion = '2.1.0',
    _jqueryUIVersion = '1.10.4',
    _bootsrapVersion = '3.1.1';


// configure require path and modules
require.config({
    baseUrl: './',

    map: {
         '*': {
            'css': 'lib/require/require-css/css',
            'text': 'lib/require/require-text/text'
        }
    },


    paths: {

        'domReady':	'lib/require/require-domready/domReady',

        //jQuery and stuff
        'jquery': 'lib/jquery/jquery-' + _jqueryVersion + ( DEBUG ? '.min' : '' ),
        'jquery-ui': 'lib/jquery/jquery-ui-' + _jqueryUIVersion + ( DEBUG ? '.min' : '' ),
        'jquery-ui-iPad': 'lib/jquery/jquery.ui.ipad',
        'jquery-WebGME': 'js/jquery.WebGME',
        'jquery-dataTables': 'lib/jquery/jquery.dataTables.min',
        'jquery-dataTables-bootstrapped': 'lib/jquery/jquery.dataTables.bootstrapped',
        'jquery-spectrum': 'lib/jquery/jquery.spectrum',

        //Bootsrap stuff
        'bootstrap': 'lib/bootstrap/' + _bootsrapVersion + '/js/bootstrap' + ( DEBUG ? '.min' : '' ),

        //Other modules
        'underscore': 'lib/underscore/underscore-min',
        'backbone': 'lib/backbone/backbone.min',
        'd3': 'lib/d3/d3.v3.min',
        'jscolor': 'lib/jscolor/jscolor',
        'superagent': 'lib/superagent/superagent',

        //RaphaelJS family
        'eve': 'lib/raphael/eve',   //needed because of raphael.core.js uses require with 'eve'
        'raphaeljs': 'lib/raphael/raphael.amd',
        'raphael_core': 'lib/raphael/raphael.core',
        'raphael_svg': 'lib/raphael/raphael.svg_fixed',
        'raphael_vml': 'lib/raphael/raphael.vml',

        //WebGME custom modules
        'logManager': '/common/LogManager',
        'eventDispatcher': '/common/EventDispatcher',

        'util': '/common/util',
        'core': '/common/core',
        'coreclient': '/common/core/users',
        'storage': '/common/storage',
        'blob': '/middleware/blob',
        'plugin': '/plugin',
        'panels': '/panels',

        'notificationManager': 'js/NotificationManager',
        'clientUtil': 'js/util',
        'loaderCircles': 'js/Loader/LoaderCircles',
        'loaderProgressBar': 'js/Loader/LoaderProgressBar',

        'codemirror': 'lib/codemirror/codemirror.amd',
        'jquery-csszoom': 'lib/jquery/jquery.csszoom',

        'jszip': 'lib/jszip/jszip',

        'moment': 'lib/moment/moment.min',

        // Angular and modules
        'angular': 'lib/angular/angular-1.3.15/angular' + ( DEBUG ? '.min' : '' ),
        'angular-route': 'lib/angular/angular-1.3.15/angular-route' + ( DEBUG ? '.min' : '' ),
        'angular-route-styles': 'lib/angular/angular-route-styles/route-styles',
        'angular-ui-bootstrap': 'lib/angular/ui-bootstrap/ui-bootstrap-tpls-0.11.0.min'
    },

    shim: {
        
        'angular-route': ['angular'],
        'angular-route-styles': ['angular'],
        'angular-ui-bootstrap': ['angular'],
        
        'jquery-ui': ['jquery'],
        'jquery-ui-iPad': ['jquery','jquery-ui'],

        'bootstrap': [
            'jquery',
            'css!lib/bootstrap/' + _bootsrapVersion + '/css/bootstrap.min.css',
            'css!lib/bootstrap/' + _bootsrapVersion + '/css/bootstrap-theme.min.css'
        ],

        'backbone': ['underscore'],
        'clientUtil': ['jquery'],
        'jquery-WebGME': ['bootstrap'],
        'jquery-dataTables': ['jquery'],
        'jquery-dataTables-bootstrapped': ['jquery-dataTables'],
        'js/WebGME': [
            'jquery-WebGME',
            'css!/css/main.css',
            'css!/css/themes/dawn.css',
            'css!fonts/font-awesome/css/font-awesome.min.css',
            'css!fonts/webgme-icons/style.css'
        ],
        'jquery-csszoom': ['jquery-ui'],
        'jquery-spectrum': ['jquery'],
        'raphael_svg': ['raphael_core'],
        'raphael_vml': ['raphael_core']
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
        'backbone',
        'js/WebGME',
        'clientUtil',
        'text!/gmeConfig.json',

        'angular',
        //'angular-route',
        //'angular-route-styles',
        'angular-ui-bootstrap'

    ],
    function (domReady, jQuery, jQueryUi, jQueryUiiPad, jqueryWebGME, jqueryDataTables, bootstrap, underscore,
              backbone, webGME, util, gmeConfigJson) {

        'use strict';

        domReady(function () {
            var gmeConfig = JSON.parse(gmeConfigJson);
            if (gmeConfig.debug) {
                DEBUG = gmeConfig.debug;
            }

            //#2 check URL
            var d = util.getURLParameterByName('debug').toLowerCase();
            if (d === 'true') {
                DEBUG = true;
            } else if (d === 'false') {
                DEBUG = false;
            }

            // attach external libraries to extlib/*

            var keys = Object.keys(gmeConfig.requirejsPaths);
            for (var i = 0; i < keys.length; i += 1) {

                // assume this is a relative path from the current working directory
                gmeConfig.requirejsPaths[keys[i]] = '/extlib/' + gmeConfig.requirejsPaths[keys[i]];
            }

            // update client config to route the external lib requests

            require.config({
                paths: gmeConfig.requirejsPaths
            });


            // Extended disable function
            jQuery.fn.extend({
                disable: function(state) {
                    return this.each(function() {
                        var $this = $(this);
                        if($this.is('input, button')) {
                          this.disabled = state;
                        } else {
                          $this.toggleClass('disabled', state);
                        }
                    });
                }
            });

            // Initialize Angular. For this time no better place.
            // has to be initialized as early as possible
            var gmeApp = angular.module(
                'gmeApp', [
                    //'ngRoute',
                    //'routeStyles',
                    'ui.bootstrap',
                    'gme.ui.projectsDialog',
                    'gme.ui.headerPanel'
                ]).config(function($locationProvider) {
                    $locationProvider.html5Mode(true);
                });

            webGME.start( function(client) {

                gmeApp.value('gmeClient', client);
//                gmeApp.value('gmeClient', null);

                angular.bootstrap(document, [ 'gmeApp']);

            });

        });
    }
);
