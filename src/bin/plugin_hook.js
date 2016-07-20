/*jshint node: true*/
/**
 * 
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var webgme = require('../../webgme'),
    Express = require('express'),
    path = require('path'),
    Q = require('q'),
    bodyParser = require('body-parser'),
    binRunPlugin = require('./run_plugin'),
    superagent = require('superagent'),
    configDir = path.join(process.cwd(), 'config'),
    gmeConfig = require(configDir),
    logger = webgme.Logger.create('gme:bin:webhook', gmeConfig.bin.log, false),
    HOOK_ID = 'pluginDebugHook';


webgme.addToRequireJsPaths(gmeConfig);

/**
 *
 * @param {object} options
 * @param {string} options.pluginId - Plugin that should be executed.
 * @param {string} [options.projectName] - Name of project to add webhook too.
 * @param {string} [options.owner=guestAccount] - Owner of project to add webhook too.
 * @param {boolean} [options.leaveHook=false] - If project given, will leave the created hook after termination.
 * @param {string} [options.handlerPort] - Port hook handler should listen too (gmeConfig.server.port + 1).
 * @param {string} [options.activeNode] - Path/id to active node.
 * @param {string} [options.activeSelection] - Comma separated list of Paths/ids to active selection.
 * @param {string} [options.namespace] - Namespace plugin should run under.
 * @param {string} [options.pluginConfigPath] - Path to plugin configuration to be used..
 * @constructor
 */
function PluginHandler(options) {
    var app = new Express(),
        results = [],
        hookUrl,
        webgmeUrl,
        server;

    options.handlerPort = options.handlerPort || gmeConfig.server.port + 1;
    options.owner = options.owner || gmeConfig.authentication.guestAccount;

    function runPlugin(payload) {
        var args = ['node', 'run_plugin.js', options.pluginId, payload.projectName],
            result = {
                payload: payload,
                pluginResult: null,
                exception: null
            };

        results.unshift(result);
        args = args.concat([
            '-o', payload.owner,
            '-u', payload.data.userId,
            '-c', payload.data.commitHash,
        ]);

        if (options.activeNode) {
            args.push('-a', options.activeNode);
        }

        if (options.activeSelection) {
            args.push('-s', options.activeSelection);
        }

        if (options.namespace) {
            args.push('-n', options.namespace);
        }

        if (options.pluginConfigPath) {
            args.push('-j', options.pluginConfigPath);
        }

        return binRunPlugin.main(args)
            .then(function (pluginResult) {
                result.pluginResult = pluginResult;
                if (pluginResult.success) {
                    logger.info(JSON.stringify(pluginResult, null, 2));
                    logger.info('SUCCEEDED!');
                } else {
                    logger.error(JSON.stringify(pluginResult, null, 2));
                    logger.error('FAILED!');
                }
            })
            .catch(function (err) {
                result.exception = err.stack;
                logger.error('EXCEPTION:', err);
            });
    }

    this.start = function (callback) {
        var deferred = Q.defer(),
            hookDeferred = Q.defer(),
            projectId,
            webHook;

        webgmeUrl = 'http://127.0.0.1:' + gmeConfig.server.port;

        // If project is specified add the webhook.
        if (options.projectName) {
            webHook = {
                description: 'Handler for debugging plugins.',
                events: ['COMMIT'],
                url: 'http://127.0.0.1:' + options.handlerPort + '/' + HOOK_ID
            };

            projectId = options.owner + '+' + options.projectName;
            hookUrl = webgmeUrl + '/api/projects/' + options.owner + '/' + options.projectName + '/hooks';

            superagent.get(hookUrl)
                .end(function (err, res) {
                    hookUrl += '/' + HOOK_ID;
                    if (err) {
                        if (res && res.status === 404) {
                            hookDeferred.reject(new Error('Project does not exist [' + projectId + ']'));
                        } else if (res && res.status === 403) {
                            hookDeferred.reject(new Error('Project does not exist [' + projectId + '] or user has no' +
                                ' read access.'));
                        }
                        logger.error('Error getting hooks', err);
                        hookDeferred.reject(err);
                    } else if (res.body.hasOwnProperty(HOOK_ID)) {
                        superagent
                            .patch(hookUrl)
                            .send(webHook)
                            .end(function(err) {
                                if (err) {
                                    hookDeferred.reject(err);
                                } else {
                                    logger.info('Updated webhook "' + HOOK_ID + '" to "' + projectId + '"', webHook);
                                    hookDeferred.resolve();
                                }
                            });
                    } else {
                        superagent
                            .put(hookUrl)
                            .send(webHook)
                            .end(function(err) {
                                if (err) {
                                    hookDeferred.reject(err);
                                } else {
                                    logger.info('Added webhook "' + HOOK_ID + '" to "' + projectId + '"', webHook);
                                    hookDeferred.resolve();
                                }
                            });
                    }
                });
        } else {
            hookDeferred.resolve();
        }

        hookDeferred.promise
            .then(function () {
                app.use(bodyParser.json());

                app.get(['', '/', '/result', '/results'], function (req, res) {
                    res.json(results);
                });

                app.post('/' + HOOK_ID, function (req, res) {
                    var payload = req.body;
                    runPlugin(payload)
                        .finally(function () {
                            logger.info('done');
                        });

                    res.sendStatus(200);
                });

                server = app.listen(options.handlerPort);
                logger.info('View results at:  http://127.0.0.1:' + options.handlerPort);
                deferred.resolve();
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    };

    this.stop = function (callback) {
        var deferred = Q.defer();
        if (hookUrl && !options.leaveHook) {
            logger.info('Cleaning up created hook in project');
            superagent
                .del(hookUrl)
                .end(function(err) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
        } else {
            deferred.resolve();
        }

        server.close();

        return deferred.promise.nodeify(callback);
    };
}

module.exports = PluginHandler;

if (require.main === module) {
    var Command = require('commander').Command,
        program = new Command(),
        handler;

    program
        .version('2.2.0')
        .arguments('<pluginName>')
        .description('Starts a webhook handler server that executes the specified plugin on commits made to the ' +
            'supplied project. The webgme server needs to be running and gmeConfig.webhooks.enable must be set ' +
            'to true. At start up the script will add a webhook to the project that will be removed when stopped.')
        .option('-p, --projectName [string]', 'Name of project to add the webhook to under "' + HOOK_ID + '".', '')
        .option('-o, --owner [string]', 'the owner of the project ]', gmeConfig.authentication.guestAccount)
        .option('-l, --leaveHook', 'Do not remove the webhook from the project after stop.', false)
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
            console.log('    $ node plugin_hook.js MinimalWorkingExample');
            console.log('    $ node plugin_hook.js MinimalWorkingExample -p 8080');
            console.log('    $ node plugin_hook.js PluginGenerator -j pluginConfig.json');
            console.log('    $ node plugin_hook.js MinimalWorkingExample -a /1/b');
            console.log('    $ node plugin_hook.js MinimalWorkingExample -s /1,/1/c,/d');
            console.log();
            console.log('  Plugin paths using ' + configDir + path.sep + 'config.' + env + '.js :');
            console.log();
            for (i = 0; i < gmeConfig.plugin.basePaths.length; i += 1) {
                console.log('    "' + gmeConfig.plugin.basePaths[i] + '"');
            }
        })
        .parse(process.argv);

    if (program.args.length < 1) {
        program.help();
    } else if (gmeConfig.webhooks.enable !== true) {
        logger.error('gmeConfig.webhooks.enable must be true in order to dispatch events from the webgme server!');
    } else {
        program.pluginId = program.args[0];
        handler = new PluginHandler(program);

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
