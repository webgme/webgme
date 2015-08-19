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
        mongodb = testFixture.mongodb,
        expect = testFixture.expect,
        Q = testFixture.Q,

        auth,
        dbConn,
        db;

    before(function (done) {
        auth = new GMEAuth(null, gmeConfig);

        dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options)
            .then(function (db_) {
                db = db_;
                return Q.allDone([
                    Q.ninvoke(db, 'collection', '_users')
                        .then(function (collection_) {
                            var collection = collection_;
                            return Q.ninvoke(collection, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_projects')
                        .then(function (projects) {
                            return Q.ninvoke(projects, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', 'ClientCreateProject')
                        .then(function (createdProject) {
                            return Q.ninvoke(createdProject, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', 'project')
                        .then(function (project) {
                            return Q.ninvoke(project, 'remove')
                                .then(function () {
                                    return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                                });
                        }),
                    Q.ninvoke(db, 'collection', 'unauthorized_project')
                        .then(function (project) {
                            return Q.ninvoke(project, 'remove')
                                .then(function () {
                                    return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                                });
                        })
                ]);
            });

        dbConn
            .then(function () {
                return auth.connect();
            })
            .then(function () {
                return auth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true});
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
        db.close(true, function (err) {
            if (err) {
                done(err);
                return;
            }
            auth.unload(function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });
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

    it('gets all user auth info', function (done) {
        auth.addUser('user_no_email', null, 'plaintext', true, {overwrite: true})
            .then(function () {
                return auth.getAllUserAuthInfo('user_no_email');
            })
            .nodeify(done);
    });


    it('gets all user auth info fails on non existent user id', function (done) {
        auth.getAllUserAuthInfo('user_does_not exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.indexOf('no such user') > -1) {
                    return;
                }
                throw new Error('Unexpected error ' + err);
            })
            .nodeify(done);
    });

    it('fails with invalid user for getProjectAuthorizationByUserId', function (done) {
        auth.getProjectAuthorizationByUserId('user_does_not exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.indexOf('No such user') > -1) {
                    return;
                }
                throw new Error('Unexpected error ' + err);
            })
            .nodeify(done);
    });

    it('gets user auth info', function (done) {
        auth.addUser('user_no_email', null, 'plaintext', true, {overwrite: true})
            .then(function () {
                return auth.getUserAuthInfo('user_no_email');
            })
            .nodeify(done);
    });

    it('gets user auth info fails on non existent user id', function (done) {
        auth.getUserAuthInfo('user_does_not exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.indexOf('no such user') > -1) {
                    return;
                }
                throw new Error('Unexpected error ' + err);
            })
            .nodeify(done);
    });

    it('throws for invalid session getAllUserAuthInfoBySession', function (done) {
        auth.getAllUserAuthInfoBySession('sessionId')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err instanceof TypeError && err.message.indexOf('getSessionUser') > -1) {
                    return;
                }
                throw err;
            })
            .nodeify(done);
    });

    it('does not authorize by invalid session authorizeBySession', function (done) {
        auth.authorize('sessionId')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err instanceof TypeError && err.message.indexOf('getSessionUser') > -1) {
                    return;
                }
                throw err;
            })
            .nodeify(done);
    });


    it('checks invalid and returns false', function (done) {
        auth.checkToken('token')
            .then(function (valid) {
                if (valid) {
                    done(new Error('should be invalid token'));
                    return;
                }
                done();
            });
    });

    it('should return with false using invalid token tokenAuth', function (done) {
        auth.tokenAuth('token')
            .then(function (valid) {
                if (valid[0]) {
                    done(new Error('should be invalid token'));
                    return;
                }
                done();
            });
    });


    it('does not get token for invalid session', function (done) {
        auth.getToken('sessionId')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err instanceof TypeError && err.message.indexOf('getSessionUser') > -1) {
                    return;
                }
                throw err;
            })
            .nodeify(done);
    });

    it('does not generate token for invalid session', function (done) {
        auth.generateToken('sessionId')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err instanceof TypeError && err.message.indexOf('getSessionUser') > -1) {
                    return;
                }
                throw err;
            })
            .nodeify(done);
    });

    it('does not get project auth by invalid session', function (done) {
        auth.getProjectAuthorizationBySession('sessionId')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err instanceof TypeError && err.message.indexOf('getSessionUser') > -1) {
                    return;
                }
                throw err;
            })
            .nodeify(done);
    });

    it('removes user by id', function (done) {
        auth.addUser('user_to_remove', 'user_to_remove@example.com', 'plaintext', true, {overwrite: true}).
            then(function () {
                return auth.deleteUser('user_to_remove');
            })
            .nodeify(done);
    });

    // _projects
    it('should add and get a project', function (done) {
        var projectName = 'newly_added_project',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.getProject(projectId);
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
        var projectName = 'project_with_info',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.addProject(ownerName, projectName, {created: 'justNow'})
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {created: 'justNow'},
                    owner: ownerName,
                    name: projectName,
                });
            })
            .nodeify(done);
    });

    it('should fail to get a non-existing project', function (done) {
        var projectName = 'does_not_exist',
            ownerName = 'someUser',
            projId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerName, projectName);
        auth.getProject(projId)
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
        auth.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.addProject(ownerName, projectName);
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
        auth.addProject(ownerName, projectName)
            .then(function (projectId) {
                expect(projectId).to.equal(projId);
                return auth.getProject(projectId);
            })
            .then(function (project) {
                expect(project).to.deep.equal({
                    _id: projId,
                    info: {},
                    owner: ownerName,
                    name: projectName
                });
                return auth.deleteProject(projId);
            })
            .then(function () {
                return auth.getProject(projId);
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
        auth.deleteProject('does_not_exist_project')
            .nodeify(done);
    });

    // Organizations
    it('should fail to get non existent organization', function (done) {
        auth.getOrganization('does_not_exist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.indexOf('No such organization') > -1) {
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
                if (err.indexOf('No such organization') > -1) {
                    return;
                }
                throw new Error('Unexpected error: ' + err);
            })
            .nodeify(done);
    });

    it.skip('should fail to remove a non existent user from an organization', function () {
        // TODO: implement
    });

    it('should fail to authorize organization with invalid type', function (done) {
        auth.authorizeOrganization('dummyOrgId', 'dummyProjectName', 'unknown', {}, function (err) {
            if (err.indexOf('unknown type') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    it('should fail to authorize by user id with invalid type', function (done) {
        auth.authorizeByUserId('user', 'dummyProjectName', 'unknown', {}, function (err) {
            if (err.indexOf('unknown type') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    it('should fail to authorize non existent organization', function (done) {
        auth.authorizeOrganization('dummyOrgId', 'unauthorized_project', 'create', {})
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                if (err.indexOf('No such user or org') > -1) {
                    return;
                }
                throw new Error('Unexpected error: ' + err);
            })
            .nodeify(done);
    });

    it('should fail to get authorization info for non existent organization', function (done) {
        auth.getAuthorizationInfoByOrgId('org_does_not_exist', 'projectName')
            .then(function () {
                done(new Error('Should have failed'));
            }, function (err) {
                if (err.indexOf('No such organization') > -1) {
                    done();
                    return;
                }
                done(new Error('Unexpected error: ' + err));
            });
    });


    it('gets project names', function (done) {
        auth._getProjectNames(done);
    });

    it('should auth with a new token', function (done) {
        auth.generateTokenForUserId('user')
            .then(function (tokenId) {
                return Q.allSettled([auth.tokenAuthorization(tokenId, 'project'),
                    auth.tokenAuthorization(tokenId, 'unauthorized_project'),
                    auth.tokenAuthorization(tokenId, 'doesnt_exist_project')]);
            }).then(function (authorized) {
                authorized.should.deep.equal([
                    {state: 'fulfilled', value: true},
                    {state: 'fulfilled', value: false},
                    {state: 'fulfilled', value: false}
                ]);
            }).nodeify(done);
    });

    it('should have permissions', function (done) {
        return auth.getAuthorizationInfoByUserId('user', 'project')
            .then(function (authorized) {
                authorized.should.deep.equal({read: true, write: true, delete: false});
            }).then(function () {
                return auth.getProjectAuthorizationByUserId('user', 'project');
            }).then(function (authorized) {
                authorized.should.deep.equal({read: true, write: true, delete: false});
            })
            .nodeify(done);
    });


    it('should be able to revoke permissions', function (done) {
        return auth.authorizeByUserId('user', 'project', 'delete', {})
            .then(function () {
                return auth.getAuthorizationInfoByUserId('user', 'project');
            }).then(function (authorized) {
                authorized.should.deep.equal({read: false, write: false, delete: false});
            }).then(function () {
                return auth.getProjectAuthorizationByUserId('user', 'project');
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
                return auth.listOrganizations({});
            }).then(function (organizations) {
                expect(organizations).to.include({
                        _id: orgName,
                        info: {},
                        projects: {},
                        type: auth.CONSTANTS.ORGANIZATION,
                        admins: []
                    },
                    {
                        _id: otherOrgName,
                        info: {},
                        projects: {},
                        type: auth.CONSTANTS.ORGANIZATION,
                        admins: []
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
                expect(err.message).to.include('duplicate key error');
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

        return auth.authorizeOrganization(orgName, projectName, 'create', {read: true, write: true, delete: false})
            .then(function () {
                return auth.getAuthorizationInfoByOrgId(orgName, projectName);
            })
            .then(function (rights) {
                rights.should.deep.equal({read: true, write: true, delete: false});
            })
            .nodeify(done);
    });

    it('should give the user project permissions from the organization', function (done) {
        return auth.getAuthorizationInfoByUserId('user', 'org_project')
            .then(function (authorized) {
                authorized.should.deep.equal({read: false, write: false, delete: false});
            })
            .then(function () {
                return auth.getProjectAuthorizationByUserId('user', 'org_project');
            })
            .then(function (authorized) {
                authorized.should.deep.equal({read: true, write: true, delete: false});
            })
            .nodeify(done);
    });

    it('should deauthorize organization', function (done) {
        var orgName = 'org1',
            projectName = 'org_project';

        return auth.authorizeOrganization(orgName, projectName, 'delete', {})
            .then(function () {
                return auth.getAuthorizationInfoByOrgId(orgName, projectName);
            })
            .then(function (rights) {
                rights.should.deep.equal({});
            })
            .nodeify(done);
    });

    it('should remove user from organization', function (done) {
        var orgName = 'org1';
        auth.removeUserFromOrganization('user', orgName)
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
        var orgName = 'org1';
        auth.removeOrganizationByOrgId(orgName)
            .nodeify(done);
    });

    it('should fail to remove organization twice', function (done) {
        var orgName = 'org1';
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
                throw 'getAdminsInOrganization should fail with non-existing organization';
            })
            .catch(function (error) {
                expect(error).to.include('No such organization [' + orgId);
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
                return auth.authorizeOrganization(orgId, projectId1, 'create',
                    {read: true, write: true, delete: true});
            })
            .then(function () {
                return auth.authorizeByUserId(userId, projectId2, 'create',
                    {read: true, write: true, delete: true});
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    usersProject1: {
                        read: true,
                        write: true,
                        delete: true
                    }
                });
                return auth.addUserToOrganization(userId, orgId);
            })
            .then(function () {
                return auth.getProjectAuthorizationListByUserId(userId);
            })
            .then(function (fullRights) {
                fullRights.should.deep.equal({
                    usersProject1: {
                        read: true,
                        write: true,
                        delete: true
                    },
                    organsProject1: {
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
                    usersProject1: {
                        read: true,
                        write: true,
                        delete: true
                    }
                });
            })
            .nodeify(done);
    });

    it('getProjectAuthorizationListByUserId should get the highest auth', function (done) {
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

    it('getProjectAuthorizationListByUserId should get the highest auth2', function (done) {
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

    it('getProjectAuthorizationList should fail if user does not exist', function (done) {
        var userId = 'getProjectAuthorizationListDoesNotExist';

        auth.getProjectAuthorizationListByUserId(userId).
            then(function () {
                throw 'Should have failed';
            })
            .catch(function (err) {
                expect(err).to.include('No such user [' + userId);
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

        auth.transferProject(projectId, newOwner)
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

    it('transferProject should give full rights to new owner', function (done) {
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

        auth.addProject(oldOwner, projectName, {firstOwner: oldOwner})
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
                expect(projectData.info).to.deep.equal({firstOwner: oldOwner});
            })
            .nodeify(done);
    });

    it('transferProject should transfer to organization', function (done) {
        var oldOwner = 'currOwnerUser',
            newOwner = 'newOwnerOrg',
            projectName = 'transferred3',
            projectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(oldOwner, projectName);

        auth.addProject(oldOwner, projectName, {firstOwner: oldOwner})
            .then(function () {
                return auth.addUser(oldOwner, '@', 'p', true, {});
            })
            .then(function () {
                return auth.addOrganization(newOwner);
            })
            .then(function () {
                return auth.transferProject(projectId, newOwner);
            })
            .then(function (newProjectId) {
                return auth.getAuthorizationInfoByOrgId(newOwner, newProjectId);
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
});