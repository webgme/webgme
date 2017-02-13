/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('./../_globals.js');

describe('issue110 testing', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        should = testFixture.should,
        logger = testFixture.logger.fork('issue110.spec'),
        storage = null,

        projectName = 'issue110test',
        projectId = testFixture.projectName2Id(projectName),
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectId: projectId});
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    beforeEach(function (done) {
        gmeAuth.authorizeByUserId(gmeConfig.authentication.guestAccount, projectId, 'create',
            {
                read: true,
                write: true,
                delete: true
            }
        )
            .then(function () {
                return storage.deleteProject({projectId: projectId});
            })
            .nodeify(done);

    });

    it('import the problematic project', function (done) {
        testFixture.importProject(storage,
            {
                projectSeed: './test/issue/110/input.webgmex',
                projectName: projectName,
                gmeConfig: gmeConfig,
                logger: logger
            }, function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                expect(result).to.contain.any.keys(['rootNode']);
                expect(result).to.contain.any.keys(['core']);
                done();
            });
    });

    it('checks the ownJsonMeta of node \'specialTransition\'', function (done) {
        var core,
            rootHash,
            root;

        testFixture.importProject(storage,
            {
                projectSeed: './test/issue/110/input.webgmex',
                projectName: projectName,
                gmeConfig: gmeConfig,
                logger: logger
            }, function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                core = result.core;
                rootHash = result.core.getHash(result.rootNode);
                core.loadRoot(rootHash, function (err, r) {
                    if (err) {
                        return done(err);
                    }
                    root = r;
                    core.loadByPath(root, '/1402711366/1821421774', function (err, node) {
                        var meta;
                        if (err) {
                            return done(err);
                        }
                        meta = core.getOwnJsonMeta(node);
                        meta.pointers.should.exist;
                        meta.pointers.src.should.exist;
                        meta.pointers.src.items.should.exist;
                        meta.pointers.src.items.should.be.instanceof(Array);
                        done();
                    });
                });
            });
    });

    it('checks the ownJsonMeta of node \'specialState\'', function (done) {
        var core,
            rootHash,
            root;

        testFixture.importProject(storage,
            {
                projectSeed: './test/issue/110/input.webgmex',
                projectName: projectName,
                gmeConfig: gmeConfig,
                logger: logger
            }, function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                core = result.core;
                rootHash = result.core.getHash(result.rootNode);

                core.loadRoot(rootHash, function (err, r) {
                    if (err) {
                        return done(err);
                    }
                    root = r;
                    core.loadByPath(root, '/1402711366/1021878489', function (err, node) {
                        var meta;
                        if (err) {
                            return done(err);
                        }
                        meta = core.getOwnJsonMeta(node);
                        meta.aspects.should.exist;
                        meta.aspects.asp.should.exist;
                        meta.aspects.asp.should.be.instanceof(Array);
                        done();
                    });
                });
            });
    });
});