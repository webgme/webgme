/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../../_globals.js');

describe('ExecutorPlugin', function () {
    'use strict';

    var Q = testFixture.Q,
        fs = testFixture.fs,
        rimraf = testFixture.rimraf,
        childProcess = testFixture.childProcess,
        should = testFixture.should,
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

        gmeAuth,
        safeStorage,

        path = require('path'),
        runPlugin = require('../../../../src/bin/run_plugin'),
        filename = path.normalize('../../../../src/bin/run_plugin.js'),
        oldProcessExit = process.exit;


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

                return Q.allSettled([
                    safeStorage.openDatabase()
                ]);
            })
            .then(function () {
                return Q.allSettled([
                    safeStorage.deleteProject({projectId: testFixture.projectName2Id(projectName)})
                ]);
            })
            .then(function () {
                return testFixture.importProject(safeStorage, {
                    projectSeed: './seeds/ActivePanels.json',
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            // project is created
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

        // COPY PASTED CODE ENDS FROM test/server/middleware/executor/worker/node_worker.spec.js

        afterEach(function () {
            process.exit = oldProcessExit;
        });

        it('should run plugin', function (done) {
            this.timeout(10000);

            process.exit = function (code) {
                console.log('Called ' + code);
                expect(code).to.equal(0);
                done();
            };

            runPlugin.main(['node', filename, '-p', projectName, '-n', 'ExecutorPlugin'],
                function (err, result) {
                    expect(err).to.equal(null);
                    expect(result.success).to.equal(true);
                });
        });
    });
});