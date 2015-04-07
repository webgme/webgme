/*jshint node: true */
// Karma configuration
// Generated on Thu Mar 12 2015 16:54:00 GMT-0500 (Central Daylight Time)

// use test configuration
process.env.NODE_ENV = 'test';

// load gme configuration
var gmeConfig = require('./config'),
    webgme = require('./webgme'),
    importCli = require('./src/bin/import'),
    testFixture = require('./test/_globals');

webgme.addToRequireJsPaths(gmeConfig);

(function initializeServer() {
    'use strict';
    var server = webgme.standaloneServer(gmeConfig),
        importProject = function (projectName, filePath) {
            importCli.import(
                webgme.serverUserStorage,
                gmeConfig,
                projectName,
                JSON.parse(testFixture.fs.readFileSync(filePath, 'utf8')),
                'master',
                true,
                function (err) {
                    error = error || err;
                    console.log(projectName, 'have been imported: ', err);
                    if (--needed === 0) {
                        finishInitialization();
                    }
                });
        },
        projectsToImport = [
            {name: 'ProjectAndBranchOperationsTest', path: './test/asset/sm_basic.json'},
            {name: 'metaQueryAndManipulationTest', path: './test-karma/client/js/client/metaTestProject.json'},
            {name: 'ClientNodeInquiryTests', path: './test-karma/client/js/client/clientNodeTestProject.json'},
            {name: 'nodeManipulationProject', path: './test-karma/client/js/client/clientNodeTestProject.json'},
            {name: 'RESTLikeTests', path: './test-karma/client/js/client/clientNodeTestProject.json'},
            {name: 'undoRedoTests', path: './test-karma/client/js/client/clientNodeTestProject.json'},
            {name: 'territoryProject', path: './test-karma/client/js/client/clientNodeTestProject.json'}
        ],
        needed = projectsToImport.length,
        i,
        error = null,
        finishInitialization = function () {
            if (error) {
                console.log('server side initialization failed [' + error + '].');
            } else {
                console.log('server side initialization was successful, starting webgme server');
                server.start(function () {
                    console.log('webgme server started');
                });
            }
        };

    for (i = 0; i < projectsToImport.length; i++) {
        importProject(projectsToImport[i].name, projectsToImport[i].path);
    }

}());


module.exports = function (config) {
    'use strict';

    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'requirejs', 'chai'],


        // list of files / patterns to load in the browser
        files: [
            {pattern: 'src/**/*.js', included: false},
            {pattern: 'test-karma/**/*.spec.js', included: false},
            'test-main.js'
        ],


        // list of files to exclude
        exclude: [
            'src/server/middleware/executor/worker/node_modules/**/*.js'
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


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,


        // forward these requests to the webgme server. All other files are server by the karma web server
        proxies: {
            '/base/gmeConfig.json': 'http://localhost:' + gmeConfig.server.port + '/gmeConfig.json',
            '/rest': 'http://localhost:' + gmeConfig.server.port + '/rest',
            '/worker': 'http://localhost:' + gmeConfig.server.port + '/worker',
            '/listAllDecorators': 'http://localhost:' + gmeConfig.server.port + '/listAllDecorators',
            '/listAllPlugins': 'http://localhost:' + gmeConfig.server.port + '/listAllPlugins'
        }
    });
};
