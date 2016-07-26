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
                return testFixture.clearDatabase(gmeConfig);
            })
            .nodeify(done);
    });

    afterEach(function (done) {
        if (server) {
            server.stop(done);
        } else {
            done();
        }
    });

    it('should return 200 at rest/executor/worker/ with enableExecutor=true', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/worker/').end(function (err, res) {
                should.equal(res.status, 200, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
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
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
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
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should return 404 POST rest/executor/info', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/info').end(function (err, res) {
                should.equal(res.status, 404, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should return 404 GET rest/executor/info/', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.get(serverBaseUrl + '/rest/executor/info/').end(function (err, res) {
                should.equal(res.status, 404, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
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
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
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
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });


    it('should return 404 PUT rest/executor/worker', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.put(serverBaseUrl + '/rest/executor/worker').end(function (err, res) {
                should.equal(res.status, 404, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should return 404 PUT rest/executor/update', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.put(serverBaseUrl + '/rest/executor/update').end(function (err, res) {
                should.equal(res.status, 404, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
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
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should return 404 PUT rest/executor/create', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.put(serverBaseUrl + '/rest/executor/create').end(function (err, res) {
                should.equal(res.status, 404, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
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
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should return 200 POST rest/executor/create/some_hash', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/create/some_hash').end(function (err, res) {
                should.equal(res.status, 200, err);
                should.equal(typeof res.body.secret, 'string', res.body);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should return 200 POST rest/executor/create/some_hash but no secret on second create', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/create/some_hash').end(function (err, res) {
                should.equal(res.status, 200, err);
                should.equal(typeof res.body.secret, 'string', res.body);
                agent.post(serverBaseUrl + '/rest/executor/create/some_hash').end(function (err, res) {
                    should.equal(res.status, 200, err);
                    should.equal(typeof res.body.secret, 'undefined', res.body.secret);
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
                });
            });
        });
    });

    it('should return 404 POST rest/executor/cancel/hashDoesNotExist', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/cancel/hashDoesNotExist').end(function (err, res) {
                should.equal(res.status, 404, err);
                server.stop(function (err) {
                    server = null;
                    done(err);
                });
            });
        });
    });

    it('should return 403 POST rest/executor/cancel/existingHash with no body', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/create/existingHash').end(function (err, res) {
                should.equal(res.status, 200, err);
                agent.post(serverBaseUrl + '/rest/executor/cancel/existingHash').end(function (err, res) {
                    should.equal(res.status, 403, err);
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
                });
            });
        });
    });

    it('should return 403 POST rest/executor/cancel/existingHash with wrong secret', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/create/existingHash').end(function (err, res) {
                should.equal(res.status, 200, err);
                agent.post(serverBaseUrl + '/rest/executor/cancel/existingHash')
                    .send({secret: 'bla_bla'})
                    .end(function (err, res) {
                    should.equal(res.status, 403, err);
                    server.stop(function (err) {
                        server = null;
                        done(err);
                    });
                });
            });
        });
    });

    it('should return 200 POST rest/executor/cancel/existingHash with correct secret', function (done) {
        gmeConfig.executor.enable = true;
        server = testFixture.WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            var serverBaseUrl = server.getUrl();
            agent.post(serverBaseUrl + '/rest/executor/create/existingHash').end(function (err, res) {
                should.equal(res.status, 200, err);
                agent.post(serverBaseUrl + '/rest/executor/cancel/existingHash')
                    .send({secret: res.body.secret})
                    .end(function (err, res) {
                        should.equal(res.status, 200, err);
                        agent.get(serverBaseUrl + '/rest/executor/info/existingHash')
                            .end(function (err, res) {
                                should.equal(res.status, 200, err);
                                server.stop(function (err) {
                                    server = null;
                                    done(err);
                                });
                            });
                    });
            });
        });
    });
});