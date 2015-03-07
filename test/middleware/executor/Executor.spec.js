/*globals require, WebGMEGlobal*/
/*jshint mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('Executor', function () {
    'use strict';

    var gmeConfig,
        agent = testFixture.superagent.agent(),
        should = testFixture.should,
        fs = testFixture.fs,
        server,
        serverBaseUrl;

    beforeEach(function () {
        gmeConfig = testFixture.getGmeConfig();
        gmeConfig.server.port = 9006;
        serverBaseUrl = 'http://127.0.0.1:' + gmeConfig.server.port;
    });

    afterEach(function (done) {
        server.stop(function (err) {
            try {
                fs.unlinkSync('test-tmp/jobList.nedb');
            } catch (error) {
                //console.log(err);
            }
            try {
                fs.unlinkSync('test-tmp/workerList.nedb');
            } catch (error) {
                //console.log(err);
            }
            done(err);
        });
    });

    it('should return 200 at rest/executor/worker/ with enableExecutor=true', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            agent.get(serverBaseUrl + '/rest/executor/worker/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });
    });

    it('should return 404 at rest/executor/worker/ with enableExecutor=false', function (done) {
        gmeConfig.executor.enable = false;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            agent.get(serverBaseUrl + '/rest/executor/worker/').end(function (err, res) {
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