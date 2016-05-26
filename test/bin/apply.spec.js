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
        __should = testFixture.should,
        gmeAuth,
        applyCLI = require('../../src/bin/apply'),
        Q = testFixture.Q,
        filename = require('path').normalize('src/bin/apply.js'),
        oldLogFunction = console.log,
        oldWarnFunction = console.warn,
        oldStdOutFunction = process.stdout.write,
        projectName = 'applyCliTest',
        projectId = testFixture.projectName2Id(projectName, gmeConfig.authentication.guestAccount);

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    username: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/bin/apply/base001.webgmex'
                });
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
                expect(err.message).to.contain('invalid argument');
                done();
            })
            .done();
    });

    it('should succeed if all parameter is given', function (done) {
        applyCLI.main(['node', filename,
            './test/bin/apply/patch.json',
            '-p', projectName,
            '-t', 'master',
            '-m', gmeConfig.mongo.uri])
            .nodeify(done);
    });

    it('should succeed with specific user name given as well', function (done) {
        applyCLI.main(['node', filename,
            './test/bin/apply/patch.json',
            '-p', projectName,
            '-t', 'master',
            '-u', gmeConfig.authentication.guestAccount,
            '-m', gmeConfig.mongo.uri])
            .nodeify(done);
    });

    it('should fail with a bad user', function (done) {
        applyCLI.main(['node', filename,
            './test/bin/apply/patch.json',
            '-p', projectId,
            '-t', 'master',
            '-u', 'badUser',
            '-m', gmeConfig.mongo.uri])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('badUser');
                done();
            });
    });

    it('should fail with a bad owner', function (done) {
        applyCLI.main(['node', filename,
            './test/bin/apply/patch.json',
            '-p', projectId,
            '-t', 'master',
            '-o', 'badOwner',
            '-m', gmeConfig.mongo.uri])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('badOwner');
                done();
            })
            .done();
    });
})
;
