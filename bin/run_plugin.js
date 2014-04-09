var webGme = require('../webgme'),
    program = require('commander'),
    PATH = require('path'),
    configFilename,
    resolvedFilename,
    commandLineConfig,
    CONFIG = webGMEGlobal.getConfig(),
    projectName,
    branch,
    pluginName,
    selectedID,
    activeSelection = [], // TODO: get this as a list of IDs from command line
    pluginConfig = {};

program.option('-c, --config <name>', 'Configuration file');
program.option('-p, --project <name>', 'Name of the project.', 'uj');
program.option('-b, --branch <name>', 'Name of the branch.', 'master');
program.option('-n, --pluginName <name><mandatory>', 'Path to given plugin.');
program.option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '');
program.parse(process.argv);

if(program.pluginName === undefined){
    program.help();
} else {
    //getting program options
    projectName = program.project;
    branch = program.branch;
    pluginName = program.pluginName;
    selectedID = program.selectedObjID;
    configFilename = program.config;
}

console.log('executing '+pluginName+' plugin');

if (configFilename) {
    // TODO: check if file exists and it is json
    resolvedFilename = PATH.resolve(configFilename);
    commandLineConfig = require(resolvedFilename);

    webGMEGlobal.setConfig(commandLineConfig);
    // TODO: check if command line config valid or not
    // TODO: probably we should not overwrite the dictionary and array options
    for (var key in commandLineConfig) {
        CONFIG[key] = commandLineConfig[key];
    }
}

//setting plugin config
pluginConfig.projectName = projectName;
pluginConfig.branch = branch;
pluginConfig.pluginName = pluginName;
pluginConfig.selectedID = selectedID;
pluginConfig.activeSelection = activeSelection;

webGme.runPlugin.main(CONFIG,pluginConfig,function(err,result){
    console.log('execution stopped:',err,result);
});