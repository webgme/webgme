// Karma configuration
// Generated on Thu Mar 12 2015 16:54:00 GMT-0500 (Central Daylight Time)

module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'requirejs', 'chai', 'express-http-server'],


        // list of files / patterns to load in the browser
        files: [
            {pattern: 'src/**/*.js', included: false},
            {pattern: 'test-browser/**/*.spec.js', included: false},
            'test-main.js'
        ],


        // list of files to exclude
        exclude: [
             'src/middleware/executor/worker/node_modules/**/*.js'
        ],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            '**/*.js': ['coverage']
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'coverage'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome', 'Firefox'],


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        proxies: {
            '/rest': 'http://localhost:8965/rest'
        },

        expressHttpServer: {
            port: 8965,
            appVisitor: function (app, log) {
                function ensureAuthenticated(req, res, next) {
                    req.session = {udmId: 'karma_test_user'};
                    next();
                };
                var webgme = require('./webgme');
                var gmeConfig = require('./config');

                var requirejs = webgme.requirejs;

                requirejs(['blob/BlobFSBackend', 'blob/BlobServer'], function (BlobFSBackend, BlobServer) {
                    var blobBackend = new BlobFSBackend(gmeConfig);
                    BlobServer.createExpressBlob(app, blobBackend, ensureAuthenticated, log);
                });
                app.use(function (req, res, next) {
                    // TODO: possible race between client and above requirejs call
                    next();
                });
                app.get('/rest/blob/istesting', function (req, res) {
                    res.end('It is working! Done.', 200);
                });
            }
        }
    });
};
