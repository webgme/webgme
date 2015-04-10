/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../_globals');

describe('Run plugin CLI', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        should = testFixture.should,
        spawn = testFixture.childProcess.spawn,
        Storage = testFixture.WebGME.serverUserStorage,
        mongodb = require('mongodb'),
        mongoConn,
        importCLI = require('../../src/bin/import'),
        fs = require('fs'),
        filename = require('path').normalize('src/bin/run_plugin.js'),
        projectName = 'aaa';

    before(function (done) {
        // TODO: refactor this into _globals.js
        var jsonProject,
            getJsonProject = function (path) {
                return JSON.parse(fs.readFileSync(path, 'utf-8'));
            };
        mongodb.MongoClient.connect(gmeConfig.mongo.uri, gmeConfig.mongo.options, function (err, db) {
            if (err) {
                done(err);
                return;
            }
            mongoConn = db;
            db.dropCollection(projectName, function (err) {
                // ignores if the collection was not found
                if (err && err.errmsg !== 'ns not found') {
                    done(err);
                    return;
                }

                try {
                    jsonProject = getJsonProject('./test/asset/intraPersist.json');
                } catch (err) {
                    done(err);
                    return;
                }
                importCLI.import(Storage, gmeConfig, projectName, jsonProject, 'master', true,
                    function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        done();
                    }
                );
            });
        });
    });

    after(function (done) {
        mongoConn.close();
        done();
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

            runPlugin.main(['node', filename, '-p', projectName, '-n', 'MinimalWorkingExample'], function (err, result) {
                if (err) {
                    done(new Error(err));
                    return;
                }
                should.equal(result.success, true);
                should.equal(result.error, null);
                done();
            });
        });
    });
});