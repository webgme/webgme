/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../../_globals.js');

describe('storage storageclasses watchers', function () {
    'use strict';
    var NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        STORAGE_CONSTANTS = testFixture.requirejs('common/storage/constants'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        openSocketIo = testFixture.openSocketIo,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        projectName2Id = testFixture.projectName2Id,

        expect = testFixture.expect,

        agent,
        socket,
        logger = testFixture.logger.fork('watchers.spec'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        safeStorage,
        storage,
        webgmeToken,

        projectName = 'SimpleAPIProject',
        projectNameCreate = 'SimpleAPICreateProject',
        projectNameCreate2 = 'SimpleAPICreateProject2',
        projectNameDelete = 'SimpleAPIDeleteProject',
        importResult,
        originalHash,
        commitHash1,
        commitHash2;

    before(function (done) {
        var commitObject,
            commitData;

        server = WebGME.standaloneServer(gmeConfig);
        server.start(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName, projectNameCreate, projectNameCreate2, projectNameDelete])
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .then(function () {
                    return Q.allDone([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                    ]);
                })
                .then(function (results) {
                    importResult = results[0]; // projectName
                    originalHash = importResult.commitHash;

                    commitObject = importResult.project.createCommitObject([originalHash],
                        importResult.rootHash,
                        'tester1',
                        'commit msg 1');
                    commitData = {
                        projectId: projectName2Id(projectName),
                        commitObject: commitObject,
                        coreObjects: []
                    };

                    return safeStorage.makeCommit(commitData);
                })
                .then(function (result) {
                    commitHash1 = result.hash;

                    commitObject = importResult.project.createCommitObject([originalHash],
                        importResult.rootHash,
                        'tester2',
                        'commit msg 2');
                    commitData = {
                        projectId: projectName2Id(projectName),
                        commitObject: commitObject,
                        coreObjects: []
                    };

                    return safeStorage.makeCommit(commitData);
                })
                .then(function (result) {
                    commitHash2 = result.hash;
                })
                .nodeify(done);
        });
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            Q.allDone([
                gmeAuth.unload(),
                safeStorage.closeDatabase()
            ])
                .nodeify(done);
        });
    });

    beforeEach(function (done) {
        agent = superagent.agent();
        openSocketIo(server, agent, guestAccount, guestAccount)
            .then(function (result) {
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);
                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        done();
                    } else {
                        throw new Error('Unexpected network state: ' + networkState);
                    }
                });
            })
            .catch(done);
    });

    afterEach(function (done) {
        storage.close(function (err) {
            socket.disconnect();
            done(err);
        });
    });

    // FIXME: none of the tests are checking for the results

    it('should watchDatabase and unwatchDatabase', function (done) {
        function eventHandler() {

        }

        Q.ninvoke(storage, 'watchDatabase', eventHandler)
            .then(function () {
                return Q.ninvoke(storage, 'unwatchDatabase', eventHandler);
            })
            .nodeify(done);
    });


    it('should watchDatabase, watchDatabase, unwatchDatabase, and unwatchDatabase', function (done) {
        function eventHandler1() {

        }

        function eventHandler2() {

        }

        Q.ninvoke(storage, 'watchDatabase', eventHandler1)
            .then(function () {
                return Q.ninvoke(storage, 'watchDatabase', eventHandler2);
            })
            .then(function () {
                return Q.ninvoke(storage, 'unwatchDatabase', eventHandler2);
            })
            .then(function () {
                return Q.ninvoke(storage, 'unwatchDatabase', eventHandler1);
            })
            .nodeify(done);
    });

    it('should fail to unwatchDatabase', function (done) {
        function eventHandler() {

        }

        Q.ninvoke(storage, 'unwatchDatabase', eventHandler)
            .then(function () {
                throw new Error('should have failed');
            })
            .catch(function (err) {
                expect(err).to.match(/watchers became negative/);
            })
            .nodeify(done);
    });

    it('should watchProject and unwatchProject', function (done) {
        function eventHandler() {

        }

        Q.ninvoke(storage, 'watchProject', projectName2Id(projectName), eventHandler)
            .then(function () {
                return Q.ninvoke(storage, 'unwatchProject', projectName2Id(projectName), eventHandler);
            })
            .nodeify(done);
    });


    it('should watchProject, watchProject, unwatchProject, and unwatchProject', function (done) {
        function eventHandler1() {

        }

        function eventHandler2() {

        }

        Q.ninvoke(storage, 'watchProject', projectName2Id(projectName), eventHandler1)
            .then(function () {
                return Q.ninvoke(storage, 'watchProject', projectName2Id(projectName), eventHandler2);
            })
            .then(function () {
                return Q.ninvoke(storage, 'unwatchProject', projectName2Id(projectName), eventHandler2);
            })
            .then(function () {
                return Q.ninvoke(storage, 'unwatchProject', projectName2Id(projectName), eventHandler1);
            })
            .nodeify(done);
    });

    it('should fail to unwatchProject', function (done) {
        function eventHandler() {

        }

        Q.ninvoke(storage, 'unwatchProject', projectName2Id(projectName), eventHandler)
            .then(function () {
                throw new Error('should have failed');
            })
            .catch(function (err) {
                expect(err).to.match(/watchers became negative/);
            })
            .nodeify(done);
    });
    
    
    
});