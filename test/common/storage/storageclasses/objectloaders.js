/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../../_globals.js');

describe('storage storageclasses objectloaders', function () {
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
        logger = testFixture.logger.fork('objectloaders.spec'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        safeStorage,
        storage,
        webGMESessionId,

        projectName = 'SimpleAPIProject',
        projectNameCreate = 'SimpleAPICreateProject',
        projectNameCreate2 = 'SimpleAPICreateProject2',
        projectNameDelete = 'SimpleAPIDeleteProject',
        importResult,
        originalHash,
        commitHash1,
        commitHash2;

    gmeConfig.storage.loadBucketSize = 2; // Use this bucket size for testing purposes

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
                    return Q.allSettled([
                        safeStorage.deleteProject({projectId: projectName2Id(projectName)}),
                        safeStorage.deleteProject({projectId: projectName2Id(projectNameCreate)}),
                        safeStorage.deleteProject({projectId: projectName2Id(projectNameCreate2)}),
                        safeStorage.deleteProject({projectId: projectName2Id(projectNameDelete)})
                    ]);
                })
                .then(function () {
                    return Q.allSettled([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                    ]);
                })
                .then(function (results) {
                    importResult = results[0].value; // projectName
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

            Q.allSettled([
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
                webGMESessionId = result.webGMESessionId;
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webGMESessionId,
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
        storage.close(done);
    });

    // helper function for loading objects
    function loadObjects(projectId, hashes, callback) {
        var promises = [],
            hashedObjects = [],
            i;

        function addHashedObject(id, deferred) {
            promises.push(deferred.promise);
            hashedObjects.push({
                hash: hashes[id],
                cb: function (err, node) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(node);
                    }
                }
            });
        }

        for (i = 0; i < hashes.length; i += 1) {
            addHashedObject(i, Q.defer());
        }

        storage.loadObjects(projectId, hashedObjects);

        return Q.allSettled(promises).nodeify(callback);
    }


    it('should loadObject root', function (done) {

        Q.ninvoke(storage, 'loadObject', projectName2Id(projectName), importResult.rootHash)
            .then(function (node) {
                expect(node._id).to.equal(importResult.rootHash);
            })
            .nodeify(done);
    });

    it('should loadObjects [root]', function (done) {

        loadObjects(projectName2Id(projectName), [importResult.rootHash])
            .then(function (promises) {
                var node;
                expect(promises.length).to.equal(1);
                node = promises[0].value;
                expect(node._id).to.equal(importResult.rootHash);
            })
            .nodeify(done);
    });

    it('should fail to loadObjects [invalidHash]', function (done) {

        loadObjects(projectName2Id(projectName), ['invalid'])
            .then(function (promises) {
                expect(promises[0].state).to.equal('rejected');
                expect(promises[0].reason).to.match(/invalid hash/);
            })
            .nodeify(done);
    });


    it('should reach bucket size limit loadObject root three times', function (done) {

        Q.allSettled(
            Q.ninvoke(storage, 'loadObject', projectName2Id(projectName), importResult.rootHash),
            Q.ninvoke(storage, 'loadObject', projectName2Id(projectName), importResult.rootHash),
            Q.ninvoke(storage, 'loadObject', projectName2Id(projectName), importResult.rootHash)
        )
            .then(function (promises) {
                expect(promises.length).to.equal(0); // FIXME: is this right? no callback called???
            })
            .nodeify(done);
    });


    it('should throw if not authorized to read project loadObject', function (done) {

        Q.ninvoke(storage, 'loadObject', projectName2Id('not_authorized'), importResult.rootHash)
            .then(function () {
                done(new Error('should have failed'));
            })
            .catch(function (err) {
                expect(err).to.match(/Not authorized to read project/);
            })
            .nodeify(done);
    });
});