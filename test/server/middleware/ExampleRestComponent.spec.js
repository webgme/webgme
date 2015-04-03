/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');
describe('ExampleRestComponent', function () {
    'use strict';

    var webGME = testFixture.WebGME,
        agent = testFixture.superagent.agent(),
        expect = testFixture.expect,
        server;

    afterEach(function (done) {
        if (server) {
            server.stop(done);
        } else {
            done();
        }
    });


    it('/rest/external/ExampleRestComponent should return 200', function (done) {
        var gmeConfig = testFixture.getGmeConfig();
        server = null;
        gmeConfig.rest.components.ExampleRestComponent = './middleware/ExampleRestComponent';
        server = webGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/external/ExampleRestComponent/').end(function (err, res) {
                expect(err).equal(null);
                expect(res.status).equal(200);
                done();
            });
        });
    });

    it('/rest/external/ExampleRestComponent should return 302 with auth and no guests', function (done) {
        var gmeConfig = testFixture.getGmeConfig();
        server = null;
        gmeConfig.authentication.enable = true;
        gmeConfig.authentication.allowGuests = false;
        gmeConfig.rest.components.ExampleRestComponent = './middleware/ExampleRestComponent';
        server = webGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/external/ExampleRestComponent/').end(function (err, res) {
                expect(err).equal(null);
                expect(res.status).equal(200);
                res.redirects.should.deep.equal([
                    'http://127.0.0.1:9001/login?redirect=%2Frest%2Fexternal%2FExampleRestComponent%2F'
                ]);
                done();
            });
        });
    });

    it('/rest/external/ExampleRestComponent should return 200 with auth and guests', function (done) {
        var gmeConfig = testFixture.getGmeConfig();
        server = null;
        gmeConfig.authentication.enable = true;
        gmeConfig.authentication.allowGuests = true;
        gmeConfig.rest.components.ExampleRestComponent = './middleware/ExampleRestComponent';
        server = webGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/external/ExampleRestComponent/').end(function (err, res) {
                expect(err).equal(null);
                expect(res.status).equal(200);
                done();
            });
        });
    });

    it('non existing component should raise error', function () {
        var gmeConfig = testFixture.getGmeConfig(),
            loadServer = function () {
                server = webGME.standaloneServer(gmeConfig);
            };
        server = null;
        gmeConfig.rest.components.doesNotExist = './middleware/doesNotExist';
        testFixture.WebGME.addToRequireJsPaths(gmeConfig);

        expect(loadServer).throw(Error);
    });
});