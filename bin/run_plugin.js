/*
 config object structure
 {
 "host": <string> shows the location of the webGME server //not really used by internally run plugins = NUII,
 "project": <string> show the name of the project,
 "token": <string> authentication token for REST API //NUII,
 "selected": <string> gives the URL / path of the selected object , you can convert URL to path,
 "commit": <string> the hash / URL part of the selected commit, you can convert URL part to hash,
 "root": <string> the hash / URL of the root object, you can convert URL to hash,
 "branch": <string> the name of the selected branch
 }
 */

var main = function(CONFIG) {
    // main code
    var requirejs = require("requirejs");
    var program = require('commander');
    var path = require('path');

    var requirejsBase = __dirname + '/..';

    requirejs.config({
        nodeRequire: require,
        baseUrl: requirejsBase
    });



    program.option('-c, --config <name>', 'Configuration file');
    program.option('-p, --project <name>', 'Name of the project.', 'PetriNet');
    program.option('-b, --branch <name>', 'Name of the branch.', 'master');
    program.option('-i, --pluginPath <name>', 'Path to given plugin.', '../interpreters/RootChildDuplicator/RootChildDuplicator');
    program.option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '');
    program.parse(process.argv);

    CONFIG = CONFIG || requirejs('bin/getconfig');

    var configFilename = program.config;
    if (configFilename) {
        // TODO: check if file exists and it is json
        var resolvedFilename = path.resolve(configFilename);
        console.log('Given configuration file: ', resolvedFilename);
        var commanlineConfig = require(resolvedFilename);

        // TODO: check if commanline config valid or not
        for (var key in commanlineConfig) {
            CONFIG[key] = commanlineConfig[key];
        }
    }

    if (CONFIG.plugins && CONFIG.plugins.basePath) {

        requirejs.config({
            nodeRequire: require,
            paths: {
                'plugins': path.relative(requirejsBase, path.resolve(CONFIG.plugins.basePath))
            },
            baseUrl: requirejsBase
        });
    }


    var projectName = program.project;
    var branch = program.branch;
    var pluginName = path.relative(requirejsBase, path.resolve(program.pluginPath));
    var selectedID = program.selectedObjID;

    // TODO: logging
    console.log('Given plugin : ', pluginName);

    var config = {
        "host": CONFIG.mongoip,
        "port": CONFIG.mongoport,
        "database": CONFIG.mongodatabase,
        "project": projectName,
        "token": "",
        "selected": selectedID,
        "commit": null, //"#668b3babcdf2ddcd7ba38b51acb62d63da859d90",
        //"root": ""
        "branchName": branch
    };

    var PluginManager = requirejs('plugin/PluginManagerBase');
    // TODO: move the downloader to PluginManager

    var Plugin = requirejs(pluginName);

    // FIXME: dependency does matter!
    var WebGME = require('../webgme');



    var Core = WebGME.core,
        Storage = WebGME.serverUserStorage;
    var storage = new Storage({'host':config.host, 'port':config.port, 'database':config.database});

    var plugins = {};
    plugins[pluginName] = Plugin;

    var pluginManager = new PluginManager(storage, Core, plugins);

    pluginManager.executePlugin(pluginName, config, function (err, result) {
        console.log(result);
    });
};

if (require.main === module) {
    main();
}