/*jshint node:true, mocha:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');


describe('Connected worker', function () {
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

        logger = testFixture.logger.fork('connectedworker.spec'),
        storage,
        ir1,
        ir2,
        commitHashAfterMod,
        oldSend = process.send,
        oldOn = process.on,
        oldExit = process.exit;


    before(function (done) {
        // We're not going through the server to start the connected-workers.
        // Disableing should save some resources..
        gmeConfig.addOn.enable = false;
        gmeConfig.addOn.monitorTimeout = 10;

        server = WebGME.standaloneServer(gmeConfig);

        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return Q.allDone([
                    testFixture.importProject(storage,
                        {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: 'ConnectedWorkerProject1',
                            branchName: 'master',
                            gmeConfig: gmeConfig,
                            logger: logger
                        }),
                    testFixture.importProject(storage,
                        {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: 'Constraints',
                            branchName: 'master',
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                ]);
            })
            .then(function (results) {
                ir1 = results[0];
                ir2 = results[1];
                return Q.allDone([
                    ir1.project.createBranch('b1', ir1.commitHash),
                    ir2.project.createBranch('b1', ir2.commitHash)
                ]);
            })
            .then(function () {
                var persisted;
                ir2.core.setRegistry(ir2.rootNode, 'usedAddOns', 'UpdateModelAddOn');
                persisted = ir2.core.persist(ir2.rootNode);

                return ir2.project.makeCommit('b1', [ir2.commitHash], persisted.rootHash,
                    persisted.objects, 'Setting usedAddOns..');
            })
            .then(function (result) {
                commitHashAfterMod = result.hash;
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

    function unloadConnectedWorker() {
        // clear the cached files
        var key,
            i,
            modulesToUnload = [];

        for (key in require.cache) {
            if (require.cache.hasOwnProperty(key)) {
                if (key.indexOf('connectedworker.js') > -1) {
                    modulesToUnload.push(key);
                }
            }
        }

        for (i = 0; i < modulesToUnload.length; i += 1) {
            delete require.cache[modulesToUnload[i]];
        }
    }

    function getConnectedWorker() {
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

        unloadConnectedWorker();

        require('./../../../src/server/worker/connectedworker');

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

    // Initialize
    it('should initialize worker with a valid gmeConfig', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should respond with no error to a second initialization request', function (done) {
        var worker = getConnectedWorker();

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
        var worker = getConnectedWorker();

        worker.send({
            command: CONSTANTS.workerCommands.connectedWorkerStart
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

    // Common behaviour
    it('should be able to start-start-stop connectedWorker', function (done) {
        var worker = getConnectedWorker(),
            params = {
                command: CONSTANTS.workerCommands.connectedWorkerStart,
                webGMESessionId: webGMESessionId,
                projectId: ir1.project.projectId,
                branchName: 'master'
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(Object.create(params));
            })
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);
                return worker.send(Object.create(params));
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStop,
                    webGMESessionId: webGMESessionId,
                    projectId: ir1.project.projectId,
                    branchName: 'master'
                });
            })
            .then(function (msg) {
                expect(msg.error).equal(null);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.result.connectionCount).equal(-1);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should be able to start-start-stop connectedWorker and start UpdateModelAddOn', function (done) {
        var worker = getConnectedWorker(),
            params = {
                command: CONSTANTS.workerCommands.connectedWorkerStart,
                webGMESessionId: webGMESessionId,
                projectId: ir2.project.projectId,
                branchName: 'b1'
            };

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send(Object.create(params));
            })
            .then(function (msg) {

                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);
                return worker.send(Object.create(params));
            })
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.error).equal(null);

                function delayedBranchHash() {
                    var deferred = Q.defer();

                    setTimeout(function () {

                        deferred.promise = ir2.project.getBranchHash('b1')
                            .then(deferred.resolve)
                            .catch(deferred.reject);
                    }, 1000);

                    return deferred.promise;
                }

                return delayedBranchHash();
            })
            .then(function (hash) {
                expect(hash).to.not.equal(ir2.commitHash);
                expect(hash).to.not.equal(commitHashAfterMod);

                return testFixture.loadRootNodeFromCommit(ir2.project, ir2.core, hash);
            })
            .then(function (newRoot) {
                var stopParams = Object.create(params);
                expect(ir2.core.getAttribute(newRoot, 'name')).to.equal('ROOT_');

                stopParams.command = CONSTANTS.workerCommands.connectedWorkerStop;

                return worker.send(stopParams);
            })
            .then(function (msg) {
                expect(msg.error).equal(null);
                expect(msg.type).equal(CONSTANTS.msgTypes.request);
                expect(msg.result.connectionCount).equal(-1);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should connectedWorkerStop with no running AddOnManager for project', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStop,
                    webGMESessionId: webGMESessionId,
                    projectId: ir1.project.projectId,
                    branchName: 'master'
                });
            })
            .then(function (msg) {
                expect(msg.error).to.equal(null);
                expect(msg.result.connectionCount).to.equal(-1);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    // Invalid parameters
    it('should fail to startConnectedWorker with invalid parameters', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart,
                    webGMESessionId: webGMESessionId,
                    projectId: ir1.project.projectId
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

    it('should fail to startConnectedWorker with invalid parameters 2', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart,
                    webGMESessionId: webGMESessionId,
                    branchName: 'master'
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

    it('should fail to stopConnectedWorker with invalid parameters', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStop,
                    webGMESessionId: webGMESessionId,
                    projectId: ir1.project.projectId
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

    it('should fail to stopConnectedWorker with invalid parameters 2', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStop,
                    webGMESessionId: webGMESessionId,
                    branchName: 'master'
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

    // wrong / no command
    it('should fail to execute wrong command', function (done) {
        var worker = getConnectedWorker();

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
        var worker = getConnectedWorker();

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

    // Failing cases
    it('should fail with error startConnectedWorker with non-existing project', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart,
                    webGMESessionId: webGMESessionId,
                    projectId: 'DoesNotExist',
                    branchName: 'master'
                });
            })
            .then(function (/*msg*/) {
                done(new Error('Missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Not authorized to read project');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });

    it('should fail with error startConnectedWorker with non-existing branch', function (done) {
        var worker = getConnectedWorker();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);

                return worker.send({
                    command: CONSTANTS.workerCommands.connectedWorkerStart,
                    webGMESessionId: webGMESessionId,
                    projectId: ir1.project.projectId,
                    branchName: 'branchDoesNotExist'
                });
            })
            .then(function (/*msg*/) {
                done(new Error('Missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.contain('Branch "branchDoesNotExist" does not exist');

                done();
            })
            .finally(restoreProcessFunctions)
            .done();
    });
});