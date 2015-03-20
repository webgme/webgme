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
                importCLI.import(gmeConfig.mongo.uri, projectName, jsonProject, 'master', true, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    done();
                });
            });
        });
    });

    after(function (done) {
        mongoConn.close();
        done();
    });

    describe('as a child process', function () {
        it('should run the Minimal Working Example plugin', function (done) {
            var nodeUserManager = spawn('node', [filename, '-p', projectName, '-n', 'MinimalWorkingExample']),
                stdoutData,
                err;

            nodeUserManager.stdout.on('data', function (data) {
                stdoutData = stdoutData || '';
                stdoutData += data.toString();
                //console.log(data.toString());
            });

            nodeUserManager.stderr.on('data', function (data) {
                err = err || '';
                err += data.toString();
                //console.log(data.toString());
            });

            nodeUserManager.on('close', function (code) {
                stdoutData.should.contain('execution was successful');
                err.should.contain('MinimalWorkingExample');
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