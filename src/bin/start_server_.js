/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    webgme = require('../../webgme'),
    myServer;

webgme.addToRequireJsPaths(gmeConfig);

myServer = new webgme.standaloneServer_(gmeConfig);
myServer.start();