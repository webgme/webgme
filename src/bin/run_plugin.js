/*jshint node: true*/
/**
 * @module Bin:RunPlugin
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var main;

main = function (argv, callback) {
    'use strict';
    var path = require('path'),
        configDir = path.join(process.cwd(), 'config'),
        gmeConfig = require(configDir),
        webgme = require('../../webgme'),
        MongoURI = require('mongo-uri'),
        Command = require('commander').Command,
        logger = webgme.Logger.create('gme:bin:runplugin', gmeConfig.bin.log),
        program = new Command(),
        params,
        storage,
        projectAccess,
        gmeAuth,
        STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
        PluginCliManager = webgme.PluginCliManager,
        project,
        projectName,
        pluginName,
        pluginConfig;

    callback = callback || function () {
        };

    function list(val) {
        return val.split(',');
    }

    webgme.addToRequireJsPaths(gmeConfig);

    program
        .version('0.14.0')
        .arguments('<pluginName> <projectName>')
        .option('-b, --branchName [string]', 'Name of the branch to load and save to.', 'master')
        .option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '')
        .option('-a, --activeSelection <webGMEIDs>', 'IDs of selected components (comma separated with no spaces).',
        list)
        .option('-n, --namespace',
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
            console.log('    $ node run_plugin.js MinimalWorkingExample TestProject -s /11231234/123458374');
            console.log('    $ node run_plugin.js MinimalWorkingExample TestProject -a /1,/1/123458374,/11231234');
            console.log();
            console.log('  Plugin paths using ' + configDir + path.sep + 'config.' + env + '.js :');
            console.log();
            for (i = 0; i < gmeConfig.plugin.basePaths.length; i += 1) {
                console.log('    "' + gmeConfig.plugin.basePaths[i] + '"');
            }
        })
        .parse(argv);

    if (program.args.length < 2) {
        callback('A project and pluginName must be specified.');
        program.help();
        return;
    }

    // this line throws a TypeError for invalid databaseConnectionString
    MongoURI.parse(program.mongoDatabaseUri);

    gmeConfig.mongo.uri = program.mongoDatabaseUri;

    pluginName = program.args[0];
    projectName = program.args[1];
    logger.info('Executing ' + pluginName + ' plugin on ' + projectName + ' in branch ' +
        program.branchName + '.');

    if (program.pluginConfigPath) {
        pluginConfig = require(path.resolve(program.pluginConfigPath));
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
            project = project_;

            return gmeAuth.getProjectAuthorizationByUserId(params.username, params.projectId);
        })
        .then(function (access) {
            logger.info('User has the following writes to the project: ', access);
            projectAccess = access;

            return project.getBranchHash(program.branchName);
        })
        .then(function (commitHash) {
            logger.info('CommitHash obtained ', commitHash);
            var pluginManager = new PluginCliManager(project, logger, gmeConfig),
                context = {
                    activeNode: program.selectedObjID,
                    activeSelection: program.activeSelection || [],
                    branchName: program.branchName,
                    commitHash: commitHash,
                    namespace: program.namespace
                };

            pluginManager.projectAccess = projectAccess;

            pluginManager.executePlugin(pluginName, pluginConfig, context,
                function (err, pluginResult) {
                    if (err) {
                        logger.error('execution stopped:', err, pluginResult);
                        callback(err, pluginResult);
                        process.exit(1);
                    } else {
                        logger.info('execution was successful:', err, pluginResult);
                        callback(err, pluginResult);
                        process.exit(0);
                    }
                }
            );
        })
        .catch(function (err) {
            logger.error('Could not open the project or branch', err.message);
            callback(err);
            process.exit(1);
        });
};

module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv);
}