/*jshint node:true, mocha:true*/
/**
 * This file tests the ServerWorkerManager w.r.t. connected-workers.
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('ServerWorkerManager - ConnectedWorkers', function () {
    'use strict';

    var logger = testFixture.logger.fork('ConnectedWorkerHandling.spec'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        agent = testFixture.superagent.agent(),
        guestAccount = gmeConfig.authentication.guestAccount,
        storage,
        webGMESessionId,
        server,
        ServerWorkerManager = require('../../../src/server/worker/serverworkermanager'),
        workerManagerParameters = {
            globConf: gmeConfig,
            logger: logger
        },
        projectName = 'SWMProject2',
        projectId = testFixture.projectName2Id(projectName),
        gmeAuth;

    gmeConfig.server.maxWorkers = 3;
    gmeConfig.addOn.enable = true;
    gmeConfig.addOn.monitorTimeout = 10;

    before(function (done) {
        //adding some project to the database
        server = testFixture.WebGME.standaloneServer(gmeConfig);

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: 'seeds/EmptyProject.webgmex',
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function () {
                return Q.ninvoke(server, 'start');
            })
            .then(function (/*result*/) {
                return testFixture.openSocketIo(server, agent, guestAccount, guestAccount);
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

    describe('connected worker handling', function () {
        var swm,
            getParams = function (join) {
                return {
                    webGMESessionId: webGMESessionId,
                    projectId: projectId,
                    branchName: 'master',
                    join: join
                };
            };

        before(function () {
            swm = new ServerWorkerManager(workerManagerParameters);
        });

        beforeEach(function (done) {
            swm.start();
            done();
        });

        afterEach(function (done) {
            swm.stop(done);
        });

        it('should clear swm.connectedWorkerId after after stop', function (done) {
            swm.socketRoomChange(getParams(false), function (err, result) {
                expect(err).to.equal(null);
                expect(swm.connectedWorkerId).to.not.equal(null);
                expect(result.connectionCount).to.equal(-1);

                swm.stop(function (err) {
                    expect(err).to.equal(null);
                    expect(swm.connectedWorkerId).to.equal(null);
                    done();
                });
            });
        });

        it('should return connectionCount -1 after join and leave', function (done) {
            swm.socketRoomChange(getParams(true), function (err) {
                expect(err).to.equal(null);
                expect(swm.connectedWorkerId).to.not.equal(null);

            });
            swm.socketRoomChange(getParams(false), function (err, result) {
                expect(err).to.equal(null);
                expect(swm.connectedWorkerId).to.not.equal(null);
                expect(result.connectionCount).to.equal(-1);
                done();
            });
        });

        it('should return connectionCount 0 after join then leave', function (done) {
            swm.socketRoomChange(getParams(true), function (err) {
                expect(err).to.equal(null);
                expect(swm.connectedWorkerId).to.not.equal(null);
                swm.socketRoomChange(getParams(false), function (err, result) {
                    expect(err).to.equal(null);
                    expect(swm.connectedWorkerId).to.not.equal(null);
                    expect(result.connectionCount).to.equal(0);
                    done();
                });
            });
        });
    });
});