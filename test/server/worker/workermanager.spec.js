/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('ServerWorkerManager', function () {
    'use strict';

    var logger = testFixture.logger.fork('workermanager.spec'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        agent = testFixture.superagent.agent(),
        guestAccount = gmeConfig.authentication.guestAccount,
        storage,
        webGMESessionId,
        server,
        workerConstants = require('../../../src/server/worker/constants'),
        ServerWorkerManager = require('../../../src/server/worker/serverworkermanager'),
        workerManagerParameters = {
            globConf: gmeConfig,
            logger: logger,
        },
        projectName = 'SWMProject',
        projectId = testFixture.projectName2Id(projectName),
        gmeAuth;

    gmeConfig.server.maxWorkers = 3;
    gmeConfig.addOn.enable = true;

    before(function (done) {
        //adding some project to the database
        server = testFixture.WebGME.standaloneServer(gmeConfig);

        server.start(function (err) {
            expect(err).to.equal(null);

            testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return storage.openDatabase();
                })
                .then(function () {
                    return testFixture.forceDeleteProject(storage, gmeAuth, projectName);
                })
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'test/server/worker/workermanager/basicProject.json',
                        projectName: projectName,
                        branchName: 'master',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (/*result*/) {
                    return testFixture.openSocketIo(server, agent, guestAccount, guestAccount);
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
            testFixture.forceDeleteProject(storage, gmeAuth, projectName)
                .then(function () {
                    return Q.allSettled([
                        storage.closeDatabase(),
                        gmeAuth.unload()
                    ]);
                })
                .nodeify(done);
        });
    });

    describe('open-close handling', function () {

        var swm;

        before(function () {
            swm = new ServerWorkerManager(workerManagerParameters);
        });

        it.skip('should reserve a worker when starts', function (/*done*/) {

        });

        it('should handle multiple stop gracefully', function (done) {
            swm.start();
            swm.stop(function (err) {
                expect(err).to.equal(null);
                swm.stop(function (err) {
                    expect(err).to.equal(null);
                    done();
                });
            });
        });

        it('should handle multiple start gracefully', function (done) {
            swm.start();
            swm.start();
            swm.start();
            swm.start();
            swm.stop(function (err) {
                expect(err).to.equal(null);
                done();
            });
        });

        it('should handle start stop start stop', function (done) {
            swm.start();
            swm.stop(function (err) {
                expect(err).to.equal(null);

                swm.start();
                swm.stop(function (err) {
                    expect(err).to.equal(null);
                    done();
                });
            });
        });
    });

    describe('bad request handling', function () {

        var swm,
            ownGmeConfig = JSON.parse(JSON.stringify(gmeConfig)),
            managerParameters = {
                globConf: ownGmeConfig,
                logger: logger,
            };

        ownGmeConfig.addOn.enable = false;

        before(function () {
            swm = new ServerWorkerManager(managerParameters);
            swm.start();
        });

        after(function (done) {
            swm.stop(done);
        });

        it('should respond with error to unknown request', function (done) {
            swm.request({command: 'unknown command'}, function (err/*, resultId*/) {
                expect(err).not.to.equal(null);
                done();
            });
        });

        it('should fail to start addOn as it is disabled', function (done) {
            var addOnRequest = {
                command: 'connectedWorkerStart',
                workerName: 'TestAddOn',
                projectId: projectId,
                webGMESessionId: webGMESessionId,
                branch: 'master'
            };

            swm.request(addOnRequest, function (err/*, id*/) {
                expect(err).not.to.equal(null);

                expect(err).to.include('not enabled');

                done();
            });
        });

        it('should fail to proxy query to an unknown id', function (done) {
            swm.query('no id', {}, function (err/*, result*/) {
                expect(err).not.to.equal(null);

                expect(err).to.contain('identification');

                done();
            });
        });
    });

    describe('simple request-result handling', function () {

        function exportLibrary(next) {
            swm.request({
                command: workerConstants.workerCommands.exportLibrary,
                branchName: 'master',
                webGMESessionId: webGMESessionId,
                projectId: projectId,
                path: '/323573539'
            }, function (err, resultId) {
                expect(err).to.equal(null);

                swm.result(resultId, function (err, result) {
                    expect(err).to.equal(null);
                    expect(result).to.include.keys('bases', 'root', 'relids', 'containment', 'nodes', 'metaSheets');
                    next();
                });
            });
        }

        var swm;

        before(function (done) {
            swm = new ServerWorkerManager(workerManagerParameters);
            swm.start();
            setTimeout(done, 100);
        });

        after(function (done) {
            swm.stop(done);
        });

        it('should handle a single request', function (done) {
            exportLibrary(done);
        });

        it('should handle multiple requests', function (done) {
            var needed = 3,
                i,
                requestHandled = function () {
                    needed -= 1;
                    if (needed === 0) {
                        done();
                    }
                };

            for (i = 0; i < needed; i += 1) {
                exportLibrary(requestHandled);
            }
        });

        it('should handle more requests simultaneously than workers allowed', function (done) {
            var needed = gmeConfig.server.maxWorkers + 1,
                i,
                requestHandled = function () {
                    needed -= 1;
                    if (needed === 0) {
                        done();
                    }
                };

            for (i = 0; i < needed; i += 1) {
                exportLibrary(requestHandled);
            }
        });
    });

    describe('connected worker handling', function () {
        var swm,
            getConnectedWorkerStartRequest = function () {
                return {
                    command: workerConstants.workerCommands.connectedWorkerStart,
                    workerName: 'TestAddOn',
                    projectId: projectId,
                    webGMESessionId: webGMESessionId,
                    branch: 'master'
                };
            };

        before(function () {
            swm = new ServerWorkerManager(workerManagerParameters);
        });

        beforeEach(function (done) {
            swm.start();
            setTimeout(done, 100);
        });

        afterEach(function (done) {
            swm.stop(done);
        });

        it('should start and stop connected worker', function (done) {
            swm.request(getConnectedWorkerStartRequest(), function (err, id) {
                expect(err).to.equal(null);
                swm.result(id, function (err) {
                    expect(err).to.equal(null);

                    done();
                });
            });
        });

        it('should proxy the query to the connected worker', function (done) {

            swm.request(getConnectedWorkerStartRequest(), function (err, id) {
                expect(err).to.equal(null);
                swm.query(id, {}, function (err/*, result*/) {
                    expect(err).to.equal(null);

                    swm.result(id, function (err) {
                        expect(err).to.equal(null);

                        done();
                    });
                });
            });
        });

        it('should fail to proxy queries after swm stop', function (done) {

            swm.request(getConnectedWorkerStartRequest(), function (err, id) {
                expect(err).to.equal(null);
                swm.query(id, {}, function (err/*, result*/) {
                    expect(err).to.equal(null);

                    swm.stop(function () {
                        swm.query(id, {}, function (err/*, result*/) {
                            expect(err).not.to.equal(null);

                            expect(err).to.contain('handler cannot be found');

                            done();
                        });
                    });
                });
            });
        });

        it('should fail to proxy connected worker close after swm stop', function (done) {

            swm.request(getConnectedWorkerStartRequest(), function (err, id) {
                expect(err).to.equal(null);

                swm.query(id, {}, function (err/*, result*/) {
                    expect(err).to.equal(null);

                    swm.stop(function () {
                        swm.result(id, function (err) {
                            expect(err).not.to.equal(null);

                            expect(err).to.contain('handler cannot be found');

                            done();
                        });
                    });
                });
            });
        });
    });
});