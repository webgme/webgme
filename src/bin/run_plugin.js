/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var main;

main = function (argv, callback) {
    'use strict';
    var path = require('path'),
        gmeConfig = require(path.join(process.cwd(), 'config')),
        webgme = require('../../webgme'),
        MongoURI = require('mongo-uri'),
        Command = require('commander').Command,
        logger = webgme.Logger.create('gme:bin:runplugin', gmeConfig.bin.log),
        program = new Command(),
        storage,
        STORAGE_CONSTANTS = webgme.requirejs('common/storage/constants'),
        PluginCliManager = require('../../src/plugin/climanager'),
        Project = require('../../src/server/storage/userproject'),
        project,
        pluginConfig;

    callback = callback || function () {
        };

    webgme.addToRequireJsPaths(gmeConfig);

    program
        .version('0.2.0')
        .option('-p, --project-name [string]', 'project name [mandatory]')
        .option('-n, --pluginName [string]', 'Path to given plugin.')
        .option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '')
        .option('-m, --mongo-database-uri [url]',
        'URI of the MongoDB [default from the configuration file]', gmeConfig.mongo.uri)
        .option('-u, --user [string]', 'the user of the command [if not given we use the default user]',
        gmeConfig.authentication.guestAccount)
        .option('-o, --owner [string]', 'the owner of the project [by default, the user is the owner]')
        .option('-b, --branchName [string]', 'Name of the branch.', 'master')
        .option('-j, --pluginConfigPath [string]',
        'Path to json file with plugin options that should be overwritten.', '')
        .parse(argv);

    if (!(program.pluginName && program.projectName)) {
        program.help();
        logger.error('A project and pluginName must be specified.');
    }

    // this line throws a TypeError for invalid databaseConnectionString
    MongoURI.parse(program.mongoDatabaseUri);

    gmeConfig.mongo.uri = program.mongoDatabaseUri;

    logger.info('Executing ' + program.pluginName + ' plugin on ' + program.projectName + ' in branch ' +
        program.branchName + '.');

    if (program.pluginConfigPath) {
        pluginConfig = require(path.resolve(program.pluginConfigPath));
    } else {
        pluginConfig = {};
    }

    webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth) {
            storage = webgme.getStorage(logger, gmeConfig, gmeAuth);
            return storage.openDatabase();
        })
        .then(function () {
            var params = {
                projectId: '',
                username: program.user
            };
            logger.info('Database is opened.');

            if (program.owner) {
                params.projectId = program.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            } else {
                params.projectId = program.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + program.projectName;
            }

            return storage.openProject(params);
        })
        .then(function (dbProject) {
            logger.info('Project is opened.');
            project = new Project(dbProject, storage, logger, gmeConfig);
            return storage.getBranchHash({
                projectId: project.projectId,
                branchName: program.branchName
            });
        })
        .then(function (commitHash) {
            logger.info('CommitHash obtained ', commitHash);
            var pluginManager = new PluginCliManager(project, logger, gmeConfig),
                context = {
                    activeNode: program.selectedObjID,
                    activeSelection: [], //TODO: Enable passing this from command line.
                    branchName: program.branchName,
                    commitHash: commitHash,
                };

            pluginManager.executePlugin(program.pluginName, pluginConfig, context,
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
            logger.error('Could not open the project or branch', err);
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