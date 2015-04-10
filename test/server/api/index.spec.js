/*globals require*/
/*jshint node:true, mocha:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');


describe('API', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        expect = testFixture.expect,
        GMEAuth = testFixture.GMEAuth,
        mongodb = testFixture.mongodb,
        Q = testFixture.Q,

        superagent = testFixture.superagent,

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
                            return Q.ninvoke(collection_, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_organizations')
                        .then(function (orgs_) {
                            return Q.ninvoke(orgs_, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_projects')
                        .then(function (projects_) {
                            return Q.ninvoke(projects_, 'remove');
                        })
                    //Q.ninvoke(db, 'collection', 'ClientCreateProject')
                    //    .then(function (createdProject) {
                    //        return Q.ninvoke(createdProject, 'remove');
                    //    }),
                    //Q.ninvoke(db, 'collection', 'project')
                    //    .then(function (project) {
                    //        return Q.ninvoke(project, 'remove')
                    //            .then(function () {
                    //                return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                    //            });
                    //    }),
                    //Q.ninvoke(db, 'collection', 'unauthorized_project')
                    //    .then(function (project) {
                    //        return Q.ninvoke(project, 'remove')
                    //            .then(function () {
                    //                return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                    //            });
                    //    })
                ]);
            });

        Q.all([dbConn, gmeauthDeferred.promise])
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
                    expect(res.status).equal(401, err);
                    done();
                });
        });

        it('should fail to update user without siteADmin role PATCH /api/v1/users/user_to_modify', function (done) {
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

        it('should fail to create a new user if acting user is not a site admin PUT /api/v1/users', function (done) {
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
                            expect(res2.status).equal(401, err);

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

        it('should fail to delete a specified user if not authenticated DELETE /api/v1/users/guest', function (done) {
            agent.get(server.getUrl() + '/api/v1/users/guest')
                .end(function (err, res) {
                    expect(res.status).equal(200, err);
                    agent.del(server.getUrl() + '/api/v1/users/guest')
                        .end(function (err, res2) {
                            expect(res2.status).equal(401, err);

                            agent.get(server.getUrl() + '/api/v1/users/guest')
                                .end(function (err, res2) {
                                    expect(res.status).equal(200, err);
                                    expect(res.body).deep.equal(res2.body); // make sure we did not lose any users

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
                                        expect(res.body).deep.equal(res2.body); // make sure we did not lose any users

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
});