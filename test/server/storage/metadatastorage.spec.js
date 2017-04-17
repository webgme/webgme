/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');


describe('metadatastorage', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        GMEAuth = testFixture.GMEAuth,
        expect = testFixture.expect,
        auth,
        store;

    before(function (done) {
        auth = new GMEAuth(null, gmeConfig);

        testFixture.clearDatabase(gmeConfig)
            .then(function () {
                return auth.connect();
            })
            .then(function () {
                store = auth.metadataStorage;
            })
            .nodeify(done);
    });

    after(function (done) {
        auth.unload(done);
    });

    it('should add and get a project', function (done) {
        var projectName = 'newly_added_project',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.metadataStorage.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return store.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {},
                    hooks: {},
                    owner: ownerName,
                    name: projectName
                });
            })
            .nodeify(done);
    });

    it('should add a project with supplied info', function (done) {
        var projectName = 'project_with_info1',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        store.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return store.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {createdAt: 'justNow'},
                    hooks: {},
                    owner: ownerName,
                    name: projectName,
                });
            })
            .nodeify(done);
    });

    it('should fail to update info if project does not exist', function (done) {
        var projectName = 'doesNotExist',
            ownerName = 'some',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);

        store.updateProjectInfo(projId, {createdAt: 'justNow'})
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('no such project');
            })
            .nodeify(done);
    });

    it('should add a project and update info', function (done) {
        var projectName = 'project_with_info2',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        store.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return store.updateProjectInfo(projectId, {createdAt: 'aBitLater'});
            })
            .then(function (data) {
                expect(data.info).to.deep.equal({
                    createdAt: 'aBitLater', modifiedAt: null, viewedAt: null,
                    viewer: null, modifier: null, creator: null, kind: null
                });
            })
            .nodeify(done);
    });

    it('should add a project and succeed with empty info', function (done) {
        var projectName = 'project_with_info3',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        store.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return store.updateProjectInfo(projectId, {});
            })
            .then(function (data) {
                expect(data.info).to.deep.equal({
                    createdAt: 'justNow', modifiedAt: null, viewedAt: null,
                    viewer: null, modifier: null, creator: null, kind: null
                });
            })
            .nodeify(done);
    });

    it('should add a project and not update with non allowed info', function (done) {
        var projectName = 'project_with_info4',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        store.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return store.updateProjectInfo(projectId, {aaa: 'should not persist'});
            })
            .then(function (data) {
                expect(data.info).to.deep.equal({
                    createdAt: 'justNow', modifiedAt: null, viewedAt: null,
                    viewer: null, modifier: null, creator: null, kind: null
                });
            })
            .nodeify(done);
    });

    it('should add a project and not update all info', function (done) {
        var projectName = 'project_with_info5',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName),
            now = 'nu',
            info = {
                createdAt: now,
                viewedAt: now,
                modifiedAt: now,
                creator: 'user',
                viewer: 'user',
                modifier: 'user',
                kind: 'someKindOfProject'
            };
        store.addProject(ownerName, projectName, info)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                info.createdAt = info.viewedAt = info.modifiedAt = 'nu1';
                return store.updateProjectInfo(projectId, info);
            })
            .then(function (data) {
                expect(data.info).to.deep.equal(info);
            })
            .nodeify(done);
    });

    it('should fail to get a non-existing project', function (done) {
        var projectName = 'does_not_exist',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        store.getProject(projId)
            .then(function () {
                throw new Error('should fail to get a non-existing project');
            })
            .catch(function (error) {
                expect(error instanceof Error);
                expect(error.message).to.contain('no such project [' + projId);
                done();
            })
            .done();
    });

    it('should fail to add an existing project', function (done) {
        var projectName = 'already_added',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        store.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return store.addProject(ownerName, projectName);
            })
            .then(function () {
                throw new Error('should fail to add an existing project');
            })
            .catch(function (error) {
                expect(error instanceof Error);
                expect(error.message).to.equal('Project already exists someUser+already_added in _projects collection');
                done();
            })
            .done();
    });

    it('should delete a project', function (done) {
        var projectName = 'to_be_deleted',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        store.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return store.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {},
                    hooks: {},
                    owner: ownerName,
                    name: projectName
                });
                return store.deleteProject(projId);
            })
            .then(function () {
                return store.getProject(projId);
            })
            .then(function () {
                throw new Error('should fail to get a deleted project');
            })
            .catch(function (error) {
                expect(error instanceof Error);
                expect(error.message).to.contain('no such project [' + projId);
                done();
            })
            .done();
    });

    it('should delete non-existing project', function (done) {
        store.deleteProject('does_not_exist_project')
            .nodeify(done);
    });

    // Project hooks
    it('should add a hook that did not exist', function (done) {
        var projectName = 'project_with_hooks1',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org'
            };

        store.addProject(ownerName, projectName, {})
            .then(function (projectId) {

                return store.addProjectHook(projectId, 'hookId', hookData);
            })
            .then(function (data) {
                expect(data.url).to.equal(hookData.url);
                expect(data.events).to.deep.equal([]);
                expect(data.active).to.equal(true);
            })
            .nodeify(done);
    });

    it('should fail to add a hook that exists', function (done) {
        var projectName = 'project_with_hooks2',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org'
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'exists', hookData);
            })
            .then(function (/*data*/) {
                return store.addProjectHook(projectId, 'exists', hookData);
            })
            .catch(function (err) {
                expect(err.message).to.include('hook already exists');
            })
            .nodeify(done);
    });

    it('should fail to add a hook with faulty events', function (done) {
        var projectName = 'project_with_hooks3',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org',
                events: ['NOT_A_VALID_EVENT']
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'hookId', hookData);
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('not among valid events');
            })
            .nodeify(done);
    });

    it('should add a hook with events="all"', function (done) {
        var projectName = 'project_with_hooks4',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org',
                events: 'all'
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'hookId', hookData);
            })
            .then(function (data) {
                expect(data.events).to.equal('all');
            })
            .nodeify(done);
    });

    it('should fail to add a hook with no url', function (done) {
        var projectName = 'project_with_hooks5',
            ownerName = 'someUser',
            hookData = {},
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'hookId', hookData);
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('data.url empty or not a string');
            })
            .nodeify(done);
    });

    it('should fail to add a hook with empty id', function (done) {
        var projectName = 'project_with_hooks6',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org',
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, '', hookData);
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('hookId empty or not a string');
            })
            .nodeify(done);
    });

    it('should add a hook with active=false when passed', function (done) {
        var projectName = 'project_with_hooks7',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org',
                active: false
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'captainHook', hookData);
            })
            .then(function (data) {
                expect(data.active).to.equal(false);
            })
            .nodeify(done);
    });

    it('should add a hook and get it', function (done) {
        var projectName = 'project_with_hooks8',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org'
            },
            rData,
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'myHook', hookData);
            })
            .then(function (data) {
                rData = data;
                return store.getProjectHook(projectId, 'myHook');
            })
            .then(function (data) {
                expect(data).to.deep.equal(rData);
            })
            .nodeify(done);
    });

    it('should fail to get hook if project does not exist', function (done) {
        store.getProjectHook('g+doesNotExist', 'myHook')
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('no such project');
            })
            .nodeify(done);
    });

    it('should fail to get hook if it does not exist', function (done) {
        var projectName = 'project_with_hooks9',
            ownerName = 'someUser';

        store.addProject(ownerName, projectName, {})
            .then(function (projectId) {
                return store.getProjectHook(projectId, 'doesNotExist');
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('no such hook');
            })
            .nodeify(done);
    });

    it('should fail to get hook if id is not given', function (done) {
        var projectName = 'project_with_hooks10',
            ownerName = 'someUser';

        store.addProject(ownerName, projectName, {})
            .then(function (projectId) {
                return store.getProjectHook(projectId, '');
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('hookId empty or not a string');
            })
            .nodeify(done);
    });

    it('should add and remove a hook', function (done) {
        var projectName = 'project_with_hooks11',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org'
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'myHook', hookData);
            })
            .then(function () {
                return store.removeProjectHook(projectId, 'myHook');
            })
            .then(function () {
                return store.getProjectHooks(projectId);
            })
            .then(function (data) {
                expect(data.myHook).to.equal(undefined);
            })
            .nodeify(done);
    });

    it('should fail to remove a hook if id not given', function (done) {
        var projectName = 'project_with_hooks12',
            ownerName = 'someUser',
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.removeProjectHook(projectId, '');
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('hookId empty or not a string');
            })
            .nodeify(done);
    });

    it('should fail to remove a hook if it does not exist', function (done) {
        var projectName = 'project_with_hooks13',
            ownerName = 'someUser';

        store.addProject(ownerName, projectName, {})
            .then(function (projectId) {
                return store.removeProjectHook(projectId, 'myHook');
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('no such hook');
            })
            .nodeify(done);
    });

    it('should add and update a hook', function (done) {
        var projectName = 'project_with_hooks14',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org',
                events: 'all'
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'myHook', hookData);
            })
            .then(function (initialData) {
                expect(initialData.active).to.equal(true);
                expect(initialData.events).to.deep.equal('all');
                expect(initialData.url).to.equal('http://my.org');

                return store.updateProjectHook(projectId, 'myHook', {events: [], active: false, url: 'new'});
            })
            .then(function (updatedData) {
                expect(updatedData.active).to.equal(false);
                expect(updatedData.events).to.deep.equal([]);
                expect(updatedData.url).to.equal('new');
            })
            .nodeify(done);
    });

    it('should fail to update a hook if it does not exist', function (done) {
        var projectName = 'project_with_hooks15',
            ownerName = 'someUser',
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;

                return store.updateProjectHook(projectId, 'myHook', {events: [], active: false, url: 'new'});
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('no such hook');
            })
            .nodeify(done);
    });

    it('should fail to update a hook if id is empty', function (done) {
        var projectName = 'project_with_hooks16',
            ownerName = 'someUser',
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;

                return store.updateProjectHook(projectId, null, {events: [], active: false, url: 'new'});
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('hookId empty or not a string');
            })
            .nodeify(done);
    });

    it('should fail to update a hook if given url not string', function (done) {
        var projectName = 'project_with_hooks17',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org',
                events: 'all'
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'myHook', hookData);
            })
            .then(function () {
                return store.updateProjectHook(projectId, 'myHook', {url: ['arr']});
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('data.url not a string');
            })
            .nodeify(done);
    });

    it('should fail to update a hook if event is string and not all', function (done) {
        var projectName = 'project_with_hooks18',
            ownerName = 'someUser',
            hookData = {
                url: 'http://my.org',
                events: 'all'
            },
            projectId;

        store.addProject(ownerName, projectName, {})
            .then(function (projectId_) {
                projectId = projectId_;
                return store.addProjectHook(projectId, 'myHook', hookData);
            })
            .then(function () {
                return store.updateProjectHook(projectId, 'myHook', {events: 'invalidStr'});
            })
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('is not an array and not "all"');
            })
            .nodeify(done);
    });

    it('should fail to update project hooks if project does not exist', function (done) {

        store.updateProjectHooks('does+notExist', {})
            .then(function (data) {
                throw new Error('Should have failed:' + JSON.stringify(data));
            })
            .catch(function (err) {
                expect(err.message).to.include('no such project');
            })
            .nodeify(done);
    });
});