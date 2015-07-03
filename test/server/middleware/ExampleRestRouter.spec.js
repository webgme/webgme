/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../_globals.js');
describe('ExampleRestRouter', function () {
    'use strict';

    var webGME = testFixture.WebGME,
        agent = testFixture.superagent.agent(),
        expect = testFixture.expect,
        server;

    describe('uses server', function () {
        afterEach(function (done) {
            server.stop(done);
        });

        it('/rest/external/ExampleRestRouter/getExample should return 200', function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            server = null;
            gmeConfig.rest.components.ExampleRestRouter = './middleware/ExampleRestRouter';
            server = webGME.standaloneServer(gmeConfig);
            server.start(function () {
                var serverBaseUrl = server.getUrl();
                agent.get(serverBaseUrl + '/rest/external/ExampleRestRouter/getExample').end(function (err, res) {
                    expect(err).equal(null);
                    expect(res.status).equal(200);
                    done();
                });
            });
        });

        it.skip('/rest/external/ExampleRestRouter/getExample should return 302 with auth and no guests', function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            server = null;
            gmeConfig.authentication.enable = true;
            gmeConfig.authentication.allowGuests = false;
            gmeConfig.rest.components.ExampleRestRouter = './middleware/ExampleRestRouter';
            server = webGME.standaloneServer(gmeConfig);
            server.start(function () {
                var serverBaseUrl = server.getUrl();
                agent.get(serverBaseUrl + '/rest/external/ExampleRestRouter/getExample').end(function (err, res) {
                    expect(err).equal(null);
                    expect(res.status).equal(401);
                    done();
                });
            });
        });

        it('/rest/external/ExampleRestRouter should return 200 with auth and guests', function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            server = null;
            gmeConfig.authentication.enable = true;
            gmeConfig.authentication.allowGuests = true;
            gmeConfig.rest.components.ExampleRestRouter = './middleware/ExampleRestRouter';
            server = webGME.standaloneServer(gmeConfig);
            server.start(function () {
                var serverBaseUrl = server.getUrl();
                agent.get(serverBaseUrl + '/rest/external/ExampleRestRouter/getExample').end(function (err, res) {
                    expect(err).equal(null);
                    expect(res.status).equal(200);
                    done();
                });
            });
        });


        it('PATCH /rest/external/ExampleRestRouter/patchExample should return 200', function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            server = null;
            gmeConfig.rest.components.ExampleRestRouter = './middleware/ExampleRestRouter';
            server = webGME.standaloneServer(gmeConfig);
            server.start(function () {
                var serverBaseUrl = server.getUrl();
                agent.patch(serverBaseUrl + '/rest/external/ExampleRestRouter/patchExample').end(function (err, res) {
                    expect(err).equal(null);
                    expect(res.status).equal(200);
                    done();
                });
            });
        });

        it('POST /rest/external/ExampleRestRouter/postExample should return 204', function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            server = null;
            gmeConfig.rest.components.ExampleRestRouter = './middleware/ExampleRestRouter';
            server = webGME.standaloneServer(gmeConfig);
            server.start(function () {
                var serverBaseUrl = server.getUrl();
                agent.post(serverBaseUrl + '/rest/external/ExampleRestRouter/postExample')
                    .send({data: 42})
                    .end(function (err, res) {
                    expect(err).equal(null);
                    expect(res.status).equal(201);
                    done();
                });
            });
        });

        it('DELETE /rest/external/ExampleRestRouter/deleteExample should return 200', function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            server = null;
            gmeConfig.rest.components.ExampleRestRouter = './middleware/ExampleRestRouter';
            server = webGME.standaloneServer(gmeConfig);
            server.start(function () {
                var serverBaseUrl = server.getUrl();
                agent.del(serverBaseUrl + '/rest/external/ExampleRestRouter/deleteExample').end(function (err, res) {
                    expect(err).equal(null);
                    expect(res.status).equal(204);
                    done();
                });
            });
        });

        it('should return 500 /rest/external/ExampleRestRouter/error', function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            server = null;
            gmeConfig.rest.components.ExampleRestRouter = './middleware/ExampleRestRouter';
            server = webGME.standaloneServer(gmeConfig);
            server.start(function () {
                var serverBaseUrl = server.getUrl();
                agent.get(serverBaseUrl + '/rest/external/ExampleRestRouter/error').end(function (err, res) {
                    expect(res.status).equal(500);
                    done();
                });
            });
        });
    });
});