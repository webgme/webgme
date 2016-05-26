/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('export CLI tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        exportCli = require('../../src/bin/export'),
        filename = require('path').normalize('src/bin/export.js'),
        projectName = 'exportCliTest',
        __should = testFixture.should,
        //projectId = testFixture.projectName2Id(projectName),
        outputPath = './test-tmp/exportCliTest.out',
        Q = testFixture.Q,
        logger = testFixture.logger.fork('export.spec'),
        storage,
        gmeAuth,
        oldLogFunction = console.log,
        oldWarnFunction = console.warn,
        oldStdOutFunction = process.stdout.write,
        jsonProject;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/ActivePanels.webgmex'
                });
            })
            .then(function () {
                //jsonProject = JSON.parse(testFixture.fs.readFileSync('./seeds/ActivePanels.json'));
            })
            .nodeify(done);

    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            storage.closeDatabase(),
            Q.nfcall(testFixture.rimraf, outputPath)
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
        exportCli.should.have.property('main');
    });

    it('should fail if mandatory parameters missing', function (done) {
        exportCli.main(['node', filename])
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

    it('should fail to export if wrong owner is given', function (done) {
        exportCli.main(['node', filename,
            '-m', gmeConfig.mongo.uri,
            '-p', projectName,
            '-o', 'badOwner',
            '-u', 'badOwner',
            '-s', 'master'
        ])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.include('invalid argument');
                done();
            })
            .done();
    });

    it('should fail to export from a wrong branch', function (done) {
        exportCli.main(['node', filename,
            '-p', projectName,
            '-u', gmeConfig.authentication.guestAccount,
            '-s', 'badBranch'
        ])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.include('invalid argument');
                done();
            })
            .done();
    });

    it('should export the project into a file', function (done) {
        exportCli.main(['node', filename,
            '-p', projectName,
            '-s', 'master',
            '-f', outputPath
        ])
            .then(function () {
                expect()
                done();
            })
            .catch(done);
    });
});
