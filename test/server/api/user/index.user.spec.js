/*globals require*/
/*jshint node:true, mocha:true, expr:true, camelcase: false*/
/*jscs:disable maximumLineLength*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');


describe('USER REST API', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        expect = testFixture.expect,
        Q = testFixture.Q,

        superagent = testFixture.superagent;


    describe('USER SPECIFIC API', function () {
        var gmeAuth;

        before(function (done) {
            this.timeout(4000);
            var gmeAuthConfig = JSON.parse(JSON.stringify(gmeConfig));
            gmeAuthConfig.authentication.enable = true;
            testFixture.clearDBAndGetGMEAuth(gmeAuthConfig)
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
                        gmeAuth.addUser('user_w_data1', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_data2', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_data3', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_data4', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_data5', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_data6', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_data7', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_data8', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            data: {a: 1}
                        }),
                        gmeAuth.addUser('user_w_settings1', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_settings2', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_settings3', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_settings4', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_c_settings1', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_c_settings2', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_c_settings3', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_c_settings4', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_w_c_settings5', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_settings1', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_settings2', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_settings3', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_settings4', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_c_settings1', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_c_settings2', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_c_settings3', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_c_settings4', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('users_w_c_settings5', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1, b: 1}, comp2: {a: 2, b: 2}}
                        }),
                        gmeAuth.addUser('user_not_in_db', 'e@mail.com', 'plaintext', false, {
                            overwrite: true,
                            settings: {comp1: {a: 1}}
                        })
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

            it('should return 404 for GET /api/v1/user/token', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/token').end(function (err, res) {
                    expect(res.status).equal(404, err);
                    done();
                });
            });

            it('should use guest account with no password and no username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body._id).to.equal('guest');
                        done();
                    });
            });

            it('should use guest account with wrong password basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:wrong_password').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body._id).to.equal('guest');
                        done();
                    });
            });

            it('should use guest account wrong username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('unknown_username:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body._id).to.equal('guest');
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

            it('should fail to update non existent user PATCH /api/v1/users/does_not_exist', function (done) {
                var updates = {
                    email: 'new_email_address',
                    canCreate: false
                };

                agent.get(server.getUrl() + '/api/v1/users/does_not_exist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);

                        agent.patch(server.getUrl() + '/api/v1/users/does_not_exist')
                            //.set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                            .send(updates)
                            .end(function (err, res2) {
                                expect(res2.status).equal(403, err);
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
                                //.set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
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

            it('should fail to delete a non existent user as site admin DELETE /api/v1/users/does_not_exist',
                function (done) {
                    agent.get(server.getUrl() + '/api/v1/users/does_not_exist')
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);
                            agent.del(server.getUrl() + '/api/v1/users/does_not_exist')
                                //.set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    done();
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
                    agent.get(server.getUrl() + '/api/v1/users/user')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            agent.del(server.getUrl() + '/api/v1/users/user')
                                //.set('Authorization', 'Basic ' + new Buffer('user:plaintext').toString('base64'))
                                .end(function (err, res2) {
                                    expect(res2.status).equal(403, err);

                                    agent.get(server.getUrl() + '/api/v1/users/user')
                                        .end(function (err, res2) {
                                            expect(res.status).equal(200, err);

                                            // make sure we did not lose any users
                                            expect(res.body).deep.equal(res2.body);

                                            done();
                                        });
                                });
                        });
                });

            it('should return 404 when posting /api/v1/register', function (done) {
                var newUser = {
                    userId: 'new_user404',
                    email: 'new_email_address404',
                    password: 'new_user_pass',
                    canCreate: true
                };

                agent.post(server.getUrl() + '/api/v1/register')
                    .send(newUser)
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });
        });

        describe('auth enabled, allowGuests false, allowUserRegistration=true', function () {
            var server,
                agent;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = true;
                gmeConfig.authentication.allowGuests = false;
                gmeConfig.authentication.allowUserRegistration = true;

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

            it('should return 401 when no auth used for GET /api/v1/user/token', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/token').end(function (err, res) {
                    expect(res.status).equal(401, err);
                    done();
                });
            });

            it('should return an access_token when authed used for GET /api/v1/user/token', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/token')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.webgmeToken.split('.').length).equal(3, 'Returned token not correct format');
                        done();
                    });
            });

            it('should create user when accessed in db and not existing for user and setting calls', function (done) {
                var userId = 'user_not_in_db',
                    token;

                gmeAuth.generateJWTokenForAuthenticatedUser(userId)
                    .then(function (token_) {
                        token = token_;
                        console.log(token);
                        return gmeAuth.deleteUser(userId, true);
                    })
                    .then(function () {
                        console.log('removed');
                        agent.get(server.getUrl() + '/api/v1/user')
                            .set('Authorization', 'Bearer ' + token)
                            .end(function (err, res) {
                                try {
                                    expect(res.status).equal(200, err);
                                    expect(res.body._id).equal(userId);
                                    expect(res.body.settings).to.deep.equal({});
                                } catch (e) {
                                    err = e;
                                }

                                done(err);
                            });
                    })
                    .catch(done);
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

            it('should update user with no data PATCH /api/v1/users/user_to_modify', function (done) {
                agent.patch(server.getUrl() + '/api/v1/users/user_to_modify')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    // no data
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
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

                                        done();
                                    });
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

                                        done();
                                    });
                            });
                    });
            });

            it('should add user when posting /api/v1/register', function (done) {
                var newUser = {
                    userId: 'reg_user',
                    email: 'em@il',
                    password: 'pass'
                };

                agent.post(server.getUrl() + '/api/v1/register')
                    .send(newUser)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        agent.get(server.getUrl() + '/api/v1/user')
                            .set('Authorization', 'Basic ' + new Buffer('reg_user:pass').toString('base64'))
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body._id).to.equal('reg_user');
                                done();
                            });
                    });
            });

            it('should fail with 400 to add user twice when posting /api/v1/register', function (done) {
                var newUser = {
                    userId: 'reg_user_twice',
                    email: 'orgEmail',
                    password: 'pass'
                };

                agent.post(server.getUrl() + '/api/v1/register')
                    .send(newUser)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        newUser.email = 'updateEmail';
                        agent.post(server.getUrl() + '/api/v1/register')
                            .send(newUser)
                            .end(function (err, res) {
                                expect(res.status).equal(400, err);

                                agent.get(server.getUrl() + '/api/v1/user')
                                    .set('Authorization', 'Basic ' + new Buffer('reg_user_twice:pass').toString('base64'))
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body._id).to.equal('reg_user_twice');
                                        expect(res.body.email).to.equal('orgEmail');
                                        done();
                                    });
                            });
                    });
            });

        });

        describe('auth enabled, allowGuests true, allowUserRegistration=false', function () {
            var server,
                agent,
                guestAccount = 'guest';

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = true;
                gmeConfig.authentication.allowGuests = true;
                gmeConfig.authentication.guestAccount = guestAccount;
                gmeConfig.authentication.allowUserRegistration = false;

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

            it('should return an access_token for guest for GET /api/v1/user/token', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/token')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.webgmeToken.split('.').length)
                            .equal(3, 'Returned token not correct format');
                        agent.get(server.getUrl() + '/api/v1/user')
                            .set('Authorization', 'Bearer ' + res.body.webgmeToken)
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body._id).equal('guest', err);
                                done();
                            });
                    });
            });

            it('should return an access_token for admin for GET /api/v1/user/token', function (done) {
                agent.get(server.getUrl() + '/api/v1/user/token')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.webgmeToken.split('.').length).equal(3, 'Returned token not correct format');
                        agent.get(server.getUrl() + '/api/v1/user')
                            .set('Authorization', 'Bearer ' + res.body.webgmeToken)
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body._id).equal('admin', err);
                                done();
                            });
                    });
            });

            it('should return 401 with invalid access_token for guest for GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Bearer ' + '42.mombo.jumbo')
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should not check password of guest basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:wrong_password').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        done();
                    });
            });

            it('should fail with wrong password basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('admin:wrong_password').toString('base64'))
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

            it('should 401 basic authentication empty user and password /api/v1/user', function (done) {
                agent.del(server.getUrl() + '/api/v1/users/doesNotExist/settings/comp')
                    .set('Authorization', 'Basic ' + new Buffer('').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(401, err);
                        done();
                    });
            });

            it('should return 404 when posting /api/v1/register', function (done) {
                var newUser = {
                    userId: 'new_user404',
                    email: 'new_email_address404',
                    password: 'new_user_pass',
                    canCreate: true
                };

                agent.post(server.getUrl() + '/api/v1/register')
                    .send(newUser)
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

            it('should use guest account GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body._id).to.deep.equal('guest');
                        done();
                    });
            });

            it('should use guest account with wrong password basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('guest:wrong_password').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body._id).to.deep.equal('guest');
                        done();
                    });
            });

            it('should use guest account with wrong username basic authentication GET /api/v1/user', function (done) {
                agent.get(server.getUrl() + '/api/v1/user')
                    .set('Authorization', 'Basic ' + new Buffer('unknown_username:guest').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body._id).to.deep.equal('guest');
                        done();
                    });
            });
        });

        describe('Token renewal an expiration auth enabled, allowGuests true', function () {
            var server,
                agent;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = true;
                gmeConfig.authentication.jwt.expiresIn = 2;
                gmeConfig.authentication.jwt.renewBeforeExpires = 1;

                server = WebGME.standaloneServer(gmeConfig);
                server.start(done);
            });

            after(function (done) {
                server.stop(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            it('should return an access_token for admin for GET /api/v1/user/token and set a new in the header', function (done) {
                this.timeout(5000);
                agent.get(server.getUrl() + '/api/v1/user/token')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        var orginalToken = res.body.webgmeToken;
                        expect(res.status).equal(200, err);
                        expect(orginalToken.split('.').length).equal(3, 'Returned token not correct format');
                        setTimeout(function () {
                            agent.get(server.getUrl() + '/api/v1/user')
                                .set('Authorization', 'Bearer ' + orginalToken)
                                .end(function (err, res) {
                                    expect(res.status).equal(200, err);
                                    expect(res.body._id).equal('admin', err);
                                    expect(res.header.access_token.split('.').length).equal(3, 'no token in header');
                                    expect(res.header.access_token).to.not.equal(orginalToken, 'no token update');
                                    done();
                                });
                        }, 1000);
                    });
            });

            it('should return 401 when using expired token', function (done) {
                this.timeout(5000);
                agent.get(server.getUrl() + '/api/v1/user/token')
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        var orginaltoken = res.body.webgmeToken;
                        expect(res.status).equal(200, err);
                        expect(orginaltoken.split('.').length).equal(3, 'Returned token not correct format');
                        setTimeout(function () {
                            agent.get(server.getUrl() + '/api/v1/user')
                                .set('Authorization', 'Bearer ' + orginaltoken)
                                .end(function (err, res) {
                                    expect(res.status).equal(401, err);
                                    done();
                                });
                        }, 2000);
                    });
            });
        });
    });
});
