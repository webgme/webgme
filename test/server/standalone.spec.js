/*globals require, describe, it, before, after, WebGMEGlobal*/
/**
 * @author lattmann / https://github.com/lattmann
 */

require('../_globals.js');
var should = require('chai').should(),
    WebGME = require('../../webgme'),
    requirejs = require('requirejs'),
    config = WebGMEGlobal.getConfig(),

    http = require('http'),
    server,
    serverBaseUrl;

config.port = 8001;
WebGMEGlobal.setConfig(config);

describe('webgme http server', function () {
    'use strict';

    before(function () {
        server = WebGME.standaloneServer();
        server.start();

        // TODO: would be nice to get this dynamically from server
        serverBaseUrl = 'http://127.0.0.1:' + config.port;
    });

    after(function () {
        server.stop();
    });

    describe('/', function () {
        it('should return 200 /', function (done) {
            http.get(serverBaseUrl + '/', function (res) {
                should.equal(200, res.statusCode);
                done();
            });
        });

        it('should return 404 /doesnotexist', function (done) {
            http.get(serverBaseUrl + '/doesnotexist', function (res) {
                should.equal(404, res.statusCode);
                done();
            });
        });

        it('should return 404 /asdf', function (done) {
            http.get(serverBaseUrl + '/asdf', function (res) {
                should.equal(404, res.statusCode);
                done();
            });
        });

        it('should return 404 /doesnotexist.js', function (done) {
            http.get(serverBaseUrl + '/doesnotexist.js', function (res) {
                should.equal(404, res.statusCode);
                done();
            });
        });
    });

});
