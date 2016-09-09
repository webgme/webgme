/*globals require*/
/*jshint browser: true*/

'use strict';

var allTestFiles = [],
    TEST_REGEXP = /(spec|test)\.js$/i,

    pathToModule = function (path) {
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
        plugin: './src/plugin',
        text: './src/client/lib/require/require-text/text',

        // plugins
        // TODO: populate plugin list dynamically based on config.json
        'plugin/MinimalWorkingExample': './src/plugin/coreplugins',
        'plugin/PluginForked': './test/plugin/scenarios/plugins',

        executor: './src/common/executor',
        blob: './src/common/blob',
        common: './src/common',

        js: './src/client/js',

        superagent: './src/client/lib/superagent/superagent',
        jszip: './src/client/bower_components/jszip/dist/jszip',
        debug: './src/client/bower_components/visionmedia-debug/dist/debug',
        chance: './src/client/bower_components/chance/chance',
        underscore: './src/client/bower_components/underscore/underscore',
        q: './src/client/bower_components/q/q',

        karmatest: './test-karma',
        aRtestCases: './test-karma/client/js/AutoRouter/testCases'

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
    callback: testServerConnection
});

function done(err) {
  if (err) {
    console.error(err);
  }
  window.__karma__.start();
}

function testServerConnection () {
  requirejs(['superagent'], function (superagent) {

      var maxTries = 20,
          i = 0,
          timeout = 300;

      function tryToGetGmeConfig() {
        console.log('Trying to get gmeConfig.json ... ', i, i * timeout / 1000);
        superagent.get('/base/gmeConfig.json')
            .end(function (err, res) {
                if (res && res.status === 200) {
                  console.log('Got gmeConfig.json');
                  done();
                } else {
                  i += 1;
                  if (i < maxTries) {
                    setTimeout(tryToGetGmeConfig, timeout);
                  } else {
                    done(err, res);
                  }
                }
            });
      }

      tryToGetGmeConfig();
  });
}
