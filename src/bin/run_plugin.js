/*jshint node: true*/
/**
 * @module Bin:RunPlugin
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';
var main;

main = function (argv, callback) {
    var path = require('path'),
        configDir = path.join(process.cwd(), 'config'),
        gmeConfig = require(configDir),
        webgme = require('../../webgme'),
        MongoURI = require('mongo-uri'),
        Command = require('commander').Command,
        logger = webgme.Logger.create('gme:bin:runplugin', gmeConfig.bin.log),
        Q = require('q'),
        program = new Command(),
        params,
        storage,
        projectAccess,
        gmeAuth,
        STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
        PluginCliManager = webgme.PluginCliManager,
        deferred = Q.defer(),
        project,
        projectName,
        pluginName,
        pluginConfig,
        err,
        pluginResult;

    function list(val) {
        return val ? val.split(',') : [];
    }

    webgme.addToRequireJsPaths(gmeConfig);
    program
        .version('2.2.0')
        .arguments('<pluginName> <projectName>')
        .option('-b, --branchName [string]', 'Name of the branch to load and save to.', 'master')
        .option('-c, --commitHash [string]', 'Commit hash to run from, if set branch will only be used for update.')
        .option('-a, --activeNode [string]', 'ID/Path to active node.', '')
        .option('-s, --activeSelection [string]', 'IDs/Paths of selected nodes (comma separated with no spaces).', list)
        .option('-n, --namespace [string]',
            'Namespace the plugin should run under.', '')
        .option('-m, --mongo-database-uri [url]',
            'URI of the MongoDB [default from the configuration file]', gmeConfig.mongo.uri)
        .option('-u, --user [string]', 'the user of the command [if not given we use the default user]',
            gmeConfig.authentication.guestAccount)
        .option('-o, --owner [string]', 'the owner of the project [by default, the user is the owner]')
        .option('-j, --pluginConfigPath [string]',
            'Path to json file with plugin options that should be overwritten.', '')

        .on('--help', function () {
            var i,
                env = process.env.NODE_ENV || 'default';
            console.log('  Examples:');
            console.log();
            console.log('    $ node run_plugin.js PluginGenerator TestProject');
            console.log('    $ node run_plugin.js PluginGenerator TestProject -b branch1 -j pluginConfig.json');
            console.log('    $ node run_plugin.js MinimalWorkingExample TestProject -a /1/b');
            console.log('    $ node run_plugin.js MinimalWorkingExample TestProject -s /1,/1/c,/d');
            console.log('    $ node run_plugin.js MinimalWorkingExample TestProject -c #123..');
            console.log('    $ node run_plugin.js MinimalWorkingExample TestProject -b b1 -c ' +
                '#def8861ca16237e6756ee22d27678d979bd2fcde');
            console.log();
            console.log('  Plugin paths using ' + configDir + path.sep + 'config.' + env + '.js :');
            console.log();
            for (i = 0; i < gmeConfig.plugin.basePaths.length; i += 1) {
                console.log('    "' + gmeConfig.plugin.basePaths[i] + '"');
            }
        })
        .parse(argv);

    if (program.args.length < 2) {
        program.help();
        deferred.reject(new Error('A project and pluginName must be specified.'));
        return deferred.promise.nodeify(callback);
    }

    // this line throws a TypeError for invalid databaseConnectionString
    MongoURI.parse(program.mongoDatabaseUri);

    gmeConfig.mongo.uri = program.mongoDatabaseUri;

    pluginName = program.args[0];
    projectName = program.args[1];
    logger.info('Executing ' + pluginName + ' plugin on ' + projectName + ' in branch ' +
        program.branchName + '.');

    if (program.pluginConfigPath) {
        try {
            pluginConfig = require(path.resolve(program.pluginConfigPath));
        } catch (e) {
            deferred.reject(e);
            return deferred.promise.nodeify(callback);
        }
    } else {
        pluginConfig = {};
    }

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth_) {
            gmeAuth = gmeAuth_;
            storage = webgme.getStorage(logger, gmeConfig, gmeAuth);
            return storage.openDatabase();
        })
        .then(function () {
            params = {
                projectId: '',
                username: program.user
            };
            logger.info('Database is opened.');

            if (program.owner) {
                params.projectId = program.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
            } else {
                params.projectId = program.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
            }

            return storage.openProject(params);
        })
        .then(function (project_) {
            logger.info('Project is opened.');
            var projectAuthParams = {
                entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT,
            };
            project = project_;

            if (program.user) {
                project.setUser(program.user);
            }
            return gmeAuth.authorizer.getAccessRights(params.username, params.projectId, projectAuthParams);
        })
        .then(function (access) {
            logger.info('User has the following rights to the project: ', access);
            projectAccess = access;

            return project.getBranchHash(program.branchName);
        })
        .then(function (commitHash) {
            var pluginManager = new PluginCliManager(project, logger, gmeConfig),
                context = {
                    activeNode: program.activeNode,
                    activeSelection: program.activeSelection || [],
                    branchName: program.branchName,
                    commitHash: program.commitHash || commitHash,
                    namespace: program.namespace
                },
                executeDeferred = Q.defer();

            pluginManager.projectAccess = projectAccess;

            pluginManager.executePlugin(pluginName, pluginConfig, context,
                function (err_, pluginResult_) {
                    err = err_;
                    pluginResult = pluginResult_;
                    executeDeferred.resolve();
                }
            );

            return executeDeferred.promise;
        })
        .catch(function (err_) {
            err = err_;
        })
        .finally(function () {
            logger.debug('Closing database connections...');
            return Q.allSettled([storage.closeDatabase(), gmeAuth.unload()])
                .finally(function () {
                    logger.debug('Closed.');
                    if (pluginResult) {
                        // The caller of this will have to check the result.success..
                        deferred.resolve(pluginResult);
                    } else if (err) {
                        deferred.reject(err instanceof Error ? err : new Error(err));
                    } else {
                        deferred.reject(new Error('No error nor any plugin result was returned!?'));
                    }
                });
        });

    return deferred.promise.nodeify(callback);
};

module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv)
        .then(function (pluginResult) {
            if (pluginResult.success === true) {
                console.info('execution was successful:', JSON.stringify(pluginResult, null, 2));
                process.exit(0);
            } else {
                console.error('execution failed:', JSON.stringify(pluginResult, null, 2));
                process.exit(1);
            }
        })
        .catch(function (err) {
            console.error('Could not open the project or branch', err);
            process.exit(1);
        });
}