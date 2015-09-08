/*globals require*/
/*jshint node:true, mocha:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');


describe('Simple worker', function () {
    'use strict';

    var WebGME = testFixture.WebGME,
        gmeConfig = testFixture.getGmeConfig(),
        guestAccount = gmeConfig.authentication.guestAccount,
        Q = testFixture.Q,
        expect = testFixture.expect,
        agent = testFixture.superagent.agent(),
        openSocketIo = testFixture.openSocketIo,
        webGMESessionId,
        CONSTANTS = require('./../../../src/server/worker/constants'),
        server,

        gmeAuth,

        usedProjectNames = [
            'workerSeedFromDB',
            'WorkerProject'
        ],
        logger = testFixture.logger.fork('simpleworker.spec'),
        storage,
        baseProjectContext = {
            name: 'WorkerProject',
            id: '',
            commitHash: '',
            rootHash: '',
            branch: 'master'
        },
        baseProjectJson = JSON.parse(
            testFixture.fs.readFileSync('seeds/ActivePanels.json')
        ),
        protocol = gmeConfig.server.https.enable ? 'https' : 'http',
        blobDownloadUrl = protocol + '://127.0.0.1:' + gmeConfig.server.port + '/rest/blob/download/',
        oldSend = process.send,
        oldOn = process.on,
        oldExit = process.exit;


    before(function (done) {
        var project;
        //gmeConfig.authentication.enable = true;
        gmeConfig.authentication.allowGuests = true;
        gmeConfig.addOn.enable = true;
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
                        projectSeed: 'seeds/ActivePanels.json',
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
                return Q.ninvoke(server, 'start');
            })
            .then(function () {
                return openSocketIo(server, agent, guestAccount, guestAccount);
            })
            .then(function (result) {
                webGMESessionId = result.webGMESessionId;
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

    it.skip('should exportLibrary given a branchName when result requested with delay', function (done) {
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
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

                return Q.delay(1000);
            })
            .then(function () {
                return worker.send({command: CONSTANTS.workerCommands.getResult});
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result).deep.equal(baseProjectJson);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    // dumpMoreNodes
    //it.skip('should dumpMoreNodes of a project', function (done) {
    //    var worker = getSimpleWorker();
    //
    //    worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
    //
    //            return worker.send({
    //                command: CONSTANTS.workerCommands.dumpMoreNodes,
    //                webGMESessionId: webGMESessionId,
    //                projectId: baseProjectContext.id,
    //                hash: baseProjectContext.rootHash,
    //                nodes: ['', '/1']
    //            });
    //        })
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.request);
    //            expect(msg.error).equal(null);
    //
    //            expect(msg.resid).not.equal(null);
    //
    //            return worker.send({command: CONSTANTS.workerCommands.getResult});
    //        })
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.result);
    //            expect(msg.error).equal(null);
    //
    //            expect(msg.result).not.equal(null);
    //            expect(msg.result).to.have.length(2);
    //        })
    //        .finally(restoreProcessFunctions)
    //        .nodeify(done);
    //});
    //
    //it.skip('should fail to dumpMoreNodes if invalid hash is given', function (done) {
    //    var worker = getSimpleWorker(),
    //        invalidHash = '#4242424242424242424242424242424242424242';
    //
    //    worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
    //
    //            return worker.send({
    //                command: CONSTANTS.workerCommands.dumpMoreNodes,
    //                webGMESessionId: webGMESessionId,
    //                projectId: baseProjectContext.id,
    //                hash: invalidHash,
    //                nodes: ['', '/1']
    //            });
    //        })
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.request);
    //            expect(msg.error).equal(null);
    //
    //            expect(msg.resid).not.equal(null);
    //
    //            return worker.send({command: CONSTANTS.workerCommands.getResult});
    //        })
    //        .then(function () {
    //            done(new Error('missing error handling'));
    //        })
    //        .catch(function (err) {
    //            expect(err.message).to.include(invalidHash);
    //            done();
    //        })
    //        .finally(restoreProcessFunctions)
    //        .done();
    //});
    //
    //it.skip('should fail to dumpMoreNodes if invalid projectId is given', function (done) {
    //    var worker = getSimpleWorker();
    //
    //    worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
    //
    //            return worker.send({
    //                command: CONSTANTS.workerCommands.dumpMoreNodes,
    //                webGMESessionId: webGMESessionId,
    //                projectId: 'badProjectId',
    //                hash: baseProjectContext.rootHash,
    //                nodes: ['', '/1']
    //            });
    //        })
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.request);
    //            expect(msg.error).equal(null);
    //
    //            expect(msg.resid).not.equal(null);
    //
    //            return worker.send({command: CONSTANTS.workerCommands.getResult});
    //        })
    //        .then(function () {
    //            done(new Error('missing error handling'));
    //        })
    //        .catch(function (err) {
    //            expect(err.message).to.include('badProjectId');
    //            done();
    //        })
    //        .finally(restoreProcessFunctions)
    //        .done();
    //});
    //
    //it.skip('should fail to dumpMoreNodes when command parameters are invalid', function (done) {
    //    var worker = getSimpleWorker();
    //
    //    worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
    //        .then(function (msg) {
    //            expect(msg.pid).equal(process.pid);
    //            expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
    //
    //            return worker.send({
    //                command: CONSTANTS.workerCommands.dumpMoreNodes
    //            });
    //        })
    //        .then(function (/*msg*/) {
    //            done(new Error('missing error handling'));
    //        })
    //        .catch(function (err) {
    //            expect(err.message).to.include('parameters');
    //
    //            done();
    //        })
    //        .finally(restoreProcessFunctions)
    //        .done();
    //});

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
                expect(err.message).to.contain('unknown file seed [UnknownSeed');
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
    // addOn
    it('should be able to start-query-stop addon', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    branch: baseProjectContext.branch,
                    addOnName: 'TestAddOn'
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerQuery,
                    webGMESessionId: webGMESessionId,
                    arbitrary: 'object'
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.query);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result.arbitrary).equal('object');

                return worker.send({command: CONSTANTS.workerCommands.connectedWorkerStop});
            })
            .then(function (msg) {
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should fail to query addon without stopping it', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerQuery,
                    webGMESessionId: webGMESessionId,
                    arbitrary: 'object'
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('No AddOn is running');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail to start addOn with invalid parameters', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart,
                    webGMESessionId: webGMESessionId,
                    workerName: 'TestAddOn'
                });
            })
            .then(function (/*msg*/) {
                done(new Error('Missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('parameter');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should respond with error to connectedWorkerStart if addOn is not allowed', function (done) {
        var worker = getSimpleWorker(),
            altConfig = JSON.parse(JSON.stringify(gmeConfig));

        altConfig.addOn.enable = false;
        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: altConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling in addOn functionality of worker'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('not enabled');
            })
            .finally(restoreProcessFunctions)
            .done(done);
    });

    it('should respond with error to connectedWorkerQuery if addOn is not allowed', function (done) {
        var worker = getSimpleWorker(),
            altConfig = JSON.parse(JSON.stringify(gmeConfig));

        altConfig.addOn.enable = false;
        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: altConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerQuery
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling in addOn functionality of worker'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('not enabled');
            })
            .finally(restoreProcessFunctions)
            .done(done);
    });

    it('should respond with error to connectedWorkerStop if addOn is not allowed', function (done) {
        var worker = getSimpleWorker(),
            altConfig = JSON.parse(JSON.stringify(gmeConfig));

        altConfig.addOn.enable = false;
        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: altConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStop
                });
            })
            .then(function (/*msg*/) {
                done(new Error('missing error handling in addOn functionality of worker'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('not enabled');
            })
            .finally(restoreProcessFunctions)
            .done(done);
    });

    // executePlugin
    it('should execute a plugin', function (done) {
        var worker = getSimpleWorker(),
            pluginContext = {
                managerConfig: {
                    host: '127.0.0.1', //FIXME
                    port: '27017', //FIXME
                    database: 'webgme_tests', //FIXME
                    project: baseProjectContext.id,
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

    it('should fail to execute a plugin if the server execution is not allowed', function (done) {
        var worker = getSimpleWorker(),
            gmeConfigCopy = JSON.parse(JSON.stringify(gmeConfig)),
            pluginContext = {
                managerConfig: {
                    host: '127.0.0.1', //FIXME
                    port: '27017', //FIXME
                    database: 'webgme_tests', //FIXME
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
});