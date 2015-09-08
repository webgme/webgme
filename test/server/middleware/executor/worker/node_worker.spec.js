/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../../_globals.js');

describe('NodeWorker', function () {
        'use strict';

        var Q = testFixture.Q,
            fs = testFixture.fs,
            rimraf = testFixture.rimraf,
            childProcess = testFixture.childProcess,
            should = testFixture.should,
            ExecutorClient = testFixture.ExecutorClient,
            BlobClient = testFixture.BlobClient,
            executorClient,
            blobClient,
            server,
            nodeWorkerProcess;

        function startServer(gmeConfig, workerNonce, callback) {
            Q.nfcall(rimraf, './test-tmp/blob-local-storage')
                .then(function () {
                    return Q.nfcall(rimraf, './test-tmp/executor');
                })
                .then(function () {
                    return Q.nfcall(rimraf, './test-tmp/executor-tmp');
                })
                .then(function () {
                    return Q.nfcall(rimraf, './test-tmp/worker_config.json');
                })
                .then(function () {
                    server = testFixture.WebGME.standaloneServer(gmeConfig);
                    return Q.nfcall(server.start);
                })
                .then(function () {
                    var workerConfig = {},
                        clientsParam = {};

                    clientsParam.serverPort = gmeConfig.server.port;
                    clientsParam.sessionId = 'testingNodeWorker';
                    clientsParam.server = '127.0.0.1';
                    clientsParam.httpsecure = gmeConfig.server.https.enable;
                    clientsParam.executorNonce = gmeConfig.executor.nonce;

                    executorClient = new ExecutorClient(clientsParam);
                    blobClient = new BlobClient(clientsParam);
                    workerConfig[server.getUrl()] = workerNonce ? {executorNonce: workerNonce} : {};
                    return Q.nfcall(fs.writeFile, 'test-tmp/worker_config.json', JSON.stringify(workerConfig));
                })
                .then(function () {
                    var deferred = Q.defer(),
                        stderr = '',
                        stdout = '',
                        args = ['node_worker.js', '../../../../../test-tmp/worker_config.json',
                            '../../../../../test-tmp/executor-tmp'],
                        timeoutId = setTimeout(function () {
                            deferred.reject('Worker did not respond in time, stderr: ' + stderr + ' stdout: ' + stdout);
                        }, 3000);

                    nodeWorkerProcess = childProcess.spawn('node', args,
                        {cwd: 'src/server/middleware/executor/worker'});
                    nodeWorkerProcess.stderr.on('data', function (data) {
                        stderr += data.toString();
                    });
                    nodeWorkerProcess.stdout.on('data', function (data) {
                        var str = data.toString();
                        stdout += str;
                        if (str.indexOf('Connected to') > -1) {
                            clearTimeout(timeoutId);
                            deferred.resolve({connected: true, stdout: stdout, stderr: stderr});
                        } else if (str.indexOf('Server returned 403') > -1) {
                            clearTimeout(timeoutId);
                            deferred.resolve({connected: false, stdout: stdout, stderr: stderr});
                        } else if (str.indexOf('Error connecting to') > -1) {
                            clearTimeout(timeoutId);
                            deferred.resolve({connected: false, stdout: stdout, stderr: stderr});
                        }
                    });
                    return deferred.promise;
                })
                .catch(function (err) {
                    throw new Error(err);
                })
                .nodeify(callback);
        }

        describe('[nonce not set]', function () {

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                this.timeout(5000);
                gmeConfig.executor.enable = true;
                gmeConfig.executor.nonce = null;
                gmeConfig.server.https.enable = false;

                startServer(gmeConfig, null, function (err, result) {
                    if (err) {
                        done(err);
                        return;
                    }
                    if (result.connected) {
                        done();
                    } else {
                        done(new Error('Worker did not attach, stdout: ' + result.stdout + ', stderr: ' +
                            result.stderr));
                    }
                });
            });

            after(function (done) {
                nodeWorkerProcess.kill('SIGINT');
                server.stop(function (err) {
                    done(err);
                });
            });

            it('getWorkersInfo should return one worker', function (done) {
                executorClient.getWorkersInfo(function (err, res) {
                    var keys = Object.keys(res);
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(typeof res, 'object', 'getWorkersInfo return object');
                    should.equal(keys.length > 0, true, 'workers attached');
                    done();
                });
            });

            it('createJob with cmd node -h should return SUCCESS', function (done) {
                this.timeout(20000);
                var executorConfig = {
                        cmd: 'node',
                        args: ['-h'],
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig)
                    };
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
        });

        describe('[nonce match]', function () {
            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                this.timeout(5000);
                gmeConfig.executor.enable = true;
                gmeConfig.executor.nonce = 'aReallyLongSecret';
                gmeConfig.server.https.enable = false;

                startServer(gmeConfig, 'aReallyLongSecret', function (err, result) {
                    if (err) {
                        done(err);
                        return;
                    }
                    if (result.connected) {
                        done();
                    } else {
                        done(new Error('Worker did not attach, stdout: ' + result.stdout + ', stderr: ' +
                        result.stderr));
                    }
                });
            });

            after(function (done) {
                nodeWorkerProcess.kill('SIGINT');
                server.stop(function (err) {
                    done(err);
                });
            });

            it('getWorkersInfo should return at least one worker', function (done) {
                executorClient.getWorkersInfo(function (err, res) {
                    var keys = Object.keys(res);
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(typeof res, 'object', 'getWorkersInfo return object');
                    should.equal(keys.length > 0, true, 'worker attached');
                    done();
                });
            });

            it('createJob with cmd node -h should return SUCCESS', function (done) {
                var executorConfig = {
                        cmd: 'node',
                        args: ['-h'],
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig)
                    };
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig),
                        'fail.js': 'process.exit(1)'
                    };
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                        done(new Error(err));
                        return;
                    }
                    intervalId = setInterval(function () {
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
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig),
                    };
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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

        describe('[nonce not matching]', function () {
            it('worker should not attach', function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                this.timeout(5000);
                gmeConfig.executor.enable = true;
                gmeConfig.executor.nonce = 'aReallyLongSecret';
                gmeConfig.server.https.enable = false;

                startServer(gmeConfig, 'notMatching', function (err, result) {
                    if (err) {
                        done(err);
                        return;
                    }
                    if (result.connected) {
                        done(new Error('Worker did attach when should not, stdout: ' + result.stdout + ', stderr: ' +
                        result.stderr));
                    } else {
                        done();
                    }
                });
            });

            after(function (done) {
                nodeWorkerProcess.kill('SIGINT');
                server.stop(function (err) {
                    done(err);
                });
            });
        });

        describe('[https nonce match]', function () {
            var nodeTLSRejectUnauthorized;

            nodeTLSRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                this.timeout(5000);
                gmeConfig.executor.enable = true;
                gmeConfig.executor.nonce = 'aReallyLongSecret';
                gmeConfig.server.https.enable = true;

                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                startServer(gmeConfig, 'aReallyLongSecret', function (err, result) {
                    if (err) {
                        done(err);
                        return;
                    }
                    if (result.connected) {
                        done();
                    } else {
                        done(new Error('Worker did not attach, stdout: ' + result.stdout + ', stderr: ' +
                        result.stderr));
                    }
                });
            });

            after(function (done) {
                nodeWorkerProcess.kill('SIGINT');
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = nodeTLSRejectUnauthorized;
                server.stop(function (err) {
                    done(err);
                });
            });

            it('getWorkersInfo should return at least one worker', function (done) {
                executorClient.getWorkersInfo(function (err, res) {
                    var keys = Object.keys(res);
                    if (err) {
                        done(err);
                        return;
                    }
                    should.equal(typeof res, 'object', 'getWorkersInfo return object');
                    should.equal(keys.length > 0, true, 'worker attached');
                    done();
                });
            });

            it('createJob with cmd node -h should return SUCCESS', function (done) {
                var executorConfig = {
                        cmd: 'node',
                        args: ['-h'],
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig)
                    };
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig),
                        'fail.js': 'process.exit(1)'
                    };
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                        done(new Error(err));
                        return;
                    }
                    intervalId = setInterval(function () {
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
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig),
                    };
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
                artifact.addFiles(filesToAdd, function (err/*, hashes*/) {
                    if (err) {
                        done(err);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            done(err);
                            return;
                        }
                        executorClient.createJob({hash: hash}, function (err, jobInfo) {
                            var intervalId;
                            if (err) {
                                done(new Error(err));
                                return;
                            }
                            intervalId = setInterval(function () {
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
    }
);