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
        Q = testFixture.Q,

        auth,
        dbConn,
        db;

    before(function (done) {
        var gmeauthDeferred = Q.defer();

        auth = new GMEAuth(null, gmeConfig);
        auth.connect(function (err) {
            if (err) {
                gmeauthDeferred.reject(err);
            } else {
                gmeauthDeferred.resolve(auth);
            }
        });

        dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options)
            .then(function (db_) {
                db = db_;
                return Q.all([
                    Q.ninvoke(db, 'collection', '_users')
                        .then(function (collection_) {
                            var collection = collection_;
                            return Q.ninvoke(collection, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_organizations')
                        .then(function (orgs_) {
                            return Q.ninvoke(orgs_, 'remove');
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
            });

        Q.all([dbConn, gmeauthDeferred.promise])
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
        auth.addUser('no_overwrite_user' + (new Date()).toISOString(), 'no_overwrite_user@example.com', 'plaintext', true, {overwrite: false}, done);
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
                return auth.removeUserByUserId('user_to_remove');
            })
            .nodeify(done);
    });

    it('deletes project', function (done) {
        auth.deleteProject('does_not_exist_project')
            .nodeify(done);
    });

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
            if (err.indexOf('invalid type') > -1) {
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
                if (err.indexOf('No such organization') > -1) {
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
                return Q.all([auth.tokenAuthorization(tokenId, 'project'),
                    auth.tokenAuthorization(tokenId, 'unauthorized_project'),
                    auth.tokenAuthorization(tokenId, 'doesnt_exist_project')]);
            }).then(function (authorized) {
                authorized.should.deep.equal([true, false, false]);
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

    it('should fail to add dup organization', function (done) {
        var orgName = 'org1';
        auth.addOrganization(orgName)
            .then(function () {
                done(new Error('should have been rejected'));
            }, function (/*err*/) {
                done();
            });
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
});