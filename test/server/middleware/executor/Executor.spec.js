/*jshint node: true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('ExecutorServer', function () {
    'use strict';

    var gmeConfig,
        agent = testFixture.superagent.agent(),
        should = testFixture.should,
        expect = testFixture.expect,
        Q = testFixture.Q,
        server;

    beforeEach(function (done) {
        Q.allDone([
            Q.ninvoke(testFixture, 'rimraf', './test-tmp/executor'),
            Q.ninvoke(testFixture, 'rimraf', './test-tmp/executor-tmp')
        ])
            .then(function () {
                gmeConfig = testFixture.getGmeConfig();
            })
            .nodeify(done);
    });

    afterEach(function (done) {
        server.stop(function (err) {
            setTimeout(function () {
                done(err);
            }, 300); // FIXME: This is really ugly and bad
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

    it('should return 200 GET rest/executor?status=SUCCESS', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor?status=SUCCESS').end(function (err, res) {
                should.equal(res.status, 200, err);
                expect(res.body).to.deep.equal({});
                done();
            });
        });
    });

    it('should return 405 GET rest/executor/cancel', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/cancel').end(function (err, res) {
                should.equal(res.status, 405, err);
                done();
            });
        });
    });

    it('should return 500 POST rest/executor/cancel', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/cancel').end(function (err, res) {
                should.equal(res.status, 500, err);
                done();
            });
        });
    });

    it('should return 500 POST rest/executor/cancel/some_hash', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/cancel/some_hash').end(function (err, res) {
                should.equal(res.status, 500, err);
                done();
            });
        });
    });


    it('should return 405 POST rest/executor/info', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/info').end(function (err, res) {
                should.equal(res.status, 405, err);
                done();
            });
        });
    });

    it('should return 500 GET rest/executor/info/', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/info/').end(function (err, res) {
                should.equal(res.status, 500, err);
                done();
            });
        });
    });

    it('should return 404 GET rest/executor/info/does_not_exist', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/info/does_not_exist').end(function (err, res) {
                should.equal(res.status, 404, err);
                done();
            });
        });
    });


    it('should return 404 GET rest/executor/unknown_command', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/unknown_command').end(function (err, res) {
                should.equal(res.status, 404, err);
                done();
            });
        });
    });


    it('should return 405 PUT rest/executor/worker', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.put(serverBaseUrl + '/rest/executor/worker').end(function (err, res) {
                should.equal(res.status, 405, err);
                done();
            });
        });
    });

    it('should return 405 PUT rest/executor/update', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.put(serverBaseUrl + '/rest/executor/update').end(function (err, res) {
                should.equal(res.status, 405, err);
                done();
            });
        });
    });

    it('should return 404 POST rest/executor/update/does_not_exist', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/update/does_not_exist').end(function (err, res) {
                should.equal(res.status, 404, err);
                done();
            });
        });
    });

    it('should return 405 PUT rest/executor/create', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.put(serverBaseUrl + '/rest/executor/create').end(function (err, res) {
                should.equal(res.status, 405, err);
                done();
            });
        });
    });

    it('should return 404 POST rest/executor/create', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/create').end(function (err, res) {
                should.equal(res.status, 404, err);
                done();
            });
        });
    });

    it('should return 200 POST rest/executor/create/new_element', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/create/new_element').end(function (err, res) {
                should.equal(res.status, 200, err);
                done();
            });
        });
    });
});