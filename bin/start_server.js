var webgme = require('./../webgme'),
    requirejs = require('requirejs'),//TODO baseUrl should be set by webgme...
    PATH = require('path'),
    baseDir = requirejs.s.contexts._.config.baseUrl, //TODO ALWAYS check!!!
    clientBaseDir = baseDir+"/client";

var config = webgme.BaseConfig;
config.decoratorpaths.push(PATH.join(clientBaseDir,"/decorators"));
config.pluginBasePaths.push(PATH.join(baseDir,"/coreplugins"));

var myServer = new webgme.standaloneServer(config);
myServer.start();