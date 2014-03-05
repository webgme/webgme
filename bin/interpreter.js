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
        var config = {
            "host": "",
            "project": "test",
            "token": "",
            "selected": "",
            "commit": "",
            "root": "",
            "branch": "master"
            },
            interpreterName = "test";


    }
);