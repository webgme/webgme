/*globals requireJS*/
/*jshint node:true*/
/**
 * TODO: This is work in progress...
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var webgme = require('../../webgme'),
    Express = require('express'),
    path = require('path'),
    Q = require('q'),
    bodyParser = require('body-parser'),
    superagent = require('superagent'),
    configDir = path.join(process.cwd(), 'config'),
    gmeConfig = require(configDir),

    CONSTANTS = requireJS('common/Constants'),
    Storage = requireJS('common/storage/nodestorage'),
    Core = requireJS('common/core/coreQ'),
    logger = webgme.Logger.create('gme:bin:connected-webhook-handler', gmeConfig.bin.log, false),
    HOOK_ID = 'connectedHook',
    TOKEN_REFRESH_INTERVAL = 60000; // Refresh token every minute.

function ConnectedHandler(options) {
    var app = new Express(),
        results = [],
        webgmeUrl = options.webgmeUrl || 'http://127.0.0.1:' + gmeConfig.server.port,
        projects = {},
        intervalId,
        webgmeToken,
        storage,
        server;

    function getConnectedStorage(callback) {
        var deferred = Q.defer(),
            storage = Storage.createStorage(webgmeUrl, webgmeToken, logger, gmeConfig);

        if (storage) {
            deferred.resolve(storage);
        } else {
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

    function handleHook(payload) {
        var project,
            commitHash,
            core;

        if (payload.eventType !== CONSTANTS.WEBHOOK_EVENTS.COMMIT || payload.data.userId !== options.userId) {
            // We're only interested in events from our user..
            logger.info('Skipping event [', payload.eventType, '] triggered by [', payload.data.userId, ']');
            return;
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
                logger.info('Name of root node is [', core.getAttribute(rootNode, 'name'), '] at commit [',
                commitHash.substring(0, 7), '] in project [', payload.projectName, ']');
            })
            .catch(function (err) {
                logger.error(err);
            });
    }

    function refreshToken() {
        var deferred = Q.defer();

        superagent.get(webgmeUrl + '/api/user/token')
            .set('Authorization', 'Basic ' + new Buffer(options.userId + ':' + options.password).toString('base64'))
            .end(function (err, res) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                if (typeof res.body.webgmeToken === 'string') {
                    webgmeToken = res.body.webgmeToken;
                    logger.info('Obtained new token from webgme server.');
                    logger.info(webgmeToken); //TODO: Remove this print out..

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
        
        app.use(bodyParser.json());

        app.get(['', '/', '/result', '/results'], function (req, res) {
            res.json(results);
        });

        app.post('/' + HOOK_ID, function (req, res) {
            var payload = req.body;
            handleHook(payload)
                .finally(function () {
                    logger.info('done');
                });

            res.sendStatus(200);
        });

        refreshToken()
            .then(function () {
                server = app.listen(options.handlerPort);
                logger.info('Server listening at:  http://127.0.0.1:' + options.handlerPort);

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
        .arguments('<pluginName> <userId> <password>')
        .description('Starts a webhook handler server that connects to the storage via the server.')
        .option('-w, --webgmeUrl [string]', 'Url to the webgme server. If not given it will assume http://127.0.0.1' +
            ':%gmeConfig.server.port%')
        .option('-h, --handlerPort [number]', 'Port the webhook-handler should listen at ' +
            '[gmeConfig.server.port + 1]')
        .option('-a, --activeNode [string]', 'ID/Path to active node.', '')
        .option('-s, --activeSelection [string]', 'IDs/Paths of selected nodes (comma separated with no spaces).')
        .option('-n, --namespace [string]', 'Namespace the plugin should run under.', '')
        .option('-j, --pluginConfigPath [string]',
            'Path to json file with plugin options that should be overwritten.', '')

        .on('--help', function () {
            var i,
                env = process.env.NODE_ENV || 'default';
            console.log('  Examples:');
            console.log();
            console.log('    $ node plugin_hook.js MinimalWorkingExample user wordpass');
            console.log('    $ node plugin_hook.js MinimalWorkingExample user wordpass -p 8080');
            console.log('    $ node plugin_hook.js MinimalWorkingExample user wordpass -p 8080 -w https://editor.webgme.org');
            console.log('    $ node plugin_hook.js PluginGenerator user wordpass -j pluginConfig.json');
            console.log('    $ node plugin_hook.js MinimalWorkingExample user wordpass -a /1/b');
            console.log('    $ node plugin_hook.js MinimalWorkingExample user wordpass -s /1,/1/c,/d');
            console.log();
            console.log('  Plugin paths using ' + configDir + path.sep + 'config.' + env + '.js :');
            console.log();
            for (i = 0; i < gmeConfig.plugin.basePaths.length; i += 1) {
                console.log('    "' + gmeConfig.plugin.basePaths[i] + '"');
            }
        })
        .parse(process.argv);

    if (program.args.length < 3) {
        program.help();
    } else {
        program.pluginId = program.args[0];
        program.userId = program.args[1];
        program.password = program.args[2];
        handler = new ConnectedHandler(program);

        handler.start(function(err) {
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

