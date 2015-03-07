/*jshint node: true*/

var path = require('path'),
    gmeConfig = require('../../config'),
    webgme = require('../../webgme'),
    myServer;

webgme.addToRequireJsPaths(gmeConfig, path.join(__dirname, '..', '..'));

myServer = new webgme.standaloneServer(gmeConfig);
myServer.start();
console.log(gmeConfig);