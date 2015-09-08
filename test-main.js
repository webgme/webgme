/*globals require, console*/
/*jshint browser: true*/

function done() {
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

            superagent: './src/client/lib/superagent/superagent-1.2.0',
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
        callback: window.__karma__.start
    });
}

//function httpGet(theUrl, callback) {
//    'use strict';
//    var xhr = new XMLHttpRequest();
//    console.log(theUrl);
//    xhr.open('GET', theUrl, true);
//    xhr.onreadystatechange  = function () {
//        console.log('ready state changed');
//        if (xhr.readyState === 4) {
//            if (xhr.status === 200) {
//                console.log(xhr.responseText);
//                callback(xhr.status);
//            } else {
//                console.error(xhr.statusText);
//                callback(xhr.status);
//            }
//        }
//    };
//    xhr.onerror = function (/*e*/) {
//        console.error(xhr.statusText);
//        callback(xhr.status);
//    };
//    xhr.send(null);
//    return xhr;
//}


// FIXME: we should try to load gmeConfig with HTTPXmlRequest, to see if the server is up and running
// wait for 5 seconds for server start up
setTimeout(function () {
    'use strict';
    done();
}, 5000);

// FIXME: this code does not behave as expected.
//var i = 20, // how many times to try to connect to the server
//    ready = false,
//    xhrPending,
//    intervalId = setInterval(function () {
//        xhrPending = httpGet('/base/gmeConfig.json', function (status) {
//            xhrPending = null;
//            console.log(status);
//            if (status === 200) {
//                if (ready === false) {
//                    clearInterval(intervalId);
//                    done();
//                } else {
//                    ready = true;
//                }
//            }
//        });
//
//        if (xhrPending) {
//            xhrPending.abort();
//        }
//
//        console.log('trying to connect');
//
//        i -= 1;
//        if (i < 0) {
//            clearInterval(intervalId);
//            throw new Error('Was not able to connect web server through karma proxy within 20 seconds');
//        }
//    }, 1000);
