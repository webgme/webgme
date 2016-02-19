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

    map: {
        '*': {
            css: './src/client/lib/require/require-css/css',
            text: './src/client/lib/require/require-text/text'
        }
    },

    paths: {
        // plugin base classes
        plugin: './src/plugin',

        // plugins
        // TODO: populate plugin list dynamically based on config.json
        MinimalWorkingExample: './src/plugin/coreplugins/MinimalWorkingExample/MinimalWorkingExample',
        PluginForked: './test/plugin/scenarios/plugins/PluginForked/PluginForked',
        'js/Dialogs/PluginConfig/PluginConfigDialog': './utils/build/empty/empty',

        // MAGIC ... from src/client/js/main.js
        executor: './src/common/executor',
        blob: './src/common/blob',
        common: './src/common',
        //'core': './src/common/core',
        //'storage': './src/common/storage',

        js: './src/client/js',
        //'util': './src/common/util',
        //'eventDispatcher': './src/common/EventDispatcher',
        //'logManager': './src/common/LogManager',
        //'coreclient': './src/common/core/users',

        superagent: './src/client/lib/superagent/superagent',
        jszip: './src/client/lib/jszip/jszip',
        debug: './src/client/lib/debug/debug',
        underscore: './src/client/lib/underscore/underscore',
        Q: './src/client/lib/q/q', //FIXME: this should be removed
        q: './src/client/lib/q/q',

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

function done(err, res) {
  if (err) {
    console.error(err);
  }
  window.__karma__.start();
}

function testServerConnection () {
  requirejs(['superagent'], function (superagent) {

      var maxTries = 50,
          i = 0,
          timeout = 100;

      function tryToGetGmeConfig() {
        console.log('Trying to get gmeConfig.json ... ', i, i * timeout / 1000);
        superagent.get('/base/gmeConfig.json')
            .end(function (err, res) {
                if (res.status === 200) {
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
