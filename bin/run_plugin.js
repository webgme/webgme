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
var fs = require('fs');
var path = require('path');
var requirejs = require("requirejs");
var program = require('commander');

var isGoodExtraAsset = function(name,filePath){
    try{
        var file = fs.readFileSync(filePath+'/'+name+'.js','utf-8');
        if(file === undefined || file === null){
            return false;
        } else {
            return true;
        }
    } catch(e){
        return false;
    }
};
var getPluginNames = function(basePaths){
    var names = []; //we add only the "*.js" files from the directories
    basePaths = basePaths || [];
    for(var i=0;i<basePaths.length;i++){
        var additional = fs.readdirSync(basePaths[i]);
        for(var j=0;j<additional.length;j++){
            if(names.indexOf(additional[j]) === -1){
                if(isGoodExtraAsset(additional[j],path.join(basePaths[i],additional[j]))){
                    names.push(additional[j]);
                }
            }
        }
    }
    return names;
};

var main = function (CONFIG) {
    // main code



    var requirejsBase = __dirname + '/..';

    requirejs.config({
        nodeRequire: require,
        baseUrl: path.resolve(requirejsBase)
    });


    program.option('-c, --config <name>', 'Configuration file');
    program.option('-p, --project <name>', 'Name of the project.', 'uj');
    program.option('-b, --branch <name>', 'Name of the branch.', 'master');
    program.option('-n, --pluginName <name><mandatory>', 'Path to given plugin.');
    program.option('-s, --selectedObjID <webGMEID>', 'ID to selected component.', '');
    program.parse(process.argv);

    if(program.pluginName === undefined){
        program.help();
    }

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

    //TODO setting the paths in requirejs according to our config...
    CONFIG.pluginBasePaths = CONFIG.pluginBasePaths || [];
    var pluginNames = getPluginNames(CONFIG.pluginBasePaths);

    //we go through every plugin and we check where we are able to find the main part of it so we can set the plugin/pluginName path according that in requirejs
    var pluginPaths = {};
    for(var i in pluginNames) {
        var found = false;
        for (var j = 0; j < CONFIG.pluginBasePaths.length; j++) {
            if (!found) {
                try {
                    var items = fs.readdirSync(CONFIG.pluginBasePaths[j]);
                    if(items.indexOf(pluginNames[i]) !== -1){
                        pluginPaths['plugin/' + pluginNames[i]] = path.relative(requirejsBase,path.resolve(CONFIG.pluginBasePaths[j]));
                        found = true;
                    }
                } catch (e) {
                    //do nothing as we will go on anyway
                    console.log(e);
                }
            } else {
                break;
            }
        }
    }

    pluginPaths['logManager'] = 'common/LogManager';

    requirejs.config({
        paths: pluginPaths
    });

    console.log(pluginPaths);

    var projectName = program.project;
    var branch = program.branch;
    var pluginName = program.pluginName;
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

    var Plugin = requirejs('plugin/'+pluginName+'/'+pluginName+'/'+pluginName);

    // FIXME: dependency does matter!
    var WebGME = require('../webgme');


    var Core = WebGME.core,
        Storage = WebGME.serverUserStorage;
    var storage = new Storage({'host': config.host, 'port': config.port, 'database': config.database});

    var plugins = {};
    plugins[pluginName] = Plugin;

    storage.openDatabase(function (err) {
        if (!err) {
            storage.openProject(config.project, function (err, project) {
                if (!err) {

                    var pluginManager = new PluginManager(project, Core, plugins);

                    pluginManager.executePlugin(pluginName, config, function (err, result) {
                        console.log(result);

                        project.closeProject();
                        storage.closeDatabase();
                    });
                } else {
                    console.error(err);
                }
            });
        } else {
            console.error(err);
        }
    });
};

if (require.main === module) {
    main();
}