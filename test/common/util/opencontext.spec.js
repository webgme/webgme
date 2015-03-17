/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('openContext', function () {
    'use strict';

    var expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        openContext = testFixture.requirejs('common/util/opencontext'),
        Core = testFixture.WebGME.core;

    describe('using local-storage', function () {
        var storage,// Will get local one from importProject.
            project,
            commitHash,
            gmeConfig = testFixture.getGmeConfig();

        before(function (done) {
            var importParam = {
                    filePath: './test/asset/sm_basic.json',
                    projectName: 'doesExist',
                    branchName: 'master',
                    gmeConfig: gmeConfig
                };

            importParam.storage = storage;
            testFixture.importProject(importParam, function (err, result) {
                storage = result.storage;
                commitHash = result.commitHash;
                done(err);
            });
        });

        afterEach(function (done) {
            if (project) {
                project.closeProject(function (err) {
                    done(err);
                });
            } else {
                done();
            }
        });

        after(function (done) {
            storage.closeDatabase(function (err) {
                done(err);
            });
        })

        it('should open existing project', function (done) {
            var parameters = {
                projectName: 'doesExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project');
                done();
            });
        });

        it('should return error with non-existing project', function (done) {
            var parameters = {
                projectName: 'doesNotExist'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).to.equal('"doesNotExist" does not exists among: doesExist');
                done();
            });
        });

        it('should load existing branch', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'master'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                expect(err).equal(null);
                expect(result).to.have.keys('project', 'rootNode', 'commitHash', 'core');
                done();
            });
        });

        it('should return error with non-existing branchName', function (done) {
            var parameters = {
                projectName: 'doesExist',
                branchName: 'b1_lancer'
            };
            openContext(storage, gmeConfig, parameters, function (err, result) {
                console.log(err);
                expect(err).to.equal('"b1_lancer" not in project: "doesExist".');
                done();
            });
        });
    });

    //storage = new WebGME.clientStorage({
    //    globConf: gmeConfig,
    //    type: 'node',
    //    host: (gmeConfig.server.https.enable === true ? 'https' : 'http') + '://127.0.0.1'
    //});
});