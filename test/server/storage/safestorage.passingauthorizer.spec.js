/*globals*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('SafeStorage with Passing Authorizer', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger,
        Q = testFixture.Q,
        __should = testFixture.should,
        gmeAuth,
        safeStorage,
        projectName = 'newProject',
        projectId = gmeConfig.authentication.guestAccount + testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;

    function getProjectData(projects, projectId) {
        var res;
        projects.forEach(function (projectData) {
            if (projectData._id === projectId) {
                res = projectData;
            }
        });

        return res;
    }

    before(function (done) {
        logger = testFixture.logger.fork('memory');
        gmeConfig.authentication.authorizer.path = testFixture.path
            .resolve('./test/server/middleware/auth/authorizer/passingauthorizer');
        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                return Q.allDone([
                    gmeAuth.addUser('user1', '@', 'pass', true, {overwrite: true}),
                    gmeAuth.addUser('user2', '@', 'pass', false, {overwrite: true}),
                    ]);
            })
            .then(function () {
                safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            safeStorage.closeDatabase()
        ])
            .nodeify(done);
    });

    it('should allow creation of a project and return full rights of project', function (done) {
        var projectName = 'project1',
            data = {
                projectName: projectName,
                username: 'user1'
            },
            projectId;

        safeStorage.createProject(data)
            .then(function (project) {
                projectId = project.projectId;
                data.username = 'user2';
                data.rights = true;
                return safeStorage.getProjects(data);
            })
            .then(function (projects) {
                var pData = getProjectData(projects, projectId);
                expect(pData.rights).to.deep.equal({read: true, write: true, delete: true});
            })
            .nodeify(done);
    });

    it('should allow creation of a project although can create is false', function (done) {
        var projectName = 'project2',
            data = {
                projectName: projectName,
                username: 'user2'
            },
            projectId;

        safeStorage.createProject(data)
            .then(function (project) {
                projectId = project.projectId;
                data.rights = true;
                return safeStorage.getProjects(data);
            })
            .then(function (projects) {
                var pData = getProjectData(projects, projectId);
                expect(pData.rights).to.deep.equal({read: true, write: true, delete: true});
            })
            .nodeify(done);
    });

    it('should allow creation of a project for other user (even though not siteAdmin)', function (done) {
        var projectName = 'project3',
            data = {
                projectName: projectName,
                username: 'user1',
                ownerId: 'user2'
            },
            projectId;

        safeStorage.createProject(data)
            .then(function (project) {
                projectId = project.projectId;
                expect(projectId).to.equal('user2+' + projectName); // FIXME: Use storage util.
                data.rights = true;
                return safeStorage.getProjects(data);
            })
            .then(function (projects) {
                var pData = getProjectData(projects, projectId);
                expect(pData.rights).to.deep.equal({read: true, write: true, delete: true});
            })
            .nodeify(done);
    });

    it('should create project and allow other user to delete it', function (done) {
        var projectName = 'project4',
            data = {
                projectName: projectName,
                username: 'user1',
                rights: true
            },
            projectId;

        safeStorage.createProject(data)
            .then(function (project) {
                projectId = project.projectId;
                return safeStorage.getProjects(data);
            })
            .then(function (projects) {
                var pData = getProjectData(projects, projectId);
                expect(pData.rights).to.deep.equal({read: true, write: true, delete: true});
                data.username = 'user2';
                return safeStorage.deleteProject(data);
            })
            .then(function () {
                data.username = 'user1';
                return safeStorage.getProjects(data);
            })
            .then(function (projects) {
                var pData = getProjectData(projects, projectId);
                expect(pData).to.equal(undefined);
            })
            .nodeify(done);
    });
});