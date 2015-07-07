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
        deleteProject = testFixture.forceDeleteProject,
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
            testFixture.fs.readFileSync('test/server/worker/simpleworker/baseProject.json', 'utf8')
        ),

        oldSend = process.send,
        oldOn = process.on,
        oldExit = process.exit;


    before(function (done) {

        //gmeConfig.authentication.enable = true;
        gmeConfig.authentication.allowGuests = true;
        gmeConfig.addOn.enable = true;
        gmeConfig.plugin.allowServerExecution = true;

        server = WebGME.standaloneServer(gmeConfig);
        server.start(function (err) {
            expect(err).to.equal(null);

            testFixture.clearDBAndGetGMEAuth(gmeConfig, usedProjectNames)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return storage.openDatabase();
                })
                .then(function () {
                    return deleteProject(storage, gmeAuth, baseProjectContext.name);
                })
                .then(function () {
                    return testFixture.importProject(storage,
                        {
                            projectSeed: 'test/server/worker/simpleworker/baseProject.json',
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
                    return openSocketIo(server, agent, guestAccount, guestAccount);
                })
                .then(function (result) {
                    webGMESessionId = result.webGMESessionId;
                })
                .nodeify(done);
        });
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                logger.error(err);
            }
            deleteProject(storage, gmeAuth, baseProjectContext.name)
                .then(function () {
                    return Q.allSettled([
                        storage.closeDatabase(),
                        gmeAuth.unload()
                    ]);
                })
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

    it('should fail to execute command without initialization', function (done) {
        var worker = getSimpleWorker();

        worker.send({
            command: CONSTANTS.workerCommands.getAllProjectsInfo,
            userId: 'myUser'
        })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
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
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

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
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

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
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

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
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
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
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
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
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
            })
            .catch(function (err) {
                expect(err.message).to.contain('Failed loading commitHash');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it.skip('should fail to export sub-tree with an unknown starting path');

    // dumpMoreNodes
    it('should dumpMoreNodes of a project', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.dumpMoreNodes,
                    webGMESessionId: webGMESessionId,
                    projectId: baseProjectContext.id,
                    hash: baseProjectContext.rootHash,
                    nodes: ['', '/1']
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                expect(msg.resid).not.equal(null);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                expect(msg.result).to.have.length(2);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    // seedProject
    it('should seedProject from an existing project', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromDB',
            projectId = testFixture.projectName2Id(projectName);

        deleteProject(storage, gmeAuth, projectName, guestAccount, function (err) {
            expect(err).equal(null);

            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
                .then(function (msg) {
                    expect(msg.pid).equal(process.pid);
                    expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                    return worker.send({
                        command: CONSTANTS.workerCommands.seedProject,
                        projectName: projectName,
                        webGMESessionId: webGMESessionId,
                        type: 'db',
                        seedName: baseProjectContext.id,
                    });
                })
                .then(function (msg) {
                    expect(msg.pid).equal(process.pid);
                    expect(msg.type).equal(CONSTANTS.msgTypes.request);
                    expect(msg.error).equal(null);

                    expect(msg.resid).not.equal(null);
                    return worker.send({command: CONSTANTS.workerCommands.getResult});
                })
                .then(function (msg) {
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
    });

    it('should seedProject from a file seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromFile',
            projectId = testFixture.projectName2Id(projectName);

        deleteProject(storage, gmeAuth, projectName, guestAccount, function (err) {
            expect(err).equal(null);

            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
                .then(function (msg) {
                    expect(msg.pid).equal(process.pid);
                    expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                    return worker.send({
                        command: CONSTANTS.workerCommands.seedProject,
                        webGMESessionId: webGMESessionId,
                        projectName: 'workerSeedFromFile',
                        type: 'file',
                        seedName: 'EmptyProject',
                    });
                })
                .then(function (msg) {
                    expect(msg.pid).equal(process.pid);
                    expect(msg.type).equal(CONSTANTS.msgTypes.request);
                    expect(msg.error).equal(null);

                    expect(msg.resid).not.equal(null);
                    return worker.send({command: CONSTANTS.workerCommands.getResult});
                })
                .then(function (msg) {
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
                    workerName: 'TestAddOn'
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
            projectName = 'workerSeedFromFile',
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
        deleteProject(storage, gmeAuth, projectName, guestAccount, function (err) {
            expect(err).equal(null);

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
    });

    // merge
});