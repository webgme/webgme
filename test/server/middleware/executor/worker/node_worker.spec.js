/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../../_globals.js');

describe('NodeWorker', function () {
        'use strict';

        var Q = testFixture.Q,
            path = testFixture.path,
            fs = testFixture.fs,
            httpProxy = require('http-proxy'),
            rimraf = testFixture.rimraf,
            childProcess = testFixture.childProcess,
            should = testFixture.should,
            ExecutorClient = testFixture.ExecutorClient,
            BlobClient = testFixture.BlobClient,
            executorClient,
            blobClient,
            server,
            nodeWorkerProcess,
            proxyServer,
            port;

        function startServer(gmeConfig, workerNonce, useHttpsProxy, callback) {
            proxyServer = null;
            port = null;

            Q.nfcall(rimraf, './test-tmp/blob-local-storage')
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

                    useHttpsProxy = useHttpsProxy === true;
                    if (useHttpsProxy) {
                        port = gmeConfig.server.port - 1;
                        proxyServer = new httpProxy.createServer({
                            target: {
                                host: 'localhost',
                                port: gmeConfig.server.port
                            },
                            ssl: {
                                key: fs.readFileSync(path.join(__dirname,
                                    '..',
                                    '..',
                                    '..',
                                    '..',
                                    'certificates',
                                    'sample-key.pem'), 'utf8'),
                                cert: fs.readFileSync(path.join(__dirname,
                                    '..',
                                    '..',
                                    '..',
                                    '..',
                                    'certificates',
                                    'sample-cert.pem'), 'utf8')
                            }
                        });

                    } else {
                        port = gmeConfig.server.port;
                    }

                    clientsParam.serverPort = port;
                    clientsParam.sessionId = 'testingNodeWorker';
                    clientsParam.server = '127.0.0.1';
                    clientsParam.httpsecure = useHttpsProxy;
                    clientsParam.executorNonce = gmeConfig.executor.nonce;

                    clientsParam.logger = testFixture.logger.fork('NodeWorker:ExecClient');
                    executorClient = new ExecutorClient(clientsParam);

                    clientsParam.logger = testFixture.logger.fork('NodeWorker:BlobClient');
                    blobClient = new BlobClient(clientsParam);
                    workerConfig[server.getUrl()] = workerNonce ? {executorNonce: workerNonce} : {};
                    return Q.nfcall(fs.writeFile, 'test-tmp/worker_config.json', JSON.stringify(workerConfig));
                })
                .then(function () {
                    if (proxyServer) {
                        var deferred = Q.defer();
                        proxyServer.listen(port, function (err) {
                            if (err) {
                                deferred.reject(err);
                            } else {
                                deferred.resolve();
                            }
                        });
                        return deferred.promise;
                    } else {
                        return;
                    }
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

                    // nodeWorkerProcess.on('close', function (code, signal) {
                    //     console.log('close', code, signal);
                    // });
                    // nodeWorkerProcess.on('error', function (err) {
                    //     console.log('error', err);
                    // });

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

                startServer(gmeConfig, null, false, function (err, result) {
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
                nodeWorkerProcess.on('close', function (/*code*/) {
                    setTimeout(function () {
                        server.stop(function (err) {
                            if (proxyServer) {
                                proxyServer.close(function (err1) {
                                    done(err || err1);
                                });
                            } else {
                                done(err);
                            }
                        });
                    }, 200); // Allow some time for initiated POST /worker
                });

                nodeWorkerProcess.kill('SIGINT');
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

                artifact.addFiles(filesToAdd)
                    .then(function () {
                        return artifact.save();
                    })
                    .then(function (hash) {
                        return executorClient.createJob({hash: hash});
                    })
                    .then(function (jobInfo) {
                        var intervalId = setInterval(function () {
                            executorClient.getInfo(jobInfo.hash, function (err, res) {
                                if (err) {
                                    clearInterval(intervalId);
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
                    })
                    .catch(done);
            });

            it('createJob and cancelJob when it is running and return with status CANCELED', function (done) {
                this.timeout(20000);
                var executorConfig = {
                        cmd: 'node',
                        args: ['longRunning.js'],
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig),
                        'longRunning.js': 'setTimeout(function (){ process.exit(1); }, 10000);'
                    };

                artifact.addFiles(filesToAdd)
                    .then(function () {
                        return artifact.save();
                    })
                    .then(function (hash) {
                        return executorClient.createJob({hash: hash});
                    })
                    .then(function (jobInfo) {
                        var secret = jobInfo.secret,
                            cancelSent = false,
                            intervalId;

                        intervalId = setInterval(function () {
                            executorClient.getInfo(jobInfo.hash, function (err, res) {
                                if (err) {
                                    clearInterval(intervalId);
                                    done(err);
                                    return;
                                }

                                if (res.status === 'CREATED') {
                                    // The job was created..
                                    return;
                                } else if (res.status === 'RUNNING') {
                                    if (cancelSent === false) {
                                        cancelSent = true;
                                        executorClient.cancelJob(jobInfo, secret, function (err) {
                                            if (err) {
                                                clearInterval(intervalId);
                                                done(err);
                                            }
                                        });
                                    }
                                    return;
                                }

                                clearInterval(intervalId);
                                should.equal(res.status, 'CANCELED');
                                done();
                            });
                        }, 100);
                    })
                    .catch(done);
            });

            it('createJob and cancelJob right away and return with status CANCELED', function (done) {
                this.timeout(20000);
                var executorConfig = {
                        cmd: 'node',
                        args: ['longRunning2.js'],
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig),
                        'longRunning2.js': 'setTimeout(function (){ process.exit(1); }, 10000);'
                    };

                artifact.addFiles(filesToAdd)
                    .then(function () {
                        return artifact.save();
                    })
                    .then(function (hash) {
                        return executorClient.createJob({hash: hash});
                    })
                    .then(function (jobInfo) {
                        var secret = jobInfo.secret;
                        var intervalId = setInterval(function () {
                            executorClient.getInfo(jobInfo.hash, function (err, res) {
                                if (err) {
                                    clearInterval(intervalId);
                                    done(err);
                                    return;
                                }

                                if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                    // The job was created or is running..
                                    return;
                                }

                                clearInterval(intervalId);
                                should.equal(res.status, 'CANCELED');
                                done();
                            });
                        }, 100);

                        return executorClient.cancelJob(jobInfo, secret);
                    })
                    .catch(done);
            });

            it('createJob and cancelJob after SUCCESS should not do anything', function (done) {
                this.timeout(20000);
                var executorConfig = {
                        cmd: 'node',
                        args: ['--version'],
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig)
                    };

                artifact.addFiles(filesToAdd)
                    .then(function () {
                        return artifact.save();
                    })
                    .then(function (hash) {
                        return executorClient.createJob({hash: hash});
                    })
                    .then(function (jobInfo) {
                        var intervalId,
                            secret = jobInfo.secret,
                            deferred = Q.defer();

                        intervalId = setInterval(function () {
                            executorClient.getInfo(jobInfo.hash)
                                .then(function (res) {
                                    if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                        // The job is still running..
                                        return;
                                    }

                                    clearInterval(intervalId);
                                    should.equal(res.status, 'SUCCESS');

                                    executorClient.cancelJob(jobInfo, secret)
                                        .then(function () {
                                            return executorClient.getInfo(jobInfo.hash);
                                        })
                                        .then(function (info) {
                                            should.equal(info.status, 'SUCCESS');
                                            deferred.resolve();
                                        })
                                        .catch(deferred.reject);
                                })
                                .catch(function (err) {
                                    clearInterval(intervalId);
                                    deferred.reject(err);
                                });
                        }, 100);

                        return deferred.promise;
                    })
                    .nodeify(done);
            });

            it('createJob and cancelJob and createJob and cancelJob', function (done) {
                this.timeout(20000);
                var executorConfig = {
                        cmd: 'node',
                        args: ['longRunning3.js'],
                        resultArtifacts: [{name: 'all', resultPatterns: []}]
                    },
                    artifact = blobClient.createArtifact('execFiles'),
                    filesToAdd = {
                        'executor_config.json': JSON.stringify(executorConfig),
                        'longRunning3.js': 'setTimeout(function (){ process.exit(1); }, 10000);'
                    };

                artifact.addFiles(filesToAdd)
                    .then(function () {
                        return artifact.save();
                    })
                    .then(function (hash) {
                        return executorClient.createJob({hash: hash});
                    })
                    .then(function (jobInfo) {
                        var deferred = Q.defer(),
                            intervalId;

                        intervalId = setInterval(function () {
                            executorClient.getInfo(jobInfo.hash, function (err, res) {
                                if (err) {
                                    clearInterval(intervalId);
                                    deferred.reject(err);
                                    return;
                                }

                                if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                    // The job was created or is running..
                                    return;
                                }

                                clearInterval(intervalId);
                                should.equal(res.status, 'CANCELED');
                                deferred.resolve(jobInfo);
                            });
                        }, 100);

                        executorClient.cancelJob(jobInfo, jobInfo.secret);

                        return deferred.promise;
                    })
                    .then(function (jobInfo) {
                        return executorClient.createJob({hash: jobInfo.hash});
                    })
                    .then(function (jobInfo) {
                        var deferred = Q.defer(),
                            intervalId;

                        intervalId = setInterval(function () {
                            executorClient.getInfo(jobInfo.hash, function (err, res) {
                                if (err) {
                                    clearInterval(intervalId);
                                    deferred.reject(err);
                                    return;
                                }

                                if (res.status === 'CREATED' || res.status === 'RUNNING') {
                                    // The job was created or is running..
                                    return;
                                }

                                clearInterval(intervalId);
                                should.equal(res.status, 'CANCELED');
                                deferred.resolve(jobInfo);
                            });
                        }, 100);

                        executorClient.cancelJob(jobInfo, jobInfo.secret);

                        return deferred.promise;
                    })
                    .nodeify(done);
            });
        });

        describe('[nonce match]', function () {
            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                this.timeout(5000);
                gmeConfig.executor.enable = true;
                gmeConfig.executor.nonce = 'aReallyLongSecret';

                startServer(gmeConfig, 'aReallyLongSecret', false, function (err, result) {
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
                nodeWorkerProcess.on('close', function (/*code*/) {
                    setTimeout(function () {
                        server.stop(function (err) {
                            if (proxyServer) {
                                proxyServer.close(function (err1) {
                                    done(err || err1);
                                });
                            } else {
                                done(err);
                            }
                        });
                    }, 200); // Allow some time for initiated POST /worker
                });

                nodeWorkerProcess.kill('SIGINT');
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
                                        clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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
                                clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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

                startServer(gmeConfig, 'notMatching', false, function (err, result) {
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
                nodeWorkerProcess.on('close', function (/*code*/) {
                    setTimeout(function () {
                        server.stop(function (err) {
                            if (proxyServer) {
                                proxyServer.close(function (err1) {
                                    done(err || err1);
                                });
                            } else {
                                done(err);
                            }
                        });
                    }, 200); // Allow some time for initiated POST /worker
                });

                nodeWorkerProcess.kill('SIGINT');
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

                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                startServer(gmeConfig, 'aReallyLongSecret', true, function (err, result) {
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
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = nodeTLSRejectUnauthorized;
                nodeWorkerProcess.on('close', function (/*code*/) {
                    setTimeout(function () {
                        server.stop(function (err) {
                            if (proxyServer) {
                                proxyServer.close(function (err1) {
                                    done(err || err1);
                                });
                            } else {
                                done(err);
                            }
                        });
                    }, 200); // Allow some time for initiated POST /worker
                });

                nodeWorkerProcess.kill('SIGINT');
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
                                        clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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
                                clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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
                                        clearInterval(intervalId);
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
