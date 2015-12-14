/*globals requireJS*/
/*jshint node:true, mocha:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');


describe('Simple worker', function () {
    'use strict';

    var WebGME,
        gmeConfig = testFixture.getGmeConfig(),
        guestAccount = gmeConfig.authentication.guestAccount,
        Q,
        expect,
        agent,
        openSocketIo = testFixture.openSocketIo,
        webGMESessionId,
        CONSTRAINT_TYPES,
        CONSTANTS,
        server,
        BlobClient,

        gmeAuth,

        usedProjectNames = [
            'workerSeedFromDB',
            'WorkerProject'
        ],
        logger,
        storage,
        baseProjectContext = {
            name: 'WorkerProject',
            id: '',
            commitHash: '',
            rootHash: '',
            branch: 'master'
        },
        constraintProjectName = 'ConstraintProject',
        constraintProjectImportResult,
        baseProjectJson,
        blobDownloadUrl = 'http://127.0.0.1:' + gmeConfig.server.port + '/rest/blob/download/',
        oldSend = process.send,
        oldOn = process.on,
        socket,
        oldExit = process.exit;


    before(function (done) {
        var project;
        Q = testFixture.Q;
        expect = testFixture.expect;
        WebGME = testFixture.WebGME;
        BlobClient = testFixture.getBlobTestClient();
        logger = testFixture.logger.fork('simpleworker.spec');
        agent = testFixture.superagent.agent();
        baseProjectJson = JSON.parse(
            testFixture.fs.readFileSync('seeds/EmptyProject.json')
        );
        CONSTANTS = require('./../../../src/server/worker/constants');
        CONSTRAINT_TYPES = requireJS('common/core/users/constraintchecker').TYPES;
        //gmeConfig.authentication.enable = true;
        gmeConfig.authentication.allowGuests = true;
        gmeConfig.addOn.enable = false;
        gmeConfig.plugin.allowServerExecution = true;

        server = WebGME.standaloneServer(gmeConfig);

        testFixture.clearDBAndGetGMEAuth(gmeConfig, usedProjectNames)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: baseProjectContext.name,
                        branchName: baseProjectContext.branch,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (result) {
                baseProjectContext.commitHash = result.commitHash;
                baseProjectContext.id = result.project.projectId;
                baseProjectContext.rootHash = result.core.getHash(result.rootNode);
                project = result.project;
                return project.createBranch('corruptBranch', result.commitHash);
            })
            .then(function (result) {
                var invalidRoot = '#424242424242424242424',
                    coreObjs = {};
                coreObjs.invalidRoot = {_id: invalidRoot};
                expect(result.status).to.equal(project.CONSTANTS.SYNCED);

                return project.makeCommit('corruptBranch', [baseProjectContext.commitHash],
                    invalidRoot, coreObjs, 'bad commit');
            })
            .then(function (result) {
                expect(result.status).to.equal(project.CONSTANTS.SYNCED);

                return testFixture.importProject(storage,
                    {
                        projectSeed: './test/common/core/users/meta/metaRules.json',
                        projectName: constraintProjectName,
                        branchName: 'master',
                        logger: logger,
                        gmeConfig: gmeConfig
                    });
            })
            .then(function (result) {
                constraintProjectImportResult = result;
                return Q.ninvoke(server, 'start');
            })
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                webGMESessionId = result.webGMESessionId;
                socket = result.socket;
            })
            .nodeify(done);
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                logger.error(err);
            }
            return Q.allDone([
                storage.closeDatabase(),
                gmeAuth.unload()
            ])
                .nodeify(done);
        });
    });

    function unloadSimpleWorker() {
        // clear the cached files
        var key,
            i,
            modulesToUnload = [];

        for (key in require.cache) {
            if (require.cache.hasOwnProperty(key)) {
                if (key.indexOf('simpleworker.js') > -1) {
                    modulesToUnload.push(key);
                }
            }
        }

        for (i = 0; i < modulesToUnload.length; i += 1) {
            delete require.cache[modulesToUnload[i]];
        }
    }

    function getSimpleWorker() {
        var worker,
            deferredArray = [],
            sendMessage;

        function sendFunction() {
            //console.log('sendFunction');
            //console.log(arguments);
            // got message
            //console.log('got message: ', arguments); // FOR DEBUGGING
            var deferred = deferredArray.shift();
            if (deferred) {
                if (arguments[0].error) {
                    // N.B: we use and care only about the error property and it is always a string if exists.
                    deferred.reject(new Error(arguments[0].error));
                } else {
                    deferred.resolve(arguments[0]);
                }
            }
        }

        function onFunction() {
            //console.log('onFunction');
            //console.log(arguments);
            if (arguments[0] === 'message') {
                // save the send message function
                sendMessage = arguments[1];
            }
        }

        function exitFunction() {
            //console.log('exitFunction');
            //console.log(arguments);
        }

        process.send = sendFunction;
        process.on = onFunction;
        process.exit = exitFunction;

        unloadSimpleWorker();

        require('./../../../src/server/worker/simpleworker');

        worker = {
            send: function () {
                // FIXME: this implementation assumes that the send/receive messages are in pair
                // exactly one message received per sent message, in the same order.
                var deferred = Q.defer();
                deferredArray.push(deferred);
                //console.log('sending message: ', arguments);  // FOR DEBUGGING
                sendMessage.apply(this, arguments);
                return deferred.promise;
            }
        };

        return worker;
    }

    function restoreProcessFunctions() {
        process.send = oldSend;
        process.on = oldOn;
        process.exit = oldExit;
    }

    it('should initialize worker with a valid gmeConfig', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should respond with no error to a second initialization request', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig});
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);

    });

    it('should fail to execute command without initialization', function (done) {
        var worker = getSimpleWorker();

        worker.send({
            command: CONSTANTS.workerCommands.getAllProjectsInfo,
            userId: 'myUser'
        })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).equal('worker has not been initialized yet');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    // exportLibrary
    it('should exportLibrary given a branchName.', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    branchName: 'master',
                    path: ''
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(typeof msg.result.file.hash).to.equal('string');
                expect(msg.result.file.url).to.include(blobDownloadUrl);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should exportLibrary given a hash (rootHash)', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    hash: baseProjectContext.rootHash,
                    path: ''
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(typeof msg.result.file.hash).to.equal('string');
                expect(msg.result.file.url).to.include(blobDownloadUrl);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should exportLibrary given a commit (commitHash).', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    commit: baseProjectContext.commitHash,
                    path: ''
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(typeof msg.result.file.hash).to.equal('string');
                expect(msg.result.file.url).to.include(blobDownloadUrl);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to exportLibrary when branchName does not exist.', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    branchName: 'doesNotExist',
                    path: ''
                });
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Branch not found');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to exportLibrary when hash (rootHash) does not exist.', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    hash: 'wrong hash',
                    path: ''
                });
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('ASSERT'); //because of the wrong hash format
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to exportLibrary when commit (commitHash) does not exist.', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    commit: 'wrong hash',
                    path: ''
                });
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Failed loading commitHash');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to exportLibrary when projectId is not correct', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: 'badProjectId',
                    commit: baseProjectContext.commitHash,
                    path: ''
                });
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('badProjectId');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to exportLibrary when command parameters are invalid', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.include('parameters');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    //TODO decide if this is a good behaviour, now the loadByPath load any path (creating empty objects on its way)
    it.skip('should fail to export sub-tree with an unknown starting path', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    commit: baseProjectContext.commitHash,
                    path: '/bad/path'
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Failed loading commitHashyyy');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    // seedProject
    it('should seedProject from an existing project', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromDB',
            projectId = testFixture.projectName2Id(projectName);

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    webGMESessionId: webGMESessionId,
                    type: 'db',
                    seedName: baseProjectContext.id,
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.result).not.equal(null);
                expect(msg.result).to.include.keys('projectId');
                expect(msg.result.projectId).to.equal(projectId);
                return storage.getProjects({branches: true});
            })
            .then(function (projects) {
                var i,
                    hadProject = false;
                for (i = 0; i < projects.length; i += 1) {
                    if (projects[i]._id === projectId) {
                        hadProject = true;
                        break;
                    }
                }
                expect(hadProject).to.equal(true,
                    'getProjects did not return the seeded project' + projectId);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to seedProject from an invalid project', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromDB2';

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    projectName: projectName,
                    webGMESessionId: webGMESessionId,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'db',
                    seedName: 'invalidProjectId',
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('invalidProjectId');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to seedProject from an invalid branch', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromDB2';

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    projectName: projectName,
                    webGMESessionId: webGMESessionId,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'db',
                    seedName: baseProjectContext.id,
                    seedBranch: 'invalidBranch'
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Branch did not exist [invalidBranch');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();

    });

    it('should fail to seedProject from a corrupted branch', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromDB3';

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    projectName: projectName,
                    webGMESessionId: webGMESessionId,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'db',
                    seedName: baseProjectContext.id,
                    seedBranch: 'corruptBranch'
                });
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('ASSERT failed');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should seedProject from a file seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromFile1',
            projectId = testFixture.projectName2Id(projectName);

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'file',
                    seedName: 'EmptyProject',
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result).to.include.keys('projectId');
                expect(msg.result.projectId).to.equal(projectId);

                return storage.getProjects({branches: true});
            })
            .then(function (projects) {
                var i,
                    hadProject = false;
                for (i = 0; i < projects.length; i += 1) {
                    if (projects[i]._id === projectId) {
                        hadProject = true;
                        break;
                    }
                }
                expect(hadProject).to.equal(true,
                    'getProjects did not return the seeded project' + projectId);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should seedProject from a file seed containing assets', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromFileAssets',
            gmeConfigMod = JSON.parse(JSON.stringify(gmeConfig)),
            projectId = testFixture.projectName2Id(projectName);

        gmeConfigMod.seedProjects.basePaths.push('./test/server/worker/workerrequests');

        Q.ninvoke(testFixture, 'rimraf', gmeConfig.blob.fsDir)
            .then(function () {
                return worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfigMod});
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfigMod.authentication.guestAccount,
                    type: 'file',
                    seedName: 'asExported',
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result).to.include.keys('projectId');
                expect(msg.result.projectId).to.equal(projectId);

                return storage.getProjects({branches: true});
            })
            .then(function (projects) {
                var i,
                    hadProject = false;
                for (i = 0; i < projects.length; i += 1) {
                    if (projects[i]._id === projectId) {
                        hadProject = true;
                        break;
                    }
                }
                expect(hadProject).to.equal(true,
                    'getProjects did not return the seeded project' + projectId);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should seedProject from a blob seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromBlob',
            blobClient = new BlobClient(gmeConfig, logger.fork('BlobClient')),
            artifact = blobClient.createArtifact('valid'),
            projectId = testFixture.projectName2Id(projectName);

        Q.all([
            Q.ninvoke(artifact, 'addFileAsSoftLink', 'Empty.json', JSON.stringify(baseProjectJson)),
            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
        ])
            .spread(function (hash, msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'blob',
                    seedName: hash,
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result).to.include.keys('projectId');
                expect(msg.result.projectId).to.equal(projectId);

                return storage.getProjects({branches: true});
            })
            .then(function (projects) {
                var i,
                    hadProject = false;
                for (i = 0; i < projects.length; i += 1) {
                    if (projects[i]._id === projectId) {
                        hadProject = true;
                        break;
                    }
                }
                expect(hadProject).to.equal(true,
                    'getProjects did not return the seeded project' + projectId);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to seed from a non-existing blob seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromBlobFail1';

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'blob',
                    seedName: 'af',
                });
            })
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Not Found');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to seed from non-json blob seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromBlobFail2',
            blobClient = new BlobClient(gmeConfig, logger.fork('BlobClient')),
            artifact = blobClient.createArtifact('invalid');

        Q.all([
            Q.ninvoke(artifact, 'addFileAsSoftLink', 'Empty.txt', 'this is a txtFile'),
            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
        ])
            .spread(function (hash, msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'blob',
                    seedName: hash,
                });
            })
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Wrong file type of blob seed');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to seed from non-project but json blob seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromBlobFail3',
            blobClient = new BlobClient(gmeConfig, logger.fork('BlobClient')),
            artifact = blobClient.createArtifact('invalid2');

        Q.all([
            Q.ninvoke(artifact, 'addFileAsSoftLink', 'Empty.json', JSON.stringify({a: 1, b: 2})),
            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
        ])
            .spread(function (hash, msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'blob',
                    seedName: hash,
                });
            })
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Provided blob-seed json was not an exported project');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to seedProject from an unknown file seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromFile2';

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'file',
                    seedName: 'UnknownSeed',
                });
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('unknown file seed [UnknownSeed');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to seedProject when disabled', function (done) {
        var worker = getSimpleWorker(),
            altConfig = JSON.parse(JSON.stringify(gmeConfig)),
            projectName = 'workerSeedFromFile2';
        altConfig.seedProjects.enable = false;

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: altConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    projectName: projectName,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'file',
                    seedName: 'UnknownSeed',
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('seeding is disabled');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to seedProject with invalid parameters', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'file',
                    seedName: 'UnknownSeed',
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Invalid parameters');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to seedProject with invalid parameters', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.seedProject,
                    webGMESessionId: webGMESessionId,
                    ownerId: gmeConfig.authentication.guestAccount,
                    type: 'unknownType',
                    projectName: 'someProject',
                    seedName: 'UnknownSeed',
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Unknown seeding type [unknownType');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    // executePlugin
    it('should execute a plugin', function (done) {
        var worker = getSimpleWorker(),
            pluginContext = {
                managerConfig: {
                    project: baseProjectContext.id,
                    activeNode: '/1',
                    commit: baseProjectContext.commitHash,
                    branchName: baseProjectContext.branch,
                    activeSelection: []
                }
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.executePlugin,
                    name: 'MinimalWorkingExample',
                    userId: 'myUser',
                    webGMESessionId: webGMESessionId,
                    context: pluginContext
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result.success).equal(true);
                expect(msg.result.pluginName).equal('Minimal Working Example');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should execute a plugin and notify socket', function (done) {
        var worker = getSimpleWorker(),
            pluginContext = {
                managerConfig: {
                    project: baseProjectContext.id,
                    token: '',
                    activeNode: '/1',
                    commit: baseProjectContext.commitHash,
                    branchName: baseProjectContext.branch,
                    activeSelection: []
                }
            },
            deferred = Q.defer();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
                socket.on('NOTIFICATION', function (data) {
                    try {
                        expect(data.type).to.equal('PLUGIN_NOTIFICATION');
                        expect(data.pluginName).to.equal('Export, Import and Update Library');
                        expect(typeof data.notification.message).to.equal('string');
                        deferred.resolve();
                    } catch (err) {
                        deferred.reject(err);
                    }

                });

                return worker.send({
                    command: CONSTANTS.workerCommands.executePlugin,
                    name: 'ExportImport',
                    socketId: socket.id,
                    webGMESessionId: webGMESessionId,
                    context: pluginContext
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result.success).equal(true);
                return deferred.promise;
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should execute a plugin and not fail with non existing socketId', function (done) {
        // This tests the case where user disconnects after starting a plugin that sends notifications.
        var worker = getSimpleWorker(),
            pluginContext = {
                managerConfig: {
                    project: baseProjectContext.id,
                    token: '',
                    activeNode: '/1',
                    commit: baseProjectContext.commitHash,
                    branchName: baseProjectContext.branch,
                    activeSelection: []
                }
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.executePlugin,
                    name: 'ExportImport',
                    socketId: 'nonExistingSocket',
                    webGMESessionId: webGMESessionId,
                    context: pluginContext
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result.success).equal(true);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to execute a plugin if the server execution is not allowed', function (done) {
        var worker = getSimpleWorker(),
            gmeConfigCopy = JSON.parse(JSON.stringify(gmeConfig)),
            pluginContext = {
                managerConfig: {
                    project: baseProjectContext.name,
                    token: '',
                    selected: '',
                    commit: baseProjectContext.commitHash,
                    branchName: baseProjectContext.branch,
                    activeSelection: []
                }
            };

        gmeConfigCopy.plugin.allowServerExecution = false;

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfigCopy})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.executePlugin,
                    name: 'MinimalWorkingExample',
                    userId: 'myUser',
                    webGMESessionId: 'mySession',
                    context: pluginContext
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result.success).equal(false);
                expect(msg.result.messages[0].message).equal('plugin execution on server side is disabled');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to execute a plugin on an invalid project', function (done) {
        var worker = getSimpleWorker(),
            pluginContext = {
                managerConfig: {
                    project: 'invalidProjectId',
                    token: '',
                    selected: '',
                    commit: baseProjectContext.commitHash,
                    branchName: baseProjectContext.branch,
                    activeSelection: []
                }
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.executePlugin,
                    name: 'MinimalWorkingExample',
                    userId: 'myUser',
                    webGMESessionId: webGMESessionId,
                    context: pluginContext
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.include('invalidProjectId');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to execute a non-existent plugin', function (done) {
        var worker = getSimpleWorker(),
            pluginContext = {
                managerConfig: {
                    project: baseProjectContext.id,
                    selected: '',
                    commit: baseProjectContext.commitHash,
                    branchName: baseProjectContext.branch,
                    activeSelection: []
                }
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.executePlugin,
                    name: 'NonExistentPlugin',
                    userId: 'myUser',
                    webGMESessionId: webGMESessionId,
                    context: pluginContext
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.include('NonExistentPlugin');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to execute a plugin with invalid command parameters', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.executePlugin,
                    name: 'MinimalWorkingExample',
                    userId: 'myUser',
                    webGMESessionId: webGMESessionId,
                    context: 'no context'
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('invalid parameters');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    // merge
    it('should merge automatically an empty change into the master branch', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'WorkerProject',
            projectId = testFixture.projectName2Id(projectName),
            context = baseProjectContext;

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.autoMerge,
                    projectId: projectId,
                    webGMESessionId: webGMESessionId,
                    mine: context.commitHash,
                    theirs: context.commitHash
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);
                expect(msg.resid).not.equal(null);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);

    });

    it('should fail to merge automatically if project id is invalid', function (done) {
        var worker = getSimpleWorker(),
            context = baseProjectContext;

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.autoMerge,
                    projectId: 'invalidProjectId',
                    webGMESessionId: webGMESessionId,
                    mine: context.commitHash,
                    theirs: context.commitHash
                });
            })
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('invalidProjectId');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();

    });

    it('should resolve automatically an empty change into the master branch', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'WorkerProject',
            projectId = testFixture.projectName2Id(projectName);

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.resolve,
                    projectId: projectId,
                    userId: gmeConfig.authentication.guestAccount,
                    webGMESessionId: webGMESessionId,
                    partial: {
                        projectId: baseProjectContext.id,
                        baseCommitHash: baseProjectContext.commitHash,
                        conflict: {
                            items: [],
                            merge: {}
                        }
                    }
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);
                expect(msg.resid).not.equal(null);

                done();
            })
            .finally(restoreProcessFunctions)
            .done();

    });

    it('should fail to resolve an invalidProject', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.resolve,
                    projectId: 'invalidProjectId',
                    userId: gmeConfig.authentication.guestAccount,
                    webGMESessionId: webGMESessionId,
                    partial: {
                        projectId: 'invalidProjectId',
                        baseCommitHash: baseProjectContext.commitHash,
                        conflict: {
                            items: [],
                            merge: {}
                        }
                    }
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);
                expect(msg.resid).not.equal(null);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
            })
            .then(function (/*msg*/) {
                done(new Error('Missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('invalidProjectId');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();

    });

    // wrong / no command
    it('should fail to execute wrong command', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: 'unknown command'
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('unknown command');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to execute request without command', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({});
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('unknown command');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    // constraint checking
    it('should succeed to check meta rules on FCO (checkType undefined -> META)', function (done) {
        var command = {
                command: CONSTANTS.workerCommands.checkConstraints,
                projectId: constraintProjectImportResult.project.projectId,
                commitHash: constraintProjectImportResult.commitHash,
                nodePaths: ['/1'],
                includeChildren: false,
                webGMESessionId: webGMESessionId
            },
            worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(command);
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result instanceof Array).to.equal(true);

                expect(msg.result.length).to.equal(1);
                expect(msg.result[0].hasViolation).to.equal(false);
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should succeed to check custom constraints if enabled', function (done) {
        var command = {
                command: CONSTANTS.workerCommands.checkConstraints,
                projectId: constraintProjectImportResult.project.projectId,
                commitHash: constraintProjectImportResult.commitHash,
                nodePaths: ['/1', '/343492672', '/2046278624'], // No constraint, passes, fails.
                includeChildren: true,
                webGMESessionId: webGMESessionId,
                checkType: CONSTRAINT_TYPES.CUSTOM
            },
            modifiedConfig = testFixture.getGmeConfig(),
            worker = getSimpleWorker();

        modifiedConfig.core.enableCustomConstraints = true;

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: modifiedConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(command);
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result instanceof Array).to.equal(true);

                expect(msg.result.length).to.equal(3);

                expect(msg.result[0].hasViolation).to.equal(false);
                expect(msg.result[1].hasViolation).to.equal(false);
                expect(msg.result[2].hasViolation).to.equal(true);
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should return with results although custom constraint raises exception', function (done) {
        var command = {
                command: CONSTANTS.workerCommands.checkConstraints,
                projectId: constraintProjectImportResult.project.projectId,
                commitHash: constraintProjectImportResult.commitHash,
                nodePaths: ['/343492672', '/902005954', '/132634291'], // passes, error, exception
                includeChildren: true,
                webGMESessionId: webGMESessionId,
                checkType: CONSTRAINT_TYPES.CUSTOM
            },
            modifiedConfig = testFixture.getGmeConfig(),
            worker = getSimpleWorker();

        modifiedConfig.core.enableCustomConstraints = true;

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: modifiedConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(command);
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result instanceof Array).to.equal(true);

                expect(msg.result.length).to.equal(3);

                expect(msg.result[0].hasViolation).to.equal(false);
                expect(msg.result[1].hasViolation).to.equal(true);
                expect(msg.result[2].hasViolation).to.equal(true);
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should return error when checking custom constraints on FCO if disabled', function (done) {
        var command = {
                command: CONSTANTS.workerCommands.checkConstraints,
                projectId: constraintProjectImportResult.project.projectId,
                commitHash: constraintProjectImportResult.commitHash,
                nodePaths: ['/1'],
                includeChildren: false,
                webGMESessionId: webGMESessionId,
                checkType: CONSTRAINT_TYPES.CUSTOM
            },
            worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(command);
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Custom constraints is not enabled');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should return error when projectId not given', function (done) {
        var command = {
                command: CONSTANTS.workerCommands.checkConstraints,
                commitHash: constraintProjectImportResult.commitHash,
                nodePaths: ['/1'],
                includeChildren: false,
                webGMESessionId: webGMESessionId
            },
            worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(command);
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('invalid parameters');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should return error when a nodePath does not exist', function (done) {
        var command = {
                command: CONSTANTS.workerCommands.checkConstraints,
                projectId: constraintProjectImportResult.project.projectId,
                commitHash: constraintProjectImportResult.commitHash,
                nodePaths: ['/1', '/11'],
                includeChildren: false,
                webGMESessionId: webGMESessionId
            },
            worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(command);
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Given nodePath does not exist');
                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });
});
