/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals.js');

describe('AddOnWorkerManager', function () {
    'use strict';

    var logger = testFixture.logger.fork('AddOnWorkerManager'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        agent = testFixture.superagent.agent(),
        guestAccount = gmeConfig.authentication.guestAccount,
        storage,
        webgmeToken,
        server,
        AddOnWorkerManager = require('../../src/addon/addonworkermanager'),
        CONSTANTS = require('../../src/server/worker/constants'),
        workerManagerParameters = {
            gmeConfig: gmeConfig,
            logger: logger
        },
        projectName = 'AddOnWorkerManager',
        projectId = testFixture.projectName2Id(projectName),
        gmeAuth;

    gmeConfig.server.maxWorkers = 3;
    gmeConfig.addOn.enable = true;
    gmeConfig.addOn.monitorTimeout = 1000;

    before(function (done) {
        //adding some project to the database
        this.timeout(10000);
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
                webgmeToken = result.webgmeToken;
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
        var awm,
            getParams = function (join) {
                return {
                    webgmeToken: webgmeToken,
                    projectId: projectId,
                    branchName: 'master',
                    command: join ? CONSTANTS.workerCommands.connectedWorkerStart :
                        CONSTANTS.workerCommands.connectedWorkerStop
                };
            };

        before(function () {
            awm = new AddOnWorkerManager(workerManagerParameters);
        });

        beforeEach(function (done) {
            awm.start(done);
        });

        afterEach(function (done) {
            awm.stop(done);
        });

        it('should clear awm.connectedWorkerId after after stop', function (done) {
            awm.connectedWorkerRequests.push({
                request: getParams(false),
                cb: function (err) {
                    try {
                        expect(err).to.equal(null);
                        expect(awm.connectedWorkerId).to.not.equal(null);
                    } catch (e) {
                        return done(e);
                    }

                    awm.stop(function (err) {
                        try {
                            expect(err).to.equal(null);
                            expect(awm.connectedWorkerId).to.equal(null);
                            done();
                        } catch (e) {
                            return done(e);
                        }
                    });
                }
            });
        });
    });
});