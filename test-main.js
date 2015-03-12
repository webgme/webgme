var allTestFiles = [];
var TEST_REGEXP = /(spec|test)\.js$/i;

var pathToModule = function (path) {
    return path.replace(/^\/base\//, '').replace(/\.js$/, '');
};

Object.keys(window.__karma__.files).forEach(function (file) {
    if (TEST_REGEXP.test(file)) {
        // Normalize paths to RequireJS module names.
        allTestFiles.push(pathToModule(file));
    }
});


require.config({
    // Karma serves files under /base, which is the basePath from your config file
    baseUrl: '/base',

    paths: {
        // plugin base classes
        'plugin': './src/plugin',

        // plugins
        // TODO: populate plugin list dynamically based on config.json


        'executor': './src/middleware/executor',
        'blob': './src/middleware/blob',
        'core': './src/common/core',

        'superagent': './src/client/lib/superagent/superagent',
        'jszip': './src/client/lib/jszip/jszip'

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
