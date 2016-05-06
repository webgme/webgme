/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('UserProject', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('core.intrapersist'),
        ProjectInterface = testFixture.requirejs('common/storage/project/interface'),
        Q = testFixture.Q,
        storage,
        gmeAuth,
        expect = testFixture.expect,
        projectName = 'UserProject_test',
        //projectId = testFixture.projectName2Id(projectName),
        importResult,
        project;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, null)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth_);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: './seeds/EmptyProject.webgmex',
                    projectName: projectName,
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function (result) {
                importResult = result;
                project = result.project;
                return Q.allDone([
                    project.createBranch('b1', result.commitHash),
                    project.createTag('tag', result.commitHash),
                    ]);
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

    it('should be instance of ProjectInterface', function () {
        expect(project instanceof ProjectInterface).to.equal(true);
    });

    it('should getBranches', function (done) {
        project.getBranches()
            .then(function (branches_) {
                expect(branches_.hasOwnProperty('master')).to.equal(true);
            })
            .nodeify(done);
    });

    it('should getTags', function (done) {
        project.getTags()
            .then(function (tags) {
                expect(tags).to.deep.equal({tag: importResult.commitHash});
            })
            .nodeify(done);
    });

    it('should getCommits', function (done) {
        project.getCommits((new Date()).getTime() + 100, 1)
            .then(function (commits) {
                expect(commits.length).to.equal(1);
                expect(commits[0]).to.have.property('message');
            })
            .nodeify(done);
    });

    it('should getHistory from branch', function (done) {
        project.getHistory('master', 1)
            .then(function (commits) {
                expect(commits.length).to.equal(1);
                expect(commits[0]).to.have.property('message');
            })
            .nodeify(done);
    });

    it('should getHistory from array of branches', function (done) {
        project.getHistory(['master'], 1)
            .then(function (commits) {
                expect(commits.length).to.equal(1);
                expect(commits[0]).to.have.property('message');
            })
            .nodeify(done);
    });

    it('should makeCommit', function (done) {
        var numCommitsBefore;

        project.getCommits((new Date()).getTime(), 100)
            .then(function (commits) {
                numCommitsBefore = commits.length;
                return project.createBranch('makeCommit_name', importResult.commitHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                return project.makeCommit('makeCommit_name', [importResult.commitHash],
                    importResult.rootHash, [], 'new commit');
            })
            .then(function () {
                return project.getCommits((new Date()).getTime(), 100);
            })
            .then(function (commits) {
                numCommitsBefore = commits.length - 1;
            })
            .nodeify(done);
    });

    it('should getCommonAncestorCommit', function (done) {
        project.makeCommit(null, [importResult.commitHash], importResult.rootHash, {}, 'commonAns')
            .then(function (result) {
                expect(result.hash).to.include('#');
                return project.getCommonAncestorCommit(result.hash, importResult.commitHash);
            })
            .then(function (commitHash) {
                expect(commitHash).to.equal(importResult.commitHash);
            })
            .nodeify(done);
    });

    it('should setBranchHash', function (done) {
        project.setBranchHash('master', importResult.commitHash, importResult.commitHash)
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                expect(result.hash).to.equal(importResult.commitHash);
            })
            .nodeify(done);
    });

    it('should getBranchHash', function (done) {
        project.getBranchHash('b1')
            .then(function (hash) {
                expect(hash).to.equal(importResult.commitHash);
            })
            .nodeify(done);
    });

    it('should create and deleteBranch', function (done) {
        project.getBranchHash('master')
            .then(function (hash) {
                return project.createBranch('toBeDeletedBranch', hash);
            })
            .then(function () {
                return project.getBranches();
            })
            .then(function (branches) {
                expect(branches).to.have.property('master');
                expect(branches).to.have.property('toBeDeletedBranch');
                return project.deleteBranch('toBeDeletedBranch', branches.toBeDeletedBranch);
            })
            .then(function () {
                return project.getBranches();
            })
            .then(function (branches) {
                expect(branches).to.have.property('master');
                expect(branches).to.not.have.property('toBeDeletedBranch');
                done();
            })
            .catch(done);
    });

    it('should create and deleteTag', function (done) {
        project.createTag('newTag', importResult.commitHash)
            .then(function () {
                return project.getTags();
            })
            .then(function (tags) {

                expect(tags).to.deep.equal({
                    tag: importResult.commitHash,
                    newTag: importResult.commitHash
                });

                return project.deleteTag('newTag');
            })
            .then(function () {
                return project.getTags();
            })
            .then(function (tags) {
                expect(tags).to.deep.equal({tag: importResult.commitHash});
            })
            .nodeify(done);
    });
})