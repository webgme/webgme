/*jshint node: true*/
/**
 * Script for generating configuration and server starting point for a DSML repository.
 * Run this script from the root of the DSML repository.
 *
 * With mongodo running at mongoip:mongoport, `node app.js` will start the webgme server.
 * Visit localhost:port from a browser.
 *
 * @author pmeijer / https://github.com/pmeijer
 */
var FS = require("fs"),
    path = require("path");

var DEFAULT_CONFIG = "/*globals define*/\n" +
"\n" +
"module.exports.getConfig = function () {\n" +
"    'use strict';\n" +
"    return {\n" +
"        port: 8888,\n" +
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
"        enableExecutor: false,\n" +
"\n" +
"        paths: {\n" +
"               //executor: './node_modules/webgme/src/middleware/executor'\n" +
"            },\n" +
"        pluginBasePaths: [\n" +
"               //'./node_modules/webgme/src/plugin/coreplugins'\n" +
"            ],\n" +
"        decoratorpaths: [],\n" +
"        visualizerDescriptors: [],\n" +
"        addonBasePaths: [],\n" +
"        rextrast: {},\n" +
"\n" +
"        // Available choices are: rand160Bits, asmSHA1, ZSSHA, plainSHA1 (default)\n" +
"        storageKeyType: 'asmSHA1'\n" +
"    };\n" +
"};\n"

var APP_JS = "/*globals WebGMEGlobal*/\n" +
"\n" +
"var config = require('./config.js').getConfig(),\n" +
"    webgme = require('webgme');\n" +
"\n" +
"// updating default configuration with ours\n" +
"WebGMEGlobal.setConfig(config);\n" +
"\n" +
"// standalone server uses WebGMEGlobal.getConfig() if no configuration defined\n" +
"var myServer = new webgme.standaloneServer();\n" +
"myServer.start();\n"

var baseDir = process.cwd(),
    configName,
    appName;
if (baseDir.charAt(baseDir.length - 1) !== '/') {
    baseDir += '/';
}
configName = baseDir + "config.js";
appName = baseDir + "app.js";

FS.stat(configName, function (err, stat) {
    if (err && err.errno === 34) {
        var file = DEFAULT_CONFIG;
        FS.writeFile(configName, file, function (err) {
            if (err) {
                console.log("Error writing " + configName);
                console.log(err);
            } else {
                console.log("Created " + configName + " file, please edit it by hand");
            }
        });
    } else if (stat.isFile()) {
        console.log(configName + " already exists, please modify or delete it by hand");
    } else {
        console.log("Unknown problem, please delete " + configName + " and run again");
        console.log(err || stat);
    }
});

FS.stat(appName, function (err, stat) {
    if (err && err.errno === 34) {
        var file = APP_JS;
        FS.writeFile(appName, file, function (err) {
            if (err) {
                console.log("Error writing " + appName);
                console.log(err);
            } else {
                console.log("Created " + appName + " file, start the sever by calling 'node app.js'.");
            }
        });
    } else if (stat.isFile()) {
        console.log(appName + " already exists.");
    } else {
        console.log("Unknown problem, please delete " + appName + " and run again");
        console.log(err || stat);
    }
});
