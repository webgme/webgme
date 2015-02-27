/*globals require, describe, it, before, after, WebGMEGlobal, WebGME, setInterval, clearInterval*/
/*jshint node:true*/
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

    it('createJob with cmd node -h should return SUCCESS', function (done) {
        var executorConfig = {
                cmd: 'node',
                args: ['-h'],
                resultArtifacts: [ { name: 'all', resultPatterns: [] } ]
            },
            artifact = blobClient.createArtifact('execFiles'),
            filesToAdd = {
                'executor_config.json': JSON.stringify(executorConfig)
            };
        artifact.addFiles(filesToAdd, function (err, hashes) {
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
                        executorClient.getInfo(jobInfo.hash, function (err, res) {
                            if (err) {
                                done(err);
                                return;
                            }

                            if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                // The job is still running..
                                return;
                            }
                            clearInterval(intervalId);
                            should.equal(res.status, 'SUCCESS');
                            done();
                        });
                    }, 100);
                });
            });
        });
    });

    it('createJob with node fail.js should return FAILED_TO_EXECUTE', function (done) {
        var executorConfig = {
                cmd: 'node',
                args: ['fail.js'],
                resultArtifacts: [ { name: 'all', resultPatterns: [] } ]
            },
            artifact = blobClient.createArtifact('execFiles'),
            filesToAdd = {
                'executor_config.json': JSON.stringify(executorConfig),
                'fail.js': 'process.exit(1)'
            };
        artifact.addFiles(filesToAdd, function (err, hashes) {
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
                        executorClient.getInfo(jobInfo.hash, function (err, res) {
                            if (err) {
                                done(err);
                                return;
                            }

                            if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                // The job is still running..
                                return;
                            }
                            clearInterval(intervalId);
                            should.equal(res.status, 'FAILED_TO_EXECUTE');
                            done();
                        });
                    }, 100);
                });
            });
        });
    });

    it('createJob with invalid hash should return FAILED_TO_GET_SOURCE_METADATA', function (done) {
        executorClient.createJob({hash: '911'}, function (err, jobInfo) {
            var intervalId;
            if (err) {
                done(err);
                return;
            }
            intervalId = setInterval(function(){
                executorClient.getInfo(jobInfo.hash, function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }

                    if (res.status === 'CREATED' || res.status === 'RUNNING') {
                        // The job is still running..
                        return;
                    }
                    clearInterval(intervalId);
                    should.equal(res.status, 'FAILED_TO_GET_SOURCE_METADATA');
                    done();
                });
            }, 100);
        });
    });

    it('createJob with without executor_config.json should return FAILED_EXECUTOR_CONFIG', function (done) {
        var artifact = blobClient.createArtifact('execFiles'),
            filesToAdd = {
                'fail.js': 'process.exit(1)'
            };
        artifact.addFiles(filesToAdd, function (err, hashes) {
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
                        executorClient.getInfo(jobInfo.hash, function (err, res) {
                            if (err) {
                                done(err);
                                return;
                            }

                            if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                // The job is still running..
                                return;
                            }
                            clearInterval(intervalId);
                            should.equal(res.status, 'FAILED_EXECUTOR_CONFIG');
                            done();
                        });
                    }, 100);
                });
            });
        });
    });

    it('createJob with missing cmd should return FAILED_EXECUTOR_CONFIG', function (done) {
        var executorConfig = {
                ccmd: 'node',
                args: ['-h'],
                resultArtifacts: [ { name: 'all', resultPatterns: [] } ]
            },
            artifact = blobClient.createArtifact('execFiles'),
            filesToAdd = {
                'executor_config.json': JSON.stringify(executorConfig),
            };
        artifact.addFiles(filesToAdd, function (err, hashes) {
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
                        executorClient.getInfo(jobInfo.hash, function (err, res) {
                            if (err) {
                                done(err);
                                return;
                            }

                            if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                // The job is still running..
                                return;
                            }
                            clearInterval(intervalId);
                            should.equal(res.status, 'FAILED_EXECUTOR_CONFIG');
                            done();
                        });
                    }, 100);
                });
            });
        });
    });

    it('createJob with missing resultArtifacts should return FAILED_EXECUTOR_CONFIG', function (done) {
        var executorConfig = {
                cmd: 'node',
                args: ['-h']
            },
            artifact = blobClient.createArtifact('execFiles'),
            filesToAdd = {
                'executor_config.json': JSON.stringify(executorConfig),
            };
        artifact.addFiles(filesToAdd, function (err, hashes) {
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
                        executorClient.getInfo(jobInfo.hash, function (err, res) {
                            if (err) {
                                done(err);
                                return;
                            }

                            if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                // The job is still running..
                                return;
                            }
                            clearInterval(intervalId);
                            should.equal(res.status, 'FAILED_EXECUTOR_CONFIG');
                            done();
                        });
                    }, 100);
                });
            });
        });
    });
});