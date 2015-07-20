/*jshint node: true*/
/**
 * @module Bin:StartServer
 * @author kecso / https://github.com/kecso
 */

'use strict';

var path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    webgme = require('../../webgme'),
    myServer;

webgme.addToRequireJsPaths(gmeConfig);

myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function (err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});