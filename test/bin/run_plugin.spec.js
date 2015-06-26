/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../_globals');

describe.skip('Run plugin CLI', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('run_plugin.spec'),
        spawn = testFixture.childProcess.spawn,
        storage,
        expect = testFixture.expect,
        filename = require('path').normalize('src/bin/run_plugin.js'),
        projectName = 'runPluginCLI',
        gmeAuth,
        Q = testFixture.Q;

    before(function (done) {
        //adding some project to the database
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.forceDeleteProject(storage, gmeAuth, projectName);
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: './test/bin/run_plugin/project.json',
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .nodeify(done);
    });

    after(function (done) {
        testFixture.forceDeleteProject(storage, gmeAuth, projectName)
            .then(function () {
                return Q.all([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .nodeify(done);
    });

    describe('as a child process', function () {
        it('should run the Minimal Working Example plugin', function (done) {
            var runpluginProcess = spawn('node', [filename, '-p', projectName, '-n', 'MinimalWorkingExample']),
                stdout,
                stderr;

            runpluginProcess.stdout.on('data', function (data) {
                stdout = stdout || '';
                stdout += data.toString();
                //console.log(data.toString());
            });

            runpluginProcess.stderr.on('data', function (data) {
                stderr = stderr || '';
                stderr += data.toString();
                //console.log(data.toString());
            });

            runpluginProcess.on('close', function (code) {
                //expect(stdout).to.contain('execution was successful');
                expect(stderr).to.contain('This is an error message');
                expect(code).to.equal(0);
                done();
            });
        });
    });

    describe('as a library', function () {
        var runPlugin = require('../../src/bin/run_plugin'),
            oldProcessExit = process.exit;

        afterEach(function () {
            process.exit = oldProcessExit;
        });

        it('should run the Minimal Working Example plugin', function (done) {
            process.exit = function (code) {
                expect(code).to.equal(0);
            };

            runPlugin.main(['node', filename, '-p', projectName, '-n', 'MinimalWorkingExample'],
                function (err, result) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }
                    expect(result.success).to.equal(true);
                    expect(result.error).to.equal(null);
                    done();
                }
            );
        });
    });
});