/* jshint node:true, mocha:true, expr:true */
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals.js'),
    gmeConfig = testFixture.getGmeConfig();

describe('merge CLI test', function () {
    'use strict';
    var filename = require('path').normalize('src/bin/merge.js'),
        mergeCli = require('../../src/bin/merge'),
        merger = testFixture.requirejs('common/core/users/merge'),
        logger = testFixture.logger.fork('merge.CLI'),
        Q = testFixture.Q,
        expect = testFixture.expect,
        rimraf = testFixture.rimraf,
        __should = testFixture.should,
        database,
        gmeAuth,
        projectName = 'mergeCliTest',
        oldProcessExit = process.exit,
        oldConsoleLog = console.log,
        oldConsoleError = console.error,
        oldProcessStdoutWrite = process.stdout.write,
        oldConsoleWarn = console.warn,
        suppressLogAndExit = function () {
            /*process.exit = function (code) {
             // TODO: would be nice to send notifications for test
             if (saveBuffer) {
             saveBuffer.code = code;
             }
             };*/
            console.log = function () {
            };
            console.error = function () {
            };
            console.warn = console.error;
            process.stdout.write = function () {
            };
        },
        restoreLogAndExit = function () {
            console.log = oldConsoleLog;
            console.error = oldConsoleError;
            console.warn = oldConsoleWarn;
            process.stdout.write = oldProcessStdoutWrite;
            process.exit = oldProcessExit;
        };

    before(function (done) {
        var context;

        testFixture.clearDBAndGetGMEAuth(gmeConfig, ['PluginManagerBase', projectName])
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                database = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return database.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(database, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/bin/merge/base.webgmex',

                });
            })
            .then(function (result) {
                context = result;
                return result.project.createBranch('other', result.commitHash);
            })
            .then(function () {
                return Q.allDone([
                    merger.apply({
                        gmeConfig: gmeConfig,
                        logger: logger.fork('apply'),
                        project: context.project,
                        branchOrCommit: 'master',
                        noUpdate: false,
                        patch: JSON.parse(
                            testFixture.fs.readFileSync('./test/bin/merge/masterDiff.json')
                        )
                    }),
                    merger.apply({
                        gmeConfig: gmeConfig,
                        logger: logger.fork('apply'),
                        project: context.project,
                        branchOrCommit: 'other',
                        noUpdate: false,
                        patch: JSON.parse(
                            testFixture.fs.readFileSync('./test/bin/merge/otherDiff.json')
                        )
                    })
                ]);
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            database.closeDatabase(),
            Q.nfcall(rimraf, './test-tmp/mergeCli*')
        ])
            .nodeify(done);
    });

    beforeEach(function () {
        suppressLogAndExit();
    });

    afterEach(function () {
        restoreLogAndExit();
    });

    it('should have a main', function () {
        mergeCli.should.have.property('main');
    });

    it('should fail if parameters missing', function (done) {
        mergeCli.main(['node', filename])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err instanceof  SyntaxError).to.equal(true);
                expect(err.message).to.contain('invalid parameter');
                done();
            })
            .done();
    });

    it('should fail with wrong owner', function (done) {
        mergeCli.main(['node', filename,
            '-p', projectName,
            '-M', 'master',
            '-T', 'other',
            '-m', gmeConfig.mongo.uri,
            '-u', gmeConfig.authentication.guestAccount,
            '-o', 'badOwner',
            '-f', './test-tmp/mergeCli'])
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

    it('should go create files if prefix is given', function (done) {
        mergeCli.main(['node', filename,
            '-p', projectName,
            '-M', 'master',
            '-T', 'other',
            '-m', gmeConfig.mongo.uri,
            '-u', gmeConfig.authentication.guestAccount,
            '-f', './test-tmp/mergeCli'])
            .then(function () {
                done();
            })
            .catch(function (err) {
                if (err instanceof SyntaxError) {
                    done();
                } else {
                    done(err);
                }
            });
    });

    it('should print to console without prefix', function (done) {
        mergeCli.main(['node', filename,
            '-p', projectName,
            '-M', 'master',
            '-T', 'other',
            '-m', gmeConfig.mongo.uri])
            .then(function () {
                done();
            })
            .catch(function (err) {
                if (err instanceof SyntaxError) {
                    done();
                } else {
                    done(err);
                }
            });
    });

})
;