/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('Safestorage', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('memory'),
        Q = testFixture.Q,

        gmeAuth,
        projectName = 'newProject',
        guestAccount = gmeConfig.authentication.guestAccount;


    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.all([
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    describe('getCommits', function () {
        var safeStorage,
            commitHash;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return safeStorage.deleteProject({projectName: projectName});
                })
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    commitHash = result.commitHash;
                    return Q();
                })
                .nodeify(done);
        });

        it('should getCommits using timestamp', function (done) {
            var data = {
                projectName: projectName,
                number: 10,
                before: (new Date()).getTime() + 1
            };

            safeStorage.getCommits(data)
                .then(function (commits) {
                    expect(commits.length).equal(1);
                    expect(commits[0]._id === commitHash);
                    done();
                })
                .catch(done);
        });

        it('should getCommits using commitHash', function (done) {
            var data = {
                projectName: projectName,
                number: 10,
                before: commitHash
            };

            safeStorage.getCommits(data)
                .then(function (commits) {
                    expect(commits.length).equal(1);
                    expect(commits[0]._id === commitHash);
                    done();
                })
                .catch(done);
        });

        it('should fail getCommits using commitHash if invalid hash given', function (done) {
            var data = {
                projectName: projectName,
                number: 10,
                before: 'invalidHash'
            };

            safeStorage.getCommits(data)
                .then(function () {
                    done(new Error('should have failed with error'));
                })
                .catch(function (err) {
                    expect(err).to.not.equal(null);
                    expect(typeof err).to.equal('object');
                    expect(err.message).to.equal('Invalid argument, data.before is not a number nor a valid hash.');
                    done();
                });
        });

        it('should fail getCommits using commitHash if hash does not exist', function (done) {
            var dummyHash = '#12312312312313123',
                data = {
                projectName: projectName,
                number: 10,
                before: dummyHash
            };

            safeStorage.getCommits(data)
                .then(function () {
                    done(new Error('should have failed with error'));
                })
                .catch(function (err) {
                    expect(err).to.not.equal(null);
                    expect(typeof err).to.equal('object');
                    expect(err.message).to.equal('object does not exist ' + dummyHash);
                    done();
                });
        });
    });
});