/*globals require, WebGMEGlobal*/
/*jshint mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('Executor', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        agent = testFixture.superagent.agent(),
        should = testFixture.should,
        fs = testFixture.fs,
        server,
        serverBaseUrl;

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
        var config = WebGMEGlobal.getConfig();
        config.port = 9005;
        config.enableExecutor = true;

        serverBaseUrl = 'http://127.0.0.1:' + config.port;

        server = testFixture.WebGME.standaloneServer(config);
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
        var config = WebGMEGlobal.getConfig();
        config.port = 9005;
        config.enableExecutor = false;

        serverBaseUrl = 'http://127.0.0.1:' + config.port;

        server = testFixture.WebGME.standaloneServer(config);
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