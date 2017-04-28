/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    Express = require('express'),
    ManagerTracker = require('../addon/managertracker'),
    CONSTANTS = requireJS('common/Constants'),
    Q = require('q'),
    bodyParser = require('body-parser'),
    superagent = require('superagent'),
    DEFAULT_TOKEN_REFRESH_INTERVAL = 60000; // Refresh token every minute by default.

/**
 *
 * @param {object} options
 * @param {string} [options.webgmeUrl]
 * @param {number} [options.port]
 * @param {string} [options.path]
 * @param {string} [options.token]
 * @param {string} [options.credentials]
 * @param {number} [options.tokenRefreshInterval]
 * @param {object} [options.gmeConfig]
 * @constructor
 */
function AddOnHandler(options) {
    var app = new Express(),
        refreshInterval = options.tokenRefreshInterval || DEFAULT_TOKEN_REFRESH_INTERVAL,
        gmeConfig = options.gmeConfig || webgme.getGmeConfig(),
        logger = webgme.Logger.create('gme:bin:addon-handler', gmeConfig.bin.log, false),
        webgmeUrl = options.webgmeUrl || 'http://127.0.0.1:' + gmeConfig.server.port,
        webgmeToken,
        timeoutId,
        mt,
        server;

    options.port = options.port || (gmeConfig.server.port + 1);

    function refreshToken() {
        var deferred = Q.defer(),
            req;

        if (webgmeToken) {
            logger.info('Token exists... ');
            req = superagent.get(webgmeUrl + '/api/user/token')
                .set('Authorization', 'Bearer ' + webgmeToken);
        } else if (options.credentials) {
            logger.info('Credentials were given.. ');
            req = superagent.get(webgmeUrl + '/api/user/token')
                .set('Authorization', 'Basic ' + new Buffer(options.credentials).toString('base64'));
        } else {
            deferred.resolve();
            return deferred.promise;
        }

        logger.info('...will request new token at', webgmeUrl + '/api/user/token');
        req.end(function (err, res) {
            if (err) {
                deferred.reject(err);
            } else if (typeof res.body.webgmeToken === 'string') {
                webgmeToken = res.body.webgmeToken;
                logger.info('Obtained new token from webgme server.');
                mt.setToken(webgmeToken);

                deferred.resolve();
            } else {
                deferred.reject(new Error(webgmeUrl + '/user/token did not provide webgmeToken.'));
            }

            timeoutId = setTimeout(refreshToken, refreshInterval);
        });

        return deferred.promise;
    }

    this.start = function (callback) {
        var deferred = Q.defer(),
            statusUrl = options.path;

        if (statusUrl[statusUrl.length - 1] === '/') {
            statusUrl = statusUrl.substring(0, statusUrl.length - 1);
        }

        statusUrl = statusUrl + '/status';

        mt = new ManagerTracker(logger, gmeConfig, options);

        app.use(bodyParser.json());

        app.get(statusUrl, function (req, res, next) {
            try {
                res.json(mt.getStatus({}));
            } catch (err) {
                next(err);
            }
        });

        app.post(options.path, function (req, res) {
            var params = req.body;

            if (params.event === CONSTANTS.STORAGE.BRANCH_JOINED ||
                params.event === CONSTANTS.STORAGE.BRANCH_HASH_UPDATED) {
                mt.connectedWorkerStart(webgmeToken || params.webgmeToken, params.projectId, params.branchName)
                    .then(function (info) {
                        logger.info('connectedWorkerStart', params.projectId, params.branchName, JSON.stringify(info));
                    })
                    .catch(function (err) {
                        logger.error(err);
                    });
            } else if (params.event === CONSTANTS.STORAGE.BRANCH_LEFT) {
                mt.connectedWorkerStop(params.projectId, params.branchName)
                    .then(function (info) {
                        logger.info('connectedWorkerStop', params.projectId, params.branchName, JSON.stringify(info));
                    })
                    .catch(function (err) {
                        logger.error(err);
                    });
            } else {
                logger.error('Unknown command received');
                res.sendStatus(404);
                return;
            }

            res.sendStatus(200);
        });

        webgmeToken = options.token;

        refreshToken()
            .finally(function (err) {
                if (err) {
                    logger.warn('Error at initial token refresh, will still proceed', err);
                }

                server = app.listen(options.port);
                logger.info('Will connect to webgme server at', webgmeUrl);
                logger.info('Server listening at:  http://127.0.0.1:' + options.port, '...');

                if (webgmeToken) {
                    logger.info('Credentials and/or token provided, will refresh token every',
                        refreshInterval, '[ms].');
                }
            });

        return deferred.promise.nodeify(callback);
    };

    this.stop = function (callback) {
        var deferred = Q.defer();

        clearTimeout(timeoutId);
        if (server) {
            server.close();
        }

        if (mt) {
            mt.close()
                .then(deferred.resolve)
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

module.exports = AddOnHandler;

if (require.main === module) {
    var Command = require('commander').Command,
        program = new Command(),
        handler;

    program
        .version('2.13.0')
        .description('Starts an add-on machine that handles addOns based on clients connecting to branches. ' +
            'This script can be used for two purposes: 1) if multiple webgme back-ends are used they should not spawn ' +
            'their own add-on workers, instead they should all be configured to post to this server ' +
            '(config.addOn.workerUrl) 2) it enables all running add-ons to be authenticated as one predefined user.')
        .option('-u, --webgmeUrl [string]', 'Url to the webgme server. If not given it will assume http://127.0.0.1' +
            ':%gmeConfig.server.port%')
        .option('-p, --port [number]', 'Port the server should listen at [gmeConfig.server.port + 1]')
        .option('-o, --path [string]', 'Path the server should receive post requests at.', '')
        .option('-t, --token [string]', 'Token for specific addon user (has precedence over credentials).', '')
        .option('-c, --credentials [string]', 'Credentials for specific addon user in the form userId:password.')
        .option('-i, --token-refresh-interval [integer]', 'Interval in ms when the token should be refreshed ' +
            '(only applicable if token or credentials were given).', resolveInterval)

        .on('--help', function () {
            console.log('  Examples:');
            console.log();
            console.log('    $ node addon_handler.js -p 8080');
            console.log('    $ node addon_handler.js -o /add-on');
            console.log('    $ node addon_handler.js -t %jwt%');
            console.log('    $ node addon_handler.js -c addon:addonPassword');
            console.log('    $ node addon_handler.js -c addon:addonPass -i 30000');
            console.log();
        })
        .parse(process.argv);

    handler = new AddOnHandler(program);

    handler.start(function (err) {
        if (err) {
            console.error(err);
        } else {
            console.info('Server running');
        }
    });

    process.on('SIGINT', function () {
        handler.stop()
            .then(function () {
                process.exit(0);
            })
            .catch(function (err) {
                console.error(err);
                process.exit(1);
            });
    });
}