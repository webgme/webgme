/*globals requireJS*/
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

        usedProjectNames = [
            'workerSeedFromDB',
            'WorkerProject'
        ],
        logger = testFixture.logger.fork('connectedworker.spec'),
        storage,
        project,
        constraintProjectName = 'ConstraintProject',
        protocol = gmeConfig.server.https.enable ? 'https' : 'http',
        oldSend = process.send,
        oldOn = process.on,
        oldExit = process.exit;


    before(function (done) {
        var project;
        //gmeConfig.authentication.enable = true;
        gmeConfig.authentication.allowGuests = true;
        gmeConfig.addOn.enable = true;

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

    function getConnected() {
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
        var worker = getConnected();

        worker.send({command: CONSTANTS.workerCommands.initialize, gmeConfig: gmeConfig})
            .then(function (msg) {
                expect(msg.pid).equal(process.pid);
                expect(msg.type).equal(CONSTANTS.msgTypes.initialized);
            })
            .finally(restoreProcessFunctions)
            .nodeify(done);
    });

    it('should respond with no error to a second initialization request', function (done) {
        var worker = getConnected();

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
        var worker = getConnected();

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

    it('should be able to start-query-stop addon', function (done) {
        var worker = getConnected();

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
        var worker = getConnected();

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
        var worker = getConnected();

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
        var worker = getConnected(),
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
        var worker = getConnected(),
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
        var worker = getConnected(),
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

    // wrong / no command
    it('should fail to execute wrong command', function (done) {
        var worker = getConnected();

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
        var worker = getConnected();

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