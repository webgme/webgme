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
        js: './src/client/js',
        client: './node_modules/webgme-engine/src/client',
        plugin: './node_modules/webgme-engine/src/plugin',
        text: './node_modules/webgme-engine/src/common/lib/requirejs/text',

        // plugins
        // 'plugin/MinimalWorkingExample': './src/plugin/coreplugins',

        executor: './node_modules/webgme-engine/src/common/executor',
        blob: './node_modules/webgme-engine/src/common/blob',
        common: './node_modules/webgme-engine/src/common',

        // common libs
        superagent: './node_modules/webgme-engine/src/common/lib/superagent/superagent',
        debug: './node_modules/webgme-engine/src/common/lib/debug/debug',
        chance: './node_modules/webgme-engine/src/common/lib/chance/chance',
        q: './node_modules/webgme-engine/src/common/lib/q/q',
        ot: './node_modules/webgme-engine/src/common/lib/ot/ot',


        // webgme app specific libs
        jquery: './src/client/bower_components/jquery/dist/jquery',
        urlparse: './src/client/lib/purl/purl.min',

        karmatest: './test-karma'
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
