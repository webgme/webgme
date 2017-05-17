/*globals requireJS*/
/*jshint node:true*/
/**
 * This is just to illustrate how to receive events from the webgme server and establish a secure and authenticated
 * connection to the webgme storage.
 *
 * In order to receive the webhook event the webgme server must have webhooks enabled and the project should have
 * a webhook added (you can use ./bin/manage_webhooks.js to add these).
 *
 * This example also requires authentication to be turned on and that the user isn't the guest account.
 *
 *
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    Express = require('express'),
    Q = require('q'),
    bodyParser = require('body-parser'),
    superagent = require('superagent'),
    gmeConfig = webgme.getGmeConfig(),
    fs = require('fs'),

    CONSTANTS = requireJS('common/Constants'),
    Storage = requireJS('common/storage/nodestorage'),
    Core = requireJS('common/core/coreQ'),
    logger = webgme.Logger.create('gme:bin:connected-webhook-handler', gmeConfig.bin.log, false),
    DEFAULT_TOKEN_REFRESH_INTERVAL = 60000; // Refresh token every minute by default.

function ConnectedHandler(options) {
    var app = new Express(),
        webgmeUrl = options.webgmeUrl || 'http://127.0.0.1:' + gmeConfig.server.port,
        projects = {},
        certificate,
        timeoutId,
        webgmeToken,
        storage,
        server;

    options.port = options.port || (gmeConfig.server.port + 1);
    options.tokenRefreshInterval = options.tokenRefreshInterval || DEFAULT_TOKEN_REFRESH_INTERVAL;

    if (options.certificate) {
        // This is needed if the tls/ssl certificates are self signed.
        certificate = fs.readFileSync(options.certificate, 'utf-8');
        gmeConfig.socketIO.clientOptions.ca = certificate;
    }

    function getConnectedStorage(callback) {
        var deferred = Q.defer();

        if (storage) {
            deferred.resolve(storage);
        } else {
            logger.info('Establishing connection to webgme storage at', webgmeUrl);
            storage = Storage.createStorage(webgmeUrl, webgmeToken, logger, gmeConfig);
            storage.open(function (networkState) {
                if (networkState === CONSTANTS.STORAGE.CONNECTED) {
                    deferred.resolve(storage);
                } else {
                    // FIXME: We can handle more events that just CONNECTED
                    deferred.reject(new Error('Problems connecting to the webgme server, network state: ' +
                        networkState));
                }
            });
        }

        return deferred.promise.nodeify(callback);
    }

    /**
     *
     * @param {object} payload
     *
     * @example
     * payload =
     * {
     *    event: 'COMMIT',
     *    projectId: 'guest+MyProject',
     *    owner: 'guest',
     *    projectName: 'MyProject',
     *    hookId: 'MyWebHook',
     *    data: {
     *       projectId: "demo+Templates",
     *       commitHash: "#d8de3bdd38be13c43ea182058d397e9e28d4b4ef",
     *       userId: "demo"
     *       }
     *    }
     */
    function handleHook(payload) {
        var defer = Q.defer(),
            project,
            commitHash,
            core;

        if (payload.event !== CONSTANTS.WEBHOOK_EVENTS.COMMIT || payload.data.userId !== options.userId) {
            // We're only interested in events from our user..
            logger.info('Skipping event [', payload.event, '] triggered by [', payload.data.userId, ']');
            defer.resolve();
            return defer.promise;
        }

        commitHash = payload.data.commitHash;

        getConnectedStorage()
            .then(function () {
                if (projects.hasOwnProperty(payload.projectId)) {
                    return projects[payload.projectId];
                } else {
                    projects[payload.projectId] = Q.ninvoke(storage, 'openProject', payload.projectId)
                        .then(function (res) {
                            return res[0];
                        });

                    return projects[payload.projectId];
                }
            })
            .then(function (project_) {
                project = project_;

                return project.getCommits(commitHash, 1);
            })
            .then(function (commitObject) {
                core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });

                return core.loadRoot(commitObject[0].root);
            })
            .then(function (rootNode) {
                logger.info('Name of root node is [', core.getAttribute(rootNode, 'name'), '] at [',
                    payload.projectName + commitHash.substring(0, 7) + ']');

                defer.resolve();
            })
            .catch(function (err) {
                logger.error(err);
                defer.reject(err);
            });

        return defer.promise;
    }

    function refreshToken() {
        var deferred = Q.defer(),
            req = superagent.get(webgmeUrl + '/api/user/token');

        logger.info('Will request new token at', webgmeUrl + '/api/user/token');

        if (!webgmeToken) {
            // Only use credentials for the first request (password may change)..
            req.set('Authorization', 'Basic ' + new Buffer(options.userId + ':' + options.password).toString('base64'));
        } else {
            req.set('Authorization', 'Bearer ' + webgmeToken);
        }

        if (certificate) {
            req.ca(certificate);
        }

        req.end(function (err, res) {
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

            timeoutId = setTimeout(refreshToken, options.tokenRefreshInterval);
        });

        return deferred.promise;
    }

    this.start = function (callback) {
        var deferred = Q.defer();

        app.use(bodyParser.json());

        app.post(['', '/'], function (req, res) {
            var payload = req.body;
            handleHook(payload)
                .finally(function () {
                });

            res.sendStatus(200);
        });

        refreshToken()
            .then(function () {
                server = app.listen(options.port);
                logger.info('Server listening at:  http://127.0.0.1:' + options.port);
            })
            .catch(deferred.reject);


        return deferred.promise.nodeify(callback);
    };

    this.stop = function (callback) {
        var deferred = Q.defer();

        clearTimeout(timeoutId);
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

function resolveInterval(val) {
    if (val) {
        return parseInt(val, 10);
    } else {
        return DEFAULT_TOKEN_REFRESH_INTERVAL;
    }
}

if (require.main === module) {
    var Command = require('commander').Command,
        program = new Command(),
        handler;

    program
        .version('2.13.0')
        .arguments('<userId> <password>')
        .description('Starts a webhook handler server that connects to the storage via the server. ' +
            'This is just to illustrate how to receive events from the webgme server and establish a secure and ' +
            'authenticated connection to the webgme storage. In order to receive the webhook event the webgme ' +
            'server must have webhooks enabled and the project should have a webhook added with matching url ' +
            '(you can use ./bin/manage_webhooks.js to add these. Currently this example also requires authentication ' +
            'to be turned on and that the user is not the guest account.')
        .option('-u, --webgmeUrl [string]', 'Url to the webgme server. If not given it will assume http://127.0.0.1' +
            ':%gmeConfig.server.port%')
        .option('-p, --port [number]', 'Port the webhook-handler should listen at ' +
            '[gmeConfig.server.port + 1]')
        .option('-c, --certificate [string]', 'Path to certificate file if webgme server is secure and ' +
            'using self signed certificate.')
        .option('-i, --token-refresh-interval [string]', 'Interval in ms when the token should be refreshed.',
            resolveInterval)

        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node connected_webhook_handler.js user wordpass -p 8080');
            console.log('    $ node connected_webhook_handler.js user wordpass -p 8080 -w https://editor.webgme.org');
            console.log('    $ node connected_webhook_handler.js user wordpass -w https://myDeployment.org' +
                ' -c ./cert.crt -i 3600000');
            console.log();
        })
        .parse(process.argv);

    if (program.args.length < 2) {
        program.help();
    } else {
        //program.pluginId = program.args[0];
        program.userId = program.args[0];
        program.password = program.args[1];
        handler = new ConnectedHandler(program);

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
}

