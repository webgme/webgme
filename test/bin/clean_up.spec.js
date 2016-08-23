/*jshint node:true, mocha:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('Clean UP CLI tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('apply.spec'),
        expect = testFixture.expect,
        storage,
        gmeAuth,
        cleanUp = require('../../src/bin/clean_up'),
        Q = testFixture.Q;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return Q.allDone([
                    testFixture.importProject(storage, {
                        projectName: 'Commits2',
                        logger: logger,
                        gmeConfig: gmeConfig,
                        projectSeed: './seeds/EmptyProject.webgmex'
                    }),
                    testFixture.importProject(storage, {
                        projectName: 'Branches2',
                        logger: logger,
                        gmeConfig: gmeConfig,
                        projectSeed: './seeds/EmptyProject.webgmex'
                    }),
                    testFixture.importProject(storage, {
                        projectName: 'Commits1',
                        logger: logger,
                        gmeConfig: gmeConfig,
                        projectSeed: './seeds/EmptyProject.webgmex'
                    }),
                    testFixture.importProject(storage, {
                        projectName: 'Branches1',
                        logger: logger,
                        gmeConfig: gmeConfig,
                        projectSeed: './seeds/EmptyProject.webgmex'
                    }),
                    testFixture.importProject(storage, {
                        projectName: 'StartsWithMatch',
                        logger: logger,
                        gmeConfig: gmeConfig,
                        projectSeed: './seeds/EmptyProject.webgmex'
                    }),
                    testFixture.importProject(storage, {
                        projectName: 'something',
                        logger: logger,
                        gmeConfig: gmeConfig,
                        projectSeed: './seeds/EmptyProject.webgmex'
                    })]
                );
            })
            .then(function (res) {
                return Q.all([
                    res[0].project.makeCommit(null, [res[0].commitHash], res[0].rootHash, {}, 'a new c'),
                    res[1].project.createBranch('b1', res[1].commitHash)
                ]);
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            storage.closeDatabase()
        ])
            .nodeify(done);
    });

    it('should make a dry run and not delete any projects', function (done) {
        var params = {
                daysAgo: 0
            },
            preCount;

        storage.getProjects({})
            .then(function (projs) {
                preCount = projs.length;

                return cleanUp(params);
            })
            .then(function () {
                return storage.getProjects({});
            })
            .then(function (projs) {
                expect(projs.length).equal(preCount);
            })
            .nodeify(done);
    });

    it('should make a dry run and not delete any projects and list', function (done) {
        var params = {
                daysAgo: 0,
                list: true
            },
            preCount;

        storage.getProjects({})
            .then(function (projs) {
                preCount = projs.length;

                return cleanUp(params);
            })
            .then(function () {
                return storage.getProjects({});
            })
            .then(function (projs) {
                expect(projs.length).equal(preCount);
            })
            .nodeify(done);
    });

    it('should throw error with unknown user', function (done) {
        var params = {
            username: 'unknown'
        };
        cleanUp(params)
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('no such user');
            })
            .nodeify(done);
    });

    it('should remove one project matching name', function (done) {
        var params = {
                regex: '^StartsWith',
                del: true,
                daysAgo: 0,
                branches: 1,
                commits: 1
            },
            preCount;

        storage.getProjects({})
            .then(function (projs) {
                preCount = projs.length;

                return cleanUp(params);
            })
            .then(function () {
                return storage.getProjects({});
            })
            .then(function (projs) {
                expect(projs.length).equal(preCount - 1);
            })
            .nodeify(done);
    });

    it('should only remove project with right nbr of commits', function (done) {
        var params = {
                regex: '^Commits',
                del: true,
                daysAgo: 0,
                branches: 1,
                commits: 1
            },
            preCount;

        storage.getProjects({})
            .then(function (projs) {
                preCount = projs.length;

                return cleanUp(params);
            })
            .then(function () {
                return storage.getProjects({});
            })
            .then(function (projs) {
                expect(projs.length).equal(preCount - 1);
            })
            .nodeify(done);
    });

    it('should only remove project with right nbr of branches', function (done) {
        var params = {
                regex: '^Branches',
                del: true,
                daysAgo: 0,
                branches: 1,
                commits: 1
            },
            preCount;

        storage.getProjects({})
            .then(function (projs) {
                preCount = projs.length;

                return cleanUp(params);
            })
            .then(function () {
                return storage.getProjects({});
            })
            .then(function (projs) {
                expect(projs.length).equal(preCount - 1);
            })
            .nodeify(done);
    });

    it('should not remove when viewed after days ago', function (done) {
        var params = {
                del: true,
                daysAgo: 10,
                branches: 1,
                commits: 1
            },
            preCount;

        storage.getProjects({})
            .then(function (projs) {
                preCount = projs.length;

                return cleanUp(params);
            })
            .then(function () {
                return storage.getProjects({});
            })
            .then(function (projs) {
                expect(projs.length).equal(preCount);
            })
            .nodeify(done);
    });
});