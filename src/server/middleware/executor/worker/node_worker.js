/*globals define*/
/*jshint node:true*/
/**
 * @module Executor:NodeWorker
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 */

var nodeRequire = require,
    log = function () {
        'use strict';
        var args = Array.prototype.slice.call(arguments);
        args.splice(0, 0, new Date().toISOString());
        console.log.apply(console, args);
    },
    err = function () {
        'use strict';
        var args = Array.prototype.slice.call(arguments);
        args.splice(0, 0, new Date().toISOString());
        console.error.apply(console, args);
    },
    logger = {
        debug: log,
        log: log,
        info: log,
        warn: log,
        error: err
    };

if (typeof define !== 'undefined') {

    define('node_worker', [
        'common/eventDispatcher',
        'blob/BlobClient',
        'executor/ExecutorWorker',
        'executor/JobInfo',
        'executor/ExecutorWorkerController',
        'url'
    ], function (eventDispatcher, BlobClient, ExecutorWorker, JobInfo, ExecutorWorkerController, url) {
        'use strict';

        return function (webGMEUrl, tempPath, parameters, availableProcessesContainer) {
            var worker,
                webGMEPort = url.parse(webGMEUrl).port || (url.parse(webGMEUrl).protocol === 'https:' ? 443 : 80);


            worker = new ExecutorWorker({
                server: url.parse(webGMEUrl).hostname,
                serverPort: webGMEPort,
                httpsecure: url.parse(webGMEUrl).protocol === 'https:',
                webgmeToken: undefined,
                availableProcessesContainer: availableProcessesContainer,
                workingDirectory: tempPath,
                executorNonce: parameters.executorNonce,
                logger: logger
            });

            log('Connecting to ' + webGMEUrl);

            var callback;
            worker.queryWorkerAPI(function (err, response) {
                if (!err) {
                    log('Connected to ' + webGMEUrl);
                }
                var refreshPeriod = 60 * 1000,
                    disconnected = false;
                callback = callback || function (err, response) {
                    if (err) {
                        log('Error connecting to ' + webGMEUrl + ' ' + err);
                        disconnected = true;
                    } else if (disconnected) {
                        log('Reconnected to ' + webGMEUrl);
                        disconnected = false;
                    }

                    if (response && response.refreshPeriod) {
                        refreshPeriod = response.refreshPeriod;
                    }
                    /*var timeoutID = */
                    setTimeout(function () {
                        worker.queryWorkerAPI(callback);
                    }, refreshPeriod);
                };
                callback(err, response);
            });
            var cancel = function () {
                callback = function () {
                };
            };
            return cancel;
        };
    });
}

if (nodeRequire.main === module) {
    var fs = nodeRequire('fs'),
        path = nodeRequire('path'),
        superagent = nodeRequire('superagent'),
        configFileName = 'config.json',
        workingDirectory = 'executor-temp',
        cas;
    //https = nodeRequire('https'); FIXME take into use or remove it

    if (process.env.LATEST_CERTS) {
        cas = nodeRequire('ssl-root-cas/latest');
    } else {
        cas = nodeRequire('ssl-root-cas');
    }

    // This is used for tests
    if (process.argv.length > 2) {
        configFileName = process.argv[2];
        if (process.argv.length > 3) {
            workingDirectory = process.argv[3];
        }
    }

    cas.inject();
    fs.readdirSync(__dirname).forEach(function (file) {
        'use strict';
        var filename = path.resolve(__dirname, file);
        if ((filename.indexOf('.pem') === filename.length - 4) || (filename.indexOf('.crt') === filename.length - 4)) {
            log('Adding ' + file + ' to trusted CAs');
            cas.addFile(filename);
        }
    });

    superagent.Request.prototype._ca = (require('https').globalAgent.options.ca);
    var requirejs = require('./node_worker.classes.build.js').requirejs;

    [
        'superagent',
        'fs',
        'util',
        'events',
        'path',
        'child_process',
        'minimatch',
        'rimraf',
        'url',
        'q'
    ].forEach(function (name) {
            'use strict';
            requirejs.s.contexts._.defined[name] = nodeRequire(name);
        });

    global.WebGMEGlobal = {
        getConfig: function () {
            'use strict';
            return {};
        }
    }; // server: config.server, serverPort: config.port, httpsecure: config.protocol==='https' }; } };

    var webGMEUrls = Object.create(null),
        maxConcurrentJobs = 1,
        availableProcessesContainer = { //FIXME check why the definition cannot be moved to global namespace
            availableProcesses: maxConcurrentJobs
        }; // shared among all ExecutorWorkers

    requirejs(['node_worker'], function (addWebGMEConnection) {
        'use strict';
        var fs = nodeRequire('fs'),
            path = nodeRequire('path');

        function readConfig() {
            var config = {
                'http://127.0.0.1:8888': {}
            };
            try {
                var configJSON = fs.readFileSync(configFileName, {
                    encoding: 'utf8'
                });
                config = JSON.parse(configJSON);
                if (Array.isArray(config)) {
                    var oldConfig = config;
                    config = {};
                    oldConfig.forEach(function (webGMEUrl) {
                        config[webGMEUrl] = {};
                    });
                } else if (typeof (config) === 'string') {
                    config = {
                        config: {}
                    };
                } else {
                }
            } catch (e) {
                if (e.code !== 'ENOENT') {
                    throw e;
                }
            }
            Object.getOwnPropertyNames(config).forEach(function (key) {
                var webGMEUrl;
                if (key.indexOf('http') === 0) {
                    webGMEUrl = key;
                    if (Object.prototype.hasOwnProperty.call(webGMEUrls, webGMEUrl)) {
                    } else {
                        webGMEUrls[webGMEUrl] = addWebGMEConnection(webGMEUrl,
                            path.join(workingDirectory, '' + workingDirectoryCount++),
                            config[webGMEUrl], availableProcessesContainer);
                    }
                } else if (key === 'maxConcurrentJobs') {
                    availableProcessesContainer.availableProcesses += config.maxConcurrentJobs - maxConcurrentJobs;
                    maxConcurrentJobs = config.maxConcurrentJobs;
                } else {
                    log('Unknown configuration key ' + key);
                }
            });
            // remove webGMEUrls no longer in config
            Object.getOwnPropertyNames(webGMEUrls).forEach(function (webGMEUrl) {
                if (Object.prototype.hasOwnProperty.call(config, webGMEUrl) === false) {
                    log('Removing ' + webGMEUrl);
                    webGMEUrls[webGMEUrl]();
                    delete webGMEUrls[webGMEUrl];
                }
            });
        }

        var workingDirectoryCount = 0;
        var rimraf = nodeRequire('rimraf');
        rimraf(workingDirectory, function (err) {
            if (err) {
                log('Could not delete working directory (' + workingDirectory + '), err: ' + err);
                process.exit(2);
            }
            if (!fs.existsSync(workingDirectory)) {
                fs.mkdirSync(workingDirectory);
            }

            readConfig();
            fs.watch(configFileName, function () {
                setTimeout(readConfig, 200);
            }); // setTimeout: likely handle O_TRUNC of config.json
            // (though `move config.json.tmp config.json` is preferred)
        });
    });

}
