var requirejs = require("requirejs");


requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/..",
    paths: {
        "core":"core",
        "logManager": "common/LogManager",
        "util": "util",
        "storage": "storage",
        "user": "user",
        "config": 'config',
        "cli": 'cli',
        "bin": 'bin',
        "auth": 'auth',
        "coreclient": 'coreclient',
        "worker": 'worker'
    }
});
requirejs(['worker/constants','core/core'],
function(CONSTANT,Core){

    var storage = null,
        core = null,
        result = null,
        resultReady = false,
        resultRequested = false,
        error = null;
    //main message processing loop
    process.on('message',function(parameters){
        parameters = parameters || {};
        parameters.command = parameters.command || CONSTANT.workerCommands.getResult; //default command

        switch(parameters.command){
            case CONSTANT.workerCommands.initialize:
                storage = parameters.storage;
                if(resultReady === 'true'){
                    var e = error,
                        r = result;

                    core = null;
                    result = null;
                    resultReady = false;
                    resultRequested = false;
                    error = null;
                    process.send({type:CONSTANT.msgTypes.result,error:e,result:r});
                } else {
                    resultRequested = true;
                }
                break;
            case CONSTANT.workerCommands.getResult:

                break;
            default:
                process.send({error:'unknown command'});
        }
    });
});
