/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');


describe('GME authentication', function () {
    'use strict';

    var GMEAuth = testFixture.GMEAuth,
        should = testFixture.should,
        mongodb = testFixture.mongodb,
        Q = testFixture.Q,

        auth,
        dbConn,
        db,
        config = {
            mongodatabase: 'webgme_tests'
        };

    before(function (done) {
        auth = new GMEAuth({
            host: '127.0.0.1',
            port: 27017,
            database: 'webgme-tests'
        });


        dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', 'mongodb://127.0.0.1/' + config.mongodatabase, {
            'w': 1,
            'native-parser': true,
            'auto_reconnect': true,
            'poolSize': 20,
            socketOptions: {keepAlive: 1}
        })
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
            }).
            nodeify(done);
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

    //it('adds user without overwrite', function (done) {
    //    auth.addUser('no_overwrite_user', 'no_overwrite_user@example.com', 'plaintext', true, {overwrite: false}, done);
    //});

    it('adds a user without email address', function (done) {
        auth.addUser('user_no_email', null, 'plaintext', true, {overwrite: true}, done);
    });

    it('removes user by id', function (done) {
        auth.addUser('user_to_remove', 'user_to_remove@example.com', 'plaintext', true, {overwrite: true}).
            then(function () {
                return auth.removeUserByUserId('user_to_remove');
            })
            .nodeify(done);
    });

    it('should fail to get non existent organization', function (done) {
        auth.getOrganization('does_not_exist', function (err) {
            if (err.indexOf('No such organization') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    it('should fail to remove user from a non existent organization', function (done) {
        auth.removeUserFromOrganization('user', 'does_not_exist', function (err) {
            if (err.indexOf('No such organization') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    //it('should fail to remove a non existent user from an organization', function (done) {
    // // TODO: implement
    //});

    it('should fail to authorize organization with invalid type', function (done) {
        auth.authorizeOrganization('dummyOrgId', 'dummyProjectName', 'unknown', {}, function (err) {
            if (err.indexOf('invalid type') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    it('should fail to authorize non existent organization', function (done) {
        auth.authorizeOrganization('dummyOrgId', 'unauthorized_project', 'create', {}, function (err) {
            if (err.indexOf('No such organization') > -1) {
                done();
                return;
            }
            done(new Error('Unexpected error: ' + err));
        });
    });

    it('should fail to get authorozation info for non existent organization', function (done) {
        auth.getAuthorizationInfoByOrgId('org_does_not_exist', 'projectName', function (err) {
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
                done('should have been rejected');
            }, function (/*err*/) {
                done();
            });
    });

    it('should fail to add nonexistant organization', function (done) {
        var orgName = 'org_doesnt_exist';
        auth.addUserToOrganization('user', orgName)
            .then(function () {
                done('should have been rejected');
            }, function (/*err*/) {
                done();
            });
    });

    it('should fail to add nonexistant user to organization', function (done) {
        var orgName = 'org1';
        auth.addUserToOrganization('user_doesnt_exist', orgName)
            .then(function () {
                done('should have been rejected');
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
            }).then(function (rights) {
                rights.should.deep.equal({read: true, write: true, delete: false});
            }).nodeify(done);
    });

    it('should give the user project permissions from the organization', function (done) {
        return auth.getAuthorizationInfoByUserId('user', 'org_project')
            .then(function (authorized) {
                authorized.should.deep.equal({read: false, write: false, delete: false});
            }).then(function () {
                return auth.getProjectAuthorizationByUserId('user', 'org_project');
            }).then(function (authorized) {
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
            }).then(function (rights) {
                rights.should.deep.equal({});
            }).nodeify(done);
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
                done('should have been rejected');
            }, function (/*err*/) {
                done();
            });
    });
});