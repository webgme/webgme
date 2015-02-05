/**
 * @author pmeijer / https://github.com/pmeijer
 */
var FS = require("fs"),
    path = require("path");

var DEFAULT_CONFIG = "/*globals define*/\n" +
"\n" +
"define([], function () {\n" +
"    'use strict';\n" +
"    return {\n" +
"        port: 80,\n" +
"        autorecconnect: true,\n" +
"        reconndelay: 1000,\n" +
"        reconnamount: 1000,\n" +
"\n" +
"        //used by the server\n" +
"        debug: false,\n" +
"        loglevel: 1, // 5 = ALL, 4 = DEBUG, 3 = INFO, 2 = WARNING, 1 = ERROR, 0 = OFF\n" +
"        logfile: 'server.log',\n" +
"\n" +
"        mongoip: '127.0.0.1',\n" +
"        mongoport: 27017,\n" +
"        mongodatabase: 'multi',\n" +
"        //mongouser: TODO by default we do not expect mongodb to use authentication\n" +
"        //mongopwd: TODO by default we do not expect mongodb to use authentication\n" +
"        authentication: false,\n" +
"        httpsecure: false,\n" +
"        guest: false,\n" +
"        sessioncookieid: 'webgmeSid',\n" +
"        sessioncookiesecret: 'meWebGMEez',\n" +
"\n" +
"        paths: {\n" +
"               //executor: './src/middleware/executor'\n" +
"            },\n" +
"        pluginBasePaths: [\n" +
"               //'./src/plugin/coreplugins'\n" +
"            ],\n" +
"        decoratorpaths: [],\n" +
"        visualizerDescriptors: [],\n" +
"        addonBasePaths: ['./addon/core'],\n" +
"        rextrast: {},\n" +
"\n" +
"        // Available choices are: rand160Bits, asmSHA1, ZSSHA, plainSHA1 (default)\n" +
"        storageKeyType: 'asmSHA1'\n" +
"    };\n" +
"});"


var name = __dirname;
if (name.charAt(name.length - 1) !== '/') {
    name += '/';
}
name += "config.js";

FS.stat(name, function (err, stat) {
    if (err && err.errno === 34) {
        var file = DEFAULT_CONFIG;
        FS.writeFile(name, file, function (err) {
            if (err) {
                console.log("Error writing " + name);
                console.log(err);
            } else {
                console.log("Created " + name + " file, please edit it by hand");
            }
        });
    } else if (stat.isFile()) {
        console.log(name + " already exists, please modify or delete it by hand");
    } else {
        console.log("Unknown problem, please delete " + name + " and run again");
        console.log(err || stat);
    }
});