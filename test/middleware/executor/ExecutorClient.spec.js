/*globals require, describe, it, before, after, WebGMEGlobal, WebGME*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

require('../../_globals.js');

describe('ExecutorClient', function () {
    'use strict';

    var requirejs = require('requirejs'),
        fs = require('fs'),
        should = require('chai').should(),
        ExecutorClient = requirejs('executor/ExecutorClient'),
        executorClient,
        server,
        serverBaseUrl;

    before(function (done) {
        // we have to set the config here
        var config = WebGMEGlobal.getConfig(),
            param = {};
        config.port = 9001;
        config.authentication = false;
        config.enableExecutor = true;

        param.serverPort = config.port;

        serverBaseUrl = 'http://127.0.0.1:' + config.port;

        server = WebGME.standaloneServer(config);
        server.start(function () {
            executorClient = new ExecutorClient(param);
            done();
        });
    });

    after(function (done) {
        server.stop(function(err) {
            try {
                fs.unlinkSync('test-tmp/jobList.nedb');
            } catch (error) {
                //console.log(error);
            }
            try {
                fs.unlinkSync('test-tmp/workerList.nedb');
            } catch (error) {
                //console.log(error);
            }
            done(err);
        });
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
            should.equal(err,404);
            done();
        });
    });

    it('getAllInfo should return 500', function (done) {
        executorClient.getAllInfo(function(err) {
            should.equal(err, 500);
            done();
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