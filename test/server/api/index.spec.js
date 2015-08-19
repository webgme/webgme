/*globals require*/
/*jshint node:true, mocha:true, expr:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');


describe('API', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('index.spec'),
        WebGME = testFixture.WebGME,
        expect = testFixture.expect,
        GMEAuth = testFixture.GMEAuth,
        mongodb = testFixture.mongodb,
        Q = testFixture.Q,

        superagent = testFixture.superagent,
        projectName2Id = testFixture.projectName2Id,

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
                            return Q.ninvoke(collection_, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_projects')
                        .then(function (projects_) {
                            return Q.ninvoke(projects_, 'remove');
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

        Q.allDone([dbConn])
            .then(function () {
                return auth.connect();
            })
            .then(function () {
                return Q.allDone([
                    auth.addUser('guest', 'guest@example.com', 'guest', true, {overwrite: true}),
                    auth.addUser('admin', 'admin@example.com', 'admin', true, {overwrite: true, siteAdmin: true}),
                    auth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('user_to_delete', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('self_delete_1', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('self_delete_2', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('user_to_modify', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('user_without_create', 'user@example.com', 'plaintext', false, {overwrite: true}),
                    auth.addUser('orgAdminUser', 'user@example.com', 'plaintext', false, {overwrite: true}),
                    auth.addUser('userAddedToOrg', 'user@example.com', 'plaintext', false, {overwrite: true}),
                    auth.addUser('userRemovedFromOrg', 'user@example.com', 'plaintext', false, {overwrite: true}),
                    auth.addOrganization('initialOrg', {someInfo: true}),
                    auth.addOrganization('orgToAddAdmin', null),
                    auth.addOrganization('orgToRemoveAdmin', null),
                    auth.addOrganization('orgToRemoveUser', null),
                    auth.addOrganization('orgToDelete', null)
                ]);
            })
            .then(function () {
                return Q.allDone([
                    auth.authorizeByUserId('user', 'project', 'create', {
                        read: true,
                        write: true,
                        delete: false
                    }),
                    auth.authorizeByUserId('user', 'unauthorized_project', 'create', {
                        read: false,
                        write: false,
                        delete: false
                    }),
                    auth.addUserToOrganization('orgAdminUser', 'initialOrg'),
                    auth.addUserToOrganization('userRemovedFromOrg', 'orgToRemoveUser'),
                    auth.setAdminForUserInOrganization('orgAdminUser', 'initialOrg', true),
                    auth.setAdminForUserInOrganization('orgAdminUser', 'orgToRemoveAdmin', true)
                ]);
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


    // USER SPECIFIC API

    describe('USER SPECIFIC API', function () {
        describe('auth disabled, allowGuests false', function () {
            var server,
                agent;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = false;
                gmeConfig.authentication.allowGuests = false;

                server = WebGME.standaloneServer(gmeConfig);
                server.start(done);
            });

            after(function (done) {
                server.stop(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            // NO AUTH methods
            it('should get api documentation link', function (done) {
                /*jshint camelcase: false */
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('documentation_url')).true;
                    agent.get(res.body.documentation_url).end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
                });
            });

            it('should get api links /api', function (done) {
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('documentation_url')).true;
                    done();
                });

            });

            it('should get api v1 links /api/v1', function (done) {
                agent.get(server.getUrl() + '/api/v1').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    done();
                });
            });

            it('should return with 404 for any non resource that does not exist /api/does_not_exist', function (done) {
                agent.get(server.getUrl() + '/api/does_not_exist').end(function (err, res) {
                    expect(res.status).equal(404, err);
                    done();
                });
            });

            it('should get all users /api/v1/users', function (done) {
                agent.get(server.getUrl() + '/api/v1/users').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    //expect(res.body.length).equal(8);
                    // TODO: check all users are there

                    done();
                });
            });

            it('should get all organizations /api/v1/orgs', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    //expect(res.body.length).equal(8);
                    // TODO: check all users are there

                    done();
                });
            });

            // AUTH METHODS
            it('should return with guest account and 200 GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body._id).equal(gmeConfig.authentication.guestAccount);
                    done();
                });
            });

            it('should support basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
            });

            it('should fail with no password and no username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should fail with wrong password basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:wrong_password').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should fail with wrong username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('unknown_username:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should GET /api/v1/users/guest', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/guest')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        done();
                    });
            });

            it('should GET /api/v1/users/admin', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/admin')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        done();
                    });
            });

            it('should return with the same information GET /api/v1/user and /api/v1/users/guest', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.get(server.getUrl() + '/api/v1/users/guest')
                            .end(function (err, res2) {
                                expect(res2.status).equal(200, err);
                                expect(res.body).deep.equal(res2.body);
                                done();
                            });
                    });
            });


            it('should fail to update user without authentication PATCH /api/v1/users/user_to_modify', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/user_to_modify')
                    //.set('Authorization', 'Basic ' + new Buffer('unknown_username:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should fail to update user without siteAdmin role PATCH /api/v1/users/user_to_modify', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/user_to_modify')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });


            it('should update user with no data PATCH /api/v1/users/user_to_modify', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/user_to_modify')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    // no data
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
            });

            it('should update user with valid data PATCH /api/v1/users/user_to_modify', function (done) {
                var updates = {
                    email: 'new_email_address',
                    password: 'newPlainPassword',
                    canCreate: false
                };

                agent.get(server.getUrl() + '/api/v1/users/user_to_modify')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.email).not.equal(updates.email);
                        expect(res.body.canCreate).not.equal(updates.canCreate);

                        agent.patch(server.getUrl() + '/api/v1/users/user_to_modify')
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(updates)
                            .end(function (err, res2) {
                                expect(res2.status).equal(200, err);
                                // have not changed anything that we did not requested to change
                                expect(res2.body._id).equal(res.body._id);
                                expect(res2.body.siteAdmin).equal(res.body.siteAdmin);

                                // we have changed only these fields
                                expect(res2.body.email).equal(updates.email);
                                expect(res2.body.canCreate).equal(updates.canCreate);
                                done();
                            });
                    });
            });

            it('should give site admin access to user with valid data PATCH /api/v1/users/user_to_modify',
                function (done) {
                    var updates = {
                        siteAdmin: true
                    };

                    agent.get(server.getUrl() + '/api/v1/users/user_to_modify')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body.siteAdmin).not.equal(updates.siteAdmin);

                            agent.patch(server.getUrl() + '/api/v1/users/user_to_modify')
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .send(updates)
                                .end(function (err, res2) {
                                    expect(res2.status).equal(200, err);
                                    // have not changed anything that we did not requested to change
                                    expect(res2.body._id).equal(res.body._id);
                                    expect(res2.body.siteAdmin).equal(true);

                                    done();
                                });
                        });
                });

            it('should fail to update non existent user PATCH /api/v1/users/does_not_exist', function (done) {
                var updates = {
                    email: 'new_email_address',
                    canCreate: false
                };

                agent.get(server.getUrl() + '/api/v1/users/does_not_exist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);

                        agent.patch(server.getUrl() + '/api/v1/users/does_not_exist')
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(updates)
                            .end(function (err, res2) {
                                expect(res2.status).equal(400, err);
                                done();
                            });
                    });
            });

            it('should update self user with valid data PATCH /api/v1/user', function (done) {
                var updates = {
                    email: 'new_email_address',
                    canCreate: false
                };

                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('user:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.email).not.equal(updates.email);
                        expect(res.body.canCreate).not.equal(updates.canCreate);

                        agent.patch(server.getUrl() + '/api/v1/user')
                            .set('Authorization', 'Basic ' + new Buffer('user:plaintext').toString('base64'))
                            .send(updates)
                            .end(function (err, res2) {
                                expect(res2.status).equal(200, err);
                                // have not changed anything that we did not requested to change
                                expect(res2.body._id).equal(res.body._id);
                                expect(res2.body.siteAdmin).equal(res.body.siteAdmin);

                                // we have changed only these fields
                                expect(res2.body.email).equal(updates.email);
                                expect(res2.body.canCreate).equal(updates.canCreate);
                                done();
                            });
                    });
            });

            it('should fail to grant site admin access with no site admin roles PATCH /api/v1/user', function (done) {
                var updates = {
                    email: 'new_email_address',
                    canCreate: false,
                    siteAdmin: true
                };

                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.email).not.equal(updates.email);
                        expect(res.body.canCreate).not.equal(updates.canCreate);
                        expect(res.body.siteAdmin).not.equal(true);

                        agent.patch(server.getUrl() + '/api/v1/user')
                            .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                            .send(updates)
                            .end(function (err, res2) {
                                expect(res2.status).equal(403, err);

                                done();
                            });
                    });
            });

            it('should fail to grant site admin acc with no site admin roles PATCH /api/v1/users/guest',
                function (done) {
                    var updates = {
                        email: 'new_email_address',
                        canCreate: false,
                        siteAdmin: true
                    };

                    agent.get(server.getUrl() + '/api/v1/user')
                        .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body.email).not.equal(updates.email);
                            expect(res.body.canCreate).not.equal(updates.canCreate);
                            expect(res.body.siteAdmin).not.equal(true);

                            agent.patch(server.getUrl() + '/api/v1/users/guest')
                                .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                                .send(updates)
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    done();
                                });
                        });
                });

            it('should create a new user with valid data PUT /api/v1/users/new_user', function (done) {
                var newUser = {
                    userId: 'new_user',
                    email: 'new_email_address',
                    password: 'new_user_pass',
                    canCreate: true
                };

                agent.get(server.getUrl() + '/api/v1/users/new_user')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err); // user should not exist at this point

                        agent.put(server.getUrl() + '/api/v1/users')
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(newUser)
                            .end(function (err, res2) {
                                expect(res2.status).equal(200, err);

                                expect(res2.body._id).equal(newUser.userId);
                                expect(res2.body.email).equal(newUser.email);
                                expect(res2.body.canCreate).equal(newUser.canCreate);

                                done();
                            });
                    });
            });

            it('should fail to create a new user with login name that exists PUT /api/v1/users/guest', function (done) {
                var newUser = {
                    userId: 'new_user',
                    email: 'new_email_address',
                    password: 'new_user_pass',
                    canCreate: true
                };

                agent.get(server.getUrl() + '/api/v1/users/guest')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err); // user should not exist at this point

                        agent.put(server.getUrl() + '/api/v1/users')
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(newUser)
                            .end(function (err, res2) {
                                expect(res2.status).equal(400, err);

                                done();
                            });
                    });
            });

            it('should fail to create a new user if acting user is not a site admin PUT /api/v1/users',
                function (done) {
                    var newUser = {
                        userId: 'new_user2',
                        email: 'new_email_address2',
                        password: 'new_user_pass2',
                        canCreate: true
                    };

                    agent.get(server.getUrl() + '/api/v1/users/new_user2')
                        .end(function (err, res) {
                            expect(res.status).equal(404, err); // user should not exist at this point

                            agent.put(server.getUrl() + '/api/v1/users')
                                .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                                .send(newUser)
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    done();
                                });
                        });
                });

            it('should fail to create a new user if not authenticated PUT /api/v1/users', function (done) {
                var newUser = {
                    userId: 'new_user2',
                    email: 'new_email_address2',
                    password: 'new_user_pass2',
                    canCreate: true
                };

                agent.get(server.getUrl() + '/api/v1/users/new_user2')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err); // user should not exist at this point

                        agent.put(server.getUrl() + '/api/v1/users')
                            .send(newUser)
                            .end(function (err, res2) {
                                expect(res2.status).equal(403, err);

                                done();
                            });
                    });
            });

            it('should delete a specified user as site admin DELETE /api/v1/users/user_to_delete', function (done) {
                agent.get(server.getUrl() + '/api/v1/users')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.del(server.getUrl() + '/api/v1/users/user_to_delete')
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .end(function (err, res2) {
                                expect(res2.status).equal(204, err);

                                agent.get(server.getUrl() + '/api/v1/users')
                                    .end(function (err, res2) {
                                        expect(res2.status).equal(200, err);
                                        expect(res.body.length - 1).equal(res2.body.length);
                                        // TODO: verify res2.body does not contain user_to_delete

                                        done();
                                    });
                            });
                    });
            });

            it('should fail to delete a non existent user as site admin DELETE /api/v1/users/does_not_exist',
                function (done) {
                    agent.get(server.getUrl() + '/api/v1/users/does_not_exist')
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);
                            agent.del(server.getUrl() + '/api/v1/users/does_not_exist')
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(404, err);

                                    done();
                                });
                        });
                });

            it('should delete a self user DELETE /api/v1/users/self_delete_2', function (done) {
                agent.get(server.getUrl() + '/api/v1/users')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.del(server.getUrl() + '/api/v1/users/self_delete_2')
                            .set('Authorization', 'Basic ' + new Buffer('self_delete_2:plaintext').toString('base64'))
                            .end(function (err, res2) {
                                expect(res2.status).equal(204, err);

                                agent.get(server.getUrl() + '/api/v1/users')
                                    .end(function (err, res2) {
                                        expect(res2.status).equal(200, err);
                                        expect(res.body.length - 1).equal(res2.body.length);
                                        // TODO: verify res2.body does not contain user_to_delete

                                        done();
                                    });
                            });
                    });
            });

            it('should delete a self user DELETE /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/users')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.del(server.getUrl() + '/api/v1/user')
                            .set('Authorization', 'Basic ' + new Buffer('self_delete_1:plaintext').toString('base64'))
                            .end(function (err, res2) {
                                expect(res2.status).equal(204, err);

                                agent.get(server.getUrl() + '/api/v1/users')
                                    .end(function (err, res2) {
                                        expect(res2.status).equal(200, err);
                                        expect(res.body.length - 1).equal(res2.body.length);
                                        // TODO: verify res2.body does not contain user_to_delete

                                        done();
                                    });
                            });
                    });
            });

            it('should fail to delete a specified user if not authenticated DELETE /api/v1/users/admin',
                function (done) {
                    agent.get(server.getUrl() + '/api/v1/users/admin')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            agent.del(server.getUrl() + '/api/v1/users/admin')
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    agent.get(server.getUrl() + '/api/v1/users/admin')
                                        .end(function (err, res2) {
                                            expect(res.status).equal(200, err);

                                            // make sure we did not lose any users
                                            expect(res.body).deep.equal(res2.body);

                                            done();
                                        });
                                });
                        });
                });

            it('should fail to delete a specified user if acting user is not a site admin DELETE /api/v1/users/guest',
                function (done) {
                    agent.get(server.getUrl() + '/api/v1/users/guest')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            agent.del(server.getUrl() + '/api/v1/users/guest')
                                .set('Authorization', 'Basic ' + new Buffer('user:plaintext').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    agent.get(server.getUrl() + '/api/v1/users/guest')
                                        .end(function (err, res2) {
                                            expect(res.status).equal(200, err);

                                            // make sure we did not lose any users
                                            expect(res.body).deep.equal(res2.body);

                                            done();
                                        });
                                });
                        });
                });
        });


        describe('auth enabled, allowGuests false', function () {
            var server,
                agent;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = true;
                gmeConfig.authentication.allowGuests = false;

                server = WebGME.standaloneServer(gmeConfig);
                server.start(done);
            });

            after(function (done) {
                server.stop(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            // NO AUTH methods
            it('should get api documentation link', function (done) {
                /*jshint camelcase: false */
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('documentation_url')).true;
                    agent.get(res.body.documentation_url).end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
                });
            });


            it('should get api v1 links /api/v1', function (done) {
                agent.get(server.getUrl() + '/api/v1').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    done();
                });
            });

            it('should return with 404 for any non resource that does not exist /api/does_not_exist', function (done) {
                agent.get(server.getUrl() + '/api/does_not_exist').end(function (err, res) {
                    expect(res.status).equal(404, err);
                    done();
                });
            });

            it('should get all users /api/v1/users', function (done) {
                agent.get(server.getUrl() + '/api/v1/users').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    //expect(res.body.length).gt(2);
                    // TODO: check all users are there

                    done();
                });
            });

            // AUTH METHODS
            it('should return with 401 GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user').end(function (err, res) {
                    expect(res.status).equal(401, err);
                    done();
                });
            });

            it('should support basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
            });

            it('should fail with wrong password basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:wrong_password').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should fail with wrong username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('unknown_username:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });
        });


        describe('auth enabled, allowGuests true', function () {
            var server,
                agent,
                guestAccount = 'guest';

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = true;
                gmeConfig.authentication.allowGuests = true;
                gmeConfig.authentication.guestAccount = guestAccount;

                server = WebGME.standaloneServer(gmeConfig);
                server.start(done);
            });

            after(function (done) {
                server.stop(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            // NO AUTH methods
            it('should get api documentation link', function (done) {
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    // TODO: redirects to login page
                    done();
                });
            });


            it('should get api v1 links /api/v1', function (done) {
                agent.get(server.getUrl() + '/api/v1').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    done();
                });
            });

            it('should return with 404 for any non resource that does not exist /api/does_not_exist', function (done) {
                agent.get(server.getUrl() + '/api/does_not_exist').end(function (err, res) {
                    expect(res.status).equal(404, err);
                    done();
                });
            });

            it('should get all users /api/v1/users', function (done) {
                agent.get(server.getUrl() + '/api/v1/users').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    //expect(res.body.length).equal(8);
                    // TODO: check all users are there

                    done();
                });
            });

            // AUTH METHODS
            it('should return with 200 and guest is logged in GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body._id).equal(guestAccount);
                    done();
                });
            });

            it('should support basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
            });

            it('should fail with wrong password basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:wrong_password').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should fail with wrong username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('unknown_username:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });
        });


        describe('auth disabled, allowGuests true', function () {
            var server,
                agent;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = false;
                gmeConfig.authentication.allowGuests = true;

                server = WebGME.standaloneServer(gmeConfig);
                server.start(done);
            });

            after(function (done) {
                server.stop(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            // NO AUTH methods
            it('should get api documentation link', function (done) {
                /*jshint camelcase: false */
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('documentation_url')).true;
                    agent.get(res.body.documentation_url).end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
                });
            });


            it('should get api v1 links /api/v1', function (done) {
                agent.get(server.getUrl() + '/api/v1').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    done();
                });
            });

            it('should return with 404 for any non resource that does not exist /api/does_not_exist', function (done) {
                agent.get(server.getUrl() + '/api/does_not_exist').end(function (err, res) {
                    expect(res.status).equal(404, err);
                    done();
                });
            });

            it('should get all users /api/v1/users', function (done) {
                agent.get(server.getUrl() + '/api/v1/users').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    //expect(res.body.length).equal(8);
                    // TODO: check all users are there

                    done();
                });
            });

            // AUTH METHODS
            it('should return with guest user account and 200 GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body._id).equal(gmeConfig.authentication.guestAccount);
                    done();
                });
            });

            it('should support basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
            });

            it('should fail with wrong password basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:wrong_password').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should fail with wrong username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('unknown_username:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });
        });
    });

    describe('ORGANIZATION SPECIFIC API', function () {
        describe('auth disabled, allowGuests false', function () {
            var server,
                agent;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = false;
                gmeConfig.authentication.allowGuests = false;

                server = WebGME.standaloneServer(gmeConfig);
                server.start(done);
            });

            after(function (done) {
                server.stop(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            // NO AUTH methods
            it('should get all organizations /api/v1/orgs', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.length > 0).equal(true);

                    done();
                });
            });

            it('should get specific organization /api/v1/orgs/initialOrg', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs/initialOrg').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.admins.length).equal(1);
                    expect(res.body.admins[0]).equal('orgAdminUser');

                    done();
                });
            });

            // AUTH METHODS
            it('should create a new organization with valid data PUT /api/v1/orgs/newOrg', function (done) {
                var newOrg = {
                    orgId: 'newOrg',
                    info: {
                        info: 'new'
                    }
                };

                agent.get(server.getUrl() + '/api/v1/orgs/newOrg')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err); // user should not exist at this point

                        agent.put(server.getUrl() + '/api/v1/orgs')
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(newOrg)
                            .end(function (err, res2) {
                                expect(res2.status).equal(200, err);

                                expect(res2.body._id).equal(newOrg.orgId);
                                expect(res2.body.info.info).equal(newOrg.info.info);
                                expect(res2.body.admins[0]).equal('admin');

                                done();
                            });
                    });
            });

            it('should delete organization DELETE /api/v1/orgs/orgToDelete', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs/orgToDelete')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err); // org should exist at this point

                        agent.del(server.getUrl() + '/api/v1/orgs/orgToDelete')
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .end(function (err, res2) {
                                expect(res2.status).equal(204, err);

                                agent.get(server.getUrl() + '/api/v1/orgs/orgToDelete')
                                    .end(function (err, res) {
                                        expect(res.status).equal(404, err); // org should not exist at this point
                                        done();
                                    });
                            });
                    });
            });

            it('should add user to organization PUT /api/v1/orgs/initialOrg/users/userAddedToOrg', function (done) {
                agent.put(server.getUrl() + '/api/v1/orgs/initialOrg/users/userAddedToOrg')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res2) {
                        expect(res2.status).equal(204, err);

                        agent.get(server.getUrl() + '/api/v1/users/userAddedToOrg')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body.orgs.length === 1).to.equal(true);
                                expect(res.body.orgs[0]).to.equal('initialOrg');
                                done();
                            });
                    });
            });

            it('should remove user from organization DELETE /api/v1/orgs/orgToRemoveUser/users/userRemovedFromOrg',
                function (done) {
                    agent.get(server.getUrl() + '/api/v1/users/userRemovedFromOrg')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body.orgs.length === 1).to.equal(true);
                            expect(res.body.orgs[0]).to.equal('orgToRemoveUser');

                            agent.del(server.getUrl() + '/api/v1/orgs/orgToRemoveUser/users/userRemovedFromOrg')
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(204, err);

                                    agent.get(server.getUrl() + '/api/v1/users/userRemovedFromOrg')
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err);
                                            expect(res.body.orgs.length === 0).to.equal(true);
                                            done();
                                        });
                                });
                        });
                }
            );

            it('should make user admin in organization PUT /api/v1/orgs/orgToAddAdmin/admins/userAddedToOrg',
                function (done) {
                    agent.put(server.getUrl() + '/api/v1/orgs/orgToAddAdmin/admins/userAddedToOrg')
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(204, err);

                            agent.get(server.getUrl() + '/api/v1/orgs/orgToAddAdmin')
                                .end(function (err, res) {
                                    expect(res.status).equal(200, err);
                                    expect(res.body.admins.length === 1).to.equal(true);
                                    expect(res.body.admins[0]).to.equal('userAddedToOrg');
                                    done();
                                });
                        });
                }
            );

            it('should remove user admin in organization DELETE /api/v1/orgs/orgToRemoveAdmin/admins/orgAdminUser',
                function (done) {
                    agent.get(server.getUrl() + '/api/v1/orgs/orgToRemoveAdmin')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body.admins.length === 1).to.equal(true);
                            expect(res.body.admins[0]).to.equal('orgAdminUser');

                            agent.del(server.getUrl() + '/api/v1/orgs/orgToRemoveAdmin/admins/orgAdminUser')
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(204, err);

                                    agent.get(server.getUrl() + '/api/v1/orgs/orgToRemoveAdmin')
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err);
                                            expect(res.body.admins.length === 0).to.equal(true);
                                            done();
                                        });
                                });
                        });
                }
            );
        });
    });

    describe('PROJECT SPECIFIC API', function () {

        describe('auth disabled, allowGuests false', function () {
            var server,
                agent,
                projectName = 'project',
                importResult,
                unauthorizedProjectName = 'unauthorized_project',
                toDeleteProjectName = 'project_to_delete',
                safeStorage,
                gmeAuth,
                guestAccount = gmeConfig.authentication.guestAccount;

            function projectName2APIPath(projectName, user) {
                user = user || guestAccount;
                return guestAccount + '/' + projectName;
            }

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = false;
                gmeConfig.authentication.allowGuests = false;

                server = WebGME.standaloneServer(gmeConfig);
                server.start(function (err) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }

                    testFixture.clearDBAndGetGMEAuth(gmeConfig,
                        [projectName, unauthorizedProjectName, toDeleteProjectName])
                        .then(function (gmeAuth_) {
                            gmeAuth = gmeAuth_;
                            safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                            return safeStorage.openDatabase();
                        })
                        .then(function () {
                            return Q.allDone([
                                testFixture.importProject(safeStorage, {
                                    projectSeed: 'seeds/EmptyProject.json',
                                    projectName: projectName,
                                    gmeConfig: gmeConfig,
                                    logger: logger
                                }),
                                testFixture.importProject(safeStorage, {
                                    projectSeed: 'seeds/EmptyProject.json',
                                    projectName: unauthorizedProjectName,
                                    gmeConfig: gmeConfig,
                                    logger: logger
                                }),
                                testFixture.importProject(safeStorage, {
                                    projectSeed: 'seeds/EmptyProject.json',
                                    projectName: toDeleteProjectName,
                                    gmeConfig: gmeConfig,
                                    logger: logger
                                })
                            ]);
                        })
                        .then(function (results) {
                            importResult = results[0]; // projectName

                            return Q.allDone([
                                gmeAuth.authorizeByUserId(guestAccount, projectName2Id(unauthorizedProjectName),
                                    'create', {
                                        read: true,
                                        write: false,
                                        delete: false
                                    }
                                )
                            ]);
                        })
                        .nodeify(done);
                });
            });

            after(function (done) {
                server.stop(function (err) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }

                    Q.allDone([
                        gmeAuth.unload(),
                        safeStorage.closeDatabase()
                    ])
                        .nodeify(done);
                });
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            // NO AUTH methods
            it('should list projects /projects', function (done) {
                agent.get(server.getUrl() + '/api/projects').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.length).to.equal(3);
                    expect(res.body).to.contain({
                        _id: 'guest+unauthorized_project',
                        //fullName: 'guest/unauthorized_project',
                        name: 'unauthorized_project',
                        owner: 'guest'
                    });
                    expect(res.body).to.contain({
                        _id: 'guest+project_to_delete',
                        //fullName: 'guest/project_to_delete',
                        name: 'project_to_delete',
                        owner: 'guest'
                    });
                    expect(res.body).to.contain({
                        _id: 'guest+project',
                        //fullName: 'guest/project',
                        name: 'project',
                        owner: 'guest'
                    });
                    done();
                });
            });

            it('should branches for project /projects/:ownerId/:projectId/branches', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('master');
                        done();
                    });
            });

            it('should not get branches for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') +
                    '/branches').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

            it('should get branch information for project /projects/:ownerId/:projectId/branches/master',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/branches/master')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.have.property('projectId');
                            expect(res.body).to.have.property('branchName');
                            expect(res.body).to.have.property('commitObject');
                            expect(res.body).to.have.property('coreObjects');

                            expect(res.body.projectId).to.equal(projectName2Id(projectName));
                            expect(res.body.branchName).to.equal('master');

                            done();
                        });
                });

            it('should not get branch information for non-existent branch', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                    '/branches/does_not_exist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should list commits for project /projects/:ownerId/:projectId/commits', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.length).to.equal(1);
                        expect(res.body[0]).to.have.property('message');
                        expect(res.body[0]).to.have.property('parents');
                        expect(res.body[0]).to.have.property('root');
                        expect(res.body[0]).to.have.property('time');
                        expect(res.body[0]).to.have.property('type');
                        expect(res.body[0]).to.have.property('updater');
                        expect(res.body[0]).to.have.property('_id');
                        done();
                    });
            });

            it('should create branch for project /projects/:ownerId/:projectId/branches/newBranch', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/master')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                            '/branches/newBranch')
                            .send({hash: res.body.commitObject._id})
                            .end(function (err, res) {
                                expect(res.status).equal(201, err);
                                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                    '/branches')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body).to.have.property('master');
                                        expect(res.body).to.have.property('newBranch');
                                        done();
                                    });
                            });
                    });
            });


            it('should delete a branch for project /projects/:ownerId/:projectId/branches/newBranchToDelete',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/branches/master')
                        .end(function (err, res) {
                            var hash;
                            expect(res.status).equal(200, err);
                            hash = res.body.commitObject._id;

                            agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                '/branches/newBranchToDelete')
                                .send({hash: hash})
                                .end(function (err, res) {
                                    expect(res.status).equal(201, err);

                                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                        '/branches')
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err);
                                            expect(res.body).to.have.property('master');
                                            expect(res.body).to.have.property('newBranchToDelete');
                                            expect(res.body.newBranchToDelete).to.equal(hash);

                                            agent.del(server.getUrl() + '/api/projects/' +
                                                projectName2APIPath(projectName) +
                                                '/branches/newBranchToDelete')
                                                .end(function (err, res) {
                                                    expect(res.status).equal(204, err);

                                                    agent.get(server.getUrl() + '/api/projects/' +
                                                        projectName2APIPath(projectName) + '/branches')
                                                        .end(function (err, res) {
                                                            expect(res.status).equal(200, err);
                                                            expect(res.body).to.have.property('master');
                                                            expect(res.body).to.not.have.property('newBranchToDelete');
                                                            done();
                                                        });
                                                });
                                        });
                                });
                        });
                });


            it('should patch a branch for project /projects/:ownerId/:projectId/branches/newBranchToPatch',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/branches/master')
                        .end(function (err, res) {
                            var hash;
                            expect(res.status).equal(200, err);
                            hash = res.body.commitObject._id;

                            agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                '/branches/newBranchToPatch')
                                .send({hash: hash})
                                .end(function (err, res) {
                                    expect(res.status).equal(201, err);

                                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                        '/branches')
                                        .end(function (err, res) {
                                            var commitObject = importResult.project.createCommitObject([hash],
                                                    importResult.rootHash,
                                                    'tester',
                                                    '15'),
                                                commitData = {
                                                    projectId: projectName2Id(projectName),
                                                    commitObject: commitObject,
                                                    coreObjects: []
                                                };


                                            expect(res.status).equal(200, err);
                                            expect(res.body).to.have.property('master');
                                            expect(res.body).to.have.property('newBranchToPatch');
                                            expect(res.body.newBranchToPatch).to.equal(hash);


                                            // we have to create a new commit to change the branch hash
                                            safeStorage.makeCommit(commitData)
                                                .then(function (result) {
                                                    expect(result.hasOwnProperty('hash')).to.equal(true);

                                                    agent.patch(server.getUrl() + '/api/projects/' +
                                                        projectName2APIPath(projectName) +
                                                        '/branches/newBranchToPatch')
                                                        .send({
                                                            oldHash: hash,
                                                            newHash: result.hash
                                                        })
                                                        .end(function (err, res) {
                                                            expect(res.status).equal(200, err);

                                                            agent.get(server.getUrl() + '/api/projects/' +
                                                                projectName2APIPath(projectName) + '/branches')
                                                                .end(function (err, res) {
                                                                    expect(res.status).equal(200, err);
                                                                    expect(res.body).to.have.property('master');
                                                                    expect(res.body).to.have.property('newBranchToPatch');
                                                                    expect(res.body.newBranchToPatch).to.equal(result.hash);
                                                                    done();
                                                                });
                                                        });
                                                })
                                                .catch(function (err) {
                                                    done(err);
                                                });
                                        });
                                });
                        });
                });

            it('should compare branches for project /projects/:ownerId/:projectId/compare/master...master',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/compare/master...master')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            // expecting empty diff
                            expect(res.body).to.deep.equal({});
                            done();
                        });
                });

            it('should fail to compare non-existent branches for project /projects/:ownerId/:projectId/compare/doesnt_exist...master',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/compare/doesnt_exist...master')
                        .end(function (err, res) {
                            expect(res.status).equal(500, err);
                            // expecting empty diff
                            done();
                        });
                });

            it('should not get commits for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') +
                    '/commits').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

            it('should delete a project by id /projects/guest/project_to_delete', function (done) {
                agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath(toDeleteProjectName))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        done();
                    });
            });

            it('should fail to delete a non-existent project', function (done) {
                agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });


            it('should fail to delete a branch if project does not exist', function (done) {
                agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') + '/branches/master')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should fail to create a branch if project does not exist', function (done) {
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') + '/branches/master')
                    .send({hash: '#hash'})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should fail to update branch if old and new hashes are not provided', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/master')
                    .send({})
                    .end(function (err, res) {
                        expect(res.status).equal(500, err);
                        done();
                    });
            });
        });
    });
});