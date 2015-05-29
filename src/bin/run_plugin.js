/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var main;

main = function (argv, callback) {
    'use strict';
    var path = require('path'),
        gmeConfig = require(path.join(process.cwd(), 'config'));
    var webgme = require('../../webgme'),
        Command = require('commander').Command,
        logger = webgme.Logger.create('gme:bin:import', gmeConfig.bin.log),
        program = new Command();
    var storage,
        PluginCliManager = require('../../src/plugin/climanager'),
        Project = require('../../src/server/storage/userproject'),
        project,
        pluginConfig;

    callback = callback || function () {};

    webgme.addToRequireJsPaths(gmeConfig);

    program.option('-p, --project <name><mandatory>', 'Name of the project.');
    program.option('-b, --branch <name>', 'Name of the branch.', 'master');
    program.option('-j, --pluginConfigPath <name>',
        'Path to json file with plugin options that should be overwritten.',
        '');
    program.option('-n, --pluginName <name><mandatory>', 'Path to given plugin.');
    program.option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '');
    program.parse(argv);

    if (!(program.pluginName && program.project)) {
        program.help();
        logger.error('A project and pluginName must be specified.');
    }

    logger.info('Executing ' + program.pluginName + ' plugin on ' + program.project + ' in branch ' +
    program.branch + '.');

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
            logger.info('Database is opened.');
            return storage.openProject({projectName: program.project});
        })
        .then(function (dbProject) {
            logger.info('Project is opened.');
            project = new Project(dbProject, storage, logger, gmeConfig);
            return storage.getBranchHash({
                projectName: program.project,
                branchName: program.branch
            });
        })
        .then(function (commitHash) {
            logger.info('CommitHash obtained ', commitHash);
            var pluginManager = new PluginCliManager(project, logger, gmeConfig),
                context = {
                    activeNode: program.selectedObjID,
                    activeSelection: [], //TODO: Enable passing this from command line.
                    branchName: program.branch,
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