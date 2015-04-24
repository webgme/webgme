/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('ServerWorkerManager', function () {
    'use strict';
    function sessionToUser(/*sessionID*/) {
        return [true, 'testUser'];
    }

    var WebGME = testFixture.WebGME,
        logger = testFixture.logger,
        expect = testFixture.expect,
        gmeConfig = testFixture.getGmeConfig(),
        MongoStorage = require('../../../src/server/storage/serveruserstorage'),
        workerConstants = require('../../../src/server/worker/constants'),
        ServerWorkerManager = require('../../../src/server/worker/serverworkermanager'),
        workerManagerParameters = {
            sessionToUser: sessionToUser,
            globConf: gmeConfig
        };

    gmeConfig.server.maxWorkers = 5;

    before(function (done) {
        //adding some project to the database
        var storage = new MongoStorage({
            logger: logger.fork('mongoStorage'),
            globConf: gmeConfig
        });
        testFixture.importProject({
            storage: storage,
            filePath: 'test/server/worker/workermanager/basicProject.json',
            projectName: 'SWMProject',
            branchName: 'master',
            gmeConfig: gmeConfig
        }, done);
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

        var swm;

        before(function () {
            swm = new ServerWorkerManager(workerManagerParameters);
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
                project: 'SWMProject',
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

        function getAllProjectsInfo(next) {
            swm.request({command: workerConstants.workerCommands.getAllProjectsInfo}, function (err, resultId) {
                expect(err).to.equal(null);
                swm.result(resultId, function (err, result) {
                    expect(err).to.equal(null);

                    expect(result).to.include.keys('SWMProject');
                    expect(result.SWMProject).to.include.keys('branches', 'rights');
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
            getAllProjectsInfo(done);
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
                getAllProjectsInfo(requestHandled);
            }
        });

        it('should handle more requests simultaneously than workers allowed', function (done) {
            var needed = gmeConfig.server.maxWorkers * 2,
                i,
                requestHandled = function () {
                    needed -= 1;
                    if (needed === 0) {
                        done();
                    }
                };

            for (i = 0; i < needed; i += 1) {
                getAllProjectsInfo(requestHandled);
            }
        });
    });

    describe('connected worker handling', function () {
        var server,
            swm,
            modifiedGmeConfig = JSON.parse(JSON.stringify(gmeConfig)),
            modifiedWorkerManagerParameters = JSON.parse(JSON.stringify(workerManagerParameters)),
            connectedWorkerStartRequest = {
                command: 'connectedWorkerStart',
                workerName: 'TestAddOn',
                project: 'SWMProject',
                branch: 'master'
            };

        modifiedGmeConfig.addOn.enable = true;
        modifiedWorkerManagerParameters.globConf = modifiedGmeConfig;
        before(function (done) {
            server = WebGME.standaloneServer(modifiedGmeConfig);
            server.start(function () {
                swm = new ServerWorkerManager(modifiedWorkerManagerParameters);
                done();
            });
        });

        beforeEach(function () {
            swm.start();
        });

        afterEach(function (done) {
            swm.stop(done);
        });

        after(function (done) {
            server.stop(function (err) {
                expect(err).to.equal(null);
                done();
            });
        });

        it('should start and stop connected worker', function (done) {
            swm.request(connectedWorkerStartRequest, function (err, id) {
                expect(err).to.equal(null);
                swm.result(id, function (err) {
                    expect(err).to.equal(null);

                    done();
                });
            });
        });

        it('should proxy the query to the connected worker', function (done) {

            swm.request(connectedWorkerStartRequest, function (err, id) {
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

            swm.request(connectedWorkerStartRequest, function (err, id) {
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

            swm.request(connectedWorkerStartRequest, function (err, id) {
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