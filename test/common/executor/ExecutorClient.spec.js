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
        OutputInfo,
        executorClient,
        logger = testFixture.logger,
        Q = testFixture.Q,
        gmeConfig,
        server;

    before(function (done) {
        var param = {};
        gmeConfig = testFixture.getGmeConfig();
        OutputInfo = testFixture.requirejs('common/executor/OutputInfo');
        gmeConfig.executor.enable = true;

        param.serverPort = gmeConfig.server.port;
        param.httpsecure = false;
        param.logger = logger.fork('ExecutorClient');

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

    it('should create executorClient without a logger passed', function () {
        var noLoggerPassed = new ExecutorClient({
            serverPort: gmeConfig.server.port,
            httpsecure: false
        });

        expect(noLoggerPassed.logger).to.have.keys('debug', 'log', 'info', 'warn', 'error');
    });

    it('getInfoURL should be concatenation of origin and getRelativeInfoURL', function () {
        var relativeUrl = executorClient.getRelativeInfoURL('someHash');

        expect(executorClient.getInfoURL('someHash')).to.equal(executorClient.origin + relativeUrl);
    });

    it('getCreateURL  should be concatenation of origin and getRelativeCreateURL ', function () {
        var relativeUrl = executorClient.getRelativeCreateURL('someHash');

        expect(executorClient.getCreateURL('someHash')).to.equal(executorClient.origin + relativeUrl);
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

    it('getAllInfo should return and object with jobs', function (done) {
        executorClient.getAllInfo()
            .then(function(jobs) {
                expect(typeof jobs).to.equal('object');
                expect(jobs).to.not.equal(null);
                expect(jobs instanceof Array).to.equal(false);
            })
            .nodeify(done);
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

    it('should return Not Found for getOutput when job does not exist', function (done) {
        executorClient.getOutput('someHash')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.include('Not Found');
            })
            .nodeify(done);
    });

    it('should return Not Found when posting output to a job that does not exist', function (done) {
        var outputInfo = new OutputInfo('hashDoesNotExist', {
            output: 'hello world',
            outputNumber: 0
        });
        executorClient.sendOutput(outputInfo)
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.include('Not Found');
            })
            .nodeify(done);
    });

    it('should create a job and post and return output', function (done) {
        var jobHash = 'jobHashWithOutput1',
            outputInfo = new OutputInfo(jobHash, {
                output: 'hello world',
                outputNumber: 0
            });
        executorClient.createJob({hash: jobHash})
            .then(function (/*jobInfo*/) {
                return executorClient.sendOutput(outputInfo);
            })
            .then(function () {
                return executorClient.getOutput(jobHash);
            })
            .then(function (output) {
                expect(output.length).to.equal(1);
                expect(output[0]).to.deep.equal(outputInfo);
            })
            .nodeify(done);
    });

    it('should create a job and post and return outputs based on queries', function (done) {
        var jobHash = 'jobHashWithOutput2',
            outputInfo = new OutputInfo(jobHash, {
                output: 'hello world',
                outputNumber: 0
            }),
            outputInfo1 = new OutputInfo(jobHash, {
                output: 'hello world 1',
                outputNumber: 1
            }),
            outputInfo2 = new OutputInfo(jobHash, {
                output: 'hello world 2',
                outputNumber: 2
            });

        executorClient.createJob({hash: jobHash})
            .then(function (jobInfo) {
                expect(jobInfo.outputNumber).to.equal(null);
                return executorClient.sendOutput(outputInfo);
            })
            .then(function () {
                return executorClient.sendOutput(outputInfo1);
            })
            .then(function () {
                return executorClient.getInfo(jobHash);
            })
            .then(function (jobInfo) {
                expect(jobInfo.outputNumber).to.equal(1);
                return executorClient.getOutput(jobHash);
            })
            .then(function (output) {
                expect(output.length).to.equal(2);
                expect(output[0]).to.deep.equal(outputInfo);
                expect(output[1]).to.deep.equal(outputInfo1);

                return executorClient.sendOutput(outputInfo2);
            })
            .then(function () {
                return Q.allDone([
                    executorClient.getOutput(jobHash, 1, 3),
                    executorClient.getOutput(jobHash, 1, 1),
                    executorClient.getOutput(jobHash, null, 2),
                    executorClient.getOutput(jobHash, 0, 5),
                    executorClient.getOutput(jobHash, 2, 3),
                    ]);
            })
            .then(function (res) {
                expect(res[0].length).to.equal(2);
                expect(res[0][0]).to.deep.equal(outputInfo1);
                expect(res[0][1]).to.deep.equal(outputInfo2);

                expect(res[1].length).to.equal(0);

                expect(res[2].length).to.equal(2);
                expect(res[2][0]).to.deep.equal(outputInfo);
                expect(res[2][1]).to.deep.equal(outputInfo1);

                expect(res[3].length).to.equal(3);

                expect(res[4].length).to.equal(1);
                expect(res[4][0]).to.deep.equal(outputInfo2);
            })
            .nodeify(done);
    });

    it('createJob should return a "secret"', function (done) {
        var jobInfo = {
            hash: 'someHash'
        };
        executorClient.createJob(jobInfo)
            .then(function (res) {
                expect(typeof res.secret).to.equal('string');
            })
            .nodeify(done);
    });

    it('createJob twice should only return a "secret" once', function (done) {
        var jobInfo = {
            hash: 'someHash1'
        };

        executorClient.createJob(jobInfo)
            .then(function (res) {
                expect(typeof res.secret).to.equal('string');
                expect(typeof res._id).to.equal('undefined');
                return executorClient.createJob(jobInfo);
            })
            .then(function (res) {
                expect(typeof res.secret).to.equal('undefined');
            })
            .nodeify(done);
    });

    it('getInfo should not return the "secret" nor _id', function (done) {
        var jobInfo = {
            hash: 'someHash11'
        };
        executorClient.createJob(jobInfo)
            .then(function (res) {
                expect(typeof res.secret).to.equal('string');
                return executorClient.getInfo(jobInfo.hash);
            })
            .then(function (res) {
                expect(typeof res.hash).to.equal('string');
                expect(typeof res.secret).to.equal('undefined');
                expect(typeof res._id).to.equal('undefined');
            })
            .nodeify(done);
    });

    it('getAllInfo should not return the "secret"', function (done) {
        var jobInfo = {
            hash: 'someHash111'
        };
        executorClient.createJob(jobInfo)
            .then(function (res) {
                expect(typeof res.secret).to.equal('string');
                return executorClient.getAllInfo();
            })
            .then(function (res) {
                var hashes = Object.keys(res);
                expect(hashes.length > 0).to.equal(true);
                hashes.forEach(function (hash) {
                    expect(typeof res[hash].hash).to.equal('string');
                    expect(typeof res[hash].secret).to.equal('undefined');
                    expect(typeof res[hash]._id).to.equal('undefined');
                });
            })
            .nodeify(done);
    });

    it('cancelJob with correct secret should succeed ', function (done) {
        var jobInfo = {
            hash: 'someHash2'
        };

        executorClient.createJob(jobInfo)
            .then(function (res) {
                expect(typeof res.secret).to.equal('string');
                return executorClient.cancelJob(jobInfo, res.secret);
            })
            .then(function (res) {
                // The worker will be notified about the job to cancel,
                // kill the process and update the status to CANCELED.
                expect(res).to.equal('OK');
            })
            .nodeify(done);

    });

    it('cancelJob with wrong secret should return Forbidden', function (done) {
        var jobInfo = {
            hash: 'someHash3'
        };

        executorClient.createJob(jobInfo)
            .then(function (res) {
                expect(typeof res.secret).to.equal('string');
                return executorClient.cancelJob(jobInfo, 'wrongSecret4sure');
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('Forbidden');
            })
            .nodeify(done);
    });

    it('cancelJob with non existing hash should return Not Found', function (done) {
        executorClient.cancelJob('cancelJobTakesAHashToo', 'theSecret')
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('Not Found');
            })
            .nodeify(done);
    });
});
