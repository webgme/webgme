/*jshint node:true, mocha:true, expr:true */

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals');

describe('diff CLI tests', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        storage,
        gmeAuth,
        expect = testFixture.expect,
        __should = testFixture.should,
        logger = testFixture.logger.fork('diff.spec'),
        diffCLI = require('../../src/bin/diff'),
        filename = require('path').normalize('src/bin/diff.js'),
        rimraf = testFixture.rimraf,
        Q = testFixture.Q,
        oldLogFunction = console.log,
        oldWarnFunction = console.warn,
        oldStdOutFunction = process.stdout.write,

        projectName = 'diffCliTest';

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
                    branchName: 'source',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/bin/diff/source001.webgmex',

                });
            })
            .then(function (result) {
                /*status: result.status,
                 branchName: branchName,
                 commitHash: commitObject._id,
                 project: project,
                 projectId: project.projectId,
                 core: core,
                 jsonProject: projectJson,
                 rootNode: rootNode,
                 rootHash: persisted.rootHash*/
                return result.project.createBranch('target', result.commitHash);
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            storage.closeDatabase(),
            Q.nfcall(rimraf, './test-tmp/diffCli.out')
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
        diffCLI.should.have.property('main');
    });

    it('should fail if mandatory parameters missing', function (done) {
        diffCLI.main(['node', filename])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.toString()).to.contain('missing argument');
                done();
            });
    });

    it('should fail to work on unknown project', function (done) {
        diffCLI.main(['node', filename, '-p', 'unknownProject', '-s', 'master', '-t', 'other'])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('unknownProject');
                done();
            })
            .done();
    });

    it('should work if all parameters are fine', function (done) {
        diffCLI.main(['node', filename,
            '-m', gmeConfig.mongo.uri,
            '-p', projectName,
            '-s', 'source',
            '-t', 'target',
            '-u', gmeConfig.authentication.guestAccount])
            .then(function () {
                done();
            })
            .catch(done);
    });

    it('should write its output to file', function (done) {
        diffCLI.main(['node', filename,
            '-p', projectName,
            '-o', gmeConfig.authentication.guestAccount,
            '-s', 'source',
            '-t', 'target',
            '-u', gmeConfig.authentication.guestAccount,
            '-f', './test-tmp/diffCli.out'])
            .then(function () {
                done();
            })
            .catch(done);
    });
});
