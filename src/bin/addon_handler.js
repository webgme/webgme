/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    Express = require('express'),
    path = require('path'),
    ManagerTracker = require('../../addon/managertracker'),
    WORKER_CONSTANTS = require('../server/worker/constants'),
    Q = require('q'),
    bodyParser = require('body-parser'),
    superagent = require('superagent'),
    configDir = path.join(process.cwd(), 'config'),
    gmeConfig = require(configDir),
    logger = webgme.Logger.create('gme:bin:addon-handler', gmeConfig.bin.log, false),
    TOKEN_REFRESH_INTERVAL = 60000; // Refresh token every minute.

function AddOnHandler(options) {
    var app = new Express(),
        webgmeUrl = options.webgmeUrl || 'http://127.0.0.1:' + gmeConfig.server.port,
        intervalId,
        mt,
        server;

    options.port = options.port || (gmeConfig.server.port + 1);

    function refreshToken(webgmeToken) {
        var deferred = Q.defer(),
            req = superagent.get(webgmeUrl + '/api/user/token');

        logger.info('Will request new token at', webgmeUrl + '/api/user/token');

        if (!webgmeToken) {
            // Only use credentials for the first request (password may change)..
            req.set('Authorization', 'Basic ' + new Buffer(options.userId + ':' + options.password).toString('base64'));
        } else {
            req.set('Authorization', 'Bearer ' + webgmeToken);
        }

        req.get(webgmeUrl + '/api/user/token')
            .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                if (typeof res.body.webgmeToken === 'string') {
                    webgmeToken = res.body.webgmeToken;
                    logger.info('Obtained new token from webgme server.');
                    //logger.info(webgmeToken);

                    if (storage) {
                        storage.setToken(webgmeToken);
                    }

                    deferred.resolve(res.body.webgmeToken);
                } else {
                    deferred.reject(new Error(webgmeUrl + '/user/token did not provide webgmeToken.'));
                }
            });

        return deferred.promise;
    }

    this.start = function (callback) {
        var deferred = Q.defer();

        mt = new ManagerTracker(logger, gmeConfig, options);

        app.use(bodyParser.json());

        app.post(options.path, function (req, res) {
            var params = req.body;

            if (params.command === WORKER_CONSTANTS.workerCommands.connectedWorkerStart) {

            } else if (params.command === WORKER_CONSTANTS.workerCommands.connectedWorkerStop) {
                mt.connectedWorkerStart()
            } else {
                logger.error('Unknown command received');
            }

            res.sendStatus(200);
        });

        refreshToken()
            .then(function () {
                server = app.listen(options.port);
                logger.info('Server listening at:  http://127.0.0.1:' + options.port);

                intervalId = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
            })
            .catch(deferred.reject);


        return deferred.promise.nodeify(callback);
    };

    this.stop = function (callback) {
        var deferred = Q.defer();

        clearInterval(intervalId);
        server.close();

        if (storage) {
            storage.close()
                .then(function () {
                    storage = null;
                    deferred.resolve();
                })
                .catch(deferred.reject);
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };
}

if (require.main === module) {
    var Command = require('commander').Command,
        program = new Command(),
        handler;

    program
        .version('2.13.0')
        .description('Starts a webhook handler server that connects to the storage via the server.')
        .option('-u, --webgmeUrl [string]', 'Url to the webgme server. If not given it will assume http://127.0.0.1' +
            ':%gmeConfig.server.port%')
        .option('-p, --port [number]', 'Port the server should listen at [gmeConfig.server.port + 1]')
        .option('-o, --path [string]', 'Path the server should receive post requests at.', '')
        .option('-t, --token [string]', 'Token for specific addon user (has precedence over credentials).', '')
        .option('-c, --credentials [string]', 'Credentials for specific addon user in the form userId:password.')

        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node addon_handler.js -p 8080');
            console.log('    $ node addon_handler.js -o /add-on');
            console.log('    $ node addon_handler.js -t ');
            console.log('    $ node addon_handler.js -c addon:addonPass');
            console.log();
        })
        .parse(process.argv);


    //program.pluginId = program.args[0];
    program.userId = program.args[0];
    program.password = program.args[1];
    handler = new AddOnHandler(program);

    handler.start(function (err) {
        if (err) {
            logger.error(err);
        } else {
            logger.info('Server running');
        }
    });

    process.on('SIGINT', function () {
        handler.stop()
            .then(function () {
                process.exit(0);
            })
            .catch(function (err) {
                logger.error(err);
                process.exit(1);
            });
    });
}