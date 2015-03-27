/*jshint browser: true*/
var allTestFiles = [];
var TEST_REGEXP = /(spec|test)\.js$/i;

var pathToModule = function (path) {
    'use strict';
    return path.replace(/^\/base\//, '').replace(/\.js$/, '');
};

Object.keys(window.__karma__.files).forEach(function (file) {
    'use strict';
    if (TEST_REGEXP.test(file)) {
        // Normalize paths to RequireJS module names.
        allTestFiles.push(pathToModule(file));
    }
});


require.config({
    // Karma serves files under /base, which is the basePath from your config file
    baseUrl: '/base',

    map: {
        '*': {
            'css': './src/client/lib/require/require-css/css',
            'text': './src/client/lib/require/require-text/text'
        }
    },

    paths: {
        // plugin base classes
        'plugin': './src/plugin',

        // plugins
        // TODO: populate plugin list dynamically based on config.json


        // MAGIC ... from src/client/js/main.js
        'executor': './src/middleware/executor',
        'blob': './src/middleware/blob',
        'common': './src/common',
        //'core': './src/common/core',
        //'storage': './src/common/storage',

        'js': './src/client/js',
        //'util': './src/common/util',
        //'eventDispatcher': './src/common/EventDispatcher',
        //'logManager': './src/common/LogManager',
        //'coreclient': './src/common/core/users',

        'superagent': './src/client/lib/superagent/superagent',
        'jszip': './src/client/lib/jszip/jszip',
        'debug': './src/client/lib/debug/debug'

        // external libraries used by plugins
        //'ejs': './support/ejs/ejs.min',
        //'xmljsonconverter': './lib/xmljsonconverter',
        //'sax': './support/sax/sax',

        // modules used by test cases
        //'mocks': './test/mocks',
        //'models': './test/models'
    },


    // dynamically load all test files
    deps: allTestFiles,

    // we have to kickoff jasmine, as it is asynchronous
    callback: window.__karma__.start
});
