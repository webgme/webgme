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
        Q = testFixture.Q,
        expect = testFixture.expect,
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
            commitHash: '',
            rootHash: '',
            branch: 'master'
        },
        baseProjectJson = JSON.parse(
            testFixture.fs.readFileSync('test/server/worker/simpleworker/baseProject.json', 'utf8')
        ),
        deleteProject = function (projectName, next) {
            testFixture.deleteProject({
                storage: storage,
                projectName: projectName
            }, next);
        },


        oldSend = process.send,
        oldOn = process.on,
        oldExit = process.exit;


    before(function (done) {

        gmeConfig.authentication.enable = false;
        gmeConfig.authentication.allowGuests = false;
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
                    return storage.deleteProject({projectName: baseProjectContext.name});
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
                    baseProjectContext.rootHash = result.core.getHash(result.rootNode);
                })
                .nodeify(done);
        });
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                logger.error(err);
            }
            storage.deleteProject({projectName: baseProjectContext.name})
                .then(function () {
                    return Q.all([
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

    it('should get all projects info', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.getAllProjectsInfo,
                    userId: 'myUser'
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
                expect(msg.result).to.include.keys(baseProjectContext.name);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should echo back the received parameter', function (done) {
        var worker = getSimpleWorker(),
            parameter = {
                arbitrary: 'object'
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.generateJsonURL,
                    object: parameter
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
                expect(msg.result).deep.equal(parameter);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should get seed info and 3 seed project files must exist', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({command: CONSTANTS.workerCommands.getSeedInfo});
            })
            .then(function (msg) {
                // FIXME: anything else to check???
                expect(msg.type).equal(CONSTANTS.msgTypes.request);

                return worker.send({command: CONSTANTS.workerCommands.getResult});
            })
            .then(function (msg) {
                // FIXME: anything else to check???
                expect(msg.type).equal(CONSTANTS.msgTypes.result);
                expect(msg.result.file).deep.equal(['ActivePanels', 'EmptyProject', 'SignalFlowSystem']);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should create a project from a JSON object', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerCreateFromFile';
        deleteProject(projectName, function (err) {
            expect(err).equal(null);

            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
                .then(function (msg) {
                    expect(msg.pid).equal(process.pid);
                    expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                    return worker.send({
                        command: CONSTANTS.workerCommands.createProjectFromFile,
                        name: baseProjectContext.name,
                        json: baseProjectJson
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

                    expect(msg.result).equal(null);
                })
                .finally(restoreProcessFunctions)
                .nodeify(done);
        });
    });

    it('should fail createProjectFromFile with no parameters name and json', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({command: CONSTANTS.workerCommands.createProjectFromFile});
            })
            .catch(function (err) {
                expect(err.message).equal('invalid parameters');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should export a sub-tree of a project', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    name: baseProjectContext.name,
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

    it('should fail to export a sub-tree of a project if wrong root hash is given', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.exportLibrary,
                    name: baseProjectContext.name,
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

    it.skip('should fail to export sub-tree with an unknown starting path');

    it('should dump nodes of a project', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.dumpMoreNodes,
                    name: baseProjectContext.name,
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

    it('should set and get a project\'s info', function (done) {
        var worker = getSimpleWorker(),
            projectInfo = {
                arbitrary: 'json object'
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.setProjectInfo,
                    webGMESessionId: 'mySession',
                    projectId: baseProjectContext.name,
                    info: projectInfo
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

                expect(msg.result).equal(null);

                return worker.send({
                    command: CONSTANTS.workerCommands.getProjectInfo,
                    webGMESessionId: 'mySession',
                    projectId: baseProjectContext.name
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

                expect(msg.result).deep.equal(projectInfo);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should return all used info tags from the database', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.getAllInfoTags,
                    webGMESessionId: 'mySession',
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
                expect(typeof msg.result).equal('object');
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it.only('should create a project from db seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromDB';

        deleteProject(projectName, function (err) {
            expect(err).equal(null);

            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
                .then(function (msg) {
                    expect(msg.pid).equal(process.pid);
                    expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                    return worker.send({
                        command: CONSTANTS.workerCommands.seedProject,
                        projectName: projectName,
                        type: 'db',
                        seedName: baseProjectContext.name,
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
                    expect(msg.error).equal(null);


                    return worker.send({
                        command: CONSTANTS.workerCommands.getAllProjectsInfo,
                        userId: 'myUser'
                    });
                })
                .then(function (/*msg*/) {

                    return worker.send({command: CONSTANTS.workerCommands.getResult});
                })
                .then(function (msg) {

                    expect(msg.result).not.equal(null);
                    expect(msg.result).to.include.keys(projectName);
                })
                .finally(restoreProcessFunctions)
                .nodeify(done);
        });
    });

    it('should create a project from file seed', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromFile';

        deleteProject(projectName, function (err) {
            expect(err).equal(null);

            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
                .then(function (msg) {
                    expect(msg.pid).equal(process.pid);
                    expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                    return worker.send({
                        command: CONSTANTS.workerCommands.seedProject,
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
                    expect(msg.error).equal(null);


                    return worker.send({
                        command: CONSTANTS.workerCommands.getAllProjectsInfo,
                        userId: 'myUser'
                    });
                })
                .then(function (/*msg*/) {

                    return worker.send({command: CONSTANTS.workerCommands.getResult});
                })
                .then(function (msg) {

                    expect(msg.result).not.equal(null);
                    expect(msg.result).to.include.keys(projectName);
                })
                .finally(restoreProcessFunctions)
                .nodeify(done);
        });
    });

    it('should create and delete branches of project', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.setBranch,
                    webGMESessionId: 'mySession',
                    project: baseProjectContext.name,
                    branch: 'wrokerSetBranch',
                    old: '',
                    new: baseProjectContext.commitHash
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
                expect(msg.error).equal(null);


                return worker.send({
                    command: CONSTANTS.workerCommands.setBranch,
                    webGMESessionId: 'mySession',
                    project: baseProjectContext.name,
                    branch: 'wrokerSetBranch',
                    old: baseProjectContext.commitHash,
                    new: ''
                });
            })
            .then(function (/*msg*/) {

                return worker.send({command: CONSTANTS.workerCommands.getResult});
            })
            .then(function (msg) {

                expect(msg.error).equal(null);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should be able to start-query-stop addon', function (done) {
        var worker = getSimpleWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart,
                    webGMESessionId: 'mySession',
                    project: baseProjectContext.name,
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
                    arbitrary: 'object'
                });
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.query);
                expect(msg.error).equal(null);

                expect(msg.result).not.equal(null);
                console.log(msg.result);
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

    it('should execute a plugin', function (done) {
        var worker = getSimpleWorker(),
            projectName = 'workerSeedFromFile',
            pluginContext = {
                managerConfig: {
                    host: '127.0.0.1', //FIXME
                    port: '27017', //FIXME
                    database: "webgme_tests", //FIXME
                    project: baseProjectContext.name,
                    token: '',
                    selected: '',
                    commit: baseProjectContext.commitHash,
                    branchName: baseProjectContext.branch,
                    activeSelection: []
                }
            };

        //deleteProject(projectName, function (err) {
        //    expect(err).equal(null);

            worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
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
                    expect(msg.result.success).equal(true);
                    expect(msg.result.pluginName).equal('Minimal Working Example');
                })
                .finally(restoreProcessFunctions)
                .nodeify(done);
//        });
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
        deleteProject(projectName, function (err) {
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
});