/*jshint node: true */
// Karma configuration
// Generated on Thu Mar 12 2015 16:54:00 GMT-0500 (Central Daylight Time)

// use test configuration
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// load gme configuration
var testFixture = require('./test/_globals.js'),
    gmeConfig = testFixture.getGmeConfig(),
    webgme = testFixture.WebGME,
    Q = testFixture.Q,
    gmeAuth,
    storage,
    server,
    logger = testFixture.logger.fork('karma.conf'),
    PROJECTS_TO_IMPORT = [
        {name: 'GMEConcepts', path: './node_modules/webgme-engine/seeds/EmptyProject.webgmex'}
    ];

(function initializeServer() {
    'use strict';
    console.log((new Date()).toISOString(), 'initializeServer started');
    // Add a user to to GMEAuth
    var projectNames = PROJECTS_TO_IMPORT.map(function (projectData) {
        return projectData.name;
    });
    //console.log(projectNames);
    testFixture.clearDBAndGetGMEAuth(gmeConfig, projectNames)
        .then(function (gmeAuth_) {
            // Open the database storage
            gmeAuth = gmeAuth_;
            storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
            return storage.openDatabase();
        })
        .then(function () {
            // Import all the projects.


            function importProject(projectInfo) {
                var branchName = projectInfo.hasOwnProperty('branches') ?
                    projectInfo.branches[0] : 'master';
                //console.log((new Date()).toISOString(), ' importing ' + projectInfo.name);
                return testFixture.importProject(storage, {
                    projectSeed: projectInfo.path,
                    projectName: projectInfo.name,
                    branchName: branchName,
                    gmeConfig: gmeConfig,
                    logger: logger
                })
                    .then(function (importResult) {
                        var i,
                            createBranches = [];
                        if (projectInfo.hasOwnProperty('branches') && projectInfo.branches.length > 1) {
                            // First one is already added thus i = 1.
                            for (i = 1; i < projectInfo.branches.length; i += 1) {
                                createBranches.push(storage.createBranch({
                                        projectId: testFixture.projectName2Id(projectInfo.name),
                                        branchName: projectInfo.branches[i],
                                        hash: importResult.commitHash
                                    })
                                );
                            }
                        }
                        return Q.allDone(createBranches);
                    })
                    .then(function () {
                        var nextProject = PROJECTS_TO_IMPORT.shift();
                        if (nextProject) {
                            return importProject(nextProject);
                        }
                    });
            }

            return importProject(PROJECTS_TO_IMPORT.shift());
        })
        .then(function () {
            // Close the storage
            return storage.closeDatabase();
        })
        .then(function () {
            server = webgme.standaloneServer(gmeConfig);
            //setTimeout(function () {
            server.start(function () {
                console.log((new Date()).toISOString(), 'webgme server started');
            });
            //}, 10000); // timeout to emulate long server start up see test-main.js
        })
        .catch(function (err) {
            console.error(err);
        });

}());


module.exports = function (config) {
    'use strict';

    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        client: {
            mocha: {
                timeout: 10000 // Increased from 2000 [ms]
            }
        },


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'requirejs', 'chai'],


        // list of files / patterns to load in the browser
        files: [
            // {pattern: 'src/**/*.js', included: false}, // THIS IS SLOW: SPECIFY EXPLICITLY WHAT WE NEED.
            {pattern: 'src/client/js/**/*.js', included: false},

            // webgme app specific libraries (add as needed)
            {pattern: 'src/client/bower_components/jquery/dist/*.js', included: false},
            {pattern: 'src/client/lib/purl/*.js', included: false},

            // webgme engine stuff
            {pattern: 'node_modules/webgme-engine/src/common/**/*.js', included: false},
            {pattern: 'node_modules/webgme-engine/src/client/*.js', included: false},
            {pattern: 'node_modules/webgme-engine/src/plugin/*.js', included: false},
            {pattern: 'node_modules/webgme-engine/src/*.js', included: false},
            {pattern: 'node_modules/webgme-engine/seeds/**/*.webgmex', included: false},
            {pattern: 'test-karma/**/*.spec.js', included: false},
            'test-main.js'
        ],


        // list of files to exclude
        exclude: [
        ],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'src/**/*.js': ['coverage']
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['dots', 'coverage'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values:
        // config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome', 'Firefox'],

        reportSlowerThan: 1000,

        // to avoid DISCONNECTED messages
        browserDisconnectTimeout: 10000, // default 2000
        browserDisconnectTolerance: 1, // default 0
        browserNoActivityTimeout: 600000, //default 10000

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,


        // forward these requests to the webgme server. All other files are server by the karma web server
        proxies: {
            '/base/gmeConfig.json': 'http://localhost:' + gmeConfig.server.port + '/gmeConfig.json',
            '/docs': 'http://localhost:' + gmeConfig.server.port + '/docs',
            '/rest': 'http://localhost:' + gmeConfig.server.port + '/rest',
            '/api': 'http://localhost:' + gmeConfig.server.port + '/api'
        }
    });
};
