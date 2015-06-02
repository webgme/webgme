/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../_globals');

describe('Run plugin CLI', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('run_plugin.spec'),
        should = testFixture.should,
        spawn = testFixture.childProcess.spawn,
        storage,
        mongodb = require('mongodb'),
        mongoConn,
        importCLI = require('../../src/bin/import'),
        fs = require('fs'),
        filename = require('path').normalize('src/bin/run_plugin.js'),
        projectName = 'aaa',
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
                return storage.deleteProject({projectName: projectName});
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
        storage.deleteProject({projectName: projectName})
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
                //console.log(stdoutData);
                //console.log(err);
                stdout.should.contain('execution was successful');
                stderr.should.contain('This is an error message');
                should.equal(code, 0);
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
                should.equal(code, 0, 'Should have succeeded');
            };

            runPlugin.main(['node', filename, '-p', projectName, '-n', 'MinimalWorkingExample'],
                function (err, result) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }
                    should.equal(result.success, true);
                    should.equal(result.error, null);
                    done();
                }
            );
        });
    });
});