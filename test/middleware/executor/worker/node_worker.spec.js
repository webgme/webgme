/*globals WebGMEGlobal*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('NodeWorker', function () {
    'use strict';

    var fs = testFixture.fs,
        rimraf = testFixture.rimraf,
        childProcess = testFixture.childProcess,
        should = testFixture.should,
        ExecutorClient = testFixture.ExecutorClient,
        BlobClient = testFixture.BlobClient,
        blobClient,
        executorClient,
        server,
        nodeWorkerProcess,
        serverBaseUrl;

    describe('[nonce not set]', function () {
        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig(),
                clientsParam = {},
                workerConfig = {};
            config.port = 9005;
            config.authentication = false;
            config.enableExecutor = true;
            config.executorNonce = null;
            config.httpsecure = false;

            clientsParam.serverPort = config.port;
            clientsParam.sessionId = 'testingNodeWorker';
            clientsParam.httpsecure = config.httpsecure;
            clientsParam.server = '127.0.0.1';
            serverBaseUrl = 'http://127.0.0.1:' + config.port;
            workerConfig[serverBaseUrl] = {};

            server = testFixture.WebGME.standaloneServer(config);

            fs.writeFile('test-tmp/worker_config.json', JSON.stringify(workerConfig), function (err) {
                if (err) {
                    done(err);
                } else {

                    server.start(function () {
                        executorClient = new ExecutorClient(clientsParam);
                        blobClient = new BlobClient(clientsParam);
                        nodeWorkerProcess = childProcess.spawn('node',
                            ['node_worker.js',
                                '../../../../test-tmp/worker_config.json',
                                '../../../../test-tmp/executor-tmp'],
                            {cwd: 'src/middleware/executor/worker'});

                        nodeWorkerProcess.stdout.on('data', function (data) {
                            var str = data.toString();
                            if (str.indexOf('Connected to') > -1) {
                                done();
                                return;
                            }

                            if (str.indexOf('Error connecting to') > -1) {
                                done(new Error(str));
                                return;
                            }

                            //console.log(str);
                        });
                    });
                }
            });
        });

        after(function (done) {
            nodeWorkerProcess.kill('SIGINT');
            server.stop(function (err) {
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
                if (err) {
                    done(err);
                } else {
                    done();
                }
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
    });

    describe('[nonce match]', function () {
        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig(),
                clientsParam = {},
                workerConfig = {};
            config.port = 9005;
            config.authentication = false;
            config.enableExecutor = true;
            config.httpsecure = false;
            config.executorNonce = 'aReallyLongSecret';
            WebGMEGlobal.setConfig({executorNonce: 'aReallyLongSecret'});
            clientsParam.serverPort = config.port;
            clientsParam.sessionId = 'testingNodeWorker';
            clientsParam.httpsecure = config.httpsecure;
            clientsParam.server = '127.0.0.1';
            serverBaseUrl = 'http://127.0.0.1:' + config.port;
            workerConfig[serverBaseUrl] = {executorNonce: 'aReallyLongSecret'};

            server = testFixture.WebGME.standaloneServer(config);

            fs.writeFile('test-tmp/worker_config.json', JSON.stringify(workerConfig), function (err) {
                if (err) {
                    done(err);
                } else {

                    server.start(function () {
                        executorClient = new ExecutorClient(clientsParam);
                        blobClient = new BlobClient(clientsParam);
                        nodeWorkerProcess = childProcess.spawn('node',
                            ['node_worker.js',
                                '../../../../test-tmp/worker_config.json',
                                '../../../../test-tmp/executor-tmp'],
                            {cwd: 'src/middleware/executor/worker'});

                        nodeWorkerProcess.stdout.on('data', function (data) {
                            var str = data.toString();
                            if (str.indexOf('Connected to') > -1) {
                                done();
                                return;
                            }

                            if (str.indexOf('Error connecting to') > -1) {
                                done(new Error(str));
                                return;
                            }

                            //console.log(str);
                        });
                    });
                }
            });
        });

        beforeEach(function (done) {
            rimraf('./test-tmp/blob-storage', function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });

        after(function (done) {
            nodeWorkerProcess.kill('SIGINT');
            server.stop(function (err) {
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
                if (err) {
                    done(err);
                } else {
                    done();
                }
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

    describe('[nonce no match]', function () {
        it('worker should not attach', function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig(),
                clientsParam = {},
                workerConfig = {},
                killAndCleanUp;
            config.port = 9005;
            config.authentication = false;
            config.enableExecutor = true;
            config.httpsecure = false;
            config.executorNonce = 'aReallyLongSecret';

            clientsParam.serverPort = config.port;
            clientsParam.sessionId = 'testingNodeWorker';
            clientsParam.httpsecure = config.httpsecure;
            clientsParam.server = '127.0.0.1';
            serverBaseUrl = 'http://127.0.0.1:' + config.port;
            workerConfig[serverBaseUrl] = {executorNonce: 'notMatching'};

            server = testFixture.WebGME.standaloneServer(config);
            killAndCleanUp = function (err) {
                nodeWorkerProcess.kill('SIGINT');
                server.stop(function (serverErr) {
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
                    if (serverErr) {
                        done(serverErr);
                    } else if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            };
            fs.writeFile('test-tmp/worker_config.json', JSON.stringify(workerConfig), function (err) {
                if (err) {
                    done(err);
                } else {

                    server.start(function () {
                        executorClient = new ExecutorClient(clientsParam);
                        blobClient = new BlobClient(clientsParam);
                        nodeWorkerProcess = childProcess.spawn('node',
                            ['node_worker.js',
                                '../../../../test-tmp/worker_config.json',
                                '../../../../test-tmp/executor-tmp'],
                            {cwd: 'src/middleware/executor/worker'});

                        nodeWorkerProcess.stdout.on('data', function (data) {
                            var str = data.toString();
                            if (str.indexOf('Connected to') > -1) {
                                killAndCleanUp('Node worker did connect with non-matching nonce.');
                            }
                            if (str.indexOf('Server returned 403') > -1) {
                                killAndCleanUp(null);
                            }
                        });
                    });
                }
            });
        });
    });

    describe('[https nonce match]', function () {
        var nodeTLSRejectUnauthorized;
        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig(),
                clientsParam = {},
                workerConfig = {};
            nodeTLSRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            config.port = 9005;
            config.authentication = false;
            config.enableExecutor = true;
            config.httpsecure = true;
            config.executorNonce = 'aReallyLongSecret';
            WebGMEGlobal.setConfig({executorNonce: 'aReallyLongSecret'});
            clientsParam.serverPort = config.port;
            clientsParam.sessionId = 'testingNodeWorker';
            clientsParam.httpsecure = config.httpsecure;
            clientsParam.server = '127.0.0.1';
            serverBaseUrl = 'https://127.0.0.1:' + config.port;
            workerConfig[serverBaseUrl] = {executorNonce: 'aReallyLongSecret'};

            server = testFixture.WebGME.standaloneServer(config);

            fs.writeFile('test-tmp/worker_config.json', JSON.stringify(workerConfig), function (err) {
                if (err) {
                    done(err);
                } else {

                    server.start(function () {
                        executorClient = new ExecutorClient(clientsParam);
                        blobClient = new BlobClient(clientsParam);
                        nodeWorkerProcess = childProcess.spawn('node',
                            ['node_worker.js',
                                '../../../../test-tmp/worker_config.json',
                                '../../../../test-tmp/executor-tmp'],
                            {cwd: 'src/middleware/executor/worker'});

                        nodeWorkerProcess.stdout.on('data', function (data) {
                            var str = data.toString();
                            if (str.indexOf('Connected to') > -1) {
                                done();
                                return;
                            }

                            if (str.indexOf('Error connecting to') > -1) {
                                done(new Error(str));
                                return;
                            }

                            //console.log(str);
                        });
                    });
                }
            });
        });

        beforeEach(function (done) {
            rimraf('./test-tmp/blob-storage', function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });

        after(function (done) {
            nodeWorkerProcess.kill('SIGINT');
            server.stop(function (err) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = nodeTLSRejectUnauthorized;
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
                if (err) {
                    done(err);
                } else {
                    done();
                }
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
});