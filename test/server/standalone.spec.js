/*globals require, describe, it, before, after, WebGMEGlobal*/
/**
 * @author lattmann / https://github.com/lattmann
 */

require('../_globals.js');
var should = require('chai').should(),
    WebGME = require('../../webgme'),
    requirejs = require('requirejs'),
    config = WebGMEGlobal.getConfig(),

    superagent = require('superagent'),
    server,
    serverBaseUrl;

config.authentication = false; //we have to make sure that our current config doesn't affect the tests
config.port = 9001;

describe('webgme http server', function () {
    'use strict';

    before(function () {
        // we have to set the config here
        WebGMEGlobal.setConfig(config);

        server = WebGME.standaloneServer();
        server.start();

        // TODO: would be nice to get this dynamically from server
        serverBaseUrl = 'http://127.0.0.1:' + config.port;
    });

    after(function (done) {
        server.stop(done);
    });

    describe('/', function () {
        var agent = superagent.agent();

        //it('should start with sign in', loginUser(agent));
        //it('should sign the user out', function(done) {
        //});

        it('should return 200 /', function (done) {
            agent.get(serverBaseUrl + '/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 404 /doesnotexist', function (done) {
            agent.get(serverBaseUrl + '/doesnotexist').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /asdf', function (done) {
            agent.get(serverBaseUrl + '/asdf').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /doesnotexist.js', function (done) {
            agent.get(serverBaseUrl + '/doesnotexist.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });
    });
});


describe('server', function () {
    it('start and stop and start and stop', function (done) {
        // we have to set the config here
        WebGMEGlobal.setConfig(config);

        server = WebGME.standaloneServer();
        server.start();
        server.stop(function () {
            server.start();
            server.stop(done);
        });
    });
});