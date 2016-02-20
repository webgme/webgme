/*globals require, $, angular*/
/*jshint browser:true, camelcase:false*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


var DEBUG = false,
    _jqueryVersion = '2.1.0',
    _jqueryUIVersion = '1.10.4',
    _bootstrapVersion = '3.1.1',
    WebGMEGlobal = WebGMEGlobal || {};


// configure require path and modules
require.config({
    baseUrl: './',

    //TODO paths should be fixed as the rules collide with each other
    map: {
        '*': {
            css: 'lib/require/require-css/css' + ( DEBUG ? '' : '.min' ),
            text: 'lib/require/require-text/text',
            'globcss':'anything/../css'
        }
    },


    paths: {

        domReady: 'lib/require/require-domready/domReady',

        //jQuery and stuff
        jquery: 'lib/jquery/jquery-' + _jqueryVersion + ( DEBUG ? '' : '.min' ),
        'jquery-ui': 'lib/jquery/jquery-ui-' + _jqueryUIVersion + ( DEBUG ? '' : '.min' ),
        'jquery-ui-iPad': 'lib/jquery/jquery.ui.ipad',
        'jquery-dataTables': 'lib/jquery/jquery.dataTables' + ( DEBUG ? '' : '.min' ),
        'jquery-dataTables-bootstrapped': 'lib/jquery/jquery.dataTables.bootstrapped',
        'jquery-spectrum': 'lib/jquery/jquery.spectrum' + ( DEBUG ? '' : '.min' ),

        //Bootsrap stuff
        bootstrap: 'bower_components/bootstrap/dist/js/bootstrap' + ( DEBUG ? '' : '.min' ),

        //Other modules
        AutoRouterActionApplier: 'lib/autorouter/action-applier' + ( DEBUG ? '' : '.min' ),
        underscore: 'bower_components/underscore/underscore-min',
        backbone: 'bower_components/backbone/backbone',
        d3: 'bower_components/d3/d3' + ( DEBUG ? '' : '.min' ),
        jscolor: 'lib/jscolor/jscolor',

        //RaphaelJS family
        eve: 'lib/raphael/eve',   //needed because of raphael.core.js uses require with 'eve'
        raphaeljs: 'lib/raphael/raphael.amd',
        raphael_core: 'lib/raphael/raphael.core',
        raphael_svg: 'lib/raphael/raphael.svg_fixed',
        raphael_vml: 'lib/raphael/raphael.vml',

        //WebGME custom modules
        common: '/common',
        blob: '/common/blob',
        executor: '/common/executor',
        plugin: '/plugin',
        layout: '/layout',
        panel: '/panel',

        //node_modules
        jszip: 'bower_components/jszip/dist/jszip' + ( DEBUG ? '' : '.min' ),
        superagent: 'lib/superagent/superagent',
        debug: 'bower_components/visionmedia-debug/dist/debug',
        q: 'lib/q/q',


        codemirror: 'lib/codemirror/codemirror.amd',
        'jquery-csszoom': 'lib/jquery/jquery.csszoom',


        moment: 'bower_components/moment/min/moment.min',

        urlparse:'lib/purl/purl.min',

        // Angular and modules
        angular: 'bower_components/angular/angular' + ( DEBUG ? '' : '.min' ),
        //'angular-route': 'lib/angular/angular-' + _angularVersion + '/angular-route' + ( DEBUG ? '' : '.min' ),
        'angular-route-styles': 'lib/angular/angular-route-styles/route-styles',
        'angular-ui-bootstrap': 'bower_components/angular-bootstrap/ui-bootstrap-tpls.min'
    },

    shim: {

        // 'angular-route': ['angular'],
        'angular-route-styles': ['angular'],
        'angular-ui-bootstrap': ['angular'],

        'bower_components/isis-ui-components/dist/isis-ui-components': ['angular'],
        'bower_components/isis-ui-components/dist/isis-ui-components-templates': ['angular'],

        'jquery-ui': ['jquery'],
        'jquery-ui-iPad': ['jquery', 'jquery-ui'],

        bootstrap: [
            'jquery',
            'css!bower_components/bootstrap/dist/css/bootstrap.min.css',
            'css!bower_components/bootstrap/dist/css/bootstrap-theme.min.css'
        ],

        backbone: ['underscore'],
        codemirror: [
            'css!globcss/codemirror/codemirror.css',
            'css!globcss/codemirror/codemirror.bootstrap.css'
        ],
        'js/util': ['jquery'],
        'js/jquery.WebGME': ['bootstrap'],
        'jquery-dataTables': ['jquery'],
        'jquery-dataTables-bootstrapped': ['jquery-dataTables'],
        'js/WebGME': [
            'js/jquery.WebGME',

            'css!globcss/main.css',
            'css!globcss/print.css',
            'css!globcss/themes/dawn.css',
            'css!fonts/font-awesome/css/font-awesome.min.css',
            'css!fonts/webgme-icons/style.css'
        ],
        'jquery-csszoom': ['jquery-ui'],
        'jquery-spectrum': ['jquery'],
        raphael_svg: ['raphael_core'],
        raphael_vml: ['raphael_core']
    }
});

require(
    [
        'jquery',
        'jquery-ui',
        'jquery-ui-iPad',
        'js/jquery.WebGME',
        'jquery-dataTables-bootstrapped',
        'bootstrap',
        'underscore',
        'backbone',
        'js/WebGME',
        'js/util',
        'text!/gmeConfig.json',
        'js/logger',
        'superagent',
        'q',

        'angular',
        //'angular-route',
        //'angular-route-styles',
        'angular-ui-bootstrap',

        'bower_components/isis-ui-components/dist/isis-ui-components',
        'bower_components/isis-ui-components/dist/isis-ui-components-templates',
        'css!bower_components/isis-ui-components/dist/isis-ui-components'

    ],
    function (jQuery, jQueryUi, jQueryUiiPad, jqueryWebGME, jqueryDataTables, bootstrap, underscore,
              backbone, webGME, util, gmeConfigJson, Logger, superagent, Q) {

        'use strict';
        var gmeConfig = JSON.parse(gmeConfigJson),
            log = Logger.create('gme:main', gmeConfig.client.log),
            domDeferred = Q.defer();

        WebGMEGlobal.gmeConfig = gmeConfig;

        // domDeferred will be resolved (with gmeApp) when the dom is ready (i.e. $ function invoked).
        $(function () {
            var d,
                keys,
                i,
                gmeApp;

            if (gmeConfig.debug) {
                DEBUG = gmeConfig.debug;
            }

            log.debug('domReady, got gmeConfig');

            //#2 check URL
            d = util.getURLParameterByName('debug').toLowerCase();
            if (d === 'true') {
                DEBUG = true;
            } else if (d === 'false') {
                DEBUG = false;
            }

            // attach external libraries to extlib/*

            keys = Object.keys(gmeConfig.requirejsPaths);
            for (i = 0; i < keys.length; i += 1) {
                // assume this is a relative path from the current working directory
                gmeConfig.requirejsPaths[keys[i]] = '/extlib/' + gmeConfig.requirejsPaths[keys[i]];
                log.debug('Requirejs path resolved: ', keys[i], gmeConfig.requirejsPaths[keys[i]]);
            }

            // update client config to route the external lib requests

            require.config({
                paths: gmeConfig.requirejsPaths
            });


            // Extended disable function
            jQuery.fn.extend({
                disable: function (state) {
                    return this.each(function () {
                        var $this = $(this);
                        if ($this.is('input, button')) {
                            this.disabled = state;
                        } else {
                            $this.toggleClass('disabled', state);
                        }
                    });
                }
            });

            // Initialize Angular. For this time no better place.
            // has to be initialized as early as possible
            gmeApp = angular.module(
                'gmeApp', [
                    //'ngRoute',
                    //'routeStyles',
                    'ui.bootstrap',
                    'isis.ui.components',
                    //'gme.ui.projectsDialog',
                    'gme.ui.headerPanel'
                ]).config(function ($locationProvider) {
                    $locationProvider.html5Mode({
                        enabled: true,
                        requireBase: false // https://github.com/angular/angular.js/issues/8934
                    });
                });

            domDeferred.resolve(gmeApp);
        });

        function populateAvailableExtensionPoints(callback) {

            function capitalizeFirstLetter(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }

            function requestExtensionPoint(name) {
                var deferred = Q.defer();
                log.debug('requestExtensionPoint', name);
                superagent.get('/api/' + name)
                    .end(function (err, res) {
                        var keyName = 'all' + capitalizeFirstLetter(name);

                        if (res.status === 200) {
                            WebGMEGlobal[keyName] = res.body;
                            log.debug('/api/' + name, WebGMEGlobal[keyName]);
                            deferred.resolve();
                        } else {
                            log.error('/api/' + name + 'failed');
                            WebGMEGlobal[keyName] = [];
                            deferred.reject(err);
                        }
                    });

                return deferred.promise;
            }

            return Q.all([
                requestExtensionPoint('visualizers'),
                requestExtensionPoint('plugins'),
                requestExtensionPoint('decorators'),
                requestExtensionPoint('seeds'),
                requestExtensionPoint('addOns')
            ]).nodeify(callback);
        }

        function populateUserInfo(callback) {
            var userInfo,
                userDeferred = Q.defer();

            function checkIfAdminInOrg(userId, orgId) {
                var deferred = Q.defer();
                superagent.get('/api/orgs/' + orgId)
                    .end(function (err, res) {
                        if (res.status === 200) {
                            if (res.body.admins.indexOf(userId) > -1) {
                                userInfo.adminOrgs.push(res.body);
                            }
                        } else {
                            log.error('failed getting org info', err);
                        }
                        deferred.resolve();
                    });

                return deferred.promise;
            }

            superagent.get('/api/user')
                .end(function (err, res) {
                    if (res.status === 200) {
                        userInfo = res.body || {_id: 'N/A', orgs: []};
                        userInfo.adminOrgs = [];

                        Q.allSettled(userInfo.orgs.map(function (orgId) {
                            return checkIfAdminInOrg(userInfo._id, orgId);
                        }))
                            .then(function () {
                                WebGMEGlobal.userInfo = userInfo;
                                userDeferred.resolve(userInfo);
                            })
                            .catch(userDeferred.reject);
                    } else {
                        userDeferred.reject(err);
                    }
                });

            return userDeferred.promise.nodeify(callback);
        }

        function getDefaultComponentSettings (callback) {
            var deferred = Q.defer();
            superagent.get('/api/componentSettings')
                .end(function (err, res) {
                    if (res.status === 200) {
                        WebGMEGlobal.componentSettings = res.body;
                    } else {
                        log.warn('Could not obtain any default component settings (./config/components.json');
                        WebGMEGlobal.componentSettings = {};
                    }

                    deferred.resolve();
                });

            return deferred.promise.nodeify(callback);
        }

        Q.all([
            domDeferred.promise,
            populateAvailableExtensionPoints(),
            populateUserInfo(),
            getDefaultComponentSettings()
        ])
            .then(function (result) {
                var gmeApp = result[0];
                webGME.start(function (client) {
                    gmeApp.value('gmeClient', client);
                    angular.bootstrap(document, ['gmeApp']);
                });
            })
            .catch(function (err) {
                log.error('Error at start up', err);
                throw err;
            });
    }
);
