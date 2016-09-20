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
        importPath = './test/bin/import/project.webgmex',
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
        oldStdOutFunction = process.stdout.write;

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
        testFixture.clearDBAndGetGMEAuth(gmeConfig, existingProjectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: existingProjectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/bin/import/project.webgmex'

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

        expect(importCLI).to.have.property('main');
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

    it('should import into existing project as a new version of existing branch', function (done) {
        var oldCommitHash, newCommitHash;

        projectName = null;
        projectId = null;

        storage.getProjects({branches: true})
            .then(function (projects) {
                var i, found = false;

                expect(projects).not.to.equal(null);
                for (i = 0; i < projects.length; i += 1) {
                    if (projects[i]._id === existingProjectId) {
                        found = true;
                        expect(projects[i].branches).to.include.keys(['master']);
                        oldCommitHash = projects[i].branches.master;
                    }
                }

                expect(found).to.equal(true);

                return importCLI.main(['node', filename,
                    importPath,
                    '-m', gmeConfig.mongo.uri,
                    '-p', existingProjectName,
                    '-o', gmeConfig.authentication.guestAccount,
                    '-b', 'master'
                ]);
            })
            .then(function () {
                return storage.getProjects({branches: true});
            })
            .then(function (projects) {
                var i;

                expect(projects).not.to.equal(null);
                for (i = 0; i < projects.length; i += 1) {
                    if (projects[i]._id === existingProjectId) {
                        expect(projects[i].branches).to.include.keys(['master']);
                        expect(projects[i].branches.master).not.to.equal(oldCommitHash);
                        newCommitHash = projects[i].branches.master;
                        return storage.openProject({projectId: existingProjectId});
                    }
                }

                throw new Error('project was not found after importing new version');

            })
            .then(function (project) {
                return Q.ninvoke(project, 'loadObject', newCommitHash);
            })
            .then(function (commitObject) {
                expect(commitObject).not.to.equal(null);
                expect(commitObject.parents).to.eql([oldCommitHash]);
            })
            .nodeify(done);
    });

});