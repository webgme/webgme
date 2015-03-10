/*jshint node: true*/

var main;

main = function (argv) {
    'use strict';
    var gmeConfig = require('../../config'),
        webGme = require('../../webgme'),
        Command = require('commander').Command,
        program = new Command(),
        PATH = require('path'),
        configFilename,
        pluginConfigFilename,
        resolvedPluginConfigFilename,
        pluginConfigJson,
        projectName,
        branch,
        pluginName,
        activeNode,
        activeSelection = [], // TODO: get this as a list of IDs from command line
        pluginConfig = {};

    webGme.addToRequireJsPaths(gmeConfig);

    program.option('-p, --project <name>', 'Name of the project.', 'projectName');
    program.option('-b, --branch <name>', 'Name of the branch.', 'master');
    program.option('-j, --pluginConfigPath <name>',
        'Path to json file with plugin options that should be overwritten.',
        '');
    program.option('-n, --pluginName <name><mandatory>', 'Path to given plugin.');
    program.option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '');
    program.parse(argv);

    if (program.pluginName === undefined) {
        program.help();
    } else {
        //getting program options
        projectName = program.project;
        branch = program.branch;
        pluginName = program.pluginName;
        activeNode = program.selectedObjID;
        configFilename = program.config;
        pluginConfigFilename = program.pluginConfigPath;
    }

    console.log('executing ' + pluginName + ' plugin');

    if (pluginConfigFilename) {
        resolvedPluginConfigFilename = PATH.resolve(pluginConfigFilename);
        pluginConfigJson = require(resolvedPluginConfigFilename);
    } else {
        pluginConfigJson = {};
    }

    //setting plugin config
    pluginConfig.projectName = projectName;
    pluginConfig.branch = branch;
    pluginConfig.pluginName = pluginName;
    pluginConfig.activeNode = activeNode;
    pluginConfig.activeSelection = activeSelection;
    pluginConfig.pluginConfig = pluginConfigJson;

    webGme.runPlugin.main(gmeConfig, pluginConfig, function (err, result) {
        'use strict';
        if (err) {
            console.log('execution stopped:', err, result);
            process.exit(1);
        } else {
            console.log('execution was successful:', err, result);
            process.exit(0);
        }
    });
};

module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv);
}