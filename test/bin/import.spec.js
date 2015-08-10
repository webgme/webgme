/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('import CLI tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        importCLI = require('../../src/bin/import'),
        filename = require('path').normalize('src/bin/import.js'),
        importPath = './test/bin/import/project.json',
        projectName,
        projectId,
        existingProjectName = 'importCliExisting',
        existingProjectId = testFixture.projectName2Id(existingProjectName),
        Q = testFixture.Q,
        logger = testFixture.logger.fork('import.spec'),
        storage,
        gmeAuth,
        oldLogFunction = console.log,
        oldWarnFunction = console.warn,
        oldStdOutFunction = process.stdout.write,
        jsonProject;

    function checkBranch(pId, branchArray) {
        var deferred = Q.defer(),
            params = {projectId: pId};
        storage.openProject(params)
            .then(function (project) {
                return project.getBranches();
            })
            .then(function (branches) {
                expect(branches).to.have.all.keys(branchArray);
                deferred.resolve();
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    before(function (done) {
        jsonProject = testFixture.loadJsonFile(importPath);
        testFixture.clearDBAndGetGMEAuth(gmeConfig, existingProjectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                testFixture.importProject(storage, {
                    projectName: existingProjectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/bin/import/project.json'

                });
            })
            .nodeify(done);

    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            storage.closeDatabase()
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

    afterEach(function (done) {
        console.log = oldLogFunction;
        console.warn = oldWarnFunction;
        process.stdout.write = oldStdOutFunction;
        if (projectId) {
            storage.deleteProject({projectId: projectId})
                .nodeify(done);
        } else {
            done();
        }
    });

    it('should have a main', function () {
        projectName = null;
        projectId = null;

        importCLI.should.have.property('main');
    });

    it('should fail if mandatory parameters missing', function (done) {
        projectName = null;
        projectId = null;

        importCLI.main(['node', filename])
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

    it('should fail to import if wrong owner is given', function (done) {
        projectName = null;
        projectId = null;

        importCLI.main(['node', filename,
            importPath,
            '-p', existingProjectName,
            '-o', 'badOwner',
            '-u', 'badOwner'
        ])
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.include('badOwner');
                done();
            })
            .done();
    });

    it('should import into master if no branch is given', function (done) {
        projectName = 'importCliTest';
        projectId = testFixture.projectName2Id(projectName);

        importCLI.main(['node', filename,
            importPath,
            '-m', gmeConfig.mongo.uri,
            '-p', projectName,
            '-u', gmeConfig.authentication.guestAccount,
        ])
            .then(function () {
                return checkBranch(projectId, ['master']);
            })
            .then(function () {
                done();
            })
            .catch(done);
    });

    it('should import into existing project should work', function (done) {
        projectName = null;
        projectId = null;

        importCLI.main(['node', filename,
            importPath,
            '-m', gmeConfig.mongo.uri,
            '-p', existingProjectName,
            '-o', gmeConfig.authentication.guestAccount,
            '-b', 'second'
        ])
            .then(function () {
                return checkBranch(existingProjectId, ['master', 'second']);
            })
            .then(function () {
                done();
            })
            .catch(done);
    });

    it('should import then overwrite', function (done) {
        projectName = 'importCliOverwrite';
        projectId = testFixture.projectName2Id(projectName);

        importCLI.main(['node', filename,
            importPath,
            '-m', gmeConfig.mongo.uri,
            '-p', projectName,
            '-o', gmeConfig.authentication.guestAccount,
            '-b', 'master'
        ])
            .then(function () {
                return importCLI.main(['node', filename,
                    importPath,
                    '-m', gmeConfig.mongo.uri,
                    '-p', projectName,
                    '-b', 'other',
                    '-w'
                ]);
            })
            .then(function () {
                return checkBranch(projectId, ['other']);
            })
            .then(function () {
                done();
            })
            .catch(done);
    });

});