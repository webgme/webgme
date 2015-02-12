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
    agent = superagent.agent(),

    server,
    serverBaseUrl;

describe('standalone server', function () {
    'use strict';

    it('should start and stop and start and stop', function (done) {
        // we have to set the config here
        config = WebGMEGlobal.getConfig();
        config.port = 9001;

        server = WebGME.standaloneServer(config);
        server.start(function () {
            server.stop(function () {
                server.start(function () {
                    server.stop(done);
                });
            });
        });
    });

    describe('http server without authentication', function () {

        before(function (done) {
            // we have to set the config here
            config = WebGMEGlobal.getConfig();
            config.port = 9001;
            config.authentication = false;

            // TODO: would be nice to get this dynamically from server
            serverBaseUrl = 'http://127.0.0.1:' + config.port;

            server = WebGME.standaloneServer(config);
            server.start(done);
        });

        after(function (done) {
            server.stop(done);
        });

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
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });
    });


    describe('http server with authentication turned on', function () {
        var shouldAccessWithoutAuth,
            shouldRedirectToLogin;

        shouldAccessWithoutAuth = function (location, done) {
            agent.get(serverBaseUrl + location).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                // no redirects
                should.equal(res.status, 200);
                //should.equal(res.res.url, location); // FIXME: should server response set the url?
                if (res.headers.location) {
                    should.equal(res.headers.location, location);
                }
                if (res.res.url) {
                    should.equal(res.res.url, location);
                }

                should.equal(res.redirects.length, 0);
                done();
            });
        };

        shouldRedirectToLogin = function (location, done) {
            agent.get(serverBaseUrl + location).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                // redirected to login page
                should.equal(res.status, 200);
                should.equal(res.headers.location, '/login'); // FIXME: add redirect url
                should.not.equal(res.headers.location, location);
                should.equal(res.redirects.length, 1);

                done();
            });
        };

        before(function (done) {
            // we have to set the config here
            config = WebGMEGlobal.getConfig();
            config.port = 9001;
            config.authentication = true;

            // TODO: would be nice to get this dynamically from server
            serverBaseUrl = 'http://127.0.0.1:' + config.port;

            server = WebGME.standaloneServer(config);
            server.start(done);
        });

        after(function (done) {
            server.stop(done);
        });

        //it('should start with sign in', loginUser(agent));
        //it('should sign the user out', function(done) {
        //});

        // SHOULD ALL ACCESS TO
        it('should allow access to /lib/require/require.min.js', function (done) {
            shouldAccessWithoutAuth('/lib/require/require.min.js', done);
        });

        it('should allow access to /plugin/PluginResult.js', function (done) {
            shouldAccessWithoutAuth('/plugin/PluginResult.js', done);
        });

        it('should allow access to /common/storage/cache.js', function (done) {
            shouldAccessWithoutAuth('/common/storage/cache.js', done);
        });

        it('should allow access to /common/storage/client.js', function (done) {
            shouldAccessWithoutAuth('/common/storage/client.js', done);
        });

        it('should allow access to /middleware/blob/BlobClient.js', function (done) {
            shouldAccessWithoutAuth('/middleware/blob/BlobClient.js', done);
        });

        // SHOULD NOT ALL ACCESS AND SHOULD REDIRECT TO LOGIN PAGE
        it('should redirect to login for /', function (done) {
            shouldRedirectToLogin('/', done);
        });

        it('should redirect to login for /package.json', function (done) {
            shouldRedirectToLogin('/package.json', done);
        });


        it('should redirect to login for /file._js', function (done) {
            shouldRedirectToLogin('/file._js', done);
        });

        it('should redirect to login for /file.html', function (done) {
            shouldRedirectToLogin('/file.html', done);
        });

        it('should redirect to login for /file.gif', function (done) {
            shouldRedirectToLogin('/file.gif', done);
        });

        it('should redirect to login for /file.png', function (done) {
            shouldRedirectToLogin('/file.png', done);
        });

        it('should redirect to login for /file.bmp', function (done) {
            shouldRedirectToLogin('/file.bmp', done);
        });

        it('should redirect to login for /file.svg', function (done) {
            shouldRedirectToLogin('/file.svg', done);
        });

        it('should redirect to login for /file.json', function (done) {
            shouldRedirectToLogin('/file.json', done);
        });

        it('should redirect to login for /file.map', function (done) {
            shouldRedirectToLogin('/file.map', done);
        });

        it('should redirect to login for /listAllPlugins', function (done) {
            shouldRedirectToLogin('/listAllPlugins', done);
        });

        it('should redirect to login for /listAllDecorators', function (done) {
            shouldRedirectToLogin('/listAllDecorators', done);
        });

        it('should redirect to login for /listAllVisualizerDescriptors', function (done) {
            shouldRedirectToLogin('/listAllVisualizerDescriptors', done);
        });
    });
});
