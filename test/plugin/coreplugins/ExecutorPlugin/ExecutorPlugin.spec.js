/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../../_globals.js');

describe('Executor Plugin', function () {
    'use strict';

    var Q = testFixture.Q,
        fs = testFixture.fs,
        rimraf = testFixture.rimraf,
        childProcess = testFixture.childProcess,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('ExecutorPlugin.spec'),
        ExecutorClient = testFixture.ExecutorClient,
        BlobClient = testFixture.BlobClient,
        executorClient,
        blobClient,
        server,
        nodeWorkerProcess,

        projectName = 'ExecutorPluginTest',
        projects = [projectName],

        os = require('os'),
        platform = os.platform(),

        gmeAuth,
        safeStorage,
        importResult,

        path = require('path'),
        runPlugin = require('../../../../src/bin/run_plugin'),
        filename = path.normalize('../../../../src/bin/run_plugin.js');


    // COPY PASTED CODE STARTS FROM test/server/middleware/executor/worker/node_worker.spec.js

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
            // creating a project
            .then(function () {
                return testFixture.clearDBAndGetGMEAuth(gmeConfig, projects);
            })
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

                return Q.allDone([
                    safeStorage.openDatabase()
                ]);
            })
            .then(function () {
                return testFixture.importProject(safeStorage, {
                    projectSeed: './seeds/ActivePanels.webgmex',
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            // project is created
            .then(function (importResult_) {
                importResult = importResult_;
                return importResult.project.createBranch('b1', importResult.commitHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                server = testFixture.WebGME.standaloneServer(gmeConfig);
                return Q.nfcall(server.start);
            })
            .then(function () {
                var workerConfig = {},
                    clientsParam = {};

                clientsParam.serverPort = gmeConfig.server.port;
                clientsParam.webGMESessionId = 'testingNodeWorker';
                clientsParam.server = '127.0.0.1';
                clientsParam.httpsecure = false;
                clientsParam.executorNonce = gmeConfig.executor.nonce;
                clientsParam.logger = logger.fork('blobOrExecutor');

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
                        deferred.reject(new Error('Worker did not respond in time, stderr: ' +
                            stderr + ' stdout: ' + stdout));
                    }, 5000);

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
            this.timeout(15000);
            gmeConfig.executor.enable = true;
            gmeConfig.executor.nonce = null;

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
            nodeWorkerProcess.on('close', function (/*code*/) {
                setTimeout(function () {
                    server.stop(function (err) {
                        done(err);
                    });
                }, 200);
            });
            nodeWorkerProcess.kill('SIGINT');
        });

        // COPY PASTED CODE ENDS FROM test/server/middleware/executor/worker/node_worker.spec.js

        it('should run ExecutorPlugin and update the model', function (done) {
            var configFileName = './test/plugin/coreplugins/ExecutorPlugin/config.' + platform + '.json',
                args = [
                    'node',
                    filename,
                    'ExecutorPlugin',
                    projectName,
                    '-a',
                    '/1',
                    '-j',
                    configFileName,
                    '-b',
                    'b1'];

            this.timeout(10000);

            Q.ninvoke(runPlugin, 'main', args)
                .then(function (result) {
                    expect(result.success).to.equal(true);
                    expect(result.commits instanceof Array).to.equal(true);
                    expect(result.commits.length).to.equal(2);
                    return Q.ninvoke(importResult.project, 'loadObject', result.commits[1].commitHash);
                })
                .then(function (commitObj) {
                    return Q.ninvoke(importResult.core, 'loadRoot', commitObj.root);
                })
                .then(function (rootNode) {
                    var deferred = Q.defer();
                    importResult.core.loadByPath(rootNode, '/1', function (err, node) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(node);
                        }
                    });
                    return deferred.promise;
                })
                .then(function (fcoNode) {
                    expect(importResult.core.getAttribute(fcoNode, 'name')).to.equal('ThisIsANewName');
                })
                .nodeify(done);
        });

        it('should run ExecutorPlugin but not update the model', function (done) {
            var configFileName = './test/plugin/coreplugins/ExecutorPlugin/config.' + platform + '.noUpdate.json',
                args = [
                    'node',
                    filename,
                    'ExecutorPlugin',
                    projectName,
                    '-a',
                    '/1',
                    '-j',
                    configFileName,
                    '-b',
                    'master'];

            this.timeout(10000);

            Q.ninvoke(runPlugin, 'main', args)
                .then(function (result) {
                    expect(result.success).to.equal(true);
                    expect(result.commits instanceof Array).to.equal(true);
                    expect(result.commits.length).to.equal(1);

                    return importResult.project.getBranches();
                })
                .then(function (branches) {
                    expect(branches.master).to.equal(importResult.commitHash);
                })
                .nodeify(done);
        });

        it('should fail to run ExecutorPlugin on root node', function (done) {
            var configFileName = './test/plugin/coreplugins/ExecutorPlugin/config.' + platform + '.json';

            this.timeout(10000);

            runPlugin.main(['node', filename, 'ExecutorPlugin', projectName, '-j', configFileName],
                function (err, result) {
                    if (err) {
                        done(err);
                        return;
                    }

                    expect(result.success).to.equal(false);
                    expect(result.error).to.equal('No activeNode specified or rootNode. Execute on any other node.');
                    done();
                });
        });

        it('should fail the job but return artifacts when success is set to false', function (done) {
            var configFileName = './test/plugin/coreplugins/ExecutorPlugin/config.' + platform + '.fail.json';

            this.timeout(10000);

            runPlugin.main(['node', filename, 'ExecutorPlugin', projectName, '-a', '/1', '-j', configFileName],
                function (err, result) {
                    try {
                        expect(err).to.equal(null);
                        expect(result.error).to.include('Job execution failed');
                        expect(result.success).to.equal(false);
                        expect(result.artifacts instanceof Array).to.equal(true);
                        expect(result.artifacts.length).to.equal(4);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });
    });
});
