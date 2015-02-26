/*globals require, describe, it, before, after, WebGMEGlobal, WebGME*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

require('../../../_globals.js');

var requirejs = require('requirejs'),
    fs = require('fs'),
    childProcess = require('child_process'),
    should = require('chai').should(),
    ExecutorClient = requirejs('executor/ExecutorClient'),
    executorClient,
    server,
    nodeWorkerProcess,
    serverBaseUrl;

describe('ExecutorClient', function () {
    'use strict';

    before(function (done) {
        // we have to set the config here
        var config = WebGMEGlobal.getConfig(),
            param = {},
            workerConfig = {};
        config.port = 9002;
        config.authentication = false;
        config.enableExecutor = true;

        param.serverPort = config.port;

        serverBaseUrl = 'http://127.0.0.1:' + config.port;
        workerConfig[serverBaseUrl] = {};

        server = WebGME.standaloneServer(config);

        fs.writeFile('test-tmp/worker_config.json', JSON.stringify(workerConfig), function (err) {
            if (err) {
                done(err);
            } else {

                server.start(function () {
                    executorClient = new ExecutorClient(param);
                    nodeWorkerProcess = childProcess.spawn('node',
                        ['node_worker.js', '../../../../test-tmp/worker_config.json', '../../../../test-tmp/executor-tmp'],
                        {cwd: 'src/middleware/executor/worker'});

                    nodeWorkerProcess.stdout.on('data', function (data) {
                        var str = data.toString();
                        if (str.indexOf('Connected to') > -1) {
                            done();
                        }
                    });
                });
            }
        });
    });

    after(function (done) {
        nodeWorkerProcess.kill('SIGINT');
        server.stop(done);
        try {
            fs.unlinkSync('test-tmp/jobList.nedb');
        } catch (err) {
            //console.log(err);
        }
        try {
            fs.unlinkSync('test-tmp/workerList.nedb');
        } catch (err) {
            //console.log(err);
        }
        try {
            fs.unlinkSync('test-tmp/worker_config.json');
        } catch (err) {
            //console.log(err);
        }
    });

    it('getWorkersInfo should return one worker with empty jobs', function (done) {
        executorClient.getWorkersInfo(function (err, res) {
            var keys = Object.keys(res);
            if (err) {
                done(err);
                return;
            }
            should.equal(typeof res, 'object', 'getWorkersInfo did not work');
            should.equal(keys.length, 1, 'No one worker attached!');
            should.equal(res[keys[0]].jobs.length, 0, 'job list not empty');
            done();
        });
    });

    //it('createJob followed by getInfo should return CREATED jobInfo', function (done) {
    //    var jobInfo = {
    //        hash: '77704f10a36aa4214f5b0095ba8099e729a10f46'
    //    };
    //    executorClient.createJob(jobInfo, function (err, res) {
    //        var createTime;
    //        if (err) {
    //            done(err);
    //            return;
    //        }
    //
    //        executorClient.getInfo(jobInfo.hash, function (err, res) {
    //            if (err) {
    //                done(err);
    //                return;
    //            }
    //            should.equal(typeof res, 'object');
    //            should.equal(res.createTime, createTime);
    //            should.equal(res.status, 'CREATED');
    //            done();
    //        });
    //    });
    //});
});