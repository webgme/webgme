var requirejs = require("requirejs");


requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/..",
    paths: {
        "logManager": "common/LogManager"
    }
});
requirejs(['bin/getconfig','server/standalone','path'],function(CONFIG,StandAloneServer,Path){

    CONFIG.basedir = __dirname + "/..";
    CONFIG.clientbasedir = Path.resolve(__dirname+'./../client');
    CONFIG.decoratorpaths.push(Path.join(CONFIG.clientbasedir,"/decorators"));
    CONFIG.intoutdir = Path.join(CONFIG.basedir,"/_poutputs_/");
    CONFIG.pluginBasePaths.push(Path.join(CONFIG.basedir,"/coreplugins"));

    var myServer = new StandAloneServer(CONFIG);
    myServer.start();
});
