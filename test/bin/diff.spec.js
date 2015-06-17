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
        logger = testFixture.logger.fork('diff.spec'),
        diffCLI = require('../../src/bin/diff'),
        importCLI = require('../../src/bin/import'),
        filename = require('path').normalize('src/bin/diff.js'),
        FS = testFixture.fs,
        rimraf = testFixture.rimraf,
        Q = testFixture.Q,
        getJsonProject = function (path) {
            return JSON.parse(FS.readFileSync(path, 'utf-8'));
        },
        oldLogFunction = console.log,
        oldWarnFunction = console.warn,
        oldStdOutFunction = process.stdout.write,

        diffCliTest = 'diffCliTest';

    before(function (done) {
        var jsonProject;

        testFixture.clearDBAndGetGMEAuth(gmeConfig, diffCliTest)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectName: diffCliTest});
            })
            .then(function () {
                jsonProject = getJsonProject('./test/bin/diff/source001.json');
                return Q.nfcall(importCLI.import,
                    storage, gmeConfig, diffCliTest, jsonProject, 'source', true, undefined);
            })
            .then(function () {
                return Q.nfcall(importCLI.import,
                    storage, gmeConfig, diffCliTest, jsonProject, 'target', true, undefined);
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.all([
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
                expect(err.toString()).to.contain('unknownProject');
                done();
            });
    });

    it('should work if all parameters are fine', function (done) {
        diffCLI.main(['node',
            filename, '-p', diffCliTest, '-s', 'source', '-t', 'target', '-u', gmeConfig.authentication.guestAccount])
            .then(function () {
                done();
            })
            .catch(done);
    });

    it('should write its output to file', function (done) {
        diffCLI.main(['node', filename, '-p', diffCliTest, '-s', 'source', '-t', 'target',
            '-u', gmeConfig.authentication.guestAccount, '-o', './test-tmp/diffCli.out'])
            .then(function () {
                done();
            })
            .catch(done);
    });
});
