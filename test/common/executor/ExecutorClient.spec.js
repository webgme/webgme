/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('ExecutorClient', function () {
    'use strict';

    var rimraf = testFixture.rimraf,
        should = testFixture.should,
        expect = testFixture.expect,
        ExecutorClient = testFixture.ExecutorClient,
        executorClient,
        logger = testFixture.logger,
        server;

    before(function (done) {
        // we have to set the config here
        var gmeConfig = testFixture.getGmeConfig(),
            param = {};

        gmeConfig.executor.enable = true;

        param.serverPort = gmeConfig.server.port;
        param.httpsecure = gmeConfig.server.https.enable;

        rimraf('./test-tmp/executor', function (err) {
            if (err) {
                done(err);
                return;
            }
            server = testFixture.WebGME.standaloneServer(gmeConfig);
            server.start(function () {
                executorClient = new ExecutorClient(param);
                done();
            });
        });
    });

    after(function (done) {
        server.stop(function (err) {
            done(err);
        });
    });

    it('should get create url', function () {
        expect(typeof executorClient.getCreateURL === 'function').to.equal(true);
        expect(executorClient.getCreateURL()).to.contain('create');
        expect(executorClient.getCreateURL('1234567890abcdef')).to.contain('1234567890abcdef');
    });

    it('getWorkersInfo should return empty object', function (done) {
        executorClient.getWorkersInfo(function (err, res) {
            if (err) {
                done(err);
                return;
            }
            should.equal(typeof res, 'object');
            should.equal(Object.keys(res).length, 0);
            done();
        });
    });

    it('createJob followed by getInfo should return CREATED jobInfo', function (done) {
        var jobInfo = {
            hash: '77704f10a36aa4214f5b0095ba8099e729a10f46'
        };
        executorClient.createJob(jobInfo, function (err, res) {
            var createTime;
            if (err) {
                done(err);
                return;
            }
            should.equal(typeof res, 'object');
            createTime = res.createTime;
            should.equal(res.status, 'CREATED');
            should.equal(typeof createTime, 'string');
            executorClient.getInfo(jobInfo.hash, function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(typeof res, 'object');
                should.equal(res.createTime, createTime);
                should.equal(res.status, 'CREATED');
                jobInfo.status = 'FAILED';
                executorClient.updateJob(jobInfo, function (err) {
                    if (err) {
                        done(err);
                    }
                    done();
                });
            });
        });
    });

    it('getInfo for non-existing hash should return 404', function (done) {
        executorClient.getInfo('87704f10a36aa4214f5b0095ba8099e729a10f46', function (err, res) {
            if (err) {
                should.equal(err.message, 'Not Found');
                done();
                return;
            }
            logger.debug(res);
            done(new Error('should have failed with 404'));
        });
    });

    it('should get info by status', function (done) {
        executorClient.getInfoByStatus('CREATED', function (err, res) {
            if (err) {
                done(new Error(err));
                return;
            }
            expect(res).deep.equal({});
            done();
        });
    });

    it('getAllInfo should return 404', function (done) {
        executorClient.getAllInfo(function (err, res) {
            if (err) {
                should.equal(err.message, 'Not Found');
                done();
                return;
            }
            logger.debug(res);
            done(new Error('should have failed with 404'));
        });
    });

    it('updateJob with SUCCESS followed by getInfo should return SUCCESS in jobInfo', function (done) {
        var jobInfo = {
            hash: '88804f10a36aa4214f5b0095ba8099e729a10f46'
        };
        executorClient.createJob(jobInfo, function (err, res) {
            var createTime;
            if (err) {
                done(err);
                return;
            }
            should.equal(typeof res, 'object');
            createTime = res.createTime;
            should.equal(res.status, 'CREATED');
            should.equal(typeof createTime, 'string');
            jobInfo.status = 'SUCCESS';
            executorClient.updateJob(jobInfo, function (err) {
                if (err) {
                    done(err);
                }
                executorClient.getInfo(jobInfo.hash, function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(typeof res, 'object');
                    should.equal(res.createTime, createTime);
                    should.equal(res.status, 'SUCCESS');
                    done();
                });
            });
        });
    });
});