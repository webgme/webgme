/*globals require*/
/*jshint browser:true, camelcase:false*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


var DEBUG = false,
    WebGMEGlobal = WebGMEGlobal || {};

WebGMEGlobal.version = 'x';
WebGMEGlobal.SUPPORTS_TOUCH = 'ontouchstart' in window || navigator.msMaxTouchPoints;


// configure require path and modules
require.config({
    baseUrl: './',

    //TODO paths should be fixed as the rules collide with each other
    map: {
        '*': {
            css: 'bower_components/require-css/css' + ( DEBUG ? '' : '.min' ),
            //text: 'lib/require/require-text/text',
        }
    },


    paths: {
        //jQuery and stuff
        jquery: 'bower_components/jquery/dist/jquery' + ( DEBUG ? '' : '.min' ),
        'jquery-ui': 'bower_components/jquery-ui/jquery-ui' + ( DEBUG ? '' : '.min' ),
        'jquery-ui-iPad': 'lib/jquery/jquery.ui.ipad',
        'jquery-dataTables': 'lib/jquery/jquery.dataTables' + ( DEBUG ? '' : '.min' ),
        'jquery-dataTables-bootstrapped': 'lib/jquery/jquery.dataTables.bootstrapped',
        'jquery-spectrum': 'bower_components/spectrum/spectrum',
        'jquery-gritter': 'bower_components/jquery.gritter/js/jquery.gritter' + ( DEBUG ? '' : '.min' ),
        'jquery-fancytree': 'bower_components/jquery.fancytree/dist/jquery.fancytree-all' + ( DEBUG ? '' : '.min' ),

        //TODO: The used version (1.6.0) does not exist as bower-component (1.4 is the latest).
        'jquery-contextMenu': 'lib/jquery/jquery.contextMenu' + ( DEBUG ? '' : '.min' ),
        //TODO: Clone/get permission to http://github.com/rkereskenyi/jquery.csszoom and make a bower release.
        'jquery-csszoom': 'lib/jquery/jquery.csszoom',

        //Bootstrap stuff
        bootstrap: 'bower_components/bootstrap/dist/js/bootstrap' + ( DEBUG ? '' : '.min' ),
        'bootstrap-multiselect': 'bower_components/bootstrap-multiselect/dist/js/bootstrap-multiselect',
        'bootstrap-notify': 'bower_components/remarkable-bootstrap-notify/dist/bootstrap-notify' + ( DEBUG ? '' : '.min' ),

        //Other modules
        AutoRouterActionApplier: 'lib/autorouter/action-applier' + ( DEBUG ? '' : '.min' ),
        underscore: 'bower_components/underscore/underscore-min',
        backbone: 'bower_components/backbone/backbone',
        d3: 'bower_components/d3/d3' + ( DEBUG ? '' : '.min' ),

        //RaphaelJS family
        eve: 'lib/raphael/eve',   //needed because of raphael.core.js uses require with 'eve'
        raphaeljs: 'lib/raphael/raphael.amd',
        raphael_core: 'lib/raphael/raphael.core',
        raphael_svg: 'lib/raphael/raphael.svg_fixed',
        raphael_vml: 'lib/raphael/raphael.vml',

        //WebGME custom modules
        common: '/common',
        blob: 'common/blob',
        executor: '/common/executor',
        plugin: '/plugin',
        layout: '/layout',
        panel: '/panel',

        //node_modules
        jszip: 'bower_components/jszip/dist/jszip' + ( DEBUG ? '' : '.min' ),
        superagent: 'lib/superagent/superagent',
        debug: 'bower_components/visionmedia-debug/dist/debug',
        q: 'bower_components/q/q',

        //codemirror: 'bower_components/codemirror/',

        moment: 'bower_components/moment/min/moment.min',

        urlparse: 'lib/purl/purl.min',

        // Angular and modules
        angular: 'bower_components/angular/angular' + ( DEBUG ? '' : '.min' ),
        'angular-ui-bootstrap': 'bower_components/angular-bootstrap/ui-bootstrap-tpls.min',
        'isis-ui-components': 'bower_components/isis-ui-components/dist/isis-ui-components',
        'isis-ui-components-templates': 'bower_components/isis-ui-components/dist/isis-ui-components-templates',
    },
    packages: [{
        name: 'codemirror',
        location: 'bower_components/codemirror',
        main: 'lib/codemirror'
    }],
    shim: {
        'angular-ui-bootstrap': ['angular'],
        'isis-ui-components': ['angular'],
        'isis-ui-components-templates': ['angular'],

        'jquery-ui': ['jquery'],
        'jquery-ui-iPad': ['jquery', 'jquery-ui'],

        bootstrap: ['jquery'],
        'bootstrap-multiselect': ['jquery', 'bootstrap'],
        'bootstrap-notify': ['jquery', 'bootstrap'],

        backbone: ['underscore'],
        'js/util': ['jquery'],
        'js/jquery.WebGME': ['bootstrap'],
        'jquery-dataTables': ['jquery'],
        'jquery-dataTables-bootstrapped': ['jquery-dataTables'],
        'js/WebGME': ['js/jquery.WebGME'],
        'jquery-csszoom': ['jquery-ui'],
        'jquery-spectrum': ['jquery'],
        'jquery-fancytree': ['jquery-ui'],
        raphael_svg: ['raphael_core'],
        raphael_vml: ['raphael_core']
    }
});

require([
    'css!/dist/webgme.dist.main.css',
], function () {
    'use strict';

    require([
        '/dist/webgme.dist.build.js'
    ], function () {

    });
});