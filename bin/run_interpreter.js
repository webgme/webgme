/*
 config object structure
 {
 "host": <string> shows the location of the webGME server //not really used by internally run interpreters = NUII,
 "project": <string> show the name of the project,
 "token": <string> authentication token for REST API //NUII,
 "selected": <string> gives the URL / path of the selected object , you can convert URL to path,
 "commit": <string> the hash / URL part of the selected commit, you can convert URL part to hash,
 "root": <string> the hash / URL of the root object, you can convert URL to hash,
 "branch": <string> the name of the selected branch
 }
 */
var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/..",
    paths: {
        "core":"core",
        "util": "util",
        "storage": "storage",
        "interpreter": "interpreter"
    }
});
requirejs(['core/core','storage/serveruserstorage'],
    function(Core,Storage){
        //somehow you should build up a config object for the interpreter
        //and get the name of the interpreter
        //now we start with a predefined ones

        var getContext = function(config,callback) {
            var context = { storage: new Storage({'host':config.host, 'port':config.port, 'database':config.database})};
            context.storage.openDatabase(function(err){
                    if (!err) {
                        context.storage.openProject(config.project,function(err,project){
                            if(!err){
                                context.storage = project;
                                context.core = new Core(context.storage,{corerel:2});
                                context.commitHash = config.commit;
                                context.selected = config.selected;
                                context.storage.loadObject(context.commitHash, function(err, commitObj) {
                                    if(!err && commitObj !== null && commitObj !== undefined){
                                        context.core.loadRoot(commitObj.root, function(err, rootNode) {
                                            if(!err){
                                                context.rootNode = rootNode;
                                                if(typeof context.selected === 'string'){
                                                    context.core.loadByPath(context.rootNode, context.selected, function (err, selectedNode) {
                                                        if(!err){
                                                            context.selectedNode = selectedNode;
                                                            callback(null,context);
                                                        } else {
                                                            callback("unable to load selected object",context);
                                                        }
                                                    });
                                                } else {
                                                    context.selectedNode = null;
                                                    callback(null,context);
                                                }
                                            } else {
                                                callback("unable to load root",context);
                                            }
                                        });
                                    } else {
                                        callback('cannot find commit',context);
                                    }

                                });
                            } else {
                                callback("cannot openproject",context);
                            }
                        });
                    } else {
                        callback("cannot open database",context);
                    }
            });
        };

        var getInterpreter = function(name){
            //return new WEBGMEINTERPRETER(); //TODO something more 'official'
            return {
                run: function(context){
                    console.log(context);
                }
            }
        };
        // TODO: read from file or command line arguments
        var config = {
                "host": "127.0.0.1",
                "port": 27017,
                "database": "multi",
                "project": "test",
                "token": "",
                "selected": "",
                "commit": "#8d77db9c181e4cf398a2f55f3a8a48b47a6e4b83"
                //"root": ""
                //"branch": "master"
            },
            interpreter = getInterpreter("");

        getContext(config,function(err,context){
            interpreter.run(context);
        });

    }
);