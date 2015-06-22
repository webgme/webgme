/*jshint node:true, mocha:true */

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals');

describe('apply CLI tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('apply.spec'),
        expect = testFixture.expect,
        storage,
        gmeAuth,
        applyCLI = require('../../src/bin/apply'),
        Q = testFixture.Q,
        filename = require('path').normalize('src/bin/apply.js'),
        oldLogFunction = console.log,
        oldWarnFunction = console.warn,
        oldStdOutFunction = process.stdout.write,
        applyCliTestProject = 'applyCliTest';

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, applyCliTestProject)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectId: applyCliTestProject});
            })
            .then(function () {
                testFixture.importProject(storage, {
                    projectName: applyCliTestProject,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/bin/apply/base001.json',

                });
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.deleteProject({
            projectName: applyCliTestProject
        })
            .then(function () {
                return Q.all([
                    gmeAuth.unload(),
                    storage.closeDatabase()
                ]);
            })
            .nodeify(done);
    });

    beforeEach(function () {
        console.log = function () {
        };
        process.stdout.write = function () {
        };
        console.warn = function () {

        };
    });

    afterEach(function () {
        console.log = oldLogFunction;
        console.warn = oldWarnFunction;
        process.stdout.write = oldStdOutFunction;
    });

    it('should have a main', function () {
        applyCLI.should.have.property('main');
    });

    it('should fail if mandatory parameters missing', function (done) {
        applyCLI.main(['node', filename])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.toString()).to.contain('invalid argument');
                done();
            });
    });

    it('should prin all projects', function (done) {
        storage.getProjectNames({username: gmeConfig.authentication.guestAccount})
            .then(function (names) {
                logger.error(names);
                done();
            })
            .catch(done);
    });

    it('should succeed if all parameter is given', function (done) {
        applyCLI.main(['node', filename,
            './test/bin/apply/patch.json',
            '-p', applyCliTestProject,
            '-t', 'master',
            '-u', gmeConfig.authentication.guestAccount,
            '-m', gmeConfig.mongo.uri])
            .nodeify(done);
    });

    it('should succeed with a bad user', function (done) {
        applyCLI.main(['node', filename,
            './test/bin/apply/patch.json',
            '-p', applyCliTestProject,
            '-t', 'master',
            '-u', 'badUser',
            '-m', gmeConfig.mongo.uri])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.toString()).to.contain('badUser');
                done();
            });
    });
});
