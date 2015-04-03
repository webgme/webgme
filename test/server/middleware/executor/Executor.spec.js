/*globals require, WebGMEGlobal*/
/*jshint mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('Executor', function () {
    'use strict';

    var gmeConfig,
        agent = testFixture.superagent.agent(),
        should = testFixture.should,
        rimraf = testFixture.rimraf,
        server;

    beforeEach(function (done) {
        rimraf('./test-tmp/executor', function (err) {
            if (err) {
                done(err);
                return;
            }
            gmeConfig = testFixture.getGmeConfig();
            done();
        });
    });

    afterEach(function (done) {
        server.stop(function (err) {
            done(err);
        });
    });

    it('should return 200 at rest/executor/worker/ with enableExecutor=true', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/worker/').end(function (err, res) {
                should.equal(res.status, 200, err);
                done();
            });
        });
    });

    it('should return 404 at rest/executor/worker/ with enableExecutor=false', function (done) {
        gmeConfig.executor.enable = false;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/worker/').end(function (err, res) {
                should.equal(res.status, 404, err);
                done();
            });
        });
    });
});