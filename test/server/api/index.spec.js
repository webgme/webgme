/*globals require*/
/*jshint node:true, mocha:true, expr:true*/
/*jscs:disable maximumLineLength*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');


describe('ORGANIZATION REST API', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        expect = testFixture.expect,
        Q = testFixture.Q,
        superagent = require('superagent');

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
                        gmeAuth.addOrganization('orgDisabledAtStart', {some: 'info'}),
                        gmeAuth.addOrganization('orgDisabledForceDelete'),
                        gmeAuth.addOrganization('orgPatchInfo', {start: 'info'}),
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUserToOrganization('userAdminOrg', 'orgInit'),
                        gmeAuth.addUserToOrganization('userRemovedFromOrg', 'orgToRemoveUser'),
                        gmeAuth.addUserToOrganization('userAdminOrg2', 'orgToDelete2'),
                        gmeAuth.setAdminForUserInOrganization('userAdminOrg', 'orgInit', true),
                        gmeAuth.setAdminForUserInOrganization('userAdminOrg2', 'orgToDelete2', true),
                        gmeAuth.setAdminForUserInOrganization('userAdminOrg', 'orgToRemoveAdmin', true),
                        gmeAuth.deleteOrganization('orgDisabledAtStart'),
                        gmeAuth.deleteOrganization('orgDisabledForceDelete'),
                        gmeAuth.setAdminForUserInOrganization('userAdminOrg', 'orgPatchInfo', true)
                    ]);
                })
                .nodeify(done);
        });

        after(function (done) {
            gmeAuth.unload()
                .nodeify(done);
        });

        describe('auth enabled, allowGuests true', function () {
            var server,
                agent;

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = true;
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

            it('should get all organizations /api/v1/orgs', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.length).to.be.above(3);

                    done();
                });
            });

            it('should get disabled orgs too if /api/v1/orgs?includeDisabled=true for site-admin', function (done) {
                var dOrgs,
                    orgs;

                function report(err) {
                    if (err) {
                        done(err);
                    } else if (dOrgs && orgs) {
                        var hadWhenShouldHave = false,
                            hadWhenShouldNotHave = false;

                        try {
                            expect(dOrgs.length > orgs.length).to.equal(true);

                            dOrgs.forEach(function (uData) {
                                if (uData.disabled) {
                                    hadWhenShouldHave = true;
                                }
                            });

                            orgs.forEach(function (uData) {
                                if (uData.disabled) {
                                    hadWhenShouldNotHave = true;
                                }
                            });

                            expect(hadWhenShouldHave).to.equal(true);
                            expect(hadWhenShouldNotHave).to.equal(false);

                            done();
                        } catch (e) {
                            done(e);
                        }
                    }
                }

                agent.get(server.getUrl() + '/api/v1/orgs')
                    .query({includeDisabled: true})
                    .end(function (err, res) {
                        orgs = res.body;
                        report(err);
                    });

                agent.get(server.getUrl() + '/api/v1/orgs')
                    .query({includeDisabled: true})
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        dOrgs = res.body;
                        report(err);
                    });
            });

            it('should get specific organization /api/v1/orgs/orgInit', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs/orgInit').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.admins).to.deep.equal(['userAdminOrg']);

                    done();
                });
            });

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

            it('should 400 when creating a new organization when org/user exists PUT /api/v1/orgs/userCanCreate',
                function (done) {
                    var orgId = 'userCanCreate',
                        newOrg = {
                            info: {
                                info: 'new'
                            }
                        };

                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .end(function (err, res) {
                            expect(res.status).equal(404);

                            agent.put(server.getUrl() + '/api/v1/orgs/' + orgId)
                                .set('Authorization', 'Basic ' + new Buffer('userCanCreate:plaintext')
                                        .toString('base64'))
                                .send(newOrg)
                                .end(function (err, res2) {
                                    expect(res2.status).equal(400);
                                    agent.get(server.getUrl() + '/api/v1/orgs/' + orgId)
                                        .end(function (err, res3) {
                                            expect(res3.status).equal(404);
                                            done();
                                        });
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

            it('should 400 when create a new organization when already exists with valid data PUT /api/v1/orgs/orgInit',
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
                                    expect(res2.status).equal(400, err);

                                    done();
                                });
                        });
                }
            );

            // patch organization
            it('should 200 when patching org with info as org-admin PATCH /api/v1/orgs/orgInit', function (done) {
                var orgId = 'orgPatchInfo',
                    newInfo = {
                        info: {
                            new: 'info'
                        }
                    };

                agent.patch(server.getUrl() + '/api/v1/orgs/' + orgId)
                    .send(newInfo)
                    .set('Authorization', 'Basic ' + new Buffer('userAdminOrg:plaintext').toString('base64'))
                    .end(function (err, res) {
                        try {
                            expect(res.status).equal(200, err);
                            expect(res.body.info.new).to.deep.equal('info');
                            done();
                        } catch (e) {
                            done(e);
                        }
                    });
            });

            it('should 200 when patching org with info as site-admin PATCH /api/v1/orgs/orgInit', function (done) {
                var orgId = 'orgPatchInfo',
                    newInfo = {
                        info: {
                            new: 'info2'
                        }
                    };

                agent.patch(server.getUrl() + '/api/v1/orgs/' + orgId)
                    .send(newInfo)
                    .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                    .end(function (err, res) {
                        try {
                            expect(res.status).equal(200, err);
                            expect(res.body.info.new).to.deep.equal('info2');
                            done();
                        } catch (e) {
                            done(e);
                        }
                    });
            });

            it('should 403 when patching org with info as non-admin PATCH /api/v1/orgs/orgInit', function (done) {
                var orgId = 'orgPatchInfo',
                    newInfo = {
                        info: {
                            new: 'info3'
                        }
                    };

                agent.patch(server.getUrl() + '/api/v1/orgs/' + orgId)
                    .send(newInfo)
                    .set('Authorization', 'Basic ' + new Buffer('userCanCreate:plaintext').toString('base64'))
                    .end(function (err, res) {
                        try {
                            expect(res.status).equal(403, err);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    });
            });

            it('should 403 when patching {disabled: false} org with on-site-admin PATCH /api/v1/orgs/orgInit',
                function (done) {
                    var orgId = 'orgPatchInfo',
                        newData = {
                            disabled: false
                        };

                    agent.patch(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .send(newData)
                        .set('Authorization', 'Basic ' + new Buffer('userAdminOrg:plaintext').toString('base64'))
                        .end(function (err, res) {
                            try {
                                expect(res.status).equal(403, err);
                                done();
                            } catch (e) {
                                done(e);
                            }
                        });
                }
            );

            it('should 400 when patching {disabled: false} org as site-admin PATCH /api/v1/orgs/orgInit',
                function (done) {
                    var orgId = 'orgDoesNotExist',
                        newData = {
                            disabled: false
                        };

                    agent.patch(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .send(newData)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res) {
                            try {
                                expect(res.status).equal(400, err);
                                done();
                            } catch (e) {
                                done(e);
                            }
                        });
                }
            );

            it('should 403 when patching {disabled: false} org as non-site-admin PATCH /api/v1/orgs/orgInit',
                function (done) {
                    var orgId = 'orgDoesNotExist',
                        newData = {
                            disabled: false
                        };

                    agent.patch(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .send(newData)
                        .set('Authorization', 'Basic ' + new Buffer('userAdminOrg:plaintext').toString('base64'))
                        .end(function (err, res) {
                            try {
                                expect(res.status).equal(403, err);
                                done();
                            } catch (e) {
                                done(e);
                            }
                        });
                }
            );

            it('should reEnable org when patching {disabled: false} org as site-admin PATCH /api/v1/orgs/orgInit',
                function (done) {
                    var orgId = 'orgDisabledAtStart',
                        newData = {
                            disabled: false
                        };

                    agent.patch(server.getUrl() + '/api/v1/orgs/' + orgId)
                        .send(newData)
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res) {
                            try {
                                expect(res.status).to.equal(200, err);
                                expect(res.body._id).to.equal(orgId);
                                expect(res.body.info).to.deep.equal({some: 'info'});
                                done();
                            } catch (e) {
                                done(e);
                            }
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
                            .set('Authorization', 'Basic ' + new Buffer('userAdminOrg2:plaintext').toString('base64'))
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

            it('should force delete org site-admin DELETE /api/v1/orgs/orgToDelete2?force=true', function (done) {
                var orgName = 'orgDisabledForceDelete';

                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgName)
                        .query({force: true})
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            try {
                                expect(res2.status).equal(204, err);
                            } catch (e) {
                                done(e);
                                return;
                            }
                            gmeAuth.getOrganization(orgName, {disabled: undefined})
                                .then(function() {
                                    throw new Error('Should have failed!');
                                })
                                .catch(function (err) {
                                    expect(err.message).to.include('no such organization');
                                })
                                .nodeify(done);
                        });
            });

            it('should 204 force delete non existing org site-admin DELETE /api/v1/orgs/orgToDelete2?force=true',
                function (done) {
                    var orgName = 'doesNotExist';

                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgName)
                        .query({force: true})
                        .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
                        .end(function (err, res2) {
                            try {
                                expect(res2.status).equal(204, err);
                                done();
                            } catch (e) {
                                done(e);
                                return;
                            }
                        });
                }
            );

            it('should 403 force delete org when only org-admin DELETE /api/v1/orgs/orgToDelete2?force=true',
                function (done) {
                    var orgName = 'orgInit';

                    agent.del(server.getUrl() + '/api/v1/orgs/' + orgName)
                        .query({force: true})
                        .set('Authorization', 'Basic ' + new Buffer('userAdminOrg:plaintext').toString('base64'))
                        .end(function (err, res2) {
                            try {
                                expect(res2.status).equal(403, err);
                                done();
                            } catch (e) {
                                done(e);
                                return;
                            }
                        });
                }
            );

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
                                .set('Authorization', 'Basic ' + new Buffer('admin:admin').toString('base64'))
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

            it('should 401 at get organizations /api/v1/orgs', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs').end(function (err, res) {
                    if (res.status === 401) {
                        done();
                    } else {
                        done(new Error('Should have returned 401'));
                    }
                });
            });

            it('should 401 at get specific organization /api/v1/orgs/orgInit', function (done) {
                agent.get(server.getUrl() + '/api/v1/orgs/orgInit').end(function (err, res) {
                    if (res.status === 401) {
                        done();
                    } else {
                        done(new Error('Should have returned 401'));
                    }
                });
            });
        });
    });
});
