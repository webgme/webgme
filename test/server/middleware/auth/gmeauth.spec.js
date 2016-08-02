/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author ksmyth / https://github.com/ksmyth
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../../_globals.js');


describe('GME authentication', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        GMEAuth = testFixture.GMEAuth,
        __should = testFixture.should,
        expect = testFixture.expect,
        Q = testFixture.Q,

        auth,
        authorizer,
        projectAuthParams;

    before(function (done) {
        auth = new GMEAuth(null, gmeConfig);

        testFixture.clearDatabase(gmeConfig)
            .then(function () {
                return auth.connect();
            })
            .then(function () {
                authorizer = auth.authorizer;
                projectAuthParams = {
                    entityType: authorizer.ENTITY_TYPES.PROJECT,
                };
                return Q.allDone([
                    auth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('adminUser2', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('adminUser3', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('adminUser4', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('adminUser5', 'user@example.com', 'plaintext', true, {overwrite: true})
                ]);
            })
            .then(function () {
                return auth.authorizeByUserId('user', 'project', 'create', {
                    read: true,
                    write: true,
                    delete: false
                });
            })
            .then(function () {
                return auth.authorizeByUserId('user', 'unauthorized_project', 'create', {
                    read: false,
                    write: false,
                    delete: false
                });
            })
            .nodeify(done);
    });

    after(function (done) {
        auth.unload()
            .nodeify(done);
    });


    it('adds random user without overwrite', function (done) {
        var username = 'no_overwrite_user' + (new Date()).toISOString();
        auth.addUser(username, username + '@example.com', 'plaintext', true, {overwrite: false})
            .then(function () {
                return auth.getUser(username);
            })
            .then(function (userData) {
                expect(userData._id).equal(username);
            })
            .nodeify(done);
    });

    it('adds user without overwrite', function (done) {
        auth.addUser('no_overwrite_user', 'no_overwrite_user@example.com', 'plaintext', true, {overwrite: false}, done);
    });

    it('adds a user without email address', function (done) {
        auth.addUser('user_no_email', null, 'plaintext', true, {overwrite: true}, done);
    });

    it('should fail to add user twice with overwrite=false', function (done) {
        var userId = 'user_twiceAdded';

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: false})
            .then(function () {
                return auth.addUser(userId, 'e@mail2', 'pass', true, {overwrite: false});
            })
            .then(function () {
                throw new Error('should fail');
            })
            .catch(function (err) {
                expect(err.message.indexOf('user already exists')).to.equal(0);
            })
            .nodeify(done);
    });

    it('should update user if added twice and overwrite=true', function (done) {
        var userId = 'user_twiceAddedOverwrite';

        auth.addUser(userId, 'e1', 'pass', true, {overwrite: false})
            .then(function () {
                return auth.addUser(userId, 'e2', 'pass', true, {overwrite: true});
            })
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (userData) {
                expect(userData.email).to.equal('e2');
            })
            .nodeify(done);
    });

    it('gets all user auth info', function (done) {
        auth.addUser('user_no_email', null, 'plaintext', true, {overwrite: true})
            .then(function () {
                return auth.getUser('user_no_email');
            })
            .nodeify(done);
    });


    it('gets user auth info fails on non existent user id', function (done) {
        auth.getUser('user_does_not exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user') > -1) {
                    return;
                }
                throw new Error('Unexpected error ' + err);
            })
            .nodeify(done);
    });

    it('fails with invalid user for getProjectAuthorizationByUserId', function (done) {
        authorizer.getAccessRights('user_does_not exist', 'someProject+Id', projectAuthParams)
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user') > -1) {
                    return;
                }
                throw new Error('Unexpected error ' + err);
            })
            .nodeify(done);
    });

    it.skip('gets user auth info', function (done) {
        auth.addUser('user_no_email', null, 'plaintext', true, {overwrite: true})
            .then(function () {
                return auth.getUserAuthInfo('user_no_email');
            })
            .nodeify(done);
    });

    it.skip('gets user auth info fails on non existent user id', function (done) {
        auth.getUserAuthInfo('user_does_not exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user') > -1) {
                    return;
                }
                throw new Error('Unexpected error ' + err);
            })
            .nodeify(done);
    });

    it('removes user by id and fail to add it again', function (done) {
        var userId = 'user_to_remove_and_fail_to_add';
        auth.addUser(userId, 'user_to_remove@example.com', 'plaintext', true, {overwrite: true})
            .then(function () {
                return auth.listUsers();
            })
            .then(function (users) {
                var hadUser = false;
                users.forEach(function (user) {
                    if (user._id === userId) {
                        hadUser = true;
                    }
                });

                expect(hadUser).to.equal(true);

                return auth.deleteUser(userId);
            })
            .then(function () {
                return auth.listUsers();
            })
            .then(function (users) {
                var hadUser = false;
                users.forEach(function (user) {
                    if (user._id === userId) {
                        hadUser = true;
                    }
                });

                expect(hadUser).to.equal(false);

                return auth.addUser(userId, 'a@example.com', 'plaintext', true,
                    {overwrite: false});
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('user already exists');
            })
            .nodeify(done);
    });

    it('removes user with force and can add it again', function (done) {
        var userId = 'user_to_remove_and_can_add';
        auth.addUser(userId, 'e@example.com', 'plaintext', true, {overwrite: true})
            .then(function () {
                return auth.listUsers();
            })
            .then(function (users) {
                var hadUser = false;
                users.forEach(function (user) {
                    if (user._id === userId) {
                        hadUser = true;
                    }
                });

                expect(hadUser).to.equal(true);

                return auth.deleteUser(userId, true);
            })
            .then(function () {
                return auth.listUsers();
            })
            .then(function (users) {
                var hadUser = false;
                users.forEach(function (user) {
                    if (user._id === userId) {
                        hadUser = true;
                    }
                });

                expect(hadUser).to.equal(false);

                return auth.addUser(userId, 'a@example.com', 'plaintext', true,
                    {overwrite: false});
            })
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (userData) {
                expect(userData._id).to.equal(userId);
            })
            .nodeify(done);
    });

    it('should remove user and throw error in api calls', function (done) {
        var orgId = 'removeUserCheckApiOrg',
            userId = 'removeUserCheckApiUser';

        auth.addUser(userId, 'mail', 'pass', true, {})
            .then(function () {
                return Q.allDone([
                    auth.addOrganization(orgId),
                    auth.deleteUser(userId)
                    ]);
            })
            .then(function () {
                return Q.allSettled([
                    auth.authenticateUser(userId, 'pass'),
                    auth.generateJWToken(userId, 'pass'),
                    auth.generateJWTokenForAuthenticatedUser(userId),
                    auth.getUser(userId),
                    auth.deleteUser(userId),
                    auth.updateUser(userId, {email: 'm@il'}),
                    auth.updateUserDataField(userId, {a: 2}),
                    auth.updateUserComponentSettings(userId, 'someId', {a: 2}),
                    auth.updateUserSettings(userId, {a: 2}),

                    auth.addUserToOrganization(userId, orgId),
                    //auth.removeUserFromOrganization(userId, orgId),
                    auth.setAdminForUserInOrganization(userId, orgId, true),
                    //auth.setAdminForUserInOrganization(userId, orgId, false),
                ]);
            })
            .then(function (res) {
                res.forEach(function (r) {
                    expect(r.state).to.equal('rejected');
                    expect(r.reason.message).to.contain('no such user');
                });
            })
            .nodeify(done);
    });

    it('should add a user with custom data provided', function (done) {
        var customData = {a: 1, b: {b1: 'b1'}};
        auth.addUser('user_w_data', 'e@mail', 'pass', true, {overwrite: true, data: customData})
            .then(function () {
                return auth.getUser('user_w_data');
            })
            .then(function (userData) {
                expect(userData.data).to.deep.equal(customData);
            })
            .nodeify(done);
    });

    it('should update a user with custom data provided and overwrite', function (done) {
        var customData = {a: 1};
        auth.addUser('user_w_data11', 'e@mail', 'pass', true, {overwrite: true, data: customData})
            .then(function () {
                return auth.updateUser('user_w_data11', {data: {b: 1}});
            })
            .then(function (userData) {
                expect(userData.data).to.deep.equal({b: 1});
            })
            .nodeify(done);
    });

    it('should fail to add a user with custom data that is not an object', function (done) {
        var customData = 'aString';
        auth.addUser('user_w_faulty_data1', 'e@mail', 'pass', true, {overwrite: true, data: customData})
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('supplied userData.data is not an object [aString]');
            })
            .nodeify(done);
    });

    it('should fail to update a user with custom data that is not an object', function (done) {
        var customData = 'aString';
        auth.addUser('user_w_faulty_data2', 'e@mail', 'pass', true, {overwrite: true, data: {}})
            .then(function () {
                return auth.updateUser('user_w_faulty_data2', {data: customData});
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('supplied userData.data is not an object [aString]');
            })
            .nodeify(done);
    });

    it('updateUserDataField should update with all supplied', function (done) {
        var userId = 'user_w_data1',
            initData = {a: 1, b: 1},
            newData = {a: 2, b: 2};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal(newData);
            })
            .nodeify(done);
    });

    it('updateUserDataField should update given field and keep the old', function (done) {
        var userId = 'user_w_data2',
            initData = {a: 1, b: 1},
            newData = {a: 2};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: 2, b: 1});
            })
            .nodeify(done);
    });

    it('updateUserDataField should add given field and keep the old', function (done) {
        var userId = 'user_w_data3',
            initData = {b: 1},
            newData = {a: 2};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: 2, b: 1});
            })
            .nodeify(done);
    });

    it('updateUserDataField should update field deep down', function (done) {
        var userId = 'user_w_data4',
            initData = {a: {b: {c: {d: 1, e: 2}}}},
            newData = {a: {b: {c: {e: 5}}}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: {b: {c: {d: 1, e: 5}}}});
            })
            .nodeify(done);
    });

    it('updateUserDataField should overwrite array with array', function (done) {
        var userId = 'user_w_data5',
            initData = {a: {b: [1, 2], c: 'c'}},
            newData = {a: {b: [3, 4]}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: {b: [3, 4], c: 'c'}});
            })
            .nodeify(done);
    });

    it('updateUserDataField should overwrite object with array', function (done) {
        var userId = 'user_w_data6',
            initData = {a: {b: {d: 1}, c: 'c'}},
            newData = {a: {b: [3, 4]}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: {b: [3, 4], c: 'c'}});
            })
            .nodeify(done);
    });

    it('updateUserDataField should overwrite array with object', function (done) {
        var userId = 'user_w_data7',
            initData = {a: {b: [1, 2], c: 'c'}},
            newData = {a: {b: {d: 1}}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: {b: {d: 1}, c: 'c'}});
            })
            .nodeify(done);
    });

    it('updateUserDataField should overwrite object with null', function (done) {
        var userId = 'user_w_data8',
            initData = {a: {b: {d: 1}, c: 'c'}},
            newData = {a: {b: null}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: {b: null, c: 'c'}});
            })
            .nodeify(done);
    });

    it('updateUserDataField should overwrite null with object', function (done) {
        var userId = 'user_w_data9',
            initData = {a: {b: null, c: 'c'}},
            newData = {a: {b: {d: 1}}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal({a: {b: {d: 1}, c: 'c'}});
            })
            .nodeify(done);
    });

    it('updateUserDataField should do nothing with empty object', function (done) {
        var userId = 'user_w_data10',
            initData = {a: {b: null, c: 'c'}},
            newData = {};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function (customData) {
                expect(customData).to.deep.equal(initData);
            })
            .nodeify(done);
    });

    it('updateUserData should reject with error when given data is a string', function (done) {
        var userId = 'user_w_data11',
            initData = {},
            newData = 'aString';
        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('supplied value is not an object [aString]');
            })
            .nodeify(done);
    });

    it('updateUserData should reject with error when given data is null', function (done) {
        var userId = 'user_w_data12',
            initData = {},
            newData = null;
        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, newData);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('supplied value is not an object [null]');
            })
            .nodeify(done);
    });

    it('updateUserData should reject with error when given data is undefined', function (done) {
        var userId = 'user_w_data13',
            initData = {};
        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('supplied value is not an object [undefined]');
            })
            .nodeify(done);
    });

    it('updateUserData should reject with error when given data is an array', function (done) {
        var userId = 'user_w_data14',
            initData = {};
        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, data: initData})
            .then(function () {
                return auth.updateUserDataField(userId, [1, 2]);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('supplied value is not an object [1,2]');
            })
            .nodeify(done);
    });

    it('updateUserData should reject with error when user does not exist', function (done) {
        auth.updateUserDataField('does_not_exist', {a: 1})
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such user [does_not_exist]');
            })
            .nodeify(done);
    });

    it('should add a user without settings', function (done) {
        var userId = 'user_w_settings1';

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true})
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (userData) {
                expect(userData.settings).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('should add a user with settings', function (done) {
        var userId = 'user_w_settings2',
            initSettings = {a: {b: 1}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (userData) {
                expect(userData.settings).to.deep.equal(initSettings);
            })
            .nodeify(done);
    });

    it('should fail to a add a user with non-object settings', function (done) {
        var userId = 'user_w_settings3',
            initSettings = 'aString';

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('supplied userData.settings is not an object [aString]');
            })
            .nodeify(done);
    });

    it('should overwrite settings when updateUser', function (done) {
        var userId = 'user_w_settings4',
            initSettings = {a: {b: 1}},
            newSettings = {b: {a: 2}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                return auth.updateUser(userId, {settings: newSettings});
            })
            .then(function (userData) {
                expect(userData.settings).to.deep.equal(newSettings);
            })
            .nodeify(done);
    });

    it('should merge settings when updateUserSettings', function (done) {
        var userId = 'user_w_settings5',
            initSettings = {a: {b: 1}},
            newSettings = {b: {a: 2}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                return auth.updateUserSettings(userId, newSettings);
            })
            .then(function (settings) {
                expect(settings).to.deep.equal({a: {b: 1}, b: {a: 2}});
            })
            .nodeify(done);
    });

    it('should overwrite settings when updateUserSettings overwrite=true', function (done) {
        var userId = 'user_w_settings6',
            initSettings = {a: {b: 1}},
            newSettings = {b: {a: 2}};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                return auth.updateUserSettings(userId, newSettings, true);
            })
            .then(function (settings) {
                expect(settings).to.deep.equal(newSettings);
            })
            .nodeify(done);
    });

    it('should merge settings when updateUserComponentSettings', function (done) {
        var userId = 'user_w_settings7',
            initSettings = {a: {b: 1, c: 2}},
            newSettings = {b: 2};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                return auth.updateUserComponentSettings(userId, 'a', newSettings);
            })
            .then(function (componentSettings) {
                expect(componentSettings).to.deep.equal({b: 2, c: 2});
            })
            .nodeify(done);
    });

    it('should overwrite settings when updateUserComponentSettings overwrite=true', function (done) {
        var userId = 'user_w_settings7',
            initSettings = {a: {b: 1}},
            newSettings = {c: 2};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                return auth.updateUserComponentSettings(userId, 'a', newSettings, true);
            })
            .then(function (componentSettings) {
                expect(componentSettings).to.deep.equal({c: 2});
            })
            .nodeify(done);
    });

    it('should add settings when updateUserComponentSettings', function (done) {
        var userId = 'user_w_settings8',
            initSettings = {},
            newSettings = {c: 2};

        auth.addUser(userId, 'e@mail', 'pass', true, {overwrite: true, settings: initSettings})
            .then(function () {
                return auth.updateUserComponentSettings(userId, 'a', newSettings);
            })
            .then(function (componentSettings) {
                expect(componentSettings).to.deep.equal({c: 2});
            })
            .nodeify(done);
    });

    // _projects
    it('should add and get a project', function (done) {
        var projectName = 'newly_added_project',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.metadataStorage.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.metadataStorage.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {},
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
        auth.metadataStorage.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.metadataStorage.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {createdAt: 'justNow'},
                    owner: ownerName,
                    name: projectName,
                });
            })
            .nodeify(done);
    });

    it('should add a project and update info', function (done) {
        var projectName = 'project_with_info2',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.metadataStorage.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.metadataStorage.updateProjectInfo(projectId, {createdAt: 'aBitLater'});
            })
            .then(function (data) {
                expect(data.info).to.deep.equal({createdAt: 'aBitLater', modifiedAt: null, viewedAt: null,
                viewer: null, modifier: null, creator: null});
            })
            .nodeify(done);
    });

    it('should add a project and succeed with empty info', function (done) {
        var projectName = 'project_with_info3',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.metadataStorage.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.metadataStorage.updateProjectInfo(projectId, {});
            })
            .then(function (data) {
                expect(data.info).to.deep.equal({createdAt: 'justNow', modifiedAt: null, viewedAt: null,
                    viewer: null, modifier: null, creator: null});
            })
            .nodeify(done);
    });

    it('should add a project and not update with non allowed info', function (done) {
        var projectName = 'project_with_info4',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.metadataStorage.addProject(ownerName, projectName, {createdAt: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.metadataStorage.updateProjectInfo(projectId, {aaa: 'should not persist'});
            })
            .then(function (data) {
                expect(data.info).to.deep.equal({createdAt: 'justNow', modifiedAt: null, viewedAt: null,
                    viewer: null, modifier: null, creator: null});
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
                modifier: 'user'
            };
        auth.metadataStorage.addProject(ownerName, projectName, info)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                info.createdAt = info.viewedAt = info.modifiedAt = 'nu1';
                return auth.metadataStorage.updateProjectInfo(projectId, info);
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
        auth.metadataStorage.getProject(projId)
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
        auth.metadataStorage.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.metadataStorage.addProject(ownerName, projectName);
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
        auth.metadataStorage.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.metadataStorage.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {},
                    owner: ownerName,
                    name: projectName
                });
                return auth.metadataStorage.deleteProject(projId);
            })
            .then(function () {
                return auth.metadataStorage.getProject(projId);
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
        auth.metadataStorage.deleteProject('does_not_exist_project')
            .nodeify(done);
    });

    // Organizations
    it('should fail to get non existent organization', function (done) {
        auth.getOrganization('does_not_exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization') > -1) {
                    return;
                }
                throw new Error('Unexpected error: ' + err);
            })
            .nodeify(done);
    });

    it('should fail to remove user from a non existent organization', function (done) {
        auth.removeUserFromOrganization('user', 'does_not_exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization') > -1) {
                    return;
                }
                throw new Error('Unexpected error: ' + err);
            })
            .nodeify(done);
    });

    it.skip('should fail to remove a non existent user from an organization', function () {
        // TODO: implement
    });

    it.skip('should fail to authorize organization with invalid type', function (done) {
        authorizer.setAccessRights('dummyOrgId', 'dummyProjectName', 'unknown', {}, function (err) {
            if (err.message.indexOf('unknown type') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    it.skip('should fail to authorize by user id with invalid type', function (done) {
        auth.authorizeByUserId('user', 'dummyProjectName', 'unknown', {}, function (err) {
            if (err.message.indexOf('unknown type') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    it('should fail to authorize non existent organization', function (done) {
        authorizer.setAccessRights('dummyOrgId', 'unauthorized_project', {}, projectAuthParams)
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user or org') > -1) {
                    return;
                }
                throw new Error('Unexpected error: ' + err);
            })
            .nodeify(done);
    });

    it('should fail to get authorization info for non existent organization', function (done) {
        authorizer.getAccessRights('orgDoesNotExist', 'projectId', projectAuthParams)
            .then(function () {
                done(new Error('Should have failed'));
            }, function (err) {
                if (err.message.indexOf('no such ') > -1) {
                    done();
                    return;
                }
                done(new Error('Unexpected error: ' + err));
            });
    });

    it('gets project names', function (done) {
        auth.metadataStorage.getProjects(done);
    });

    it('should have permissions', function (done) {
        return authorizer.getAccessRights('user', 'project', projectAuthParams)
            .then(function (authorized) {
                authorized.should.deep.equal({read: true, write: true, delete: false});
            })
            .nodeify(done);
    });


    it('should be able to revoke permissions', function (done) {
        return authorizer.setAccessRights('user', 'project',
            {read: false, write: false, delete: false}, projectAuthParams)
            .then(function () {
                return authorizer.getAccessRights('user', 'project', projectAuthParams);
            }).then(function (authorized) {
                authorized.should.deep.equal({read: false, write: false, delete: false});
            })
            .nodeify(done);
    });

    it('should be able to add organization', function (done) {
        var orgName = 'org1';
        return auth.addOrganization(orgName)
            .then(function () {
                return auth.getOrganization(orgName);
            }).then(function () {
                return auth.addUserToOrganization('user', orgName);
            }).then(function () {
                return auth.getOrganization(orgName);
            }).then(function (org) {
                org.users.should.deep.equal(['user']);
            }).nodeify(done);
    });

    it('should be able to list organization', function (done) {
        var orgName = 'org2',
            otherOrgName = 'otherOrgName';
        Q.allDone([
            auth.addOrganization(orgName),
            auth.addOrganization(otherOrgName)
        ])
            .then(function () {
                'adminUser2'
                return Q.allDone([
                    auth.addUserToOrganization('user', orgName)
                ]);
            })
            .then(function () {
                return auth.listOrganizations({});
            }).then(function (organizations) {
                expect(organizations).to.include({
                        _id: orgName,
                        info: {},
                        projects: {},
                        type: auth.CONSTANTS.ORGANIZATION,
                        admins: [],
                        users: ['user']
                    },
                    {
                        _id: otherOrgName,
                        info: {},
                        projects: {},
                        type: auth.CONSTANTS.ORGANIZATION,
                        admins: [],
                        users: []
                    });
            }).nodeify(done);
    });

    it('should fail to add dup organization', function (done) {
        var orgName = 'org3';
        auth.addOrganization(orgName)
            .then(function () {
                return auth.addOrganization(orgName);
            })
            .then(function () {
                done(new Error('should have been rejected'));
            })
            .catch(function (err) {
                expect(err.message).to.include('user or org already exists');
                done();
            })
            .done();
    });

    it('should fail to add nonexistant organization', function (done) {
        var orgName = 'org_doesnt_exist';
        auth.addUserToOrganization('user', orgName)
            .then(function () {
                done(new Error('should have been rejected'));
            }, function (/*err*/) {
                done();
            });
    });

    it('should fail to add nonexistant user to organization', function (done) {
        var orgName = 'org1';
        auth.addUserToOrganization('user_doesnt_exist', orgName)
            .then(function () {
                done(new Error('should have been rejected'));
            }, function (/*err*/) {
                done();
            });
    });

    it('should authorize organization', function (done) {
        var orgName = 'org1',
            projectName = 'org_project';
        authorizer.setAccessRights(orgName, projectName, {read: true, write: true, delete: false}, projectAuthParams)
            .then(function () {
                return authorizer.getAccessRights(orgName, projectName, projectAuthParams);
            })
            .then(function (rights) {
                rights.should.deep.equal({read: true, write: true, delete: false});
            })
            .nodeify(done);
    });

    it('should give the user project permissions from the organization', function (done) {
        authorizer.setAccessRights('user', 'org_project',
            {read: true, write: true, delete: true}, projectAuthParams)
            .then(function () {
                return authorizer.getAccessRights('user', 'org_project', projectAuthParams);
            })
            .then(function (authorized) {
                authorized.should.deep.equal({read: true, write: true, delete: true});
            })
            .nodeify(done);
    });

    it('should deauthorize organization', function (done) {
        var orgName = 'org1',
            projectName = 'org_project';
        authorizer.setAccessRights(orgName, projectName, {read: false, write: false, delete: false}, projectAuthParams)
            .then(function () {
                return authorizer.getAccessRights(orgName, projectName, projectAuthParams);
            })
            .then(function (rights) {
                rights.should.deep.equal({read: false, write: false, delete: false});
            })
            .nodeify(done);
    });

    it('should remove user from organization', function (done) {
        var orgId = 'orgWithUser',
            userId = 'userInOrg';
        auth.addUser(userId, '@', 'ss', true, {})
            .then(function () {
                return auth.addOrganization(orgId);
            })
            .then(function () {
                return auth.addUserToOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (user) {
                expect(user.orgs).to.deep.equal(['orgWithUser']);
                return auth.removeUserFromOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (user) {
                expect(user.orgs).to.deep.equal([]);
            })
            .nodeify(done);
    });

    it('should remove organization', function (done) {
        var orgName = 'org_removed';
        auth.addOrganization(orgName)
            .then(function () {
                return auth.listOrganizations();
            })
            .then(function (orgs) {
                var hadOrg = false;
                orgs.forEach(function (org) {
                    if (org._id === orgName) {
                        hadOrg = true;
                    }
                });

                expect(hadOrg).to.equal(true);

                return auth.removeOrganizationByOrgId(orgName);
            })
            .then(function () {
                return auth.listOrganizations();
            })
            .then(function (orgs) {
                var hadOrg = false;
                orgs.forEach(function (org) {
                    if (org._id === orgName) {
                        hadOrg = true;
                    }
                });

                expect(hadOrg).to.equal(false);
            })
            .nodeify(done);
    });

    it('should remove/disable organization and fail to add it again', function (done) {
        var orgName = 'org_remove_fail_to_add';

        auth.addOrganization(orgName)
            .then(function () {
                return auth.removeOrganizationByOrgId(orgName);
            })
            .then(function () {
                return auth.addOrganization(orgName);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('user or org already exists');
            })
            .nodeify(done);
    });


    it('should remove with force organization and be able to add it again', function (done) {
        var orgName = 'org_remove_can_add';

        auth.addOrganization(orgName)
            .then(function () {
                return auth.removeOrganizationByOrgId(orgName, true);
            })
            .then(function () {
                return auth.getOrganization(orgName);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such organization');
                return auth.addOrganization(orgName, {newOrg: true});
            })
            .then(function () {
                return auth.getOrganization(orgName);
            })
            .then(function (org) {
                expect(org.info.newOrg).to.equal(true);
            })
            .nodeify(done);
    });

    it('should remove org and throw error in api calls', function (done) {
        var orgId = 'removeOrgCheckApiOrg',
            userId = 'removeOrgCheckApiUser';

        auth.addOrganization(orgId)
            .then(function () {
                return Q.allDone([
                    auth.addUser(userId, 'mail', 'pass', true, {}),
                    auth.removeOrganizationByOrgId(orgId)
                ]);
            })
            .then(function () {
                return Q.allSettled([
                    auth.getOrganization(orgId),
                    auth.removeOrganizationByOrgId(orgId),

                    auth.addUserToOrganization(userId, orgId),
                    auth.removeUserFromOrganization(userId, orgId),
                    auth.setAdminForUserInOrganization(userId, orgId, true),
                    auth.setAdminForUserInOrganization(userId, orgId, false),
                ]);
            })
            .then(function (res) {
                res.forEach(function (r) {
                    expect(r.state).to.equal('rejected');
                    expect(r.reason.message).to.contain('no such organization');
                });
            })
            .nodeify(done);
    });

    it('should remove from user.orgs when removing organization', function (done) {
        var orgId = 'checkRemovedFromUserOrg',
            userId = 'checkRemovedFromUserUser';

        auth.addUser(userId, 'mail', 'pass', true, {})
            .then(function () {
                return auth.addOrganization(orgId);
            })
            .then(function () {
                return auth.addUserToOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (userData) {
                expect(userData.orgs).to.deep.equal([orgId]);
                return auth.removeOrganizationByOrgId(orgId);
            })
            .then(function () {
                return auth.getUser(userId);
            })
            .then(function (userData) {
                expect(userData.orgs).to.deep.equal([]);
            })
            .nodeify(done);
    });

    it('should remove from org.admins when removing user', function (done) {
        var orgId = 'checkRemovedFromOrgOrg',
            userId = 'checkRemovedFromOrgUser';

        auth.addUser(userId, 'mail', 'pass', true, {})
            .then(function () {
                return auth.addOrganization(orgId);
            })
            .then(function () {
                return auth.setAdminForUserInOrganization(userId, orgId, true);
            })
            .then(function () {
                return auth.getOrganization(orgId);
            })
            .then(function (orgData) {
                expect(orgData.admins).to.deep.equal([userId]);
                return auth.deleteUser(userId);
            })
            .then(function () {
                return auth.getOrganization(orgId);
            })
            .then(function (orgData) {
                expect(orgData.admins).to.deep.equal([]);
            })
            .nodeify(done);
    });

    it('should fail to remove organization that does not exist', function (done) {
        var orgName = 'orgDoesNotExist';
        auth.removeOrganizationByOrgId(orgName)
            .then(function () {
                done(new Error('should have been rejected'));
            }, function (/*err*/) {
                done();
            });
    });

    it('getAdminsInOrganization should fail with non-existing organization', function (done) {
        var orgId = 'doesNotExist';
        return auth.getAdminsInOrganization(orgId)
            .then(function () {
                throw new Error('getAdminsInOrganization should fail with non-existing organization');
            })
            .catch(function (error) {
                expect(error.message).to.include('no such organization [' + orgId);
                done();
            })
            .done();
    });

    it('getAdminsInOrganization return empty array for new organization', function (done) {
        var orgId = 'orgAdmin1';
        return auth.addOrganization(orgId)
            .then(function () {
                return auth.getAdminsInOrganization(orgId);
            })
            .then(function (admins) {
                expect(admins).to.deep.equal([]);
            })
            .nodeify(done);
    });

    it('should should make user admin for organization', function (done) {
        var orgId = 'orgAdmin2',
            userId = 'adminUser2';
        return auth.addOrganization(orgId)
            .then(function () {
                return auth.setAdminForUserInOrganization(userId, orgId, true);
            })
            .then(function () {
                return auth.getAdminsInOrganization(orgId);
            })
            .then(function (admins) {
                expect(admins.indexOf(userId) > - 1).to.equal(true);
            })
            .nodeify(done);
    });

    it('should should make user admin, then remove admin for organization', function (done) {
        var orgId = 'orgAdmin3',
            userId = 'adminUser3';
        return auth.addOrganization(orgId)
            .then(function () {
                return auth.setAdminForUserInOrganization(userId, orgId, true);
            })
            .then(function () {
                return auth.getAdminsInOrganization(orgId);
            })
            .then(function (admins) {
                expect(admins.indexOf(userId) > - 1).to.equal(true);
            })
            .then(function () {
                return auth.setAdminForUserInOrganization(userId, orgId, false);
            })
            .then(function () {
                return auth.getAdminsInOrganization(orgId);
            })
            .then(function (admins) {
                expect(admins.indexOf(userId) > - 1).to.equal(false);
            })
            .nodeify(done);
    });

    it('should should make user admin twice organization', function (done) {
        var orgId = 'orgAdmin4',
            userId = 'adminUser4';
        return auth.addOrganization(orgId)
            .then(function () {
                return auth.setAdminForUserInOrganization(userId, orgId, true);
            })
            .then(function () {
                return auth.getAdminsInOrganization(orgId);
            })
            .then(function (admins) {
                expect(admins.indexOf(userId) > - 1).to.equal(true);
            })
            .then(function () {
                return auth.setAdminForUserInOrganization(userId, orgId, true);
            })
            .then(function () {
                return auth.getAdminsInOrganization(orgId);
            })
            .then(function (admins) {
                expect(admins.indexOf(userId) > - 1).to.equal(true);
            })
            .nodeify(done);
    });

    it('should should remove user admin in organization', function (done) {
        var orgId = 'orgAdmin5',
            userId = 'adminUser5';
        return auth.addOrganization(orgId)
            .then(function () {
                return auth.setAdminForUserInOrganization(userId, orgId, false);
            })
            .then(function () {
                return auth.getAdminsInOrganization(orgId);
            })
            .then(function (admins) {
                expect(admins.indexOf(userId) > - 1).to.equal(false);
            })
            .nodeify(done);
    });

    it('getProjectAuthorizationListByUserId should include auth from organization', function (done) {
        var orgId = 'organ1',
            userId = 'userWithOrgan1',
            projectId1 = 'organsProject1',
            projectId2 = 'usersProject1';

        auth.addUser(userId, '@', 'p', true, {})
            .then(function () {
                return auth.addOrganization(orgId);
            })
            .then(function () {
                return authorizer.setAccessRights(orgId, projectId1,
                    {read: true, write: true, delete: true}, projectAuthParams);
            })
            .then(function () {
                return auth.authorizeByUserId(userId, projectId2, 'create',
                    {read: true, write: true, delete: true});
            })
            .then(function () {
                return authorizer.getAccessRights(userId, projectId1, projectAuthParams);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    read: false,
                    write: false,
                    delete: false
                });
                return auth.addUserToOrganization(userId, orgId);
            })
            .then(function () {
                return authorizer.getAccessRights(userId, projectId1, projectAuthParams);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    read: true,
                    write: true,
                    delete: true
                });
                return auth.removeUserFromOrganization(userId, orgId);
            })
            .then(function () {
                return authorizer.getAccessRights(userId, projectId1, projectAuthParams);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    read: false,
                    write: false,
                    delete: false
                });
            })
            .nodeify(done);
    });

    it.skip('getProjectAuthorizationListByUserId should get the highest auth', function (done) {
        var orgId = 'organHighest1',
            userId = 'userWithOrganHighest1',
            projectId = 'organAndUserProject1';

        auth.addUser(userId, '@', 'p', true, {})
            .then(function () {
                return auth.addOrganization(orgId);
            })
            .then(function () {
                return auth.authorizeOrganization(orgId, projectId, 'create',
                    {read: true, write: false, delete: false});
            })
            .then(function () {
                return auth.authorizeByUserId(userId, projectId, 'create',
                    {read: true, write: true, delete: false});
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    organAndUserProject1: {
                        read: true,
                        write: true,
                        delete: false
                    }
                });
                return auth.addUserToOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    organAndUserProject1: {
                        read: true,
                        write: true,
                        delete: false
                    }
                });
                return auth.removeUserFromOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    organAndUserProject1: {
                        read: true,
                        write: true,
                        delete: false
                    }
                });
            })
            .nodeify(done);
    });

    it.skip('getProjectAuthorizationListByUserId should get the highest auth2', function (done) {
        var orgId = 'organHighest2',
            userId = 'userWithOrganHighest2',
            projectId = 'organAndUserProject2';

        auth.addUser(userId, '@', 'p', true, {})
            .then(function () {
                return auth.addOrganization(orgId);
            })
            .then(function () {
                return auth.authorizeOrganization(orgId, projectId, 'create',
                    {read: true, write: true, delete: true});
            })
            .then(function () {
                return auth.authorizeByUserId(userId, projectId, 'create',
                    {read: true, write: false, delete: false});
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    organAndUserProject2: {
                        read: true,
                        write: false,
                        delete: false
                    }
                });
                return auth.addUserToOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    organAndUserProject2: {
                        read: true,
                        write: true,
                        delete: true
                    }
                });
                return auth.removeUserFromOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    organAndUserProject2: {
                        read: true,
                        write: false,
                        delete: false
                    }
                });
            })
            .nodeify(done);
    });

    it.skip('getProjectAuthorizationList should fail if user does not exist', function (done) {
        var userId = 'getProjectAuthorizationListDoesNotExist';

        auth.getProjectAuthorizationListByUserId(userId).
            then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such user [' + userId);
                done();
            })
            .done();
    });

    // project transfer
    it('transferProject should fail when project does not exit', function (done) {
        var oldOwner = 'currOwner',
            newOwner = 'newOwner',
            projectName = 'does_not_exist_transfer',
            projectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(oldOwner, projectName);

        auth.metadataStorage.transferProject(projectId, newOwner)
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such project [');
                done();
            })
            .done();
    });

    it.skip('transferProject should fail when newOwner does not exist', function (done) {
        // This is not checked in gmeAuth
        var oldOwner = 'currOwner',
            newOwner = 'newOwner_does_not_exist',
            projectName = 'owner_does_not_match_transfer',
            projectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(oldOwner, projectName);

        auth.addProject(oldOwner, projectName)
            .then(function () {
                return auth.transferProject(projectId, newOwner);
            })
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('newOrgOrUserId [' + newOwner + '] does not exist');
                done();
            })
            .done();
    });

    it.skip('transferProject should give full rights to new owner', function (done) {
        var oldOwner = 'currOwner',
            newOwner = 'newOwner',
            newProjectId,
            projectName = 'transferred1',
            projectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(oldOwner, projectName);

        auth.addProject(oldOwner, projectName)
            .then(function () {
                return auth.addUser(oldOwner, '@', 'p', true, {});
            })
            .then(function () {
                return auth.addUser(newOwner, '@', 'p', true, {});
            })
            .then(function () {
                return auth.transferProject(projectId, newOwner);
            })
            .then(function (newProjectId_) {
                newProjectId = newProjectId_;
                return auth.getProject(newProjectId);
            })
            .then(function (projectData) {
                expect(projectData).to.deep.equal({
                    _id: 'newOwner+transferred1',
                    info: {},
                    name: 'transferred1',
                    owner: 'newOwner'
                });
                return auth.getProjectAuthorizationByUserId(newOwner, newProjectId);
            })
            .then(function (rights) {
                expect(rights).to.deep.equal({
                    read: true,
                    write: true,
                    delete: true
                });
            })
            .nodeify(done);
    });

    it('transferProject should save info about project', function (done) {
        var oldOwner = 'currOwner2',
            newOwner = 'newOwner2',
            newProjectId,
            projectName = 'transferred2',
            projectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(oldOwner, projectName);

        auth.metadataStorage.addProject(oldOwner, projectName, {firstOwner: oldOwner})
            .then(function () {
                return auth.addUser(oldOwner, '@', 'p', true, {});
            })
            .then(function () {
                return auth.addUser(newOwner, '@', 'p', true, {});
            })
            .then(function () {
                return auth.metadataStorage.transferProject(projectId, newOwner);
            })
            .then(function (newProjectId_) {
                newProjectId = newProjectId_;
                return auth.metadataStorage.getProject(newProjectId);
            })
            .then(function (projectData) {
                expect(projectData.info).to.deep.equal({firstOwner: oldOwner});
            })
            .nodeify(done);
    });

    it('transferProject should transfer to organization', function (done) {
        var oldOwner = 'currOwnerUser',
            newOwner = 'newOwnerOrg',
            projectName = 'transferred3',
            projectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(oldOwner, projectName);

        auth.metadataStorage.addProject(oldOwner, projectName, {firstOwner: oldOwner})
            .then(function () {
                return auth.addUser(oldOwner, '@', 'p', true, {});
            })
            .then(function () {
                return auth.addOrganization(newOwner);
            })
            .then(function () {
                return auth.metadataStorage.transferProject(projectId, newOwner);
            })
            .then(function (newProjectId) {
                return auth.metadataStorage.getProject(newProjectId);
            })
            .then(function (projectData) {
                expect(projectData.info).to.deep.equal({firstOwner: oldOwner});
            })
            .nodeify(done);
    });
});