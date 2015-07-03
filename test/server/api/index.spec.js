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
                return Q.all([
                    Q.ninvoke(db, 'collection', '_users')
                        .then(function (collection_) {
                            return Q.ninvoke(collection_, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_organizations')
                        .then(function (orgs_) {
                            return Q.ninvoke(orgs_, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_projects')
                        .then(function (projects_) {
                            return Q.ninvoke(projects_, 'remove');
                        }),
                    //Q.ninvoke(db, 'collection', 'ClientCreateProject')
                    //    .then(function (createdProject) {
                    //        return Q.ninvoke(createdProject, 'remove');
                    //    }),
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

        Q.all([dbConn])
            .then(function () {
                return auth.connect();
            })
            .then(function () {
                return Q.all([
                    auth.addUser('guest', 'guest@example.com', 'guest', true, {overwrite: true}),
                    auth.addUser('admin', 'admin@example.com', 'admin', true, {overwrite: true, siteAdmin: true}),
                    auth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('user_to_delete', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('self_delete_1', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('self_delete_2', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('user_to_modify', 'user@example.com', 'plaintext', true, {overwrite: true}),
                    auth.addUser('user_without_create', 'user@example.com', 'plaintext', false, {overwrite: true})
                ]);
            })
            .then(function () {
                return Q.all([
                    auth.authorizeByUserId('user', 'project', 'create', {
                        read: true,
                        write: true,
                        delete: false
                    }),
                    auth.authorizeByUserId('user', 'unauthorized_project', 'create', {
                        read: false,
                        write: false,
                        delete: false
                    })
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


    describe('PROJECT SPECIFIC API', function () {

        describe('auth disabled, allowGuests false', function () {
            var server,
                agent,
                projectName = 'project',
                unauthorizedProjectName = 'unauthorized_project',
                toDeleteProjectName = 'project_to_delete',
                safeStorage,
                gmeAuth,
                guestAccount = gmeConfig.authentication.guestAccount;

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
                            return Q.all([
                                safeStorage.deleteProject({projectId: projectName2Id(projectName)}),
                                safeStorage.deleteProject({projectId: projectName2Id(unauthorizedProjectName)}),
                                safeStorage.deleteProject({projectId: projectName2Id(toDeleteProjectName)})
                            ]);
                        })
                        .then(function () {
                            return Q.all([
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
                        .then(function () {
                            return Q.all([
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

                    Q.all([
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
                        fullName: 'guest/unauthorized_project',
                        name: 'unauthorized_project',
                        owner: 'guest'
                    });
                    expect(res.body).to.contain( {
                        _id: 'guest+project_to_delete',
                        fullName: 'guest/project_to_delete',
                        name: 'project_to_delete',
                        owner: 'guest'
                    });
                    expect(res.body).to.contain({
                        _id: 'guest+project',
                        fullName: 'guest/project',
                        name: 'project',
                        owner: 'guest'
                    });
                    done();
                });
            });

            it('should branches for project /projects/:projectId/branches', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('master');
                        done();
                    });
            });

            it('should not get branches for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/does_not_exist/branches').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

            it('should get branch information for project /projects/:projectId/branches/master', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/master')
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
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/does_not_exist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should list commits for project /projects/:projectId/commits', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/commits')
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

            it('should create branch for project /projects/:projectId/branches/newBranch', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/master')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        agent.put(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/newBranch')
                            .send({hash: res.body.commitObject._id})
                            .end(function (err, res) {
                                expect(res.status).equal(201, err);
                                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body).to.have.property('master');
                                        expect(res.body).to.have.property('newBranch');
                                        done();
                                    });
                            });
                    });
            });


            it('should delete a branch for project /projects/:projectId/branches/newBranchToDelete', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/master')
                    .end(function (err, res) {
                        var hash;
                        expect(res.status).equal(200, err);
                        hash =  res.body.commitObject._id;

                        agent.put(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/newBranchToDelete')
                            .send({hash: hash})
                            .end(function (err, res) {
                                expect(res.status).equal(201, err);

                                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body).to.have.property('master');
                                        expect(res.body).to.have.property('newBranchToDelete');
                                        expect(res.body.newBranchToDelete).to.equal(hash);
                                        
                                        agent.del(server.getUrl() + '/api/projects/' + projectName2Id(projectName) +
                                                  '/branches/newBranchToDelete')
                                            .end(function (err, res) {
                                                expect(res.status).equal(204, err);

                                                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches')
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


            it.skip('should patch a branch for project /projects/:projectId/branches/newBranchToPatch', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/master')
                    .end(function (err, res) {
                        var hash;
                        expect(res.status).equal(200, err);
                        hash =  res.body.commitObject._id;

                        agent.put(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches/newBranchToPatch')
                            .send({hash: hash})
                            .end(function (err, res) {
                                expect(res.status).equal(201, err);

                                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body).to.have.property('master');
                                        expect(res.body).to.have.property('newBranchToPatch');
                                        expect(res.body.newBranchToPatch).to.equal(hash);

                                        agent.patch(server.getUrl() + '/api/projects/' + projectName2Id(projectName) +
                                                  '/branches/newBranchToPatch')
                                            .send({hash: '#fd22b3c71857a1cfde65f1c1bf5045a984150e68'})
                                            .end(function (err, res) {
                                                expect(res.status).equal(200, err);

                                                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/branches')
                                                    .end(function (err, res) {
                                                        expect(res.status).equal(200, err);
                                                        expect(res.body).to.have.property('master');
                                                        expect(res.body).to.have.property('newBranchToPatch');
                                                        expect(res.body.newBranchToPatch).to.equal('#fd22b3c71857a1cfde65f1c1bf5045a984150e68');
                                                        done();
                                                    });
                                            });
                                    });
                            });
                    });
            });

            it('should compare branches for project /projects/:projectId/compare/master...master', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2Id(projectName) + '/compare/master...master')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        // expecting empty diff
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            it('should not get commits for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/does_not_exist/commits').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

            it('should delete a project by id /projects/project_to_delete', function (done) {
                agent.del(server.getUrl() + '/api/projects/' + projectName2Id(toDeleteProjectName))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        done();
                    });
            });

            it('should fail to delete a non-existent project', function (done) {
                agent.del(server.getUrl() + '/api/projects/does_not_exist').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

        });
    });

});