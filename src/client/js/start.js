/*globals require, WebGMEGlobal, $, DEBUG, angular*/
/*jshint browser:true*/
require(
    [
        'jquery',
        'jquery-ui',
        'jquery-ui-iPad',
        'js/jquery.WebGME',
        'bootstrap',
        'bootstrap-notify',
        'underscore',
        'backbone',
        'js/WebGME',
        'js/util',
        'text!/gmeConfig.json',
        'text!/package.json',
        'js/logger',
        'superagent',
        'q',
        'ravenjs',

        'angular',
        'angular-ui-bootstrap',

        'isis-ui-components',
        'isis-ui-components-templates'
    ],
    function (jQuery, jQueryUi, jQueryUiiPad, jqueryWebGME, bootstrap, bootstrapNotify, underscore,
              backbone, webGME, util, gmeConfigJson, packageJson, Logger, superagent, Q, Raven) {

        'use strict';
        var gmeConfig = JSON.parse(gmeConfigJson),
            npmJSON = JSON.parse(packageJson),
            log = Logger.create('gme:main', gmeConfig.client.log),
            domDeferred = Q.defer(),
            defaultRavenOpts = { release: npmJSON.version }, // This is the webgme version
            npmJSONFromSplit;

        if (gmeConfig.client.errorReporting.enable === true) {
            Raven.config(
                gmeConfig.client.errorReporting.DSN,
                gmeConfig.client.errorReporting.ravenOptions || defaultRavenOpts
            ).install();
        }

        WebGMEGlobal.gmeConfig = gmeConfig;

        WebGMEGlobal.version = npmJSON.version;
        WebGMEGlobal.NpmVersion = npmJSON.dist ? npmJSON.version : '';
        WebGMEGlobal.GitHubVersion = '';
        if (npmJSON._from) {
            npmJSONFromSplit = npmJSON._from.split('/');
            WebGMEGlobal.GitHubVersion = npmJSONFromSplit[npmJSONFromSplit.length - 1];
        }

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
                ]).config(['$locationProvider', function ($locationProvider) {
                $locationProvider.html5Mode({
                    enabled: true,
                    requireBase: false // https://github.com/angular/angular.js/issues/8934
                });
            }]);

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

            function requestPluginMetadata () {
                var deferred = Q.defer();

                superagent.get('/api/plugins/metadata')
                    .end(function (err, res) {
                        if (res.status === 200) {
                            WebGMEGlobal.allPlugins = Object.keys(res.body);
                            WebGMEGlobal.allPluginsMetadata = res.body;
                            deferred.resolve();
                        } else {
                            log.error('/api/' + name + 'failed');
                            WebGMEGlobal.allPlugins = [];
                            WebGMEGlobal.allPluginsMetadata = {};
                            deferred.reject(err);
                        }
                    });

                return deferred.promise;
            }

            return Q.all([
                requestExtensionPoint('visualizers'),
                requestPluginMetadata(),
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

        function loadExtraCssFiles(callback) {
            var deferred = Q.defer();

            if (gmeConfig.visualization.extraCss.length > 0) {
                require(gmeConfig.visualization.extraCss.map(function (cssFile) {
                        return 'css!' + cssFile;
                    }),
                    deferred.resolve,
                    deferred.reject
                );
            } else {
                deferred.resolve();
            }

            return deferred.promise.nodeify(callback);
        }

        Q.all([
                domDeferred.promise,
                loadExtraCssFiles(),
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