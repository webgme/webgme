/*globals require*/
/*jshint node:true, mocha:true, expr:true*/
/*jscs:disable maximumLineLength*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');


describe('REST API', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('index.spec'),
        WebGME = testFixture.WebGME,
        expect = testFixture.expect,
        Q = testFixture.Q,

        superagent = testFixture.superagent,
        projectName2Id = testFixture.projectName2Id;


    // USER SPECIFIC API

    describe('USER SPECIFIC API', function () {
        var gmeAuth;

        before(function (done) {
            this.timeout(4000);
            testFixture.clearDBAndGetGMEAuth(gmeConfig)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    return Q.allDone([
                        gmeAuth.addUser('guest', 'guest@example.com', 'guest', true, {overwrite: true}),
                        gmeAuth.addUser('admin', 'admin@example.com', 'admin', true, {
                            overwrite: true,
                            siteAdmin: true
                        }),
                        gmeAuth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true}),
                        gmeAuth.addUser('user_to_delete', 'user@example.com', 'plaintext', true, {overwrite: true}),
                        gmeAuth.addUser('self_delete_1', 'user@example.com', 'plaintext', true, {overwrite: true}),
                        gmeAuth.addUser('self_delete_2', 'user@example.com', 'plaintext', true, {overwrite: true}),
                        gmeAuth.addUser('user_to_modify', 'user@example.com', 'plaintext', true, {overwrite: true}),
                        gmeAuth.addUser('user_without_create', 'user@example.com', 'plaintext', false, {overwrite: true}),
                        gmeAuth.addUser('user_w_data', 'e@mail.com', 'plaintext', false, {overwrite: true}),
                        gmeAuth.addUser('user_w_data1', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_data2', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_data3', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_data4', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_data5', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_data6', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_data7', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_data8', 'e@mail.com', 'plaintext', false, {overwrite: true, data: {a: 1}}),
                        gmeAuth.addUser('user_w_settings1', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_settings2', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_settings3', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_settings4', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_c_settings1', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_c_settings2', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_c_settings3', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_c_settings4', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('user_w_c_settings5', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_settings1', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_settings2', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_settings3', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_settings4', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_c_settings1', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_c_settings2', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_c_settings3', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_c_settings4', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}}),
                        gmeAuth.addUser('users_w_c_settings5', 'e@mail.com', 'plaintext', false, {overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}})
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.authorizeByUserId('user', 'project', 'create', {
                            read: true,
                            write: true,
                            delete: false
                        }),
                        gmeAuth.authorizeByUserId('user', 'unauthorized_project', 'create', {
                            read: false,
                            write: false,
                            delete: false
                        })
                    ]);
                })
                .nodeify(done);
        });

        after(function (done) {
            gmeAuth.unload()
                .nodeify(done);
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
            it('should get api links /api', function (done) {
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('api_documentation_url')).true;
                    expect(res.body.hasOwnProperty('source_code_documentation_url')).true;
                    done();
                });
            });

            it('should get api documentation link', function (done) {
                /*jshint camelcase: false */
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('api_documentation_url')).true;
                    agent.get(res.body.api_documentation_url).end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
                });
            });

            it('should get source-code documentation link', function (done) {
                /*jshint camelcase: false */
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('source_code_documentation_url')).true;
                    agent.get(res.body.source_code_documentation_url).end(function (err, res) {
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

                                // we have just changed these fields
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

                                // we have changed just these fields
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

            it('should create a new user with valid data PUT /api/v1/users', function (done) {
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

            it('should create a new user with valid data PUT /api/v1/users/new_user_param', function (done) {
                var newUser = {
                        email: 'new_email_address',
                        password: 'pass',
                        canCreate: true
                    },
                    userId = 'new_user_param';

                agent.get(server.getUrl() + '/api/v1/users/new_user_param')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err); // user should not exist at this point

                        agent.put(server.getUrl() + '/api/v1/users/' + userId)
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(newUser)
                            .end(function (err, res2) {
                                expect(res2.status).equal(200, err);

                                expect(res2.body._id).equal(userId);
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
                    expect(res.body.hasOwnProperty('api_documentation_url')).true;
                    agent.get(res.body.api_documentation_url).end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
                });
            });

            it('should get source code documentation link', function (done) {
                /*jshint camelcase: false */
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('source_code_documentation_url')).true;
                    agent.get(res.body.source_code_documentation_url).end(function (err, res) {
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

            // User data methods /user/data
            it('should get empty user data basic authentication GET /api/v1/user/data', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/data')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_data:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            it('should get user data basic authentication GET /api/v1/user/data', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/data')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_data1:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 1});
                        done();
                    });
            });

            it('should overwrite user data basic authentication PUT /api/v1/user/data', function (done) {
                agent.put(server.getUrl() + '/api/v1/user/data')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('user_w_data2:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({b: 1});
                        gmeAuth.getUser('user_w_data2')
                            .then(function (userData) {
                                expect(userData.data).to.deep.equal({b: 1});
                            })
                            .nodeify(done);
                    });
            });

            it('should update user data basic authentication PATCH /api/v1/user/data', function (done) {
                agent.patch(server.getUrl() + '/api/v1/user/data')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('user_w_data3:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 1, b: 1});
                        gmeAuth.getUser('user_w_data3')
                            .then(function (userData) {
                                expect(userData.data).to.deep.equal({a: 1, b: 1});
                            })
                            .nodeify(done);
                    });
            });

            it('should delete user data basic authentication DELETE /api/v1/user/data', function (done) {
                agent.del(server.getUrl() + '/api/v1/user/data')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_data4:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getUser('user_w_data4')
                            .then(function (userData) {
                                expect(userData.data).to.deep.equal({});
                            })
                            .nodeify(done);
                    });
            });

            // User data methods /users/:username/data
            it('should get user data basic authentication "admin" GET /api/v1/users/:username/data', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/user_w_data5/data')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 1});
                        done();
                    });
            });

            it('should overwrite user data basic authentication "admin" PUT /api/v1/users/:username/data', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/user_w_data6/data')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({b: 1});
                        gmeAuth.getUser('user_w_data6')
                            .then(function (userData) {
                                expect(userData.data).to.deep.equal({b: 1});
                            })
                            .nodeify(done);
                    });
            });

            it('should update user data basic authentication "admin" PATCH /api/v1/users/:username/data', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/user_w_data7/data')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 1, b: 1});
                        gmeAuth.getUser('user_w_data7')
                            .then(function (userData) {
                                expect(userData.data).to.deep.equal({a: 1, b: 1});
                            })
                            .nodeify(done);
                    });
            });

            it('should delete user data basic authentication "admin" DELETE /api/v1/users/:username/data', function (done) {
                agent.del(server.getUrl() + '/api/v1/users/user_w_data8/data')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getUser('user_w_data8')
                            .then(function (userData) {
                                expect(userData.data).to.deep.equal({});
                            })
                            .nodeify(done);
                    });
            });

            // Component Settings
            it('should get empty user settings basic authentication GET /api/v1/componentSettings', function (done) {
                agent.get(server.getUrl() + '/api/v1/componentSettings')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            it('should get empty user settings basic authentication GET /api/v1/componentSettings/componentId', function (done) {
                agent.get(server.getUrl() + '/api/v1/componentSettings/componentId')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            // User setting methods /user/settings
            it('should get empty user settings basic authentication GET /api/v1/user/settings', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/settings')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_data:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            it('should get user settings basic authentication GET /api/v1/user/settings', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/settings')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_settings1:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}});
                        done();
                    });
            });

            it('should overwrite user settings basic authentication PUT /api/v1/user/settings', function (done) {
                agent.put(server.getUrl() + '/api/v1/user/settings')
                    .send({comp3: {a: 1, b: 1}})
                    .set('Authorization', 'Basic ' + new Buffer('user_w_settings2:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({comp3: {a: 1, b: 1}});
                        gmeAuth.getUser('user_w_settings2')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({comp3: {a: 1, b: 1}});
                            })
                            .nodeify(done);
                    });
            });

            it('should update user settings basic authentication PATCH /api/v1/user/settings', function (done) {
                agent.patch(server.getUrl() + '/api/v1/user/settings')
                    .send({comp2: {a: 1, b: 1}})
                    .set('Authorization', 'Basic ' + new Buffer('user_w_settings3:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({comp1: {a: 1, b: 1}, comp2: {a: 1, b: 1}});
                        gmeAuth.getUser('user_w_settings3')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({comp1: {a: 1, b: 1}, comp2: {a: 1, b: 1}});
                            })
                            .nodeify(done);
                    });
            });

            it('should delete user settings basic authentication DELETE /api/v1/user/settings', function (done) {
                agent.del(server.getUrl() + '/api/v1/user/settings')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_settings4:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getUser('user_w_settings4')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({});
                            })
                            .nodeify(done);
                    });
            });

            // User setting methods /user/settings/:componentId
            it('should get empty user settings basic authentication GET /api/v1/user/settings/comp', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/settings/comp')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_data:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            it('should get user settings basic authentication GET /api/v1/user/settings/comp1', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/settings/comp1')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_c_settings1:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 1, b: 1});
                        done();
                    });
            });

            it('should add user settings basic authentication PUT /api/v1/user/settings/comp3', function (done) {
                agent.put(server.getUrl() + '/api/v1/user/settings/comp3')
                    .send({a: 3, b: 3})
                    .set('Authorization', 'Basic ' + new Buffer('user_w_c_settings2:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 3, b: 3});
                        gmeAuth.getUser('user_w_c_settings2')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({
                                    comp1: {a: 1, b: 1},
                                    comp2: {a: 2, b: 2},
                                    comp3: {a: 3, b: 3}
                                });
                            })
                            .nodeify(done);
                    });
            });

            it('should overwrite user settings basic authentication PUT /api/v1/user/settings/comp2', function (done) {
                agent.put(server.getUrl() + '/api/v1/user/settings/comp2')
                    .send({a: 3})
                    .set('Authorization', 'Basic ' + new Buffer('user_w_c_settings3:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 3});
                        gmeAuth.getUser('user_w_c_settings3')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({
                                    comp1: {a: 1, b: 1},
                                    comp2: {a: 3}
                                });
                            })
                            .nodeify(done);
                    });
            });

            it('should update user settings basic authentication PATCH /api/v1/user/settings/comp2', function (done) {
                agent.patch(server.getUrl() + '/api/v1/user/settings/comp2')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('user_w_c_settings4:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 2, b: 1});
                        gmeAuth.getUser('user_w_c_settings4')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({
                                    comp1: {a: 1, b: 1},
                                    comp2: {a: 2, b: 1}
                                });
                            })
                            .nodeify(done);
                    });
            });

            it('should delete user settings basic authentication DELETE /api/v1/user/settings/comp2', function (done) {
                agent.del(server.getUrl() + '/api/v1/user/settings/comp2')
                    .set('Authorization', 'Basic ' + new Buffer('user_w_c_settings5:plaintext').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getUser('user_w_c_settings5')
                            .then(function (userData) {
                                expect(userData.settings.comp2).to.deep.equal({});
                            })
                            .nodeify(done);
                    });
            });

            // User settings methods /users/:username/settings
            it('should get empty user settings basic authentication GET /api/v1/user/:username/settings', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/user_w_data/settings')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            it('should get user settings basic authentication GET /api/v1/users/:username/settings', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/users_w_settings1/settings')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}});
                        done();
                    });
            });

            it('should overwrite user settings basic authentication PUT /api/v1/users/:username/settings', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/users_w_settings2/settings')
                    .send({comp3: {a: 1, b: 1}})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({comp3: {a: 1, b: 1}});
                        gmeAuth.getUser('users_w_settings2')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({comp3: {a: 1, b: 1}});
                            })
                            .nodeify(done);
                    });
            });

            it('should update user settings basic authentication PATCH /api/v1/users/:username/settings', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/users_w_settings3/settings')
                    .send({comp2: {a: 1, b: 1}})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({comp1: {a: 1, b: 1}, comp2: {a: 1, b: 1}});
                        gmeAuth.getUser('users_w_settings3')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({comp1: {a: 1, b: 1}, comp2: {a: 1, b: 1}});
                            })
                            .nodeify(done);
                    });
            });

            it('should delete user settings basic authentication DELETE /api/v1/users/:username/settings', function (done) {
                agent.del(server.getUrl() + '/api/v1/users/users_w_settings4/settings')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getUser('users_w_settings4')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({});
                            })
                            .nodeify(done);
                    });
            });

            // User setting methods /users/:userId/settings/:componentId
            it('should get empty user settings basic authentication GET /api/v1/users/:username/settings/comp', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/user_w_data/settings/comp')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({});
                        done();
                    });
            });

            it('should get user settings basic authentication GET /api/v1/users/:username/settings/comp1', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/users_w_c_settings1/settings/comp1')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 1, b: 1});
                        done();
                    });
            });

            it('should add user settings basic authentication PUT /api/v1/users/:username/settings/comp3', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/users_w_c_settings2/settings/comp3')
                    .send({a: 3, b: 3})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 3, b: 3});
                        gmeAuth.getUser('users_w_c_settings2')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({
                                    comp1: {a: 1, b: 1},
                                    comp2: {a: 2, b: 2},
                                    comp3: {a: 3, b: 3}
                                });
                            })
                            .nodeify(done);
                    });
            });

            it('should overwrite user settings basic authentication PUT /api/v1/users/:username/settings/comp2', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/users_w_c_settings3/settings/comp2')
                    .send({a: 3})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 3});
                        gmeAuth.getUser('users_w_c_settings3')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({
                                    comp1: {a: 1, b: 1},
                                    comp2: {a: 3}
                                });
                            })
                            .nodeify(done);
                    });
            });

            it('should update user settings basic authentication PATCH /api/v1/users/:username/settings/comp2', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/users_w_c_settings4/settings/comp2')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.deep.equal({a: 2, b: 1});
                        gmeAuth.getUser('users_w_c_settings4')
                            .then(function (userData) {
                                expect(userData.settings).to.deep.equal({
                                    comp1: {a: 1, b: 1},
                                    comp2: {a: 2, b: 1}
                                });
                            })
                            .nodeify(done);
                    });
            });

            it('should delete user settings basic authentication DELETE /api/v1/users/:username/settings/comp2', function (done) {
                agent.del(server.getUrl() + '/api/v1/users/users_w_c_settings5/settings/comp2')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getUser('users_w_c_settings5')
                            .then(function (userData) {
                                expect(userData.settings.comp2).to.deep.equal({});
                            })
                            .nodeify(done);
                    });
            });
            // Fail cases

            it('should 404 basic authentication "admin" GET /api/v1/users/doesNotExist/data', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/doesNotExist/data')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" PUT /api/v1/users/doesNotExist/data', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/doesNotExist/data')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" PATCH /api/v1/users/doesNotExist/data', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/doesNotExist/data')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" DELETE /api/v1/users/doesNotExist/data', function (done) {
                agent.del(server.getUrl() + '/api/v1/users/doesNotExist/data')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 403 ensureSameUserOrSiteAdmin "guest" PUT /api/v1/users/doesNotExist/data', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/user_w_data/data')
                    .send({a: 1})
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" GET /api/v1/users/doesNotExist/settings', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/doesNotExist/settings')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" PUT /api/v1/users/doesNotExist/settings', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/doesNotExist/settings')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" PATCH /api/v1/users/doesNotExist/settings', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/doesNotExist/settings')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" DELETE /api/v1/users/doesNotExist/settings', function (done) {
                agent.del(server.getUrl() + '/api/v1/users/doesNotExist/settings')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" GET /api/v1/users/doesNotExist/settings/comp', function (done) {
                agent.get(server.getUrl() + '/api/v1/users/doesNotExist/settings/comp')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" PUT /api/v1/users/doesNotExist/settings/comp', function (done) {
                agent.put(server.getUrl() + '/api/v1/users/doesNotExist/settings/comp')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" PATCH /api/v1/users/doesNotExist/settings/comp', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/doesNotExist/settings/comp')
                    .send({b: 1})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 basic authentication "admin" DELETE /api/v1/users/doesNotExist/settings/comp', function (done) {
                agent.del(server.getUrl() + '/api/v1/users/doesNotExist/settings/comp')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
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
                    expect(res.body.hasOwnProperty('api_documentation_url')).true;
                    agent.get(res.body.api_documentation_url).end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
                });
            });

            it('should get source code documentation link', function (done) {
                /*jshint camelcase: false */
                agent.get(server.getUrl() + '/api').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.hasOwnProperty('source_code_documentation_url')).true;
                    agent.get(res.body.source_code_documentation_url).end(function (err, res) {
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
        var gmeAuth;

        before(function (done) {
            this.timeout(4000);
            testFixture.clearDBAndGetGMEAuth(gmeConfig)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    return Q.allDone([
                        gmeAuth.addUser('admin', 'admin@example.com', 'admin', true, {
                            overwrite: true,
                            siteAdmin: true
                        }),
                        gmeAuth.addUser('userCanCreate', 'admin@example.com', 'plaintext', true, {overwrite: true}),
                        gmeAuth.addUser('userCanNotCreate', 'admin@example.com', 'plaintext', false, {overwrite: true}),
                        gmeAuth.addUser('userAdminOrg', 'user@example.com', 'plaintext', false, {overwrite: true}),
                        gmeAuth.addUser('userAdminOrg2', 'user@example.com', 'plaintext', false, {overwrite: true}),
                        gmeAuth.addUser('userAddedToOrg', 'user@example.com', 'plaintext', false, {overwrite: true}),
                        gmeAuth.addUser('userRemovedFromOrg', 'user@example.com', 'plaintext', false, {overwrite: true}),
                        gmeAuth.addOrganization('orgInit', {someInfo: true}),
                        gmeAuth.addOrganization('orgToAddAdmin', null),
                        gmeAuth.addOrganization('orgToRemoveAdmin', null),
                        gmeAuth.addOrganization('orgToRemoveUser', null),
                        gmeAuth.addOrganization('orgToDelete', null),
                        gmeAuth.addOrganization('orgToDelete2', null),
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUserToOrganization('userAdminOrg', 'orgInit'),
                        gmeAuth.addUserToOrganization('userRemovedFromOrg', 'orgToRemoveUser'),
                        gmeAuth.addUserToOrganization('userAdminOrg2', 'orgToDelete2'),
                        gmeAuth.setAdminForUserInOrganization('userAdminOrg', 'orgInit', true),
                        gmeAuth.setAdminForUserInOrganization('userAdminOrg2', 'orgToDelete2', true),
                        gmeAuth.setAdminForUserInOrganization('userAdminOrg', 'orgToRemoveAdmin', true)
                    ]);
                })
                .nodeify(done);
        });

        after(function (done) {
            gmeAuth.unload()
                .nodeify(done);
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
            it('should get all organizations /api/v1/orgs', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.length).to.be.above(3);

                    done();
                });
            });

            it('should get specific organization /api/v1/orgs/orgInit', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs/orgInit').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.admins).to.deep.equal(['userAdminOrg']);

                    done();
                });
            });

            // AUTH METHODS
            // create organization
            it('should create a new organization as admin with valid data PUT /api/v1/orgs/newOrg', function (done) {
                var orgId = 'newOrg',
                    newOrg = {
                        info: {
                            info: 'new'
                        }
                    };

                agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                    .end(function (err, res) {
                        expect(res.status).equal(404, err); // user should not exist at this point

                        agent.put(server.getUrl() + '/api/v1/orgs/' + orgId)
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(newOrg)
                            .end(function (err, res2) {
                                expect(res2.status).equal(200, err);

                                expect(res2.body._id).equal(orgId);
                                expect(res2.body.info.info).equal(newOrg.info.info);
                                expect(res2.body.admins).to.deep.equal(['admin']);
                                expect(res2.body.users).to.deep.equal(['admin']);

                                done();
                            });
                    });
            });

            it('should create a new organization when canCreate with valid data PUT /api/v1/orgs/newOrgCanCreate',
                function (done) {
                    var orgId = 'newOrgCanCreate',
                        newOrg = {
                            info: {
                                info: 'new'
                            }
                        };

                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err); // org should not exist at this point

                            agent.put(server.getUrl() + '/api/v1/orgs/' + orgId)
                                .set('Authorization', 'Basic ' + new Buffer('userCanCreate:plaintext')
                                    .toString('base64'))
                                .send(newOrg)
                                .end(function (err, res2) {
                                    expect(res2.status).equal(200, err);

                                    expect(res2.body._id).equal(orgId);
                                    expect(res2.body.info.info).equal(newOrg.info.info);
                                    expect(res2.body.admins).to.deep.equal(['userCanCreate']);
                                    expect(res2.body.users).to.deep.equal(['userCanCreate']);

                                    done();
                                });
                        });
                }
            );

            it('should 403 when create a new organization when can not create with valid data PUT /api/v1/orgs/someOrg',
                function (done) {
                    var orgId = 'someOrg',
                        newOrg = {
                            info: {
                                info: 'new'
                            }
                        };

                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err); // org should not exist at this point

                            agent.put(server.getUrl() + '/api/v1/orgs/' + orgId)
                                .set('Authorization', 'Basic ' + new Buffer('userCanNotCreate:plaintext')
                                    .toString('base64'))
                                .send(newOrg)
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);
                                    done();
                                });
                        });
                }
            );

            it('should 500 when create a new organization when already exists with valid data PUT /api/v1/orgs/orgInit',
                function (done) {
                    var orgId = 'orgInit',
                        newOrg = {
                            info: {
                                info: 'new'
                            }
                        };

                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);

                            agent.put(server.getUrl() + '/api/v1/orgs/' + orgId)
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .send(newOrg)
                                .end(function (err, res2) {
                                    expect(res2.status).equal(500, err);

                                    done();
                                });
                        });
                }
            );

            // delete organization
            it('should delete organization as site admin DELETE /api/v1/orgs/orgToDelete', function (done) {
                var orgName = 'orgToDelete';
                agent.get(server.getUrl() + '/api/v1/orgs/' + orgName)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err); // org should exist at this point

                        agent.del(server.getUrl() + '/api/v1/orgs/' + orgName)
                            .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .end(function (err, res2) {
                                expect(res2.status).equal(204, err);

                                agent.get(server.getUrl() + '/api/v1/orgs/' + orgName)
                                    .end(function (err, res) {
                                        expect(res.status).equal(404, err); // org should not exist at this point
                                        done();
                                    });
                            });
                    });
            });

            it('should delete organization as org admin DELETE /api/v1/orgs/orgToDelete2', function (done) {
                var orgName = 'orgToDelete2';
                agent.get(server.getUrl() + '/api/v1/orgs/' + orgName)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err); // org should exist at this point

                        agent.del(server.getUrl() + '/api/v1/orgs/' + orgName)
                            .set('Authorization', 'Basic ' + new Buffer('userAdminOrg2:plaintext')
                                .toString('base64'))
                            .end(function (err, res2) {
                                expect(res2.status).equal(204, err);

                                agent.get(server.getUrl() + '/api/v1/orgs/' + orgName)
                                    .end(function (err, res) {
                                        expect(res.status).equal(404, err); // org should not exist at this point
                                        done();
                                    });
                            });
                    });
            });

            it('should 403 when delete organization when not site nor org admin DELETE /api/v1/orgs/orgInit',
                function (done) {
                    var orgName = 'orgInit';
                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgName)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err); // org should exist at this point

                            agent.del(server.getUrl() + '/api/v1/orgs/' + orgName)
                                .set('Authorization', 'Basic ' + new Buffer('userCanNotCreate:plaintext')
                                    .toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgName)
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err); // org should still exist at this point
                                            done();
                                        });
                                });
                        });
                }
            );

            it('should 404 when delete organization that does not exist DELETE /api/v1/orgs/orgInitDoesNotExist',
                function (done) {
                    var orgName = 'orgInitDoesNotExist';
                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgName)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err); // org should not exist at this point

                            agent.del(server.getUrl() + '/api/v1/orgs/' + orgName)
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin')
                                    .toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(404, err);
                                    done();
                                });
                        });
                }
            );

            // add user to organization
            it('should add user to organization PUT /api/v1/orgs/orgInit/users/userAddedToOrg', function (done) {
                agent.put(server.getUrl() + '/api/v1/orgs/orgInit/users/userAddedToOrg')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res2) {
                        expect(res2.status).equal(204, err);

                        agent.get(server.getUrl() + '/api/v1/users/userAddedToOrg')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body.orgs).to.deep.equal(['orgInit']);
                                done();
                            });
                    });
            });

            it('should 403 when add user to organization and not admin PUT /api/v1/orgs/orgInit/users/userAddedToOrg',
                function (done) {
                    agent.put(server.getUrl() + '/api/v1/orgs/orgInit/users/userAddedToOrg')
                        .set('Authorization', 'Basic ' + new Buffer('userCanNotCreate:plaintext').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(403, err);
                            done();
                        });
                }
            );

            it('should 404 when add user to non-existing organization PUT /api/v1/orgs/noExists/users/userAddedToOrg',
                function (done) {
                    agent.put(server.getUrl() + '/api/v1/orgs/noExists/users/userAddedToOrg')
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(404, err);
                            done();
                        });
                }
            );

            it('should 404 when add non-existing user to organization PUT /api/v1/orgs/orgInit/users/noExists',
                function (done) {
                    agent.put(server.getUrl() + '/api/v1/orgs/orgInit/users/noExists')
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(404, err);
                            done();
                        });
                }
            );

            // remove user from organization
            it('should remove user from organization DELETE /api/v1/orgs/orgToRemoveUser/users/userRemovedFromOrg',
                function (done) {
                    var orgId = 'orgToRemoveUser',
                        userId = 'userRemovedFromOrg';
                    agent.get(server.getUrl() + '/api/v1/users/' + userId)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body.orgs).to.deep.equal([orgId]);

                            agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/users/' + userId)
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(204, err);

                                    agent.get(server.getUrl() + '/api/v1/users/' + userId)
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err);
                                            expect(res.body.orgs).to.deep.equal([]);
                                            done();
                                        });
                                });
                        });
                }
            );

            it('should 403 when remove user from org and not admin DELETE /api/v1/orgs/initOrg/users/userAdminOrg',
                function (done) {
                    var orgId = 'orgInit',
                        userId = 'userAdminOrg';
                    agent.get(server.getUrl() + '/api/v1/users/' + userId)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body.orgs).to.deep.equal([orgId]);

                            agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/users/' + userId)
                                .set('Authorization', 'Basic ' + new Buffer('userCanNotCreate:plaintext')
                                    .toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    agent.get(server.getUrl() + '/api/v1/users/' + userId)
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err);
                                            expect(res.body.orgs).to.deep.equal([orgId]);
                                            done();
                                        });
                                });
                        });
                }
            );

            it('should 404 when remove user from non-existing org DELETE /api/v1/orgs/noExist/users/userAdminOrg',
                function (done) {
                    var orgId = 'noExist',
                        userId = 'userAdminOrg';

                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/users/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin')
                            .toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(404, err);
                            done();
                        });
                }
            );

            it('should 204 when remove non-existing user from org DELETE /api/v1/orgs/initOrg/users/noExist',
                function (done) {
                    var orgId = 'orgInit',
                        userId = 'noExist';

                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/users/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin')
                            .toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(204, err);
                            done();
                        });
                }
            );

            // set admins of organization
            it('should make user admin in organization PUT /api/v1/orgs/orgToAddAdmin/admins/userAddedToOrg',
                function (done) {
                    var orgId = 'orgToAddAdmin',
                        userId = 'userAddedToOrg';
                    agent.put(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(204, err);

                            agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                                .end(function (err, res) {
                                    expect(res.status).equal(200, err);
                                    expect(res.body.admins).to.deep.equal([userId]);
                                    done();
                                });
                        });
                }
            );

            it('should 403 when making user admin when not admin PUT /api/v1/orgs/orgInit/admins/userAddedToOrg',
                function (done) {
                    var orgId = 'orgInit',
                        userId = 'userAddedToOrg';
                    agent.put(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('userCanNotCreate:plaintext').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(403, err);
                            done();
                        });
                }
            );

            it('should 404 when making user admin in non-existing org PUT /api/v1/orgs/noExist/admins/userAddedToOrg',
                function (done) {
                    var orgId = 'noExist',
                        userId = 'userAddedToOrg';
                    agent.put(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(404, err);
                            done();
                        });
                }
            );

            it('should 404 when making non-existing user admin in org PUT /api/v1/orgs/orgInit/admins/noExist',
                function (done) {
                    var orgId = 'orgInit',
                        userId = 'noExist';
                    agent.put(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(404, err);
                            done();
                        });
                }
            );

            it('should remove user admin in organization DELETE /api/v1/orgs/orgToRemoveAdmin/admins/userAdminOrg',
                function (done) {
                    var orgId = 'orgToRemoveAdmin',
                        userId = 'userAdminOrg';
                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body.admins).to.deep.equal([userId]);

                            agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(204, err);

                                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err);
                                            expect(res.body.admins).to.deep.equal([]);
                                            done();
                                        });
                                });
                        });
                }
            );

            it('should 403 when removing user admin when not admin DELETE /api/v1/orgs/orgInit/admins/userAddedToOrg',
                function (done) {
                    var orgId = 'orgInit',
                        userId = 'userAddedToOrg';
                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('userCanNotCreate:plaintext').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(403, err);
                            done();
                        });
                }
            );

            it('should 404 when removing user admin in non-existing org DELETE /api/v1/orgs/noExist/admins/userAddedToOrg',
                function (done) {
                    var orgId = 'noExist',
                        userId = 'userAddedToOrg';
                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(404, err);
                            done();
                        });
                }
            );

            it('should 204 when removing non-existing user admin in org DELETE /api/v1/orgs/orgInit/admins/noExist',
                function (done) {
                    var orgId = 'orgInit',
                        userId = 'noExist';
                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgId + '/admins/' + userId)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            expect(res2.status).equal(204, err);
                            done();
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
                                importResult.project.createTag('tag', importResult.commitHash),
                                importResult.project.createTag('tagPatched', importResult.commitHash),
                                gmeAuth.authorizeByUserId(guestAccount, projectName2Id(unauthorizedProjectName),
                                    'create', {
                                        read: true,
                                        write: false,
                                        delete: false
                                    }
                                ),
                                gmeAuth.addOrganization('org', null),
                                gmeAuth.addUser('userSiteAdmin', 'user@example.com', 'p', true, {
                                    overwrite: true,
                                    siteAdmin: true
                                })
                            ]);
                        })
                        .then(function () {
                            return Q.allDone([
                                gmeAuth.addUserToOrganization(guestAccount, 'org'),
                                gmeAuth.setAdminForUserInOrganization(guestAccount, 'org', true)
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

            it('should create a project from fileSeed /projects/:ownerId/:projectName', function (done) {
                var toBeCreatedProjectName = 'myVeryNewFileProject';
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(toBeCreatedProjectName))
                    .send({type: 'file', seedName: 'EmptyProject'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(204);

                        agent.get(server.getUrl() + '/api/projects')
                            .end(function (err, res) {
                                expect(res.status).to.equal(200);
                                expect(res.body).to.contain({
                                    _id: testFixture.projectName2Id(toBeCreatedProjectName),
                                    name: toBeCreatedProjectName,
                                    owner: 'guest'
                                });
                                done();
                            });
                    });
            });

            it('should create a project from dbSeed /projects/:ownerId/:projectName', function (done) {
                var toBeCreatedProjectName = 'myVeryNewDBProject';
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(toBeCreatedProjectName))
                    .send({type: 'db', seedName: testFixture.projectName2Id('project'), seedBranch: 'master'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(204);

                        agent.get(server.getUrl() + '/api/projects')
                            .end(function (err, res) {
                                expect(res.status).to.equal(200);
                                expect(res.body).to.contain({
                                    _id: testFixture.projectName2Id(toBeCreatedProjectName),
                                    name: toBeCreatedProjectName,
                                    owner: 'guest'
                                });
                                done();
                            });
                    });
            });

            it('should create a project to an organization /projects/org/:projectName', function (done) {
                var toBeCreatedProjectName = 'ownedByOrg';
                agent.put(server.getUrl() + '/api/projects/org/' + toBeCreatedProjectName)
                    .send({type: 'file', seedName: 'EmptyProject'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(204);

                        agent.get(server.getUrl() + '/api/projects')
                            .end(function (err, res) {
                                expect(res.status).to.equal(200);
                                expect(res.body).to.contain({
                                    _id: testFixture.projectName2Id(toBeCreatedProjectName, 'org'),
                                    name: toBeCreatedProjectName,
                                    owner: 'org'
                                });
                                done();
                            });
                    });
            });

            it('should get info and branches for project /projects/:ownerId/:projectId', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('branches');
                        expect(res.body).to.have.property('info');
                        expect(res.body.info).to.include.keys('creator', 'viewer', 'modifier',
                            'createdAt', 'viewedAt', 'modifiedAt');
                        done();
                    });
            });

            it('should patch info for project /projects/:ownerId/:projectId', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName))
                    .send({creator: 'PerAlbinHansson'})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('info');
                        expect(res.body.info).to.include.keys('creator', 'viewer', 'modifier',
                            'createdAt', 'viewedAt', 'modifiedAt');
                        expect(res.body.info.creator).to.equal('PerAlbinHansson');
                        done();
                    });
            });

            it('should not patch info for project if no write access /projects/:ownerId/:projectId', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(unauthorizedProjectName))
                    .send({creator: 'PerAlbinHansson'})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should patch if siteAdmin /projects/:ownerId/:projectId', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(unauthorizedProjectName))
                    .set('Authorization', 'Basic ' + new Buffer('userSiteAdmin:p').toString('base64'))
                    .send({creator: 'PerAlbinHansson'})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('info');
                        expect(res.body.info).to.include.keys('creator', 'viewer', 'modifier',
                            'createdAt', 'viewedAt', 'modifiedAt');
                        expect(res.body.info.creator).to.equal('PerAlbinHansson');
                        done();
                    });
            });

            it('should not get info and branches for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
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

            it('should list commits for project /projects/:ownerId/:projectId/commits?n=1', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits?n=1')
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

            it('should return commit for project /projects/:ownerId/:projectId/commits/:commitHash', function (done) {
                var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                    importResult.commitHash.substring(1);
                agent.get(url)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('message');
                        expect(res.body).to.have.property('parents');
                        expect(res.body).to.have.property('root');
                        expect(res.body).to.have.property('time');
                        expect(res.body).to.have.property('type');
                        expect(res.body).to.have.property('updater');
                        expect(res.body).to.have.property('_id');
                        done();
                    });
            });

            it('should return commit for project /projects/:ownerId/:projectId/commits/:%23commitHash', function (done) {
                var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/%23' +
                    importResult.commitHash.substring(1);
                agent.get(url)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('message');
                        expect(res.body).to.have.property('parents');
                        expect(res.body).to.have.property('root');
                        expect(res.body).to.have.property('time');
                        expect(res.body).to.have.property('type');
                        expect(res.body).to.have.property('updater');
                        expect(res.body).to.have.property('_id');
                        done();
                    });
            });

            it('should 404 commit for project /projects/:ownerId/:projectId/commits/:doesNotExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                    'doesNotExist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 commit for project /projects/:ownerId/:doesNotExist/commits/:doesNotExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/guest/doesNotExist/commits/' +
                    importResult.commitHash.substring(1))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 commit for project /projects/:ownerId/:projectId/commits/:rootHash', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                    importResult.rootHash.substring(1))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            // Getting raw data nodes via commit
            it('should return rootNode for project /projects/:ownerId/:projectId/commits/:commitHash/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        importResult.commitHash.substring(1) + '/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should return fcoNode for project /projects/:ownerId/:projectId/commits/:commitHash/tree/1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        importResult.commitHash.substring(1) + '/tree/1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.not.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should return fcoNode for project /projects/:ownerId/:projectId/commits/:%23commitHash/tree/1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/%23' +
                        importResult.commitHash.substring(1) + '/tree/1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.not.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/commits/:doesNotExist/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        'doesNotExist' + '/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/commits/:commitHash/tree/doesNotExist',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        importResult.commitHash.substring(1) + '/tree/doesNotExist';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:doesNotExist/commits/:commitHash/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/guest/doesNotExist/commits/' +
                        importResult.commitHash.substring(1) + '/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should get history for branch /projects/:ownerId/branches/:branchId/commits',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/commits';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body instanceof Array).to.equal(true);
                            expect(res.body.length).to.equal(1);
                            expect(res.body[0]._id).to.equal(importResult.commitHash);

                            done();
                        });
                }
            );

            it('should get history for branch /projects/:ownerId/branches/:branchId/commits?n=1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/commits?n=1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body instanceof Array).to.equal(true);
                            expect(res.body.length).to.equal(1);
                            expect(res.body[0]._id).to.equal(importResult.commitHash);

                            done();
                        });
                }
            );

            // Getting raw data nodes via branch
            it('should return rootNode for project /projects/:ownerId/:projectId/branches/:branchId/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should return fcoNode for project /projects/:ownerId/:projectId/branches/:branchId/tree/1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/tree/1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.not.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/branches/:doesNotExist/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'doesNotExist/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/branches/:branchId/tree/doesNotExist',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/tree/doesNotExist';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:doesNotExist/branches/:branchId/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/guest/doesNotExist/branches/master/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            // Branch manipulation
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

            it('should fail to create a project with unknown owner', function (done) {
                var toBeCreatedProjectName = 'myVeryNewProject';
                agent.put(server.getUrl() + '/api/projects/noRealOwner/' + toBeCreatedProjectName)
                    .send({type: 'file', seedName: 'EmptyProject'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(500);

                        done();
                    });
            });

            //Tags
            it('should getTags for project /projects/:ownerId/:projectId/tags', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('tag');

                        done();
                    });
            });

            it('should return commit for project /projects/:ownerId/:projectId/tags/:tagId', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/tag')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.type).to.equal('commit');

                        done();
                    });
            });

            it('should 404 for project /projects/:ownerId/:projectId/tags/:notExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/notExist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);

                        done();
                    });
            });

            it('should patch an existing tag /projects/:ownerId/:projectId/tags/tagPatched', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/tagPatched')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body).to.have.property('tagPatched');

                                done();
                            });
                    });
            });

            it('should patch a non-existing tag /projects/:ownerId/:projectId/tags/didNotExist', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/newPatched')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body).to.have.property('newPatched');

                                done();
                            });
                    });
            });

            it('should create tag for put project /projects/:ownerId/:projectId/tags/:newTag', function (done) {
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/newTag')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(201, err);
                        agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body.newTag).to.equal(importResult.commitHash);

                                done();
                            });
                    });
            });

            it('should delete tag for del project /projects/:ownerId/:projectId/tags/:newTag', function (done) {
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/toDel')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(201, err);
                        agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                            '/tags/toDel')
                            .end(function (err, res) {
                                expect(res.status).equal(204, err);
                                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                    '/tags')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body.hasOwnProperty('toDel')).to.equal(false);

                                        done();
                                    });
                            });

                    });
            });

            it('should 403 for project get /projects/not/Exist/tags', function (done) {
                agent.get(server.getUrl() + '/api/projects/not/Exist/tags')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project get /projects/not/Exist/tags/notExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project del /projects/not/Exist/tags/notExist', function (done) {
                agent.del(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project put /projects/not/Exist/tags/notExist', function (done) {
                agent.put(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project patch /projects/not/Exist/tags/notExist', function (done) {
                agent.put(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });
        });
    });

    describe('Assigning authorization for projects', function () {
        var server,
            agent,
            projectOwnedByUser = 'projectOwnedByUser',
            projectOwnedByOrg = 'projectOwnedByOrg',
            projectOwnedByOtherUser = 'projectOwnedByOtherUser',
            safeStorage,
            gmeAuth,
            pr2Id = testFixture.projectName2Id,
            guestAccount = gmeConfig.authentication.guestAccount;

        before(function (done) {
            var gmeConfig = testFixture.getGmeConfig();

            server = WebGME.standaloneServer(gmeConfig);

            testFixture.clearDBAndGetGMEAuth(gmeConfig)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUser('user', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userWithRights1', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userWithRights2', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userWithRights3', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userOrgAdmin', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userSiteAdmin', 'user@example.com', 'p', true, {
                            overwrite: true,
                            siteAdmin: true
                        }),
                        gmeAuth.addOrganization('org', null)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUserToOrganization('userOrgAdmin', 'org'),
                        gmeAuth.setAdminForUserInOrganization('userOrgAdmin', 'org', true)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectOwnedByUser,
                            gmeConfig: gmeConfig,
                            username: 'user',
                            logger: logger
                        }),
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectOwnedByOrg,
                            gmeConfig: gmeConfig,
                            username: 'userOrgAdmin',
                            logger: logger
                        }),
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectOwnedByOtherUser,
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.authorizeByUserOrOrgId(
                            'user',
                            pr2Id(projectOwnedByUser, 'user'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userWithRights1',
                            pr2Id(projectOwnedByUser, 'user'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userWithRights2',
                            pr2Id(projectOwnedByUser, 'user'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userWithRights3',
                            pr2Id(projectOwnedByOrg, 'org'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userOrgAdmin',
                            pr2Id(projectOwnedByOrg, 'userOrgAdmin'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        safeStorage.transferProject({
                            projectId: pr2Id(projectOwnedByOrg, 'userOrgAdmin'),
                            newOwnerId: 'org',
                            username: 'userOrgAdmin'
                        })
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addOrganization('orgTest1', null),
                        gmeAuth.addOrganization('orgTest2', null),
                        gmeAuth.addOrganization('orgTest3', null)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUser('userTest1', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest2', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest3', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest4', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest5', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest6', 'user@example.com', 'p', true, {overwrite: true}),
                    ]);
                })
                .then(function () {
                    return Q.ninvoke(server, 'start');
                })
                .nodeify(done);
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

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/userTest1/r', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userTest1/rr')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.getProjectAuthorizationByUserId('userTest1', pr2Id(projectOwnedByUser, 'user'))
                        .then(function (auth) {
                            expect(auth).to.deep.equal({
                                read: true,
                                write: false,
                                delete: false
                            });
                        })
                        .nodeify(done);
                });
        });

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/userTest2/w', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userTest2/w')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.getProjectAuthorizationByUserId('userTest2', pr2Id(projectOwnedByUser, 'user'))
                        .then(function (auth) {
                            expect(auth).to.deep.equal({
                                read: false,
                                write: true,
                                delete: false
                            });
                        })
                        .nodeify(done);
                });
        });

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/userTest3/rwd', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userTest3/rwd')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.getProjectAuthorizationByUserId('userTest3', pr2Id(projectOwnedByUser, 'user'))
                        .then(function (auth) {
                            expect(auth).to.deep.equal({
                                read: true,
                                write: true,
                                delete: true
                            });
                        })
                        .nodeify(done);
                });
        });

        it('404 as owner should not authorize /projects/user/projectOwnedByUser/authorize/notExists/r', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/notExists/r')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(404, err);
                    done();
                });
        });

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/orgTest1/r', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/orgTest1/r')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.getProjectAuthorizationByUserId('orgTest1', pr2Id(projectOwnedByUser, 'user'))
                        .then(function (auth) {
                            expect(auth).to.deep.equal({
                                read: true,
                                write: false,
                                delete: false
                            });
                        })
                        .nodeify(done);
                });
        });

        it('204 as admin in owner org should authorize /projects/org/projectOwnedByOrg/authorize/userTest4/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/userTest4/r')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getProjectAuthorizationByUserId('userTest4', pr2Id(projectOwnedByOrg, 'org'))
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: true,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('204 as siteAdmin should authorize /projects/org/projectOwnedByOrg/authorize/userTest5/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/userTest5/r')
                    .set('Authorization', 'Basic ' + new Buffer('userSiteAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getProjectAuthorizationByUserId('userTest5', pr2Id(projectOwnedByOrg, 'org'))
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: true,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('403 should not authorize /projects/' + guestAccount + '/projectOwnedByOtherUser/authorize/userTest6/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/' + guestAccount + '/projectOwnedByOtherUser/authorize/userTest6/r')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );

        it('403 should not deauthorize /projects/user/projectOwnedByUser/authorize/userWithRights1',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userWithRights1')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        gmeAuth.getProjectAuthorizationByUserId('userWithRights1', pr2Id(projectOwnedByUser, 'user'))
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: true,
                                    write: true,
                                    delete: true
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        // TODO: This might be the wrong behaviour
        it('204 should deauthorize /projects/user/projectOwnedByUser/authorize/notExists', function (done) {
            agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/notExists')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    done();
                });
        });

        it('204 as owner should deauthorize /projects/user/projectOwnedByUser/authorize/userWithRights1',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userWithRights1')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getProjectAuthorizationByUserId('userWithRights1', pr2Id(projectOwnedByUser, 'user'))
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: false,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('204 as siteAdmin should deauthorize /projects/user/projectOwnedByUser/authorize/userWithRights2',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userWithRights2')
                    .set('Authorization', 'Basic ' + new Buffer('userSiteAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getProjectAuthorizationByUserId('userWithRights2', pr2Id(projectOwnedByUser, 'user'))
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: false,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('204 as org admin should deauthorize /projects/org/projectOwnedByOrg/authorize/userWithRights3',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/userWithRights3')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.getProjectAuthorizationByUserId('userWithRights3', pr2Id(projectOwnedByOrg, 'org'))
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: false,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('404 as org admin if project not exist /projects/org/unknown/authorize/userWithRights3/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/unknown/authorize/userWithRights3/r')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            }
        );

        it('404 as (del) org admin if project not exist /projects/org/unknown/authorize/userWithRights3',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/org/unknown/authorize/userWithRights3')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            }
        );

        it('403 as not org admin authorize /projects/org/projectOwnedByOrg/authorize/orgTest2/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/orgTest2/r')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );

        it('403 (del) as not org admin authorize /projects/org/projectOwnedByOrg/authorize/orgTest3',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/orgTest3')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );
    });
});
