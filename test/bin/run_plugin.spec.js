/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../_globals');

describe('Run plugin CLI', function () {
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
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
        .nodeify(done);
    });

    describe('as a child process', function () {
        it('should run the Minimal Working Example plugin', function (done) {
            var runpluginProcess = spawn('node', [filename, 'MinimalWorkingExample', projectName]),
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
                done();
            };

            runPlugin.main(['node', filename, 'MinimalWorkingExample', projectName],
                function (err, result) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }
                    expect(result.success).to.equal(true);
                    expect(result.error).to.equal(null);
                }
            );
        });

        it('should run the Minimal Working Example plugin and fail with configuration file', function (done) {
            process.exit = function (code) {
                expect(code).to.equal(1);
                done();
            };

            runPlugin.main(['node', filename, 'MinimalWorkingExample', projectName,
                    '-j', './test/bin/run_plugin/MinimalWorkingExample.config.json'],
                function (err) {
                    if (err) {
                        expect(err).to.match(/Failed on purpose./);
                        return;
                    }
                    done(new Error('should have failed to run plugin'));
                }
            );
        });


        it('should run the Minimal Working Example plugin if owner is specified', function (done) {
            process.exit = function (code) {
                expect(code).to.equal(0);
                done();
            };

            runPlugin.main(['node', filename, 'MinimalWorkingExample', projectName,
                    '-o', gmeConfig.authentication.guestAccount],
                function (err, result) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }
                    expect(result.success).to.equal(true);
                    expect(result.error).to.equal(null);
                }
            );
        });

        it('should fail to run the Minimal Working Example plugin if does not have access to project', function (done) {
            process.exit = function (code) {
                expect(code).to.equal(1);
                done();
            };

            runPlugin.main(['node', filename, 'MinimalWorkingExample', 'not_authorized_project'],
                function (err) {
                    if (err) {
                        expect(err).to.match(/Not authorized to read or write project/);
                        return;
                    }
                    done(new Error('should have failed to run plugin'));
                }
            );
        });

        it('should fail to run plugin if no plugin name and no project name is not given', function (done) {
            process.exit = function () {
                done();
            };

            runPlugin.main(['node', filename],
                function (err/*, result*/) {
                    if (err) {
                        expect(err).to.match(/must be specified/);
                        return;
                    }
                    done(new Error('should have failed to run plugin'));
                }
            );
        });

        it('should fail to run plugin if no project name is given', function (done) {
            process.exit = function () {
                done();
            };

            runPlugin.main(['node', filename, projectName],
                function (err) {
                    if (err) {
                        expect(err).to.match(/must be specified/);
                        return;
                    }
                    done(new Error('should have failed to run plugin'));
                }
            );
        });
    });
});
