/*globals require, describe, it, before, after, WebGMEGlobal, WebGME, setInterval, clearInterval*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

require('../../../_globals.js');

var requirejs = require('requirejs'),
    fs = require('fs'),
    childProcess = require('child_process'),
    should = require('chai').should(),
    ExecutorClient = requirejs('executor/ExecutorClient'),
    BlobServerClient = requirejs('blob/BlobServerClient'),
    blobClient,
    executorClient,
    server,
    nodeWorkerProcess,
    serverBaseUrl;

describe('NodeWorker', function () {
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
                    blobClient = new BlobServerClient(param);
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

    it('getWorkersInfo should return one worker', function (done) {
        executorClient.getWorkersInfo(function (err, res) {
            var keys = Object.keys(res);
            if (err) {
                done(err);
                return;
            }
            should.equal(typeof res, 'object', 'getWorkersInfo return object');
            should.equal(keys.length, 1, 'One worker attached');
            should.equal(res[keys[0]].jobs.length, 0, 'job list empty');
            done();
        });
    });

    it('createJob with cmd exit and args 0 should succeed', function (done) {
        var executorConfig = {
                cmd: 'exit',
                args: ['0'],
                resultArtifacts: [ { name: 'all', resultPatterns: [] } ]
            },
            killCnt = 0,
            artifact = blobClient.createArtifact('execFiles');

        artifact.addFile('executor_config.json', JSON.stringify(executorConfig), function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            artifact.save(function(err, hash) {
                if (err) {
                    done(err);
                    return;
                }
                executorClient.createJob({hash: hash}, function (err, jobInfo) {
                    var intervalId;
                    if (err) {
                        done(err);
                        return;
                    }
                    intervalId = setInterval(function(){
                        executorClient.getWorkersInfo(function (err, res) {
                            console.log(res);
                        });
                        executorClient.getInfo(jobInfo.hash, function (err, res) {
                            if (err) {
                                done(err);
                                return;
                            }
                            killCnt += 1;
                            if (killCnt > 15) {
                                done('Job Never finished!');
                                return;
                            }

                            if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                // The job is still running..
                                return;
                            }

                            clearInterval(intervalId);
                            should.equal(jobInfo, 'SUCCESS');
                            done();
                        });
                    }, 100);

                });
            });
        });
    });
});